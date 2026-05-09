/**
 * Logger - Lightweight centralized logging utility for IPLMind.
 * Provides consistent, structured logging with prefixes for debugging.
 * Safe for both server and client contexts.
 */

const LOG_LEVELS = {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
};

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Format log message with timestamp, level, and module prefix.
 */
function formatLog(level, module, message, data) {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
    const prefix = `[${timestamp}] [${level}] [${module}]`;

    if (data) {
        return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
}

/**
 * Log an error with context.
 * Includes stack trace in development, hides in production.
 */
export function logError(module, message, error, context = {}) {
    const errorInfo = {
        message: error?.message || String(error),
        ...(isDevelopment && error?.stack && { stack: error.stack }),
        ...context,
    };

    console.error(formatLog(LOG_LEVELS.ERROR, module, message, errorInfo));
}

/**
 * Log a warning with optional context.
 */
export function logWarn(module, message, context = {}) {
    console.warn(formatLog(LOG_LEVELS.WARN, module, message, context));
}

/**
 * Log info message (development only).
 */
export function logInfo(module, message, context = {}) {
    if (isDevelopment) {
        console.log(formatLog(LOG_LEVELS.INFO, module, message, context));
    }
}

/**
 * Log debug message (development only, verbose).
 */
export function logDebug(module, message, context = {}) {
    if (isDevelopment) {
        console.debug(formatLog(LOG_LEVELS.DEBUG, module, message, context));
    }
}

/**
 * Create a safe error response for API responses.
 * Hides internal details from client in production.
 */
export function createErrorResponse(error, context = "unknown operation") {
    const isUserError = error?.message?.includes("not found") ||
        error?.message?.includes("invalid") ||
        error?.message?.includes("required");

    if (isDevelopment) {
        return {
            error: error?.message || "An error occurred",
            context,
            ...(error?.stack && { trace: error.stack }),
        };
    }

    // Production: sanitize response
    return {
        error: isUserError ? error.message : "An error occurred while processing your request",
        context: isUserError ? context : undefined,
    };
}

/**
 * Log session state for debugging (production: minimal).
 */
export function logSessionState(sessionId, state, details = {}) {
    const summary = {
        sessionId,
        status: state.status,
        questionNumber: state.questionNumber,
        candidates: state.candidates?.length || 0,
        ...details,
    };

    if (isDevelopment) {
        logDebug("sessionManager", "Session state", summary);
    }
}

/**
 * Log probability update for debugging.
 */
export function logProbabilityUpdate(sessionId, topCandidate, entropy, details = {}) {
    if (isDevelopment) {
        logDebug("probabilityEngine", "Probability update", {
            sessionId,
            topPlayer: topCandidate?.name,
            topConfidence: topCandidate?.confidence?.toFixed(2),
            entropy: entropy?.toFixed(3),
            ...details,
        });
    }
}
