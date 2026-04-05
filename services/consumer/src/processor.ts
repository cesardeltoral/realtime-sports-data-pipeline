import { prisma } from "./db/mysql.js";
import { MatchEvent } from "./models/event.model.js";
import type { StatsBombEvent, Location2D } from "./types.js";
import { isMetadataEvent, isStartingXIEvent } from "./types.js";

/**
 * Compute pitch zone from StatsBomb coordinates.
 * StatsBomb pitch: 120x80 yards.
 * Zones: Defensive Third (0-40), Middle Third (40-80), Attacking Third (80-120)
 * Combined with Left/Center/Right (y-axis split into thirds).
 */
function computePitchZone(location: Location2D | null): string | null {
  if (!location) return null;

  const { x, y } = location;

  let xZone: string;
  if (x < 40) xZone = "Defensive";
  else if (x < 80) xZone = "Middle";
  else xZone = "Attacking";

  let yZone: string;
  if (y < 26.7) yZone = "Left";
  else if (y < 53.3) yZone = "Center";
  else yZone = "Right";

  return `${xZone} ${yZone}`;
}

/**
 * Extract event-specific detail fields (pass_, shot_, carry_, etc.)
 * into a clean details object for MongoDB storage.
 */
function extractDetails(event: StatsBombEvent): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  const prefixes = [
    "pass_", "shot_", "carry_", "duel_", "goalkeeper_",
    "foul_committed_", "foul_won_", "clearance_", "block_",
    "interception_", "dribble_", "substitution_", "ball_recovery_",
  ];

  for (const [key, value] of Object.entries(event)) {
    if (prefixes.some((p) => key.startsWith(p))) {
      details[key] = value;
    }
  }

  // Include tactics for Starting XI events
  if (isStartingXIEvent(event) && event.tactics) {
    details.tactics = event.tactics;
  }

  return details;
}

// Cache resolved team IDs per match to avoid guessing from a single event
const teamIdCache = new Map<number, { homeTeamId: number; awayTeamId: number }>();

/**
 * Upsert team and player metadata into MySQL.
 * Called for every event to ensure we capture all players/teams.
 */
async function upsertMetadata(event: StatsBombEvent): Promise<void> {
  const meta = event.match_meta;

  // Upsert current event's team
  await prisma.team.upsert({
    where: { id: event.team_id },
    update: {},
    create: { id: event.team_id, name: event.team },
  });

  // Upsert possession team (may differ from event team)
  await prisma.team.upsert({
    where: { id: event.possession_team_id },
    update: {},
    create: { id: event.possession_team_id, name: event.possession_team },
  });

  // Build team ID mapping from observed events
  if (!teamIdCache.has(meta.match_id)) {
    const mapping = { homeTeamId: 0, awayTeamId: 0 };
    if (event.team === meta.home_team) {
      mapping.homeTeamId = event.team_id;
    } else if (event.team === meta.away_team) {
      mapping.awayTeamId = event.team_id;
    }
    if (event.possession_team === meta.home_team) {
      mapping.homeTeamId = event.possession_team_id;
    } else if (event.possession_team === meta.away_team) {
      mapping.awayTeamId = event.possession_team_id;
    }
    if (mapping.homeTeamId && mapping.awayTeamId) {
      teamIdCache.set(meta.match_id, mapping);
    }
  }

  // Upsert match once we know both team IDs
  const teams = teamIdCache.get(meta.match_id);
  if (teams) {
    await prisma.match.upsert({
      where: { id: meta.match_id },
      update: {},
      create: {
        id: meta.match_id,
        matchDate: meta.match_date,
        competitionStage: meta.competition_stage,
        stadium: meta.stadium,
        homeTeamId: teams.homeTeamId,
        awayTeamId: teams.awayTeamId,
        homeScore: meta.home_score,
        awayScore: meta.away_score,
      },
    });
  }

  // Upsert player if present
  if (event.player && event.player_id) {
    await prisma.player.upsert({
      where: { id: event.player_id },
      update: { name: event.player, teamId: event.team_id },
      create: { id: event.player_id, name: event.player, teamId: event.team_id },
    });
  }
}

/**
 * Store play-by-play event in MongoDB.
 */
async function storeEvent(event: StatsBombEvent): Promise<void> {
  const location = event.location as Location2D | null ?? null;

  await MatchEvent.updateOne(
    { eventId: event.id },
    {
      $setOnInsert: {
        eventId: event.id,
        matchId: event.match_id,
        type: event.type,
        period: event.period,
        minute: event.minute,
        second: event.second,
        timestamp: event.timestamp,
        team: event.team,
        teamId: event.team_id,
        player: event.player ?? null,
        playerId: event.player_id ?? null,
        position: event.position ?? null,
        location: location,
        playPattern: event.play_pattern,
        duration: event.duration ?? null,
        underPressure: event.under_pressure ?? false,
        details: extractDetails(event),
        pitchZone: computePitchZone(location),
        producedAt: new Date(event.produced_at),
        consumedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * Process a single event from Kafka.
 * Routes metadata to MySQL and play-by-play to MongoDB.
 */
export async function processEvent(event: StatsBombEvent): Promise<void> {
  // Skip malformed events missing required envelope
  if (!event.match_meta) {
    console.warn(`[Processor] Skipping event ${event.id} — missing match_meta`);
    return;
  }

  // Always upsert metadata (teams, players, match) to MySQL
  await upsertMetadata(event);

  // Store all non-metadata events in MongoDB
  if (!isMetadataEvent(event)) {
    await storeEvent(event);
  }
}
