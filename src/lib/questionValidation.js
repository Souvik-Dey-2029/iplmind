/**
 * Question Validation Pipeline
 * Enforces simplicity, word limits, and complexity scoring.
 */

export function validateQuestion(questionText) {
  if (!questionText) return false;

  const score = questionComplexityScore(questionText);
  
  // Hard reject overly complex questions
  if (score > 10) return false;

  const wordCount = questionText.split(/\s+/).length;
  if (wordCount > 16) return false;

  return true;
}

export function questionComplexityScore(questionText) {
  let score = 0;
  const text = questionText.toLowerCase();

  // Penalize long questions
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 12) score += (wordCount - 12) * 1;

  // Penalize controversy/drama
  const dramaWords = ["controversy", "dropped", "midway", "drama", "fight", "banned", "scandal", "argue"];
  if (dramaWords.some(w => text.includes(w))) score += 10;

  // Penalize multiple clauses
  if (text.includes(" and ") || text.includes(" or ") || text.includes(" but ")) {
    score += 5;
  }

  // Penalize highly specific timeline constraints
  if (text.includes("season") && text.includes("midway")) score += 5;
  
  return score;
}
