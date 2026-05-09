import { confirmGuess, recordFeedback } from "@/lib/sessionManager";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { validateSession, ensurePlayerName } from "@/lib/validators";
import { logError, logWarn, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { sessionId, wasCorrect, correctPlayerName } = payload;

    if (!sessionId) {
      logWarn("session/feedback", "Missing sessionId");
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const feedback = wasCorrect
      ? confirmGuess(sessionId)
      : recordFeedback(sessionId, ensurePlayerName(correctPlayerName));

    if (!feedback) {
      logWarn("session/feedback", "Session not found", { sessionId });
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    // Validate feedback structure
    const validation = validateSession(feedback);
    if (!validation.valid) {
      logWarn("session/feedback", "Invalid feedback structure", {
        error: validation.error,
        sessionId,
      });
    }

    // Persist feedback to Firestore
    try {
      await addDoc(collection(db, "game_sessions"), feedback);
      logInfo("session/feedback", "Feedback persisted to Firestore", { sessionId });
    } catch (firebaseError) {
      logWarn("session/feedback", "Failed to persist to Firestore", {
        error: firebaseError.message,
      });
      // Continue despite Firebase failure - don't block user experience
    }

    return Response.json({ status: "finished", feedback });
  } catch (error) {
    logError("session/feedback", "Failed to process feedback", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
