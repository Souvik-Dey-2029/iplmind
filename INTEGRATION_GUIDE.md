/**
 * INTEGRATION GUIDE - IPLMind Premium Features
 * 
 * This guide shows exactly how to integrate all Phase 1-4 infrastructure
 * into GameClient.js without breaking existing functionality.
 */

// ============================================================================
// STEP 1: ADD IMPORTS AT TOP OF GameClient.js
// ============================================================================

import { useMemo, useState } from "react";

// Phase 1: AI Intelligence
import { generateReasoningFactors, rankQuestionsByGain } from "@/lib/reasoningEngine";
import { PERSONALITY_MODES, applyPersonality } from "@/lib/personalityModes";

// Phase 2: Visualization & Interaction
import ConfidenceLeaderboard from "@/components/ConfidenceLeaderboard";
import AIThinkingStage from "@/components/AIThinkingStage";
import GuessExplanationCard from "@/components/GuessExplanationCard";

// Phase 3: Features
import VoiceInputButton from "@/components/VoiceInputButton";
import PostGameSummary from "@/components/PostGameSummary";
import SettingsPanel from "@/components/SettingsPanel";

// Phase 3: Multi-language & Voice
import { LANGUAGES, getText } from "@/lib/i18n";
import { isVoiceSupported } from "@/lib/voiceInteraction";

// Phase 4: Premium Theme
import { getIPLThemeForTeam, getConfidenceColor } from "@/lib/iplTheme";

// ============================================================================
// STEP 2: ADD STATE VARIABLES IN GameClient() FUNCTION
// ============================================================================

// Add these new state variables alongside existing ones:

  // Phase 2: AI Thinking simulation
  const [showThinkingStage, setShowThinkingStage] = useState(false);

  // Phase 3: Language & Personality
  const [language, setLanguage] = useState(LANGUAGES.ENGLISH);
  const [personalityMode, setPersonalityMode] = useState("analyst");
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Phase 3: Game stats for post-game summary
  const [gameStats, setGameStats] = useState({
    questionsAsked: 0,
    startTime: null,
    answers: [],
  });

  // Phase 4: Show explanation card
  const [showExplanation, setShowExplanation] = useState(false);
  const [reasoningData, setReasoningData] = useState(null);

// ============================================================================
// STEP 3: ENHANCE startGame() FUNCTION
// ============================================================================

