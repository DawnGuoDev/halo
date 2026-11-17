package run.halo.e2e.support;

/**
 * Raised when the temporary Halo instance never becomes ready. Reported as BLOCKED, never as a
 * business FAIL, because no endpoint assertion was reached.
 */
public class BackendReadinessException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public BackendReadinessException(String message, Throwable cause) {
        super(message, cause);
    }
}
