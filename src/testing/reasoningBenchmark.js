import fs from "node:fs";
import { players } from "../data/players.js";
import {
  initializeProbabilities,
  updateProbabilities,
  calculateEntropy,
  getTopCandidate,
  getRankedPlayers,
  getViableCandidates,
  shouldGuess
} from "../lib/probabilityEngine.js";
import { generateQuestion, evaluateCandidates } from "../lib/gemini.js";

const TEST_CATEGORIES = {
  "EASY": ["Virat Kohli", "MS Dhoni", "Rohit Sharma"],
  "MEDIUM": ["Ruturaj Gaikwad", "Yuzvendra Chahal", "Bhuvneshwar Kumar"],
  "HARD": ["Jacob Bethell", "Tilak Varma", "Nehal Wadhera"],
  "SIMILAR_CLUSTERS": [
    { target: "Shubman Gill", decoy: "Ruturaj Gaikwad" },
    { target: "Ravindra Jadeja", decoy: "Axar Patel" },
    { target: "Andre Russell", decoy: "Kieron Pollard" },
    { target: "Sanju Samson", decoy: "Jitesh Sharma" }
  ],
  "OBSCURE": ["Ramandeep Singh", "Prerak Mankad"]
};

/**
 * Automates the answering process for a target player.
 * Uses Gemini to evaluate the question against the target player.
 */
async function autoAnswer(question, targetPlayerName) {
  const targetPlayer = players.find(p => p.name === targetPlayerName);
  if (!targetPlayer) throw new Error(`Target player ${targetPlayerName} not found in dataset.`);

  // Test "yes" and "no" strictly against the target player to see which yields a better match score.
  const evalYes = await evaluateCandidates([targetPlayer], question, "yes");
  const valueYes = evalYes[targetPlayer.name] || 0.5;

  if (valueYes >= 0.7) return "yes";
  if (valueYes <= 0.3) return "no";
  return "maybe";
}

/**
 * Run a full game simulation for a specific target player.
 */
export async function runSimulation(targetPlayerName) {
  console.log(`\n==================================================`);
  console.log(`▶ STARTING SIMULATION FOR: ${targetPlayerName}`);
  console.log(`==================================================\n`);

  let probabilities = initializeProbabilities(players);
  let candidates = [...players];
  let previousQA = [];
  let entropyLog = [];
  let step = 1;

  while (step <= 10) {
    const entropy = calculateEntropy(probabilities);
    entropyLog.push(entropy);

    console.log(`[Step ${step}] Candidates: ${candidates.length} | Entropy: ${entropy.toFixed(3)}`);
    
    // Generate Question
    const question = await generateQuestion(candidates, previousQA, step);
    console.log(`  Q: ${question}`);

    // Auto-answer based on target player truth
    const answer = await autoAnswer(question, targetPlayerName);
    console.log(`  A: ${answer}`);

    previousQA.push({ question, answer });

    // Evaluate all active candidates against this Q/A
    const matchScores = await evaluateCandidates(candidates, question, answer);

    // Update Probabilities
    probabilities = updateProbabilities(probabilities, matchScores);

    // Detect Contradiction / Collapse
    const maxProb = Math.max(...Object.values(probabilities));
    if (maxProb < 0.05 && step > 3) {
      console.log(`  [!] WARNING: Pool collapsed (contradiction detected). Softening penalties...`);
      // Contradiction recovery: apply a softer update or partially reset
      for(let p of Object.keys(probabilities)) {
          probabilities[p] = Math.sqrt(probabilities[p]); // Soften the curve
      }
    }

    candidates = getViableCandidates(players, probabilities);
    
    // Log Top 3
    const ranked = getRankedPlayers(probabilities);
    console.log(`  Top: 1. ${ranked[0].name} (${(ranked[0].probability*100).toFixed(1)}%) | 2. ${ranked[1]?.name} (${(ranked[1]?.probability*100).toFixed(1)}%) | 3. ${ranked[2]?.name} (${(ranked[2]?.probability*100).toFixed(1)}%)`);

    // Check Win Condition
    if (shouldGuess(probabilities, 75, 3)) {
      const top = getTopCandidate(probabilities);
      console.log(`\n🎯 AI CHOSE TO GUESS: ${top.name} with ${top.confidence.toFixed(1)}% confidence.`);
      console.log(`✅ Success: ${top.name === targetPlayerName}`);
      return { steps: step, success: top.name === targetPlayerName, finalEntropy: calculateEntropy(probabilities) };
    }

    step++;
  }

  console.log(`\n❌ AI FAILED TO GUESS WITHIN 10 STEPS.`);
  return { steps: 10, success: false, finalEntropy: calculateEntropy(probabilities) };
}

/**
 * Execute the Benchmark Suite
 */
async function runBenchmark() {
  const results = [];
  
  console.log("🚀 INITIALIZING REASONING BENCHMARK SUITE");

  for (const category of ["EASY", "MEDIUM", "HARD"]) {
    console.log(`\n=== RUNNING CATEGORY: ${category} ===`);
    for (const playerName of TEST_CATEGORIES[category]) {
      try {
        const res = await runSimulation(playerName);
        results.push({ category, player: playerName, ...res });
      } catch (e) {
        console.error(`Error simulating ${playerName}:`, e);
      }
    }
  }

  console.log("\n==================================================");
  console.log("📊 BENCHMARK RESULTS SUMMARY");
  console.log("==================================================");
  console.table(results);
}

// Run if executed directly
if (process.argv[1] && process.argv[1].endsWith('reasoningBenchmark.js')) {
    runBenchmark();
}
