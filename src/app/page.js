"use client";

import { useState } from "react";
import GameClient from "@/components/GameClient";
import IPLMindHome from "@/components/IPLMindHome";

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return <GameClient onBackToHome={() => setIsPlaying(false)} />;
  }

  return <IPLMindHome onStartGame={() => setIsPlaying(true)} />;
}
