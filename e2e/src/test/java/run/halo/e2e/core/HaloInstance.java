package run.halo.e2e.core;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/**
 * Starts the Halo application of the current branch in a separate JVM and waits for
 * readiness, or attaches to an instance provided via {@code -De2e.base-url}.
 *
 * <p>Runs the Boot jar built from the current branch (same layout as the deployed artifact).
 * Isolation: random port, dedicated H2 file database inside a temporary work dir,
 * no preset plugin download and no Lucene index. The temporary directory is deleted
 * after a successful run and kept (with the path reported) when the test fails.
 */
public final class HaloInstance implements AutoCloseable {

    private static final Duration STARTUP_TIMEOUT = Duration.ofSeconds(180);
    private static final Duration SHUTDOWN_TIMEOUT = Duration.ofSeconds(20);

    private final URI baseUri;
    private final Process process;
    private final Path workDir;
    private final Path logFile;
    private final boolean owned;

    private HaloInstance(URI baseUri, Process process, Path workDir, Path logFile, boolean owned) {
        this.baseUri = baseUri;
        this.process = process;
        this.workDir = workDir;
        this.logFile = logFile;
        this.owned = owned;
    }

    public static HaloInstance start() {
        URI external = E2eConfig.baseUri();
        if (external != null) {
            waitUntilReady(external, null, null);
            return new HaloInstance(external, null, null, null, false);
        }
        return startTemporary();
    }

    private static HaloInstance startTemporary() {
        Path workDir;
        try {
            Path root = Path.of(E2eConfig.workDir()).toAbsolutePath();
            Files.createDirectories(root);
            workDir = Files.createTempDirectory(root, "instance-");
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot create E2E work directory", ex);
        }

        int port = freePort();
        Path logFile = workDir.resolve("halo-e2e.log");
        List<String> command = new ArrayList<>();
        command.add(javaExecutable());
        command.add("-Xmx512m");
        command.add("-Dfile.encoding=UTF-8");
        command.add("-Duser.dir=" + Path.of(System.getProperty("user.dir")).toAbsolutePath());
        String bootJar = System.getProperty("e2e.application-boot-jar", "");
        if (bootJar.isBlank()) {
            throw new E2eBlockedException("Missing e2e.application-boot-jar: run the suite through Gradle tasks "
                    + ":e2e:testBackend / :e2e:testFrontend");
        }
        command.add("-jar");
        command.add(bootJar);
        command.add("--server.port=" + port);
        command.add("--spring.r2dbc.url=r2dbc:h2:file:///" + workDir
                + "/db/halo-e2e?MODE=MySQL&DB_CLOSE_ON_EXIT=FALSE");
        command.add("--spring.r2dbc.username=admin");
        command.add("--spring.r2dbc.password=123456");
        command.add("--halo.work-dir=" + workDir);
        command.add("--halo.security.basic-auth.disabled=false");
        command.add("--logging.file.name=" + logFile);
        command.add("--spring.main.banner-mode=off");

        ProcessBuilder builder = new ProcessBuilder(command);
        builder.directory(Path.of(System.getProperty("user.dir")).toFile());
        builder.redirectErrorStream(true);
        builder.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile.toFile()));
        // Test preset plugins are never shipped in test resources, so no preset download is needed.
        builder.environment().remove("SPRING_PROFILES_ACTIVE");
        Process process;
        try {
            process = builder.start();
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot start Halo instance", ex);
        }
        URI baseUri = URI.create("http://127.0.0.1:" + port);
        HaloInstance instance = new HaloInstance(baseUri, process, workDir, logFile, true);
        try {
            waitUntilReady(baseUri, process, logFile);
        } catch (RuntimeException ex) {
            instance.close();
            throw ex;
        }
        return instance;
    }

    /** Polls /actuator/health with a bounded timeout; a startup timeout is reported as BLOCKED, not FAIL. */
    public static void waitUntilReady(URI baseUri, Process process, Path logFile) {
        Instant deadline = Instant.now().plus(STARTUP_TIMEOUT);
        E2eHttpClient client = new E2eHttpClient(baseUri, "probe", "probe");
        String lastError = "";
        while (Instant.now().isBefore(deadline)) {
            if (process != null && !process.isAlive()) {
                throw new E2eBlockedException("Halo instance exited with code " + process.exitValue()
                        + ". Startup log: " + logFile + "\n" + tail(logFile, 120));
            }
            try {
                E2eHttpClient.Response response = client.get("/actuator/health");
                String status = Json.string(Json.parse(response.body()), "status");
                if (response.status() == 200 && "UP".equals(status)) {
                    return;
                }
                lastError = "status=" + response.status() + " body=" + response.body();
            } catch (RuntimeException ex) {
                lastError = ex.getMessage();
            }
            sleep(Duration.ofSeconds(2));
        }
        throw new E2eBlockedException("Halo instance did not become healthy within " + STARTUP_TIMEOUT.toSeconds()
                + "s at " + baseUri + ". Last probe: " + lastError + ". Log: " + logFile);
    }

    public URI baseUri() {
        return baseUri;
    }

    public Path workDir() {
        return workDir;
    }

    public Path logFile() {
        return logFile;
    }

    /**
     * Releases the JVM. On failed tests {@code deleteWorkDir} must be false so the
     * site, the H2 database and the log stay available for troubleshooting.
     */
    public void stop(boolean deleteWorkDir) {
        if (process != null && process.isAlive()) {
            process.destroy();
            try {
                if (!process.waitFor(SHUTDOWN_TIMEOUT.toSeconds(), TimeUnit.SECONDS)) {
                    process.destroyForcibly().waitFor(SHUTDOWN_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                process.destroyForcibly();
            }
        }
        if (deleteWorkDir && workDir != null) {
            try (Stream<Path> paths = Files.walk(workDir)) {
                paths.sorted(Comparator.reverseOrder()).map(Path::toFile).forEach(File::delete);
            } catch (IOException ex) {
                System.err.println("[E2E][CLEANUP-WARNING] Cannot delete temp work dir " + workDir + ": " + ex);
            }
        }
    }

    @Override
    public void close() {
        stop(true);
    }

    private static int freePort() {
        try (java.net.ServerSocket socket = new java.net.ServerSocket(0)) {
            socket.setReuseAddress(true);
            return socket.getLocalPort();
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot allocate a free port", ex);
        }
    }

    private static String javaExecutable() {
        return Path.of(System.getProperty("java.home"), "bin", "java").toString();
    }

    private static String tail(Path logFile, int lines) {
        if (logFile == null || !Files.exists(logFile)) {
            return "<no log file>";
        }
        try {
            List<String> all = Files.readAllLines(logFile, StandardCharsets.UTF_8);
            return String.join("\n", all.subList(Math.max(0, all.size() - lines), all.size()));
        } catch (IOException ex) {
            return "<cannot read " + logFile + ": " + ex + ">";
        }
    }

    private static void sleep(Duration duration) {
        try {
            TimeUnit.MILLISECONDS.sleep(duration.toMillis());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for Halo", ex);
        }
    }

    /** Marker for environment problems: reported as blocked (skipped) instead of a business failure. */
    public static class E2eBlockedException extends RuntimeException {
        private static final long serialVersionUID = 1L;

        public E2eBlockedException(String message) {
            super(message);
        }
    }

    /** Mostly for debugging: returns the effective configuration of this instance. */
    public Map<String, Object> describe() {
        return Map.of(
                "baseUri", baseUri.toString(),
                "ownedProcess", owned,
                "workDir", workDir == null ? "<external>" : workDir.toString(),
                "logFile", logFile == null ? "<external>" : logFile.toString());
    }
}