async function startGame() {
  setLoading(true);
  setError("");
  setGuess(null);
  setFinishedMessage("");
  setCorrectPlayer("");
  setShowThinkingStage(false);  // ADD THIS
  setShowExplanation(false);    // ADD THIS
  
  // ADD THIS: Initialize game stats
  setGameStats({
    questionsAsked: 0,
    startTime: Date.now(),
    answers: [],
  });

  try {
    const response = await fetch("/api/session/start", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not start game");

    setSessionId(data.sessionId);
    setQuestion(data.question);
    setQuestionNumber(data.questionNumber);
    setCandidatesRemaining(data.candidatesRemaining);
    setAdaptiveQuestionLimit(data.adaptiveQuestionLimit || 12);
    setConfidence(0);
    setDebugReasoningPanel(null);
    setTopCandidates([]);
    setPhase("playing");
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

// ============================================================================
// STEP 4: ENHANCE answerQuestion() FUNCTION
// ============================================================================

async function answerQuestion(answer) {
  if (!sessionId) return;

  setLoading(true);
  setError("");
  
  // ADD THIS: Show thinking stage animation
  setShowThinkingStage(true);
  
  // ADD THIS: Track game stats
  setGameStats(prev => ({
    ...prev,
    questionsAsked: prev.questionsAsked + 1,
    answers: [...prev.answers, answer],
  }));

  try {
    const response = await fetch("/api/session/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answer }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not submit answer");

    setQuestionNumber(data.questionNumber);
    setCandidatesRemaining(data.candidatesRemaining);
    setConfidence(data.confidence ?? data.guess?.confidence ?? 0);
    setAdaptiveQuestionLimit(data.adaptiveQuestionLimit || adaptiveQuestionLimit);
    setDebugReasoningPanel(data.debugReasoningPanel ?? null);

    if (data.status === "guessing") {
      setGuess(data.guess);
      
      // ADD THIS: Generate reasoning factors and show explanation card
      if (data.guess && topCandidates.length > 0) {
        const reasoning = generateReasoningFactors(
          data.guess.player,
          topCandidates,
          gameStats.answers,
          topCandidates.map(c => c.probability)
        );
        setReasoningData(reasoning);
        setShowExplanation(true);
      }
      
      // Hide thinking stage before showing guess
      setShowThinkingStage(false);
      setPhase("guessing");
      return;
    }

    setQuestion(data.question);
    setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
    
    // Hide thinking stage after getting question
    setShowThinkingStage(false);
  } catch (err) {
    setError(err.message);
    setShowThinkingStage(false);
  } finally {
    setLoading(false);
  }
}

// ============================================================================
// STEP 5: ENHANCE sendFeedback() FUNCTION
// ============================================================================

async function sendFeedback(wasCorrect) {
  if (!sessionId) return;

  setLoading(true);
  setError("");

  try {
    const response = await fetch("/api/session/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        wasCorrect,
        correctPlayerName: correctPlayer,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save feedback");

    setPhase("finished");
    setFinishedMessage(
      wasCorrect
        ? "Called it. The cricket brain is warm."
        : "Noted. I logged the correction for this round."
    );
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

// ============================================================================
// STEP 6: ADD HANDLER FOR LANGUAGE/PERSONALITY CHANGES
// ============================================================================

function handleLanguageChange(newLanguage) {
  setLanguage(newLanguage);
  // Optionally refresh UI strings
  setShowSettingsPanel(false);
}

function handlePersonalityChange(newPersonality) {
  setPersonalityMode(newPersonality);
  setShowSettingsPanel(false);
}

// ============================================================================
// STEP 7: ADD HANDLER FOR VOICE ANSWERS (optional)
// ============================================================================

function handleVoiceAnswer(answer) {
  // answer is already normalized: "Yes", "No", "Maybe", "Don't Know"
  answerQuestion(answer);
}

// ============================================================================
// STEP 8: UPDATE JSX LAYOUT - ADD SETTINGS BUTTON TO HEADER
// ============================================================================

// In the JSX section where the game title is rendered, add settings button:

<div className="space-y-7">
  {/* Existing IPLMind header */}
  <div className="inline-flex items-center justify-between w-full gap-3">
    <div className="inline-flex items-center gap-3 rounded-full border border-[#15211f]/15 bg-white/60 px-4 py-2 text-sm font-semibold backdrop-blur">
      <span className="h-2.5 w-2.5 rounded-full bg-[#eb6334]" />
      IPLMind
    </div>
    {/* ADD THIS: Settings button */}
    <button
      onClick={() => setShowSettingsPanel(true)}
      className="px-3 py-2 rounded-full bg-white/60 backdrop-blur border border-[#15211f]/15 hover:border-[#eb6334] transition"
      title="Settings"
    >
      ⚙️
    </button>
  </div>
  {/* Rest of title section */}
</div>

// ============================================================================
// STEP 9: UPDATE JSX - ADD COMPONENTS TO PLAYING PHASE
// ============================================================================

// Replace the existing "playing" phase section with:

{phase === "playing" && (
  <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold uppercase text-[#eb6334]">
          Question {questionNumber}
        </p>
        <p className="text-sm text-[#63706d]">
          {candidatesRemaining} candidates still alive
        </p>
      </div>
      <div className="h-2 w-44 overflow-hidden rounded-full bg-[#d8ddd4]">
        <div
          className="h-full rounded-full bg-[#00735e] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>

    <div className="rounded-md bg-[#15211f] p-6 text-white">
      <p className="text-2xl font-black leading-tight sm:text-3xl">
        {question}
      </p>
    </div>

    {/* ADD THIS: Confidence Leaderboard - Live top 5 candidates */}
    {topCandidates.length > 0 && (
      <div className="mt-4">
        <ConfidenceLeaderboard
          probabilities={topCandidates.reduce((acc, c) => {
            acc[c.name || c.id] = c.probability;
            return acc;
          }, {})}
          candidates={topCandidates}
          topCandidate={topCandidates[0]}
          animate={true}
        />
      </div>
    )}

    <div className="grid gap-3 sm:grid-cols-2">
      {answerOptions.map((answer) => (
        <button
          key={answer}
          className="h-14 rounded-md border border-[#15211f]/15 bg-white px-4 text-base font-bold transition hover:border-[#00735e] hover:bg-[#e8f0df] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={() => answerQuestion(answer)}
        >
          {answer}
        </button>
      ))}
    </div>

    {/* ADD THIS: Voice input button (if supported) */}
    {isVoiceSupported() && (
      <VoiceInputButton
        onAnswer={handleVoiceAnswer}
        language={language}
        disabled={loading}
      />
    )}

    {topCandidates.length > 0 && (
      <div className="rounded-md bg-[#f3f0e6] p-4">
        <p className="text-sm font-bold text-[#34433f]">
          Current read
        </p>
        <div className="mt-3 grid gap-2">
          {topCandidates.map((candidate) => (
            <div
              key={candidate.id || candidate.name}
              className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
            >
              <span>{displayName(candidate)}</span>
              <span className="font-bold text-[#00735e]">
                {(candidate.probability * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

// ============================================================================
// STEP 10: UPDATE JSX - ENHANCE GUESSING PHASE
// ============================================================================

// Replace the existing "guessing" phase section with:

{phase === "guessing" && guess && (
  <div className="space-y-6">
    {/* ADD THIS: AI Thinking Stage overlay */}
    <AIThinkingStage
      isVisible={showThinkingStage}
      personalityMode={personalityMode}
      onComplete={() => setShowThinkingStage(false)}
      totalDuration={2000}
    />

    {/* ADD THIS: Guess Explanation Card */}
    <GuessExplanationCard
      playerName={guess.player.name}
      topFactors={reasoningData?.topFactors || []}
      confidence={guess.confidence}
      explanations={reasoningData?.explanations || {}}
      personalityGuessPhrase={guess.explanation}
      isVisible={showExplanation}
    />

    <p className="text-sm font-bold uppercase text-[#eb6334]">
      My guess
    </p>
    <div className="rounded-md bg-[#15211f] p-6 text-white">
      <p className="text-4xl font-black">{guess.player.name}</p>
      <p className="mt-2 text-white/75">
        {guessFacts(guess).join(" | ")}
      </p>
      <p className="mt-5 text-lg leading-7">{cleanText(guess.explanation)}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        className="h-13 rounded-md bg-[#00735e] px-5 font-bold text-white transition hover:bg-[#095f50]"
        disabled={loading}
        onClick={() => sendFeedback(true)}
      >
        Correct
      </button>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-[#15211f]/15 bg-white px-3 outline-none focus:border-[#eb6334]"
          placeholder="Who was it?"
          value={correctPlayer}
          onChange={(event) => setCorrectPlayer(event.target.value)}
        />
        <button
          className="h-13 rounded-md border border-[#15211f]/15 bg-white px-5 font-bold transition hover:bg-[#f3f0e6]"
          disabled={loading}
          onClick={() => sendFeedback(false)}
        >
          Missed
        </button>
      </div>
    </div>
  </div>
)}

// ============================================================================
// STEP 11: UPDATE JSX - ENHANCE FINISHED PHASE
// ============================================================================

// Replace the existing "finished" phase section with:

{phase === "finished" && (
  <>
    {/* ADD THIS: Post-Game Summary */}
    <PostGameSummary
      guessedPlayer={guess?.player || {}}
      correctPlayer={{}}
      gameStats={gameStats}
      summary={{
        questionsAsked: gameStats.questionsAsked,
        efficiency: Math.round((confidence / gameStats.questionsAsked) * 100),
        reasoningPath: gameStats.answers,
      }}
      isVisible={true}
    />

    {/* Existing finished panel */}
    <div className="grid min-h-[390px] place-items-center rounded-md bg-[#15211f] p-8 text-center text-white">
      <div>
        <CricketMark />
        <h2 className="mt-6 text-3xl font-black">Round complete</h2>
        <p className="mt-3 text-white/75">{finishedMessage}</p>
        <button
          className="mt-7 h-13 rounded-md bg-[#eb6334] px-7 font-bold text-white transition hover:bg-[#d85429]"
          disabled={loading}
          onClick={startGame}
        >
          Play again
        </button>
      </div>
    </div>
  </>
)}

// ============================================================================
// STEP 12: ADD SETTINGS PANEL AT BOTTOM OF JSX (before closing main)
// ============================================================================

{/* ADD THIS: Settings Panel */}
<SettingsPanel
  currentLanguage={language}
  currentPersonality={personalityMode}
  onLanguageChange={handleLanguageChange}
  onPersonalityChange={handlePersonalityChange}
  isOpen={showSettingsPanel}
  onClose={() => setShowSettingsPanel(false)}
/>

// ============================================================================
// STEP 13: INTEGRATE WITH BACKEND ENDPOINTS (Optional)
// ============================================================================

// In /api/session/answer endpoint, add:
// 1. Call reasoningEngine when status === 'guessing':

import { generateReasoningFactors } from "@/lib/reasoningEngine";

if (status === 'guessing' && guess) {
  const reasoning = generateReasoningFactors(
    guess.player,
    topCandidates,
    sessionData.questionHistory,
    topCandidates.map(c => c.probability)
  );
  
  response.reasoningFactors = reasoning.topFactors;
  response.explanations = reasoning.explanations;
}

// 2. Apply personality mode before returning response:

import { applyPersonality } from "@/lib/personalityModes";

if (guess && personalityMode) {
  response = applyPersonality(response, personalityMode);
}

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

// Before deploying:
// [ ] Test normal gameplay without voice/multi-language
// [ ] Test confidence leaderboard updates
// [ ] Test AI thinking stage animation
// [ ] Test guess explanation card display
// [ ] Test settings panel language switching
// [ ] Test settings panel personality switching
// [ ] Test voice input (if browser supports)
// [ ] Test post-game summary display
// [ ] Test ESLint passes
// [ ] Test build: npm run build
// [ ] Mobile responsive test

// ============================================================================
