import { undoLastAnswer } from "@/lib/sessionManager";
import { logError, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/session/undo
 * Restores the exact previous engine state by popping the latest snapshot.
 */
export async function POST(request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      logWarn("session/undo", "Missing sessionId");
      return Response.json({ error: "sessionId is required" }, { status: 400 });
    }

    const result = undoLastAnswer(sessionId);

    if (!result.canUndo) {
      return Response.json(
        { error: result.error || "Nothing to undo", canUndo: false },
        { status: 400 }
      );
    }

    return Response.json(result);
  } catch (error) {
    const status = error.message === "Session not found" ? 404 : 500;
    logError("session/undo", "Failed to undo", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status }
    );
  }
}
