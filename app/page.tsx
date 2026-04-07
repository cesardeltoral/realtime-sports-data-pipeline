import { graphqlFetch } from "./lib/graphql";
import Dashboard from "./components/Dashboard";
import type { Match, Shot } from "./types";

export default async function Home() {
  let matches: Match[] = [];
  let shotsByMatch: Record<number, Shot[]> = {};
  let error: string | null = null;

  try {
    const data = await graphqlFetch<{ matches: Match[] }>(`{
      matches {
        id matchDate competitionStage stadium
        homeTeam { name } awayTeam { name }
        homeScore awayScore
        stats { totalEvents shots passes fouls goals }
      }
    }`);
    matches = data.matches;

    // Fetch shots for each match in parallel
    const shotResults = await Promise.all(
      matches.map((m) =>
        graphqlFetch<{ shotMap: Shot[] }>(`{
          shotMap(matchId: ${m.id}) {
            player team minute
            location { x y }
            details
          }
        }`)
      )
    );

    for (let i = 0; i < matches.length; i++) {
      shotsByMatch[matches[i].id] = shotResults[i].shotMap;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch data";
  }

  if (error || !matches.length) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans">
        <div className="max-w-md rounded-xl bg-zinc-100 p-8 text-center dark:bg-zinc-800">
          <h1 className="mb-2 text-xl font-bold">API Unavailable</h1>
          <p className="mb-4 text-sm text-zinc-500">
            Make sure the API server is running on port 4000 and the databases have data.
          </p>
          <code className="text-xs text-zinc-400">
            {error ?? "No match data found"}
          </code>
          <div className="mt-4 text-left text-xs text-zinc-500">
            <p className="font-semibold">To get started:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>cd infra && docker compose up -d</li>
              <li>cd services/api && npm start</li>
              <li>cd services/producer && python3 producer.py</li>
              <li>cd services/consumer && npm start</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 text-center">
          <h1 className="text-sm font-medium tracking-widest text-zinc-400 uppercase">
            Real-Time Sports Data Pipeline
          </h1>
        </header>

        <Dashboard matches={matches} shotsByMatch={shotsByMatch} />
      </div>
    </div>
  );
}
