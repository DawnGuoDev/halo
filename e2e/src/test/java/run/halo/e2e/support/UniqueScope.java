package run.halo.e2e.support;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Per-run unique scope token used as title/slug prefix so repeated runs never collide. */
public record UniqueScope(String token) {

    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static UniqueScope create() {
        var timestamp = DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .withZone(ZoneOffset.UTC)
                .format(Instant.now());
        var random = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            random.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return new UniqueScope(("e2e-" + timestamp + "-" + random).toLowerCase(Locale.ROOT));
    }

    public String title(String suffix) {
        return token + " " + suffix;
    }

    public String slug(String suffix) {
        return token + "-" + suffix;
    }
}
