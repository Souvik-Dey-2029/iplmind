"use client";

import { useState } from "react";
import GameClient from "@/components/GameClient";
import IPLMindHome from "@/components/IPLMindHome";
import IPLStadiumHome from "@/components/IPLStadiumHome";
import IPLStadiumGameClient from "@/components/IPLStadiumGameClient";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { theme } = useTheme();

  if (isPlaying) {
    if (theme === "ipl") {
      return <IPLStadiumGameClient onBackToHome={() => setIsPlaying(false)} />;
    }
    return <GameClient onBackToHome={() => setIsPlaying(false)} />;
  }

  if (theme === "ipl") {
    return <IPLStadiumHome onStartGame={() => setIsPlaying(true)} />;
  }

  return <IPLMindHome onStartGame={() => setIsPlaying(true)} />;
}
