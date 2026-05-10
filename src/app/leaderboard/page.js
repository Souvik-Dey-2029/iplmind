import LeaderboardClient from "@/components/LeaderboardClient";

export const metadata = {
  title: "Leaderboard | IPLMind",
  description: "Global AI Cricket Intelligence Leaderboard",
};

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white" data-theme="ipl">
      <LeaderboardClient />
    </div>
  );
}
