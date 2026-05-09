import { confirmGuess, recordFeedback, getSession } from "@/lib/sessionManager";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { validateSession, ensurePlayerName } from "@/lib/validators";
import { logError, logWarn, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const FEEDBACK_TIMEOUT_MS = 10000; // 10 second timeout

export async function POST(request) {
  try {
    const payload = await request.json();
    const { sessionId, wasCorrect, correctPlayerName } = payload;

    if (!sessionId) {
      logWarn("session/feedback", "Missing sessionId");
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Verify session exists before processing
    const session = getSession(sessionId);
    if (!session) {
      logWarn("session/feedback", "Session not found", { sessionId });
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "guessing") {
      logWarn("session/feedback", "Session not in guessing state", { sessionId, status: session.status });
      return Response.json(
        { error: "Cannot provide feedback - game not in guessing phase" },
        { status: 400 }
      );
    }

    const feedback = wasCorrect
      ? confirmGuess(sessionId)
      : recordFeedback(sessionId, ensurePlayerName(correctPlayerName));

    if (!feedback) {
      logWarn("session/feedback", "Failed to generate feedback", { sessionId });
      return Response.json({ error: "Failed to process feedback" }, { status: 500 });
    }

    // Validate feedback structure
    const validation = validateSession(feedback);
    if (!validation.valid) {
      logWarn("session/feedback", "Invalid feedback structure", {
        error: validation.error,
        sessionId,
      });
    }

    // Persist feedback to Firestore with timeout
    try {
      await Promise.race([
        addDoc(collection(db, "game_sessions"), feedback),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Firestore write timed out")),
            FEEDBACK_TIMEOUT_MS
          )
        ),
      ]);
      logInfo("session/feedback", "Feedback persisted to Firestore", { sessionId });
    } catch (firebaseError) {
      logWarn("session/feedback", "Failed to persist to Firestore", {
        error: firebaseError?.message || "Unknown error",
        sessionId,
      });
      // Continue despite Firebase failure - don't block user experience
    }

    return Response.json({ status: "finished", feedback });
  } catch (error) {
    logError("session/feedback", "Failed to process feedback", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
