import { confirmGuess, recordFeedback } from "@/lib/sessionManager";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { sessionId, wasCorrect, correctPlayerName } = await request.json();

    if (!sessionId) {
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const feedback = wasCorrect
      ? confirmGuess(sessionId)
      : recordFeedback(sessionId, correctPlayerName || "Unknown");

    if (!feedback) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json({ status: "finished", feedback });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
