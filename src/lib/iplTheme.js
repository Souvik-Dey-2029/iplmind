/**
 * IPL Premium Theme & Styling System
 * Cricket-themed UI enhancements, animations, and visual polish
 */

// IPL Team Colors
export const IPL_TEAMS = {
    CSK: { name: "Chennai Super Kings", primary: "#FFD700", secondary: "#1e1e1e" },
    DC: { name: "Delhi Capitals", primary: "#003399", secondary: "#FF00FF" },
    GT: { name: "Gujarat Titans", primary: "#0099ff", secondary: "#ff6600" },
    KKR: { name: "Kolkata Knight Riders", primary: "#3399ff", secondary: "#FFD700" },
    LSG: { name: "Lucknow Super Giants", primary: "#00B4D8", secondary: "#FFB700" },
    MI: { name: "Mumbai Indians", primary: "#001F6E", secondary: "#1E90FF" },
    PBKS: { name: "Punjab Kings", primary: "#FF0000", secondary: "#FFFFFF" },
    RCB: { name: "Royal Challengers Bangalore", primary: "#FF0000", secondary: "#000000" },
    RR: { name: "Rajasthan Royals", primary: "#FF66FF", secondary: "#001F3F" },
    SRH: { name: "Sunrisers Hyderabad", primary: "#FF6600", secondary: "#000000" },
};

/**
 * Tailwind CSS animation classes for cricket theme
 */
export const ANIMATIONS = {
    // Pulse animations
    "animate-pulse-slow": "animate-pulse [animation-duration:3s]",
    "animate-pulse-fast": "animate-pulse [animation-duration:0.5s]",

    // Custom bouncing for cricket feel
    "animate-cricket-bounce":
        "animate-bounce [animation-duration:0.8s] [animation-iteration-count:infinite]",

    // Shimmer effect for confidence bars
    "animate-shimmer": `
    animate-pulse 
    [animation-duration:2s] 
    [animation-iteration-count:infinite]
  `,

    // Glow effect
    "animate-glow": `
    animate-pulse 
    [animation-duration:2s] 
    shadow-lg 
    shadow-cyan-500/50
  `,
};

/**
 * Glassmorphism effect for IPL premium look
 */
export const GLASS_STYLES = {
    container: "bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl shadow-2xl",
    card: "bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-lg border border-cyan-500/30 rounded-xl",
    accent: "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40",
};

/**
 * Cricket-themed gradient backgrounds
 */
export const GRADIENTS = {
    primary:
        "from-cyan-600 via-blue-600 to-purple-600",
    secondary:
        "from-orange-500 via-red-500 to-pink-500",
    success:
        "from-green-500 to-cyan-500",
    warning:
        "from-yellow-500 to-orange-500",
    neutral:
        "from-slate-600 to-slate-800",
};

/**
 * IPL-themed button styles
 */
export const BUTTON_STYLES = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all duration-300 active:scale-95",
    secondary: "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-cyan-500/30 text-cyan-300 font-semibold transition-all duration-300",
    success: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-green-500/50 transition-all",
    danger: "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-semibold shadow-lg shadow-red-500/50 transition-all",
};

/**
 * Cricket-themed stat display components
 */
export const STAT_COMPONENTS = {
    // Batting stats display
    battingCard: `
    bg-gradient-to-br from-orange-900/30 to-red-900/20 
    border border-orange-500/30 
    rounded-lg p-4
  `,

    // Bowling stats display
    bowlingCard: `
    bg-gradient-to-br from-green-900/30 to-emerald-900/20 
    border border-green-500/30 
    rounded-lg p-4
  `,

    // Leadership stats
    leadershipCard: `
    bg-gradient-to-br from-purple-900/30 to-blue-900/20 
    border border-purple-500/30 
    rounded-lg p-4
  `,
};

/**
 * Cricket emoji library for visual flair
 */
export const CRICKET_EMOJIS = {
    batting: "🏏",
    bowling: "🎳",
    fielding: "🧤",
    captain: "👑",
    runs: "🏃",
    wicket: "⚰️",
    boundary: "🏟️",
    century: "💯",
    fast: "⚡",
    slow: "🐢",
    match: "🎯",
    team: "👥",
    trophy: "🏆",
    flag: "🚩",
};

/**
 * Apply IPL theme to player card
 */
export function getIPLThemeForTeam(teamName) {
    const team = Object.entries(IPL_TEAMS).find(
        ([_, t]) => t.name.toLowerCase() === teamName.toLowerCase()
    );

    if (!team) {
        return {
            primary: "#06b6d4",
            secondary: "#001f3f",
        };
    }

    return {
        primary: team[1].primary,
        secondary: team[1].secondary,
    };
}

/**
 * Cricket-themed animations CSS
 */
export const CRICKET_CSS = `
  @keyframes cricket-bat-swing {
    0% { transform: rotate(-45deg); }
    50% { transform: rotate(0deg); }
    100% { transform: rotate(45deg); }
  }

  @keyframes ball-spin {
    0% { transform: rotateX(0deg); }
    100% { transform: rotateX(360deg); }
  }

  @keyframes stadium-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
    50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.6); }
  }

  .animate-bat-swing {
    animation: cricket-bat-swing 1.5s ease-in-out infinite;
  }

  .animate-ball-spin {
    animation: ball-spin 2s linear infinite;
  }

  .animate-stadium-glow {
    animation: stadium-glow 2s ease-in-out infinite;
  }
`;

/**
 * Get personality-themed accent color
 */
export function getPersonalityAccentColor(personality) {
    const colors = {
        analyst: "from-blue-500 to-cyan-500",
        commentator: "from-orange-500 to-red-500",
        meme: "from-pink-500 to-purple-500",
        "gen-z": "from-lime-400 to-pink-400",
    };

    return colors[personality] || colors.analyst;
}

/**
 * Get confidence color based on percentage
 */
export function getConfidenceColor(confidence) {
    if (confidence >= 80) return "from-green-500 to-emerald-500";
    if (confidence >= 65) return "from-cyan-500 to-blue-500";
    if (confidence >= 50) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
}

/**
 * Create neon text glow effect
 */
export function getNeonTextClass(color = "cyan") {
    return `
    text-${color}-400 
    drop-shadow-lg 
    drop-shadow-${color}-500/50
  `;
}
