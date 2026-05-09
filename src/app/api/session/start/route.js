import { createSession, getFirstQuestion } from "@/lib/sessionManager";
import { validateSession } from "@/lib/validators";
import { logError, logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

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

    const question = await getFirstQuestion(session.id);
    if (!question) {
      logWarn("session/start", "First question generation returned null", {
        sessionId: session.id,
      });
      return Response.json(
        { error: "Failed to generate opening question" },
        { status: 500 }
      );
    }

    logInfo("session/start", "New session created", {
      sessionId: session.id,
      candidates: session.candidates.length,
    });

    return Response.json({
      sessionId: session.id,
      question,
      questionNumber: 1,
      adaptiveQuestionLimit: session.adaptiveQuestionLimit,
      candidatesRemaining: session.candidates.length,
    });
  } catch (error) {
    logError("session/start", "Failed to create session", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
