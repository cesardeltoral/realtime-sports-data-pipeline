interface MatchStatsProps {
  stats: {
    totalEvents: number;
    shots: number;
    passes: number;
    fouls: number;
    goals: number;
  };
}

export default function MatchStats({ stats }: MatchStatsProps) {
  const items = [
    { label: "Total Events", value: stats.totalEvents },
    { label: "Goals", value: stats.goals },
    { label: "Shots", value: stats.shots },
    { label: "Passes", value: stats.passes },
    { label: "Fouls", value: stats.fouls },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg bg-zinc-100 p-4 text-center dark:bg-zinc-800"
        >
          <div className="text-2xl font-bold tabular-nums">{item.value}</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
