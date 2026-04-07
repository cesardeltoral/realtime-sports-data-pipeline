interface MatchHeaderProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  matchDate: string;
  competitionStage: string;
  stadium: string;
}

export default function MatchHeader({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchDate,
  competitionStage,
  stadium,
}: MatchHeaderProps) {
  return (
    <div className="rounded-xl bg-zinc-900 p-6 text-white">
      <div className="mb-2 text-center text-sm text-zinc-400">
        UEFA Champions League — {competitionStage}
      </div>
      <div className="flex items-center justify-center gap-8">
        <div className="flex-1 text-right">
          <div className="text-xl font-bold">{homeTeam}</div>
        </div>
        <div className="text-4xl font-bold tabular-nums">
          {homeScore} — {awayScore}
        </div>
        <div className="flex-1 text-left">
          <div className="text-xl font-bold">{awayTeam}</div>
        </div>
      </div>
      <div className="mt-2 text-center text-sm text-zinc-400">
        {matchDate} — {stadium}
      </div>
    </div>
  );
}
