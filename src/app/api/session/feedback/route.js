import { confirmGuess, recordFeedback } from "@/lib/sessionManager";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { sessionId, wasCorrect, correctPlayerName } = await request.json();

    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const feedback = wasCorrect
      ? confirmGuess(sessionId)
      : recordFeedback(sessionId, correctPlayerName || "");

    if (!feedback) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    // Persist feedback to Firestore
    try {
      await addDoc(collection(db, "game_sessions"), feedback);
    } catch (firebaseError) {
      console.warn("Failed to persist feedback to Firestore:", firebaseError.message);
      // Continue despite Firebase failure - don't block user experience
    }

    return Response.json({ status: "finished", feedback });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
