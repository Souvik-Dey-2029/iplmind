import { calculateEntropy, normalizeProbabilities } from "./probabilityEngine.js";

const MIN_SPLIT = 0.12;
const TEAM_CATEGORY_LIMIT = 2;

const staticQuestions = [
  question("overseas", "origin", "Is this player an overseas player?", (p) => p.overseas),
  question("indian", "origin", "Is this player from India?", (p) => p.country === "India"),
  question("wicketkeeper", "role", "Is this player a wicketkeeper?", (p) => p.wicketKeeper || p.role === "wicket-keeper"),
  question("batsman", "role", "Is this player primarily a batter?", (p) => p.role === "batsman"),
  question("bowler", "role", "Is this player primarily a bowler?", (p) => p.role === "bowler"),
  question("allrounder", "role", "Is this player an all-rounder?", (p) => p.role === "all-rounder"),
  question("opener", "batting-role", "Is this player primarily an opener?", (p) => p.opener),
  question("middle-order", "batting-role", "Does this player usually bat in the middle order?", (p) => p.middleOrder),
  question("finisher", "batting-role", "Is this player known as a finisher?", (p) => p.finisher),
  question("power-hitter", "batting-style", "Is this player known for power hitting?", (p) => p.powerHitter || p.aggressive),
  question("anchor", "batting-style", "Is this player more of an anchor batter?", (p) => p.anchorBatter),
  question("left-handed", "batting-style", "Is this player left-handed?", (p) => p.leftHanded),
  question("spinner", "bowling-style", "Is this player a spinner?", (p) => p.spinner),
  question("pacer", "bowling-style", "Is this player a pace bowler?", (p) => p.pacer),
  question("death-bowler", "bowling-role", "Is this player known for bowling at the death?", (p) => p.deathBowler || p.famousForYorkers),
  question("captain", "leadership", "Has this player captained an IPL team?", (p) => p.captain),
  question("orange-cap", "achievement", "Has this player won an IPL Orange Cap?", (p) => p.orangeCap),
  question("purple-cap", "achievement", "Has this player won an IPL Purple Cap?", (p) => p.purpleCap),
  question("playoffs-hero", "achievement", "Is this player known for strong playoff performances?", (p) => p.playoffsHero),
  question("iconic", "profile", "Is this player considered an iconic IPL name?", (p) => p.iconic),
  question("active", "era", "Is this player active in recent IPL seasons?", (p) => p.active),
];

export function selectBestQuestion(candidates, probabilities, history = []) {
  const options = buildQuestionOptions(candidates);
  const scopedProbabilities = normalizeProbabilities(
    Object.fromEntries(candidates.map((player) => [player.name, probabilities[player.name] || 0]))
  );
  const askedIds = new Set(history.map((entry) => entry.questionId).filter(Boolean));
  const askedTexts = new Set(history.map((entry) => normalize(entry.question)));
  const categoryCounts = countCategories(history);
  const baseEntropy = calculateEntropy(scopedProbabilities);

  const ranked = options
    .filter((option) => !askedIds.has(option.id) && !askedTexts.has(normalize(option.text)))
    .map((option) => scoreQuestion(option, candidates, scopedProbabilities, baseEntropy, categoryCounts))
    .filter((option) => option.yesProbability >= MIN_SPLIT && option.noProbability >= MIN_SPLIT)
    .sort((a, b) => b.score - a.score);

  return ranked[0] || fallbackQuestion(candidates, history);
}

export function evaluateQuestionAnswer(candidates, questionMeta, answer) {
  const answerKind = normalizeAnswer(answer);
  if (answerKind === "neutral" || !questionMeta) return neutralScores(candidates, 0.55);

  const option = hydrateQuestion(questionMeta);
  if (!option) return null;

  const scores = {};
  candidates.forEach((player) => {
    const yes = option.predicate(player);
    const matches = answerKind === "yes" ? yes : !yes;
    scores[player.name] = matches ? 0.97 : 0.001;
  });

  return scores;
}

