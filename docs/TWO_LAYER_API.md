/**
 * TWO-LAYER AI API SYSTEM - Setup & Usage Guide
 * 
 * This file documents the new dual-provider AI system that provides
 * automatic fallback from Gemini to OpenRouter for maximum reliability.
 */

// ==============================================================================
// OVERVIEW
// ==============================================================================

/*
  The IPLMind AI system now uses a two-layer architecture:
  
  LAYER 1: Gemini (Primary)
  - Fast response times
  - Cost-effective for high volume
  - Reliable for most operations
  - Used by default for all AI operations
  
  LAYER 2: OpenRouter (Fallback)
  - Reliable backup provider
  - Activates only when Gemini fails
  - Adds resilience to the system
  - Different rate limits and quotas
  
  Benefits:
  ✅ Higher reliability - Game never fails due to single provider
  ✅ Cost optimization - Primary provider handles most traffic
  ✅ Graceful degradation - Seamless fallback without user impact
  ✅ Load distribution - Can spread traffic across providers
  ✅ Provider independence - Not locked to single vendor
*/

// ==============================================================================
// SETUP INSTRUCTIONS
// ==============================================================================

/*
  STEP 1: Get API Keys
  
  Gemini API:
  1. Go to https://ai.google.dev/
  2. Click "Get API key"
  3. Select or create a Google Cloud project
  4. Generate API key
  5. Copy the key
  
  OpenRouter API:
  1. Go to https://openrouter.ai
  2. Sign up or log in
  3. Go to Settings → API Keys
  4. Create new API key
  5. Copy the key
  
  STEP 2: Configure Environment Variables
  
  In .env.local (create if not exists):
  
  GEMINI_API_KEY=your_gemini_key_here
  OPENROUTER_API_KEY=your_openrouter_key_here
  
  STEP 3: Restart Development Server
  
  npm run dev
  
  STEP 4: Verify Setup
  
  curl http://localhost:3000/api/system/health
  
  Expected response:
  {
    "status": "ok",
    "aiProviders": {
      "gemini": {
        "available": true,
        "successes": 0,
        "failures": 0,
        "successRate": 0,
        "total": 0
      },
      "openRouter": {
        "available": true,
        "successes": 0,
        "failures": 0,
        "successRate": 0,
        "total": 0
      },
      "fallbackCount": 0
    }
  }
*/

// ==============================================================================
// ARCHITECTURE
// ==============================================================================

/*
  File Structure:
  
  src/lib/aiProvider.js
  └─ withFallback(operation, prompt, batchInfo)
     ├─ Try: callGemini(prompt)
     └─ Catch: callOpenRouter(prompt)
  
  Functions Provided:
  
  1. evaluateCandidates(candidates, question, answer)
     - Evaluates each candidate against question+answer
     - Returns confidence scores (0.0 to 1.0)
     - Processes in batches of 50 candidates
     - Fallback: neutral scores (0.5) if both providers fail
     - Used by: sessionManager.processAnswer()
  
  2. generateGuessExplanation(player, previousQA)
     - Creates AI explanation for why player was guessed
     - Returns brief 1-2 sentence explanation
     - Fallback: template-based explanation if both providers fail
     - Used by: sessionManager.processAnswer()
  
  3. getProviderStatus()
     - Returns metrics on both providers
     - Success/failure counts
     - Success rates
     - Fallback count
     - Used by: /api/system/health endpoint
  
  4. resetProviderMetrics()
     - Clears all metrics
     - Used for testing/monitoring
*/

// ==============================================================================
// USAGE EXAMPLES
// ==============================================================================

