import { createSession, getFirstQuestion } from "@/lib/sessionManager";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = createSession();
    const question = await getFirstQuestion(session.id);

    return Response.json({
      sessionId: session.id,
      question,
      questionNumber: 1,
      maxQuestions: session.maxQuestions,
      candidatesRemaining: session.candidates.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
