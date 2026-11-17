package run.halo.e2e.support;

import java.io.File;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * A real Halo process started from the current working tree (boot classpath of the {@code
 * :application} module, never a released image).
 *
 * <p>Isolation per instance: random free port, H2 in-memory database, dedicated temporary
 * {@code halo.work-dir}.
 *
 * <p>Lifecycle is explicit ({@link #start()}, {@link #stop()}) because test framework hooks (TestNG
 * {@code @BeforeSuite}) cannot be used to mark a blocked run: a hook failure is reported as a test
 * failure by the runner.
 */
public final class HaloInstance implements AutoCloseable {

    private static final Duration HEALTH_REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final int port;
    private final Path workDir;
    private final Path logFile;
    private final List<String> classpath;
    private Process process;

    private HaloInstance(int port, Path workDir) {
        this.port = port;
        this.workDir = workDir;
        this.logFile = workDir.resolve("logs").resolve("instance.log");
        this.classpath = resolveClasspath();
    }

    /** Creates an instance using a random port and a fresh temporary directory. */
    public static HaloInstance create() {
        var port = findFreePort();
        var dir = E2EConfig.TEMP_DIR.resolve("halo-" + port + "-" + System.nanoTime());
        return new HaloInstance(port, dir);
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + port;
    }

    /** Creates an unauthenticated HTTP client with a bounded connect timeout. */
    public HttpClient newHttpClient() {
        return HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    /** True when the application JAR of the current checkout was built. */
    public static boolean isApplicationClasspathAvailable() {
        return !resolveClasspath().isEmpty();
    }

    private static List<String> resolveClasspath() {
        var appClasses = Path.of("../application/build/classes/java/main");
        var appResources = Path.of("../application/build/resources/main");
        var apiClasses = Path.of("../api/build/classes/java/main");
        var apiResources = Path.of("../api/build/resources/main");
        if (!Files.isDirectory(appClasses) || !Files.isDirectory(apiClasses)) {
            return List.of();
        }
        var entries = new LinkedHashSet<String>();
        entries.add(appClasses.toAbsolutePath().toString());
        entries.add(appResources.toAbsolutePath().toString());
        entries.add(apiClasses.toAbsolutePath().toString());
        entries.add(apiResources.toAbsolutePath().toString());
        for (var line : readApplicationRuntimeClasspath()) {
            entries.add(line);
        }
        return List.copyOf(entries);
    }

    private static List<String> readApplicationRuntimeClasspath() {
        for (var file : List.of(
                Path.of("../application/build/e2e-runtime-classpath.txt"),
                Path.of("../application/build/runtime-classpath.txt"))) {
            try {
                if (Files.isRegularFile(file)) {
                    return Files.readAllLines(file, StandardCharsets.UTF_8).stream()
                            .filter(line -> !line.isBlank())
                            .toList();
                }
            } catch (IOException e) {
                throw new IllegalStateException("Cannot read classpath file " + file.toAbsolutePath(), e);
            }
        }
        return List.of();
    }

    /** Starts the instance and blocks until {@code /actuator/health} reports UP. */
    public HaloInstance start() {
        if (classpath.isEmpty()) {
            throw new BackendReadinessException(
                    "Halo application classes are missing. Run `./gradlew :application:classes :application:writeE2eRuntimeClasspath` "
                            + "(or `./gradlew build`) before E2E.",
                    null);
        }
        if (process != null) {
            return this;
        }
        try {
            Files.createDirectories(workDir);
        } catch (IOException e) {
            throw new BackendReadinessException("Cannot create work dir " + workDir, e);
        }
        var java = System.getProperty("java.home") + "/bin/java";
        var command = new ArrayList<String>();
        command.add(java);
        command.add("-Xmx1g");
        command.add("-Djava.awt.headless=true");
        command.add("-cp");
        command.add(String.join(File.pathSeparator, classpath));
        command.add("run.halo.app.Application");
        command.add("--server.port=" + port);
        command.add("--spring.r2dbc.url=r2dbc:h2:mem:///halo-e2e-" + port + ";MODE=MySQL;DB_CLOSE_DELAY=-1");
        command.add("--halo.work-dir=" + workDir.toAbsolutePath());
        command.add("--spring.main.banner-mode=off");
        command.add("--logging.file.name=" + logFile.toAbsolutePath());
        command.add("--server.forward-headers-strategy=native");
        command.add("--spring.output.ansi.enabled=never");
        try {
            Files.createDirectories(logFile.getParent());
            var log = new ProcessBuilder(command)
                    .redirectErrorStream(true)
                    .redirectOutput(ProcessBuilder.Redirect.appendTo(logFile.toFile()))
                    .start();
            this.process = log;
            awaitHealthy();
            return this;
        } catch (BackendReadinessException e) {
            stop();
            throw new BackendReadinessException(
                    e.getMessage() + "\nWork dir (kept for diagnosis): " + workDir + "\n" + lastLogLines(80), e);
        } catch (IOException e) {
            stop();
            throw new BackendReadinessException("Cannot start Halo process: " + e.getMessage(), e);
        }
    }

    private void awaitHealthy() {
        var client = newHttpClient();
        var deadline = System.nanoTime() + Duration.ofSeconds(E2EConfig.READY_TIMEOUT_SECONDS).toNanos();
        var health = URI.create(baseUrl() + "/actuator/health");
        String lastStatus = "not requested";
        while (System.nanoTime() < deadline) {
            if (process != null && !process.isAlive()) {
                throw new BackendReadinessException(
                        "Halo process exited with code " + process.exitValue() + " before becoming ready", null);
            }
            try {
                var response = client.send(
                        HttpRequest.newBuilder(health)
                                .timeout(HEALTH_REQUEST_TIMEOUT)
                                .GET()
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
                lastStatus = response.statusCode() + " " + response.body();
                if (response.statusCode() == 200 && response.body().contains("\"UP\"")) {
                    return;
                }
            } catch (IOException e) {
                lastStatus = e.getMessage();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new BackendReadinessException("Interrupted while waiting for Halo readiness", e);
            }
            sleep(1000);
        }
        throw new BackendReadinessException(
                "Halo did not become healthy within " + E2EConfig.READY_TIMEOUT_SECONDS + "s on " + baseUrl()
                        + " (last: " + lastStatus + ")",
                null);
    }

    /** Stops the instance and removes the temporary work directory if no failure context is kept. */
    @Override
    public void close() {
        stop();
    }

    /** Stops the instance; work dir is kept so that failure diagnostics remain available. */
    public void stop() {
        if (process != null) {
            process.descendants().forEach(ProcessHandle::destroy);
            process.destroy();
            try {
                if (!process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                    process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                process.destroyForcibly();
            }
            process = null;
        }
    }

    /** Best-effort deletion of the work directory. Returns {@code null} on success, else the reason. */
    public String cleanUpWorkDir() {
        try (Stream<Path> walk = Files.walk(workDir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Reported via the directory-presence check below.
                }
            });
            return Files.exists(workDir) ? "Work dir still exists after cleanup: " + workDir : null;
        } catch (IOException e) {
            return "Work dir cleanup failed for " + workDir + ": " + e.getMessage();
        }
    }

    public Path workDir() {
        return workDir;
    }

    public Path logFile() {
        return logFile;
    }

    public String lastLogLines(int count) {
        try {
            if (!Files.isRegularFile(logFile)) {
                return "<no log file at " + logFile + ">";
            }
            var lines = Files.readAllLines(logFile, StandardCharsets.UTF_8);
            var from = Math.max(0, lines.size() - count);
            return E2EConfig.sanitize(String.join("\n", lines.subList(from, lines.size())));
        } catch (IOException e) {
            return "<cannot read log: " + e.getMessage() + ">";
        }
    }

    private static int findFreePort() {
        try (ServerSocket socket = new ServerSocket(0)) {
            socket.setReuseAddress(true);
            return socket.getLocalPort();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot allocate a free port for Halo", e);
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BackendReadinessException("Interrupted while waiting for Halo readiness", e);
        }
    }
}