/*
  Example 1: Evaluate Candidates (called internally)
  
  import { evaluateCandidates } from "@/lib/aiProvider";
  
  const candidates = [...]; // Array of players
  const question = "Is the player a right-hand batter?";
  const answer = "Yes";
  
  const scores = await evaluateCandidates(candidates, question, answer);
  // Returns: { "Virat Kohli": 0.9, "MS Dhoni": 0.8, ... }
  
  
  Example 2: Generate Explanation (called internally)
  
  import { generateGuessExplanation } from "@/lib/aiProvider";
  
  const player = { name: "Virat Kohli", ... };
  const history = [
    { question: "Q1", answer: "Yes" },
    { question: "Q2", answer: "No" }
  ];
  
  const explanation = await generateGuessExplanation(player, history);
  // Returns: "Virat Kohli is a right-hand batter and plays for RCB..."
  
  
  Example 3: Check Provider Status
  
  import { getProviderStatus } from "@/lib/aiProvider";
  
  const status = getProviderStatus();
  console.log(status);
  // Returns:
  // {
  //   "gemini": { available: true, successes: 45, failures: 2, successRate: 95.7, total: 47 },
  //   "openRouter": { available: true, successes: 2, failures: 0, successRate: 100, total: 2 },
  //   "fallbackCount": 2
  // }
*/

// ==============================================================================
// FALLBACK BEHAVIOR
// ==============================================================================

/*
  When Gemini Fails:
  
  1. Error is logged: "Gemini failed, trying OpenRouter: [error message]"
  2. Fallback counter incremented
  3. OpenRouter is called with same prompt
  4. If OpenRouter succeeds: Response is returned transparently
  5. If OpenRouter fails: Combined error is logged and thrown
  
  Example Flow:
  
  Request arrives for evaluateCandidates()
    ↓
  Gemini API call fails (timeout, quota, etc)
    ↓
  Log warning: "Gemini failed, trying OpenRouter: Quota exceeded"
    ↓
  OpenRouter API call starts
    ↓
  OpenRouter responds with scores
    ↓
  Response returned to caller (transparently)
    ↓
  Metrics updated: gemini failures++, openrouter successes++, fallbacks++
  
  User never sees the failure - game continues normally.
*/

// ==============================================================================
// MONITORING & HEALTH CHECKS
// ==============================================================================

/*
  Health Check Endpoint:
  
  GET /api/system/health
  
  Returns:
  {
    "status": "ok",
    "timestamp": "2026-05-09T10:30:00Z",
    "aiProviders": {
      "gemini": {
        "available": true,
        "successes": 245,
        "failures": 3,
        "successRate": 98.79,
        "total": 248
      },
      "openRouter": {
        "available": true,
        "successes": 3,
        "failures": 0,
        "successRate": 100,
        "total": 3
      },
      "fallbackCount": 3
    },
    "notes": {
      "gemini": "Primary provider - 98.8% success rate",
      "openRouter": "Fallback provider - 100.0% success rate",
      "fallbacks": "3 fallback(s) from Gemini to OpenRouter"
    }
  }
  
  Interpretation:
  - successRate > 95%: System healthy
  - 90-95%: Monitor for issues
  - < 90%: Investigate failures
  - fallbackCount > 5%: Consider provider issues
*/

// ==============================================================================
// TROUBLESHOOTING
// ==============================================================================

/*
  Issue: "Both AI providers failed"
  
  Cause: Both Gemini and OpenRouter are unavailable or misconfigured
  Solution:
  1. Check .env.local has both API keys
  2. Verify keys are correct (copy from provider dashboards)
  3. Check provider quotas and rate limits
  4. Test endpoints manually:
     - Gemini: Use Google AI Studio
     - OpenRouter: Use OpenRouter API playground
  
  
  Issue: Fallback count is very high (> 20%)
  
  Cause: Gemini experiencing frequent failures
  Solution:
  1. Check Gemini API quotas in Google Cloud console
  2. Review API logs for error patterns
  3. Check if rate limits are being exceeded
  4. Consider increasing Gemini quota
  5. Verify prompt size (may exceed token limits)
  
  
  Issue: Health endpoint shows "not available" for a provider
  
  Cause: API key not configured in .env.local
  Solution:
  1. Get API key from provider
  2. Add to .env.local
  3. Restart dev server: npm run dev
  4. Check health endpoint again
  
  
  Issue: Response times are slow
  
  Cause: OpenRouter fallback being used frequently (slower provider)
  Solution:
  1. Check Gemini status using /api/system/health
  2. If Gemini failure rate high, investigate issues
  3. Contact Google Cloud support if quota issues
  4. Consider upgrading Gemini tier
  5. Monitor network latency to providers
*/

