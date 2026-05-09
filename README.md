# 🏏 IPLMind (IPL Genius)

IPLMind is an AI-powered, Akinator-style cricket player guessing game. Think of any IPL player — a legendary veteran, a rising star, or an obscure player from the past — and the AI will try to read your mind by asking a series of smart, adaptive questions.

## ✨ Features

- **Adaptive AI Questioning:** A sophisticated custom inference engine uses Bayesian probability and information gain to ask the most optimal questions, narrowing down candidates rapidly.
- **Smart Confidence Smoothing:** Utilizes an entropy-based confidence algorithm that prevents the AI from jumping to premature conclusions.
- **Resilient Gameplay Flow:** Includes a "continue after wrong guess" feature. If the AI guesses wrong, it excludes that player, adjusts its logic, and keeps asking questions.
- **Premium UI/UX:** Built with a beautiful, responsive, glass-morphism aesthetic featuring smooth Framer Motion animations and a dynamic mascot that reacts to the gameplay state.
- **Dual-Provider AI Fallback:** Powered primarily by Gemini, with an automatic, exponential backoff fallback to OpenRouter to ensure 100% uptime during gameplay.
- **Production-Ready Architecture:** Designed for unified or split deployment across Vercel (frontend) and Render (backend) with robust async locking and memory leak protections.

## 🛠️ Technology Stack

- **Frontend:** Next.js (App Router), React 19, Tailwind CSS v4, Framer Motion, Zustand
- **Backend:** Node.js, Next.js API Routes (Serverless & Standalone compatible)
- **AI Integration:** Gemini API, OpenRouter API
- **Data:** Comprehensive local JSON player database with fuzzy-matching normalizers

## 🚀 Getting Started

### Prerequisites

Ensure you have Node.js installed. You will also need API keys for the AI providers:
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY` (Optional, but recommended for fallback)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/The-Lazy-Four/IPLMind.git
   cd IPLMind
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   Create a `.env` file in the root directory and add your keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🌍 Deployment

IPLMind is hardened for both unified and split deployments.

**Unified Deployment (Vercel):**
Simply connect the repository to Vercel. Next.js will handle both the frontend and API routes automatically.

**Split Deployment (Render Backend + Vercel Frontend):**
1. Deploy the backend to Render using the included `render.yaml` blueprint.
2. Deploy the frontend to Vercel and set the `NEXT_PUBLIC_API_BASE_URL` environment variable to point to your Render service URL.

## 👥 The Team (The Lazy Four)

This project was built for the GDG Hackathon by:

- **Souvik Dey** – Full backend architecture, core game logic, Bayesian probability engine,UI Fixes, and AI integrations.
- **Partha Sarthi Sarkar** – Project structure, premium UI/UX design, and database Integration.
- **Snehasis Chakraborty** – QA testing, performance evaluation, and website runner.

---

*Built with ❤️ for cricket fans and AI enthusiasts.*
