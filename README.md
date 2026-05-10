<div align="center">
  <h1>🏏 IPLMind (IPL Genius)</h1>
  <p><strong>The Ultimate AI that reads your mind using 15 years of legendary IPL stats, hidden patterns, and adaptive intelligence.</strong></p>
  <p><i>Built for the GDG Hackathon by The Lazy Four</i></p>
</div>

---

## ⚡ The Pitch
Ever played Akinator and thought, *"I wish there was a version just for cricket that actually understood the game?"* 

**IPLMind** is an AI-powered, mind-reading cricket game. Think of ANY player from the Indian Premier League—from iconic legends to obscure one-season wonders—and our sophisticated inference engine will ask adaptive, highly-contextual questions to guess exactly who you are thinking of. 

It doesn't just guess; it **learns, adapts, and evolves** globally with every game played.

## 🧠 How It Works (The Magic)
This isn't just a simple wrapper around ChatGPT. We engineered a **Custom Deterministic + Probabilistic Engine** tailored specifically for IPL data:

- **Hybrid Reasoning Engine:** Starts with a lightning-fast deterministic Bayesian probability engine to aggressively slice the candidate pool using information gain and entropy calculations.
- **Semantic Constraint Engine:** Automatically infers facts from your answers. If you confirm "Yes" to "Is he an Indian batter?", the AI instantly blocks contradictory questions about overseas players or bowlers. No dumb questions!
- **Adaptive AI Questioning:** When the candidate pool gets small, it seamlessly hands over to Google Gemini to generate hyper-specific, non-template questions to differentiate obscure players.
- **Global Autonomous Learning:** Connected to Firebase Firestore. Every time the AI is stumped, it triggers a background auto-enrichment pipeline via Gemini to learn missing metadata about the player, making the global brain smarter for everyone!

## 🚀 Key Features
* 🔮 **Authentic Akinator Experience:** Uses confidence smoothing (max 97% confidence) and context-aware commentary (*"A captain! That narrows it significantly ⚡"*) for a genuinely immersive and human-like feel.
* 🎬 **Premium Cinematic UI:** Built with Framer Motion, featuring pseudo-3D floating trophies, stadium light beams, and glassmorphism. It feels like a live, high-end sports broadcast.
* 🔄 **Resilient Gameplay Flow:** The AI gets up to 3 guess attempts. If it guesses wrong, it dynamically excludes that player, adjusts probabilities on the fly, and keeps interrogating!
* 📊 **Live Leaderboard & Difficulty Scoring:** Real metrics from actual sessions. Guessing Virat Kohli earns a lower score than successfully stumping the AI with an obscure player.

## 🛠️ The Tech Stack
* **Frontend:** Next.js (App Router), React 19, Tailwind CSS, Framer Motion
* **Backend:** Node.js, Next.js Serverless API Routes
* **AI Intelligence:** Google Gemini API (Primary Adaptive Engine) & OpenRouter (Fallback)
* **Database & Memory:** Firebase Admin SDK (Firestore) for persistent global learning and telemetry

## 🚧 Challenges We Overcame
1. **The "Dumb AI" Contradiction Problem:** Generic LLMs often ask contradictory questions (e.g., asking if a player is from Australia after you already confirmed they are Indian). We solved this by building our own **Semantic Constraint Engine** that maps mutually exclusive traits and strictly filters candidate questions.
2. **Performance vs Visuals:** We wanted a "Wow" cinematic 3D effect without the heavy load of Three.js. We achieved a 60fps premium aesthetic purely using layered SVGs, CSS gradients, and hardware-accelerated Framer Motion transforms.
3. **Handling Obscure Players:** Standard deterministic questions fail on players with identical basic stats. Our handoff to Gemini for **Adaptive AI Questioning** combined with gradient probability scoring solved this beautifully.

## 💻 Running Locally

### Prerequisites
* Node.js installed
* API Keys: `GEMINI_API_KEY`
* Firebase Credentials (for the learning engine): `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

### Quick Start
```bash
# Clone the repository
git clone https://github.com/The-Lazy-Four/IPLMind.git
cd IPLMind

# Install dependencies
npm install

# Add your .env file with the required keys
# Run the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the magic.

## 👥 Meet 'The Lazy Four'
* **Souvik Dey** – Full backend architecture, core game logic, Bayesian probability engine, AI integrations, and Player Database Enhancement.
* **Partha Sarthi Sarkar** – Project structure, premium UI/UX design, and database integration.
* **Snehasis Chakraborty** – QA testing, performance evaluation, and website runner.


---
<div align="center">
  <b>Built with ❤️, ☕, and a love for Cricket</b>
</div>
