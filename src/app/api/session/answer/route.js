import { processAnswer } from "@/lib/sessionManager";
import { validateAnswerPayload, clampConfidence } from "@/lib/validators";
import { logError, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

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

    const result = await processAnswer(sessionId, answer);

    // Ensure confidence is properly clamped in response
    if (result.confidence !== undefined) {
      result.confidence = clampConfidence(result.confidence);
    }

    return Response.json(result);
  } catch (error) {
    const status = error.message === "Session not found" ? 404 : 500;
    logError("session/answer", "Failed to process answer", error, {
      status,
    });
    return Response.json({ error: error.message }, { status });
  }
}
