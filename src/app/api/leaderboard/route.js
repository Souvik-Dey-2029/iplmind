import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { logError } from "@/lib/logger";
import { players } from "@/data/players";
import { getSemanticDifficulty } from "@/lib/semanticInference";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Prevent Next.js from caching the leaderboard

export async function GET() {
  try {
    if (!db) {
      return Response.json({ error: "Database not configured" }, { status: 500 });
    }

    // Parallel fetch for different leaderboard categories
    const [fastestGuessesSnapshot, aiDefeatsSnapshot, recentWinsSnapshot, globalStatsDoc] = await Promise.all([
      // 1. Fastest Guesses (fewest questions asked to win)
      getDocs(query(
        collection(db, "game_sessions"),
        where("wasCorrect", "==", true),
        orderBy("questionsAsked", "asc"),
        limit(10)
      )),
      // 2. AI Defeats (Longest games where AI failed)
      getDocs(query(
        collection(db, "game_sessions"),
        where("failed", "==", true),
        orderBy("questionsAsked", "desc"),
        limit(10)
      )),
      // 3. Recent rare/epic wins
      getDocs(query(
        collection(db, "game_sessions"),
        where("wasCorrect", "==", true),
        orderBy("timestamp", "desc"),
        limit(10)
      )),
      // 4. Global Stats
      getDoc(doc(db, "learning_memory", "global_state"))
    ]);

    // Format Data
    const fastestGuesses = fastestGuessesSnapshot.docs.map(doc => {
      const data = doc.data();
      const player = findPlayer(data.guessedPlayer);
      const semanticDifficulty = data.semanticDifficulty || getSemanticDifficulty(player, data.questionsAsked || 0);
      return {
        id: doc.id,
        player: data.guessedPlayer || "Unknown",
        questions: data.questionsAsked || 0,
        score: Math.max(10, Math.round((120 - (data.questionsAsked || 0) * 5) * semanticDifficulty)),
        rarity: data.rarity || player?.obscurityProfile?.rarity || "",
        semanticDifficulty,
        timestamp: data.timestamp || Date.now(),
      };
    });

    const aiDefeats = aiDefeatsSnapshot.docs.map(doc => {
      const data = doc.data();
      const player = findPlayer(data.correctPlayer);
      const semanticDifficulty = data.semanticDifficulty || getSemanticDifficulty(player, data.questionsAsked || 0);
      return {
        id: doc.id,
        player: data.correctPlayer || "Unknown",
        questions: data.questionsAsked || 0,
        difficultyScore: Math.min(Math.round((data.questionsAsked || 0) * 10 * semanticDifficulty), 350),
        rarity: data.rarity || player?.obscurityProfile?.rarity || "",
        semanticDifficulty,
        timestamp: data.timestamp || Date.now(),
      };
    });

    const globalStats = globalStatsDoc.exists() ? globalStatsDoc.data() : {
      totalGames: 0,
      totalSuccesses: 0,
      totalFailures: 0
    };

    return Response.json({
      fastestGuesses,
      aiDefeats,
      recentWins: recentWinsSnapshot.docs.map(doc => {
        const data = doc.data();
        const player = findPlayer(data.guessedPlayer);
        return {
          id: doc.id,
          player: data.guessedPlayer || "Unknown",
          questions: data.questionsAsked || 0,
          rarity: data.rarity || player?.obscurityProfile?.rarity || "",
          semanticDifficulty: data.semanticDifficulty || getSemanticDifficulty(player, data.questionsAsked || 0),
          timestamp: data.timestamp || Date.now(),
        };
      }),
      globalStats: {
        totalGames: globalStats.totalGames || 0,
        aiWinRate: globalStats.totalGames > 0 
          ? Math.round(((globalStats.totalSuccesses || 0) / globalStats.totalGames) * 100) 
          : 0,
        mostDifficultPlayers: Object.entries(globalStats.playerDifficulty || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, misses]) => ({ name, misses }))
      }
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

  } catch (error) {
    logError("api/leaderboard", "Failed to fetch leaderboard", error);
    return Response.json({ error: "Failed to fetch leaderboard data" }, { status: 500 });
  }
}

function findPlayer(name = "") {
  const key = String(name || "").toLowerCase().trim();
  return players.find((player) => player.name.toLowerCase() === key) || null;
}
