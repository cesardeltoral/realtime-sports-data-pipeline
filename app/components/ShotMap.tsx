"use client";

import { useState } from "react";

interface Shot {
  player: string;
  team: string;
  minute: number;
  location: { x: number; y: number };
  details: {
    shot_outcome?: string;
    shot_statsbomb_xg?: number;
    shot_body_part?: string;
  };
}

interface ShotMapProps {
  shots: Shot[];
  homeTeam: string;
  awayTeam: string;
}

/**
 * StatsBomb pitch: 120x80 yards.
 * We render the attacking half (x: 60-120, y: 0-80) since most shots happen there.
 * SVG viewBox maps to this coordinate space.
 */
export default function ShotMap({ shots, homeTeam, awayTeam }: ShotMapProps) {
  const [activeShot, setActiveShot] = useState<Shot | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? shots
    : shots.filter((s) => s.team === filter);

  return (
    <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Shot Map</h2>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 ${filter === "all" ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter(homeTeam)}
            className={`rounded-md px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 ${filter === homeTeam ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            {homeTeam}
          </button>
          <button
            onClick={() => setFilter(awayTeam)}
            className={`rounded-md px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 ${filter === awayTeam ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            {awayTeam}
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox="60 0 60 80"
          className="w-full rounded-lg bg-green-800"
          style={{ aspectRatio: "60/80" }}
        >
          {/* Pitch lines */}
          <rect x="60" y="0" width="60" height="80" fill="none" stroke="white" strokeWidth="0.3" />
          {/* Penalty area */}
          <rect x="102" y="18" width="18" height="44" fill="none" stroke="white" strokeWidth="0.3" />
          {/* 6-yard box */}
          <rect x="114" y="30" width="6" height="20" fill="none" stroke="white" strokeWidth="0.3" />
          {/* Goal */}
          <rect x="120" y="36" width="1.5" height="8" fill="none" stroke="white" strokeWidth="0.4" />
          {/* Penalty spot */}
          <circle cx="108" cy="40" r="0.4" fill="white" />
          {/* Center line */}
          <line x1="60" y1="0" x2="60" y2="80" stroke="white" strokeWidth="0.3" strokeDasharray="1,1" />

          {/* Shots */}
          {filtered.map((shot, i) => {
            const isGoal = shot.details.shot_outcome === "Goal";
            const xg = shot.details.shot_statsbomb_xg ?? 0;
            const radius = 0.8 + xg * 2;

            return (
              <circle
                key={`${shot.player}-${shot.minute}-${shot.location.x}-${shot.location.y}`}
                cx={shot.location.x}
                cy={shot.location.y}
                r={radius}
                fill={isGoal ? "#22c55e" : shot.team === homeTeam ? "#ef4444" : "#3b82f6"}
                fillOpacity={0.8}
                stroke="white"
                strokeWidth={isGoal ? 0.4 : 0.2}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                className="cursor-pointer transition-all duration-150 hover:scale-150 hover:fill-opacity-100"
                onMouseEnter={() => setActiveShot(shot)}
                onMouseLeave={() => setActiveShot(null)}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {activeShot && (
          <div className="absolute bottom-2 left-2 rounded-lg bg-black/80 px-3 py-2 text-sm text-white">
            <div className="font-semibold">{activeShot.player}</div>
            <div className="text-zinc-300">
              {activeShot.minute}&apos; — {activeShot.details.shot_outcome} ({activeShot.details.shot_body_part})
            </div>
            {activeShot.details.shot_statsbomb_xg != null && (
              <div className="text-zinc-400">
                xG: {activeShot.details.shot_statsbomb_xg.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Goal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> {homeTeam}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> {awayTeam}
        </span>
        <span className="ml-auto">Circle size = xG</span>
      </div>
    </div>
  );
}
