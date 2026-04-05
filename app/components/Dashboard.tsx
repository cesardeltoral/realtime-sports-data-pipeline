"use client";

import { useState } from "react";
import MatchHeader from "./MatchHeader";
import MatchStats from "./MatchStats";
import ShotMap from "./ShotMap";
import LiveFeed from "./LiveFeed";
import type { Match, Shot } from "../types";

interface DashboardProps {
  matches: Match[];
  shotsByMatch: Record<number, Shot[]>;
}

export default function Dashboard({ matches, shotsByMatch }: DashboardProps) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0].id);

  const match = matches.find((m) => m.id === selectedMatchId) ?? matches[0];
  const shots = shotsByMatch[match.id] ?? [];

  return (
    <div className="space-y-6">
      {matches.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMatchId(m.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                m.id === selectedMatchId
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
              }`}
            >
              {m.homeTeam.name} vs {m.awayTeam.name} ({m.homeScore}-{m.awayScore})
            </button>
          ))}
        </div>
      )}

      <MatchHeader
        homeTeam={match.homeTeam.name}
        awayTeam={match.awayTeam.name}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        matchDate={match.matchDate}
        competitionStage={match.competitionStage}
        stadium={match.stadium}
      />

      <MatchStats stats={match.stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ShotMap
          shots={shots}
          homeTeam={match.homeTeam.name}
          awayTeam={match.awayTeam.name}
        />
        <LiveFeed />
      </div>
    </div>
  );
}
