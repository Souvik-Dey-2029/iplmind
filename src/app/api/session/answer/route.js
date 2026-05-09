import { processAnswer } from "@/lib/sessionManager";
import { validateAnswerPayload, clampConfidence } from "@/lib/validators";
import { logError, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ANSWER_TIMEOUT_MS = 15000; // 15 second timeout for AI operations

export async function POST(request) {
  try {
    const payload = await request.json();
    const { sessionId, answer } = payload;

    // Validate required fields
    if (!sessionId || !answer) {
      logWarn("session/answer", "Missing required fields", {
        hasSessionId: !!sessionId,
        hasAnswer: !!answer,
      });
      return Response.json(
        { error: "sessionId and answer are required" },
        { status: 400 }
      );
    }

    // Validate answer payload structure
    const validation = validateAnswerPayload(payload);
    if (!validation.valid) {
      logWarn("session/answer", "Invalid answer payload", { error: validation.error });
      return Response.json({ error: validation.error }, { status: 400 });
    }

    // Wrap processAnswer with timeout protection
    const result = await Promise.race([
      processAnswer(sessionId, answer),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Answer processing timed out after " + ANSWER_TIMEOUT_MS + "ms")),
          ANSWER_TIMEOUT_MS
        )
      ),
    ]);

    // Validate response structure
    if (!result || typeof result !== "object") {
      throw new Error("Invalid response from processAnswer");
    }

    if (!["playing", "guessing", "failed"].includes(result.status)) {
      throw new Error(`Invalid status: ${result.status}`);
    }

    // Ensure confidence is properly clamped in response
    if (result.confidence !== undefined) {
      result.confidence = clampConfidence(result.confidence);
    }

    // For playing phase, ensure question exists
    if (result.status === "playing" && !result.question) {
      throw new Error("No question generated for playing phase");
    }

    // For guessing phase, ensure guess exists
    if (result.status === "guessing" && !result.guess) {
      throw new Error("No guess generated for guessing phase");
    }

    // For failed phase, return as-is (contains message and top candidates)

    return Response.json(result);
  } catch (error) {
    const status =
      error.message === "Session not found" ? 404 : 500;
    logError("session/answer", "Failed to process answer", error, {
      status,
      errorMessage: error.message,
    });
    return Response.json(
      { error: error.message || "Internal server error" },
      { status }
    );
  }
}
