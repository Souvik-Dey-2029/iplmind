import { createSession, getFirstQuestion } from "@/lib/sessionManager";
import { validateSession } from "@/lib/validators";
import { logError, logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

const START_TIMEOUT_MS = 10000; // 10 second timeout

export async function POST() {
  try {
    const session = createSession();

    // Validate session structure before proceeding
    const validation = validateSession(session);
    if (!validation.valid) {
      logError("session/start", "Invalid session created", new Error(validation.error), {
        sessionId: session?.id,
      });
      return Response.json(
        { error: "Failed to initialize game session" },
        { status: 500 }
      );
    }

    // Wrap with timeout protection
    const question = await Promise.race([
      getFirstQuestion(session.id),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Question generation timed out")),
          START_TIMEOUT_MS
        )
      ),
    ]);

    if (!question || typeof question !== "string") {
      logWarn("session/start", "First question generation returned invalid value", {
        sessionId: session.id,
        questionType: typeof question,
      });
      return Response.json(
        { error: "Failed to generate opening question" },
        { status: 500 }
      );
    }

    logInfo("session/start", "New session created", {
      sessionId: session.id,
      candidates: session.candidates?.length || 0,
    });

    return Response.json({
      sessionId: session.id,
      question,
      questionNumber: 1,
      adaptiveQuestionLimit: session.adaptiveQuestionLimit,
      candidatesRemaining: session.candidates?.length || 0,
    });
  } catch (error) {
    logError("session/start", "Failed to create session", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
