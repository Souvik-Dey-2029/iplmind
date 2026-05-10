/**
 * IPLMind Inference Benchmark — Automated Stress-Test System
 * Simulates full inference sessions for every player and measures accuracy.
 * Run: node scripts/benchmark.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const players = JSON.parse(readFileSync(join(__dirname, "..", "src", "data", "players.json"), "utf8"));

// ─── Lightweight reimplementation of core inference (no Next.js deps) ───

const staticQuestions = [
  { id: "batsman", cat: "role", pred: p => p.role?.includes("bat") || p.batsman },
  { id: "bowler", cat: "role", pred: p => p.role?.includes("bowl") || p.bowler },
  { id: "allrounder", cat: "role", pred: p => p.role?.includes("all") || p.allrounder },
  { id: "wicketkeeper", cat: "role", pred: p => p.role?.includes("keeper") || p.wicketKeeper },
  { id: "overseas", cat: "origin", pred: p => p.overseas === true },
  { id: "indian", cat: "origin", pred: p => p.country === "India" },
  { id: "spinner", cat: "bowl", pred: p => p.spinner === true },
  { id: "pacer", cat: "bowl", pred: p => p.pacer === true },
  { id: "opener", cat: "bat-role", pred: p => p.opener === true },
  { id: "middle-order", cat: "bat-role", pred: p => p.middleOrder === true },
  { id: "finisher", cat: "bat-role", pred: p => p.finisher === true },
  { id: "power-hitter", cat: "bat-style", pred: p => p.powerHitter === true },
  { id: "anchor", cat: "bat-style", pred: p => p.anchorBatter === true },
  { id: "left-handed", cat: "bat-style", pred: p => p.leftHanded === true },
  { id: "captain", cat: "leadership", pred: p => p.captain === true },
  { id: "active", cat: "era", pred: p => p.active === true },
  { id: "iconic", cat: "profile", pred: p => p.iconic === true },
  { id: "founding-era", cat: "era", pred: p => p.era === "founding-era" },
  { id: "orange-cap", cat: "achievement", pred: p => p.orangeCap === true },
  { id: "purple-cap", cat: "achievement", pred: p => p.purpleCap === true },
];

function buildDynamicQuestions(candidates) {
  const qs = [];
  const teams = new Set(), countries = new Set();
  candidates.forEach(p => {
    if (p.currentTeam) teams.add(p.currentTeam);
    if (p.country && p.country !== "India") countries.add(p.country);
    (p.teams || []).forEach(t => teams.add(t));
  });
  teams.forEach(t => qs.push({ id: `current-team:${t}`, cat: "team", pred: p => p.currentTeam === t }));
  teams.forEach(t => qs.push({ id: `played-team:${t}`, cat: "franchise", pred: p => (p.teams||[]).includes(t) }));
  countries.forEach(c => qs.push({ id: `country:${c}`, cat: "country", pred: p => p.country === c }));

  // Semantic tags
  const tagCounts = new Map();
  candidates.forEach(p => {
    [...(p.dnaTags||[]), ...(p.semanticVector||[]), ...(p.tacticalTags||[])].forEach(t => {
      const k = t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (k.length >= 4) tagCounts.set(k, (tagCounts.get(k)||0) + 1);
    });
  });
  const total = Math.max(candidates.length, 1);
  [...tagCounts.entries()]
    .filter(([,c]) => c/total >= 0.10 && c/total <= 0.90)
    .sort((a,b) => Math.abs(0.5 - b[1]/total) - Math.abs(0.5 - a[1]/total))
    .slice(0, 20)
    .forEach(([tag]) => {
      qs.push({ id: `semantic:${tag}`, cat: "semantic", pred: p =>
        [...(p.dnaTags||[]), ...(p.semanticVector||[]), ...(p.tacticalTags||[])]
          .some(t => t.toLowerCase().replace(/[^a-z0-9]+/g,"-") === tag)
      });
    });
  return qs;
}

function entropy(probs) {
  let h = 0;
  for (const v of Object.values(probs)) if (v > 0) h -= v * Math.log2(v);
  return h;
}

function normalize(probs) {
  const sum = Object.values(probs).reduce((a,b) => a+b, 0);
  if (!sum) return probs;
  const out = {};
  for (const k in probs) out[k] = probs[k] / sum;
  return out;
}

function selectBestQ(candidates, probs, asked, allQs) {
  const scopedProbs = normalize(Object.fromEntries(candidates.map(p => [p.name, probs[p.name]||0])));
  const baseH = entropy(scopedProbs);
  let best = null, bestScore = -1;

  for (const q of allQs) {
    if (asked.has(q.id)) continue;
    let yesP = 0;
    const yesDist = {}, noDist = {};
    candidates.forEach(p => {
      const prob = scopedProbs[p.name] || 0;
      if (q.pred(p)) { yesP += prob; yesDist[p.name] = prob; }
      else noDist[p.name] = prob;
    });
    const noP = 1 - yesP;
    if (yesP < 0.08 || noP < 0.08) continue;
    const ig = baseH - (yesP * entropy(normalize(yesDist)) + noP * entropy(normalize(noDist)));
    const balance = 1 - Math.abs(0.5 - yesP) * 2;
    const score = ig * (0.7 + balance * 0.3);
    if (score > bestScore) { bestScore = score; best = q; }
  }
  return best;
}

// ─── Simulation Engine ───

function simulateGame(target, allPlayers, maxQ = 25) {
  let candidates = [...allPlayers];
  let probs = {};
  const rarity = target.obscurityProfile?.rarity || target.rarity || "rare";
  const rarityMult = { common: 0.88, uncommon: 0.94, rare: 1.0, epic: 1.08, legendary: 1.14, "legendary-obscure": 1.18, forgotten: 1.16, niche: 1.10 }[rarity] || 1;
  let totalPrior = 0;
  allPlayers.forEach(p => {
    const r = p.obscurityProfile?.rarity || p.rarity || "rare";
    const m = { common: 0.88, uncommon: 0.94, rare: 1.0, epic: 1.08, legendary: 1.14, "legendary-obscure": 1.18, forgotten: 1.16, niche: 1.10 }[r] || 1;
    totalPrior += m;
  });
  allPlayers.forEach(p => {
    const r = p.obscurityProfile?.rarity || p.rarity || "rare";
    const m = { common: 0.88, uncommon: 0.94, rare: 1.0, epic: 1.08, legendary: 1.14, "legendary-obscure": 1.18, forgotten: 1.16, niche: 1.10 }[r] || 1;
    probs[p.name] = m / totalPrior;
  });

  const asked = new Set();
  const history = [];
  const entropyTrace = [entropy(probs)];
  const allQs = [...staticQuestions, ...buildDynamicQuestions(allPlayers)];

  for (let q = 0; q < maxQ; q++) {
    const question = selectBestQ(candidates, probs, asked, allQs);
    if (!question) break;
    asked.add(question.id);

    // Oracle answers truthfully
    const answer = question.pred(target) ? "yes" : "no";
    history.push({ id: question.id, answer, cat: question.cat });

    // Update probabilities
    const scores = {};
    candidates.forEach(p => {
      const matches = question.pred(p);
      const correct = answer === "yes" ? matches : !matches;
      scores[p.name] = correct ? 0.95 : 0.05;
    });
    const updated = {};
    let total = 0;
    for (const name in probs) {
      const lk = scores[name] ?? 0.5;
      updated[name] = probs[name] * Math.max(lk, 0.0005);
      total += updated[name];
    }
    if (total > 0) for (const k in updated) updated[k] /= total;
    probs = updated;

    // Prune candidates
    const ranked = Object.entries(probs).sort((a,b) => b[1] - a[1]);
    const topProb = ranked[0]?.[1] || 0;
    const isLongTail = ["epic","legendary","legendary-obscure","forgotten","niche"].includes(
      allPlayers.find(p => p.name === ranked[0]?.[0])?.rarity
    );
    const minR = isLongTail ? 0.02 : 0.05;
    candidates = candidates.filter(p => (probs[p.name]||0) >= topProb * minR && (probs[p.name]||0) > 0.0001);

    entropyTrace.push(entropy(probs));

    // Check guess condition
    if (q >= 5 && ranked.length >= 2) {
      const sep = (ranked[0][1] - ranked[1][1]) / ranked[0][1];
      const relConf = ranked[0][1] / ranked[1][1];
      if (sep >= 0.35 && relConf >= 3.0) {
        const guessName = ranked[0][0];
        return {
          success: guessName === target.name,
          guessedPlayer: guessName,
          questionsAsked: q + 1,
          entropyTrace,
          history,
          finalRank: ranked.findIndex(([n]) => n === target.name) + 1,
          candidatesRemaining: candidates.length,
          topProb: ranked[0][1],
        };
      }
    }
  }

  // Final guess = top ranked
  const ranked = Object.entries(probs).sort((a,b) => b[1] - a[1]);
  return {
    success: ranked[0]?.[0] === target.name,
    guessedPlayer: ranked[0]?.[0],
    questionsAsked: maxQ,
    entropyTrace,
    history,
    finalRank: ranked.findIndex(([n]) => n === target.name) + 1,
    candidatesRemaining: candidates.length,
    topProb: ranked[0]?.[1] || 0,
  };
}

// ─── Run Full Benchmark ───

console.log(`\n🏏 IPLMind Inference Benchmark`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Players: ${players.length}\n`);

const results = [];
const failures = [];
const confusionMap = {};
const rarityStats = {};
const questionUsage = {};
let totalQuestions = 0;

for (let i = 0; i < players.length; i++) {
  const target = players[i];
  const result = simulateGame(target, players);
  results.push({ player: target.name, rarity: target.rarity || target.obscurityProfile?.rarity || "rare", ...result });

  if (!result.success) {
    failures.push({ target: target.name, guessed: result.guessedPlayer, questions: result.questionsAsked, rank: result.finalRank });
    const key = [result.guessedPlayer, target.name].sort().join(" ↔ ");
    confusionMap[key] = (confusionMap[key] || 0) + 1;
  }

  totalQuestions += result.questionsAsked;
  result.history.forEach(h => { questionUsage[h.id] = (questionUsage[h.id] || 0) + 1; });

  const r = target.rarity || target.obscurityProfile?.rarity || "rare";
  if (!rarityStats[r]) rarityStats[r] = { total: 0, success: 0, avgQ: 0, qSum: 0 };
  rarityStats[r].total++;
  if (result.success) rarityStats[r].success++;
  rarityStats[r].qSum += result.questionsAsked;

  if ((i+1) % 50 === 0) process.stdout.write(`  Simulated ${i+1}/${players.length}...\r`);
}

// ─── Analysis ───

const successes = results.filter(r => r.success).length;
const accuracy = (successes / results.length * 100).toFixed(1);
const avgQ = (totalQuestions / results.length).toFixed(1);

console.log(`\n\n📊 OVERALL RESULTS`);
console.log(`━━━━━━━━━━━━━━━━━━`);
console.log(`Accuracy:          ${accuracy}% (${successes}/${results.length})`);
console.log(`Avg Questions:     ${avgQ}`);
console.log(`Total Failures:    ${failures.length}`);

console.log(`\n📊 ACCURACY BY RARITY`);
console.log(`━━━━━━━━━━━━━━━━━━━━━`);
for (const [r, s] of Object.entries(rarityStats).sort((a,b) => b[1].total - a[1].total)) {
  const acc = (s.success / s.total * 100).toFixed(1);
  const avgQR = (s.qSum / s.total).toFixed(1);
  console.log(`  ${r.padEnd(20)} ${acc}% (${s.success}/${s.total})  avg ${avgQR}q`);
}

// Famous player bias detection
const famousPlayers = ["MS Dhoni", "Virat Kohli", "Chris Gayle", "AB de Villiers", "Rohit Sharma", "Jasprit Bumrah"];
const famousOverguess = {};
failures.forEach(f => {
  if (famousPlayers.includes(f.guessed)) {
    famousOverguess[f.guessed] = (famousOverguess[f.guessed] || 0) + 1;
  }
});
if (Object.keys(famousOverguess).length) {
  console.log(`\n⚠️  FAMOUS PLAYER OVERGUESS`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  for (const [name, count] of Object.entries(famousOverguess).sort((a,b) => b[1] - a[1])) {
    console.log(`  ${name}: wrongly guessed ${count} times`);
  }
}

// Top confusion clusters
const sortedConfusion = Object.entries(confusionMap).sort((a,b) => b[1] - a[1]).slice(0, 15);
if (sortedConfusion.length) {
  console.log(`\n🔥 TOP CONFUSION CLUSTERS`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
  sortedConfusion.forEach(([pair, count]) => console.log(`  ${pair}: ${count}x`));
}

// Unreachable players (never correctly guessed AND rank > 10)
const unreachable = results.filter(r => !r.success && r.finalRank > 10);
if (unreachable.length) {
  console.log(`\n🚫 UNREACHABLE PLAYERS (rank > 10 at end)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  unreachable.slice(0, 20).forEach(r => console.log(`  ${r.player} → rank #${r.finalRank} (guessed: ${r.guessedPlayer})`));
}

// Question quality
const qSorted = Object.entries(questionUsage).sort((a,b) => b[1] - a[1]);
console.log(`\n📋 QUESTION USAGE (top 15)`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
qSorted.slice(0, 15).forEach(([id, count]) => console.log(`  ${id.padEnd(35)} used ${count}x`));

// Entropy efficiency
const avgEntropyDrop = results.map(r => {
  if (r.entropyTrace.length < 2) return 0;
  return (r.entropyTrace[0] - r.entropyTrace[r.entropyTrace.length - 1]) / r.questionsAsked;
}).reduce((a,b) => a+b, 0) / results.length;
console.log(`\n⚡ ENTROPY EFFICIENCY`);
console.log(`━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Avg entropy drop/question: ${avgEntropyDrop.toFixed(3)} bits`);

// Confidence calibration
const confBuckets = { "q5-8": { correct: 0, total: 0 }, "q9-12": { correct: 0, total: 0 }, "q13-16": { correct: 0, total: 0 }, "q17+": { correct: 0, total: 0 } };
results.forEach(r => {
  const q = r.questionsAsked;
  const bucket = q <= 8 ? "q5-8" : q <= 12 ? "q9-12" : q <= 16 ? "q13-16" : "q17+";
  confBuckets[bucket].total++;
  if (r.success) confBuckets[bucket].correct++;
});
console.log(`\n🎯 ACCURACY BY QUESTION COUNT`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
for (const [bucket, s] of Object.entries(confBuckets)) {
  if (s.total === 0) continue;
  console.log(`  ${bucket.padEnd(10)} ${(s.correct/s.total*100).toFixed(1)}% (${s.correct}/${s.total})`);
}

// Write full report to file
const report = {
  timestamp: new Date().toISOString(),
  totalPlayers: players.length,
  accuracy: parseFloat(accuracy),
  avgQuestions: parseFloat(avgQ),
  rarityBreakdown: Object.fromEntries(Object.entries(rarityStats).map(([r,s]) => [r, { accuracy: parseFloat((s.success/s.total*100).toFixed(1)), total: s.total, avgQuestions: parseFloat((s.qSum/s.total).toFixed(1)) }])),
  famousPlayerOverguess: famousOverguess,
  topConfusionClusters: sortedConfusion.slice(0, 10).map(([pair, count]) => ({ pair, count })),
  unreachablePlayers: unreachable.map(r => ({ name: r.player, rank: r.finalRank, guessed: r.guessedPlayer })),
  failures: failures.map(f => ({ target: f.target, guessed: f.guessed, questions: f.questions, rank: f.rank })),
  entropyEfficiency: parseFloat(avgEntropyDrop.toFixed(3)),
};
writeFileSync(join(__dirname, "benchmark-report.json"), JSON.stringify(report, null, 2));
console.log(`\n✅ Full report saved to scripts/benchmark-report.json`);
console.log(`\n🏏 Benchmark complete.\n`);
