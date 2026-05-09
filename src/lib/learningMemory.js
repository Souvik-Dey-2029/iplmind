import fs from "fs";
import path from "path";

const MEMORY_FILE = path.join(process.cwd(), "data", "learning_memory.json");

let memoryState = {
  playerPopularity: {}, // playerName -> count
  playerDifficulty: {}, // playerName -> count of times missed
  questionEffectiveness: {}, // questionId -> weight
  totalGames: 0
};

// Initialize memory on load
export function initLearningMemory() {
  try {
    if (!fs.existsSync(path.dirname(MEMORY_FILE))) {
      fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
    }
    
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, "utf-8");
      memoryState = { ...memoryState, ...JSON.parse(data) };
    } else {
      saveMemory();
    }
  } catch (error) {
    console.error("[learningMemory] Failed to init memory", error);
  }
}

function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryState, null, 2));
  } catch (error) {
    console.error("[learningMemory] Failed to save memory", error);
  }
}

/**
 * Record a successful game to boost player popularity.
 */
export function recordSuccess(playerName, questions) {
  memoryState.totalGames++;
  if (playerName) {
    memoryState.playerPopularity[playerName] = (memoryState.playerPopularity[playerName] || 0) + 1;
  }
  
  questions.forEach(q => {
    if (q.questionId && q.answer === "yes") {
      memoryState.questionEffectiveness[q.questionId] = (memoryState.questionEffectiveness[q.questionId] || 0) + 1;
    }
  });
  
  saveMemory();
}

/**
 * Record a failure or wrong guess to boost player difficulty visibility.
 */
export function recordFailure(correctPlayerName) {
  memoryState.totalGames++;
  if (correctPlayerName) {
    const normalizedName = correctPlayerName.toLowerCase().trim();
    memoryState.playerDifficulty[normalizedName] = (memoryState.playerDifficulty[normalizedName] || 0) + 1;
  }
  saveMemory();
}

/**
 * Get prior probability boosts for players based on community play patterns.
 * Popular players get a slight prior boost. Difficult players get an exposure boost.
 */
export function getPlayerPriors(players) {
  const priors = {};
  const total = memoryState.totalGames || 1;
  
  players.forEach(p => {
    const name = p.name;
    const normalized = name.toLowerCase().trim();
    
    const popularityScore = (memoryState.playerPopularity[name] || 0) / total;
    const difficultyScore = (memoryState.playerDifficulty[normalized] || 0) / total;
    
    // Base prior is 1.0. Popularity adds up to 0.5. Difficulty adds up to 0.8.
    priors[name] = 1.0 + (popularityScore * 0.5) + (difficultyScore * 0.8);
  });
  
  return priors;
}

/**
 * Get dynamic boosts for questions that are proven effective.
 */
export function getQuestionBoost(questionId) {
  const total = memoryState.totalGames || 1;
  const effectiveness = (memoryState.questionEffectiveness[questionId] || 0) / total;
  // Boost by up to 15% for highly effective historical questions
  return 1.0 + Math.min(0.15, effectiveness);
}

// Call init immediately in Node environments
if (typeof window === "undefined") {
  initLearningMemory();
}