// ==============================================================================
// COST OPTIMIZATION
// ==============================================================================

/*
  Gemini Pricing:
  - Generally cheaper than other providers
  - Free tier available for development
  - Pay-as-you-go for production
  - See: https://ai.google.dev/pricing
  
  OpenRouter Pricing:
  - Marketplace pricing from various models
  - Pay for each API call
  - Different models have different rates
  - Used as fallback only
  - See: https://openrouter.ai/pricing
  
  Cost Optimization Tips:
  1. Keep Gemini as primary (cheaper)
  2. Cache common prompts (if both providers support)
  3. Monitor fallback rate (high fallback = higher costs)
  4. Batch requests when possible
  5. Use appropriate model size (flash > pro for speed/cost)
  
  Expected Monthly Cost (100 games/day):
  - Gemini primary: ~$10-30 (estimates only)
  - OpenRouter fallback: ~$5-10 (rarely used)
  - Total: ~$15-40/month
  
  (Actual cost depends on prompt sizes and provider pricing)
*/

// ==============================================================================
// PRODUCTION DEPLOYMENT
// ==============================================================================

/*
  Environment Variables:
  
  Vercel/Production Deployment:
  1. Go to project settings
  2. Add environment variables:
     - GEMINI_API_KEY
     - OPENROUTER_API_KEY
  3. Redeploy
  
  Docker/Self-hosted:
  1. Set env vars in docker-compose.yml or .env
  2. Rebuild container
  3. Test health endpoint after restart
  
  Monitoring:
  1. Set up health check: curl /api/system/health
  2. Alert if fallback count > threshold
  3. Alert if success rate < 95%
  4. Log provider metrics to analytics service
  5. Monitor API response times
  
  Load Balancing:
  Future enhancement: Could distribute traffic across providers
  - Example: 90% Gemini, 10% OpenRouter (for real-world testing)
  - Would require provider selection logic in aiProvider.js
*/

// ==============================================================================
// FUTURE ENHANCEMENTS
// ==============================================================================

/*
  Potential Improvements:
  
  1. Provider Selection Strategy
     - Current: Sequential (Gemini first, then OpenRouter)
     - Future: Random selection, weighted round-robin, etc.
  
  2. Additional Providers
     - Claude (Anthropic via OpenRouter)
     - Mistral
     - LLaMA variants
  
  3. Caching Layer
     - Cache common Q&A evaluations
     - Reduce API calls
     - Faster responses
  
  4. Load Testing
     - Simulate heavy traffic
     - Verify fallback behavior under load
  
  5. Cost Tracking
     - Track API costs per provider
     - Generate monthly cost reports
  
  6. Advanced Metrics
     - Response time histograms
     - Error categorization
     - Provider comparison analysis
*/

// ==============================================================================
// INTEGRATION POINTS
// ==============================================================================

/*
  Where aiProvider.js is used:
  
  1. src/lib/sessionManager.js
     import { evaluateCandidates, generateGuessExplanation } from "./aiProvider"
     - Line 17: Import
     - Line 133: evaluateCandidates() call in processAnswer()
     - Line 154: generateGuessExplanation() call in processAnswer()
  
  2. src/app/api/system/health/route.js
     import { getProviderStatus } from "@/lib/aiProvider"
     - Line 6: Import
     - Line 13: getProviderStatus() call
  
  Migration from old system:
  - OLD: import { evaluateCandidates } from "./gemini"
  - NEW: import { evaluateCandidates } from "./aiProvider"
  
  The interface is identical - drop-in replacement.
*/

// ==============================================================================