export function buildQuestionOptions(candidates) {
  const options = [...staticQuestions];
  const teams = unique(candidates.flatMap((player) => player.teams || []));
  const currentTeams = unique(candidates.map((player) => player.currentTeam).filter(Boolean));
  const countries = unique(candidates.map((player) => player.country).filter(Boolean));

  currentTeams.forEach((team) => {
    options.push(
      question(
        `current-team:${team}`,
        "current-team",
        `Is this player currently with ${team}?`,
        (player) => player.currentTeam === team,
        { value: team }
      )
    );
  });

  teams.forEach((team) => {
    options.push(
      question(
        `played-team:${team}`,
        "historical-team",
        `Has this player played for ${team}?`,
        (player) => player.teams.includes(team),
        { value: team }
      )
    );
  });

  countries
    .filter((country) => country !== "India")
    .forEach((country) => {
      options.push(
        question(
          `country:${country}`,
          "origin",
          `Is this player from ${country}?`,
          (player) => player.country === country,
          { value: country }
        )
      );
    });

  return options;
}

function scoreQuestion(option, candidates, probabilities, baseEntropy, categoryCounts) {
  let yesProbability = 0;
  const yesDistribution = {};
  const noDistribution = {};

  candidates.forEach((player) => {
    const probability = probabilities[player.name] || 0;
    if (option.predicate(player)) {
      yesProbability += probability;
      yesDistribution[player.name] = probability;
    } else {
      noDistribution[player.name] = probability;
    }
  });

  const noProbability = 1 - yesProbability;
  const yesEntropy = calculateEntropy(normalizeProbabilities(yesDistribution));
  const noEntropy = calculateEntropy(normalizeProbabilities(noDistribution));
  const expectedEntropy = yesProbability * yesEntropy + noProbability * noEntropy;
  const informationGain = baseEntropy - expectedEntropy;
  const balance = 1 - Math.abs(0.5 - yesProbability) * 2;
  const categoryPenalty = Math.pow(0.78, categoryCounts[option.category] || 0);
  const teamPenalty = option.category.includes("team")
    ? Math.pow(0.62, categoryCounts.currentTeamAndHistorical || 0)
    : 1;
  const lowInfoPenalty = yesProbability < 0.18 || noProbability < 0.18 ? 0.55 : 1;

  return {
    ...option,
    yesProbability,
    noProbability,
    informationGain,
    score: informationGain * (0.72 + balance * 0.28) * categoryPenalty * teamPenalty * lowInfoPenalty,
  };
}

function fallbackQuestion(candidates, history) {
  const fallback = staticQuestions.find(
    (option) => !history.some((entry) => entry.questionId === option.id)
  );
  return fallback || staticQuestions[0];
}

function hydrateQuestion(meta) {
  return buildQuestionOptions([]).find((option) => option.id === meta.id) || hydrateDynamicQuestion(meta);
}

function hydrateDynamicQuestion(meta) {
  if (meta.category === "current-team") {
    return question(meta.id, meta.category, meta.text, (player) => player.currentTeam === meta.value, {
      value: meta.value,
    });
  }

  if (meta.category === "historical-team") {
    return question(meta.id, meta.category, meta.text, (player) => player.teams.includes(meta.value), {
      value: meta.value,
    });
  }

  if (meta.category === "origin") {
    return question(meta.id, meta.category, meta.text, (player) => player.country === meta.value, {
      value: meta.value,
    });
  }

  return null;
}

function question(id, category, text, predicate, extra = {}) {
  return { id, category, text, predicate, ...extra };
}

function countCategories(history) {
  const counts = {};
  history.forEach((entry) => {
    if (!entry.category) return;
    counts[entry.category] = (counts[entry.category] || 0) + 1;
    if (entry.category.includes("team")) {
      counts.currentTeamAndHistorical = (counts.currentTeamAndHistorical || 0) + 1;
    }
  });
  return counts;
}

function neutralScores(candidates, score) {
  return Object.fromEntries(candidates.map((player) => [player.name, score]));
}

function normalizeAnswer(answer) {
  const normalized = normalize(answer);
  if (normalized === "yes") return "yes";
  if (normalized === "no") return "no";
  return "neutral";
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}
