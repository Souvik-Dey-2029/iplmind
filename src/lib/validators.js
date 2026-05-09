/**
 * Validators - Lightweight centralized validation layer for IPLMind.
 * Provides consistent validation for sessions, questions, players, and probabilities.
 * Keeps validation fast and simple - no heavy libraries.
 */

/**
 * Validate session object has required fields.
 * Returns { valid: boolean, error?: string }
 */
export function validateSession(session) {
    if (!session || typeof session !== "object") {
        return { valid: false, error: "Session must be an object" };
    }

    if (!session.id || typeof session.id !== "string") {
        return { valid: false, error: "Session missing valid id" };
    }

    if (!session.probabilities || typeof session.probabilities !== "object") {
        return { valid: false, error: "Session missing valid probabilities object" };
    }

    if (!Array.isArray(session.candidates)) {
        return { valid: false, error: "Session candidates must be an array" };
    }

    if (session.status && !["playing", "guessing", "finished"].includes(session.status)) {
        return { valid: false, error: `Invalid session status: ${session.status}` };
    }

    return { valid: true };
}

/**
 * Validate question metadata has required fields.
 */
export function validateQuestionMeta(meta) {
    if (!meta || typeof meta !== "object") {
        return { valid: false, error: "Question metadata must be an object" };
    }

    if (!meta.id || typeof meta.id !== "string") {
        return { valid: false, error: "Question missing valid id" };
    }

    if (!meta.category || typeof meta.category !== "string") {
        return { valid: false, error: "Question missing valid category" };
    }

    return { valid: true };
}

/**
 * Validate player object has required fields for gameplay.
 */
export function validatePlayer(player) {
    if (!player || typeof player !== "object") {
        return { valid: false, error: "Player must be an object" };
    }

    if (!player.name || typeof player.name !== "string") {
        return { valid: false, error: "Player missing valid name" };
    }

    // Role, country are optional but should be strings if present
    if (player.role && typeof player.role !== "string") {
        return { valid: false, error: "Player role must be a string" };
    }

    if (player.country && typeof player.country !== "string") {
        return { valid: false, error: "Player country must be a string" };
    }

    // Teams should be an array if present
    if (player.teams && !Array.isArray(player.teams)) {
        return { valid: false, error: "Player teams must be an array" };
    }

    return { valid: true };
}

/**
 * Validate probability value is within valid bounds [0, 1].
 */
export function validateProbability(value, playerName = "unknown") {
    if (typeof value !== "number") {
        return { valid: false, error: `Probability for ${playerName} must be a number, got ${typeof value}` };
    }

    if (value < 0 || value > 1) {
        return { valid: false, error: `Probability for ${playerName} out of bounds [0,1]: ${value}` };
    }

    return { valid: true };
}

/**
 * Validate all probabilities in an object.
 */
export function validateProbabilities(probabilities) {
    if (!probabilities || typeof probabilities !== "object") {
        return { valid: false, error: "Probabilities must be an object" };
    }

    const entries = Object.entries(probabilities);
    if (entries.length === 0) {
        return { valid: false, error: "Probabilities object is empty" };
    }

    for (const [playerName, prob] of entries) {
        const validation = validateProbability(prob, playerName);
        if (!validation.valid) return validation;
    }

    // Check sum is close to 1.0 (allow small floating point errors)
    const sum = Object.values(probabilities).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
        return { valid: false, error: `Probabilities don't sum to ~1.0: ${sum}` };
    }

    return { valid: true };
}

/**
 * Validate answer payload from client.
 */
export function validateAnswerPayload(payload) {
    if (!payload || typeof payload !== "object") {
        return { valid: false, error: "Payload must be an object" };
    }

    if (!payload.sessionId || typeof payload.sessionId !== "string") {
        return { valid: false, error: "Payload missing valid sessionId" };
    }

    if (!payload.answer || typeof payload.answer !== "string") {
        return { valid: false, error: "Payload missing valid answer" };
    }

    if (payload.answer.length > 200) {
        return { valid: false, error: "Answer too long (max 200 chars)" };
    }

    return { valid: true };
}

/**
 * Clamp a value to bounds with optional error reporting.
 */
export function clampProbability(value, playerName = "unknown") {
    if (typeof value !== "number") {
        console.warn(`[validator] Non-numeric probability for ${playerName}: ${typeof value}, defaulting to 0.5`);
        return 0.5;
    }

    if (value < 0) {
        console.warn(`[validator] Negative probability for ${playerName}: ${value}, clamping to 0.0001`);
        return 0.0001;
    }

    if (value > 1) {
        console.warn(`[validator] Probability > 1 for ${playerName}: ${value}, clamping to 1.0`);
        return 1.0;
    }

    return value;
}

/**
 * Ensure confidence value is in [0, 100] range.
 */
export function clampConfidence(value) {
    if (typeof value !== "number") return 0;
    return Math.max(0, Math.min(100, value));
}

/**
 * Safe fallback for missing question IDs.
 */
export function ensureQuestionId(meta) {
    if (meta?.id && typeof meta.id === "string") {
        return meta.id;
    }
    const fallbackId = `fallback-q-${Date.now()}`;
    console.warn(`[validator] Missing question ID, generated fallback: ${fallbackId}`);
    return fallbackId;
}

/**
 * Safe fallback for missing player data.
 */
export function ensurePlayerName(player) {
    if (player?.name && typeof player.name === "string") {
        return player.name;
    }
    return "Unknown Player";
}
