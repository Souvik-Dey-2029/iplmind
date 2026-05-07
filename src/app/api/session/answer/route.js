import { processAnswer } from "@/lib/sessionManager";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { sessionId, answer } = await request.json();

    if (!sessionId || !answer) {
      return Response.json(
        { error: "sessionId and answer are required" },
        { status: 400 }
      );
    }

    return Response.json(await processAnswer(sessionId, answer));
  } catch (error) {
    const status = error.message === "Session not found" ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }
}
