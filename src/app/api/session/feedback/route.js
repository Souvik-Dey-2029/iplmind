import { confirmGuess, recordFeedback, recordFailureFeedback, getSession, continueAfterWrongGuess } from "@/lib/sessionManager";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { validateSession, ensurePlayerName } from "@/lib/validators";
import { logError, logWarn, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const FEEDBACK_TIMEOUT_MS = 10000; // 10 second timeout

export async function POST(request) {
  try {
    const payload = await request.json();
    const { sessionId, wasCorrect, correctPlayerName, action } = payload;

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

    // V2: Handle "continue" action — resume game after wrong guess
    if (action === "continue") {
      if (session.status !== "guessing") {
        return Response.json(
          { error: "Cannot continue - game not in guessing phase" },
          { status: 400 }
        );
      }

      try {
        const result = await continueAfterWrongGuess(sessionId);
        return Response.json(result);
      } catch (err) {
        logError("session/feedback", "Continue after wrong guess failed", err);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // V2: Handle "reveal" action — player tells us who it was after failure
    if (action === "reveal") {
      const feedback = recordFailureFeedback(sessionId, ensurePlayerName(correctPlayerName));
      if (feedback) {
        await persistFeedback(feedback, sessionId);
      }
      return Response.json({ status: "finished", feedback });
    }

    if (session.status !== "guessing" && session.status !== "failed") {
      logWarn("session/feedback", "Session not in guessing/failed state", { sessionId, status: session.status });
      return Response.json(
        { error: "Cannot provide feedback - game not in guessing or failed phase" },
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

    // Persist feedback to Firestore
    await persistFeedback(feedback, sessionId);

    return Response.json({ status: "finished", feedback });
  } catch (error) {
    logError("session/feedback", "Failed to process feedback", error);
    return Response.json(

    return Response.json({ status: "finished", feedback });
  } catch (error) {
    logError("session/feedback", "Failed to process feedback", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Persist feedback to Firebase asynchronously with retry-safe logic.
 * Ensures the leaderboard never freezes due to dropped connections.
 */
async function persistFeedback(feedback, sessionId) {
  if (!db) {
    logWarn("session/feedback", "Firestore unavailable, skipping persistence", { sessionId });
    return;
  }

  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    try {
      await Promise.race([
        addDoc(collection(db, "game_sessions"), feedback),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore write timed out")), FEEDBACK_TIMEOUT_MS)
        )
      ]);
      logInfo("session/feedback", "Successfully persisted session data", { sessionId, attempt: attempt + 1 });
      return; // Success, exit loop
    } catch (error) {
      attempt++;
      logWarn("session/feedback", `Firestore persistence failed (Attempt ${attempt}/${maxRetries})`, { sessionId, error: error.message });
      if (attempt >= maxRetries) {
        logError("session/feedback", "Failed to persist feedback after max retries", error, { sessionId });
      } else {
        await new Promise(r => setTimeout(r, 500 * attempt)); // Exponential-ish backoff
      }
    }
  }
}
