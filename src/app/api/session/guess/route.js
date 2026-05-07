import { getSession } from "@/lib/sessionManager";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  return Response.json({
    status: session.status,
    guess: session.guess,
    questionNumber: session.questionNumber,
    candidatesRemaining: session.candidates.length,
  });
}
