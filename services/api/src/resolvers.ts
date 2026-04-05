import { GraphQLScalarType, Kind } from "graphql";
import { prisma } from "./db/mysql.js";
import { MatchEvent } from "./models/event.model.js";

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) return JSON.parse(ast.value);
    return null;
  },
});

export const resolvers = {
  JSON: JSONScalar,

  Query: {
    // --- Teams ---
    teams: () => prisma.team.findMany({ orderBy: { name: "asc" } }),
    team: (_: unknown, { id }: { id: number }) =>
      prisma.team.findUnique({ where: { id } }),

    // --- Players ---
    players: () => prisma.player.findMany({ orderBy: { name: "asc" } }),
    player: (_: unknown, { id }: { id: number }) =>
      prisma.player.findUnique({ where: { id } }),

    // --- Matches ---
    matches: () =>
      prisma.match.findMany({
        include: { homeTeam: true, awayTeam: true },
        orderBy: { matchDate: "desc" },
      }),
    match: (_: unknown, { id }: { id: number }) =>
      prisma.match.findUnique({
        where: { id },
        include: { homeTeam: true, awayTeam: true },
      }),

    // --- Events (MongoDB) ---
    events: async (
      _: unknown,
      args: { matchId: number; type?: string; pitchZone?: string; limit?: number; offset?: number }
    ) => {
      const filter: Record<string, unknown> = { matchId: args.matchId };
      if (args.type) filter.type = args.type;
      if (args.pitchZone) filter.pitchZone = args.pitchZone;

      return await MatchEvent.find(filter)
        .sort({ period: 1, minute: 1, second: 1 })
        .skip(args.offset ?? 0)
        .limit(args.limit ?? 100)
        .lean();
    },

    // --- Shot Map ---
    shotMap: async (_: unknown, args: { matchId: number; teamId?: number }) => {
      const filter: Record<string, unknown> = { matchId: args.matchId, type: "Shot" };
      if (args.teamId) filter.teamId = args.teamId;

      return await MatchEvent.find(filter)
        .sort({ period: 1, minute: 1, second: 1 })
        .lean();
    },
  },

  // --- Field Resolvers (join MySQL + MongoDB) ---

  Team: {
    players: (team: { id: number }) =>
      prisma.player.findMany({ where: { teamId: team.id } }),
    homeMatches: (team: { id: number }) =>
      prisma.match.findMany({ where: { homeTeamId: team.id } }),
    awayMatches: (team: { id: number }) =>
      prisma.match.findMany({ where: { awayTeamId: team.id } }),
  },

  Player: {
    team: (player: { teamId: number }) =>
      prisma.team.findUnique({ where: { id: player.teamId } }),
    events: async (player: { id: number }, args: { type?: string; limit?: number }) => {
      const filter: Record<string, unknown> = { playerId: player.id };
      if (args.type) filter.type = args.type;

      return await MatchEvent.find(filter)
        .sort({ period: 1, minute: 1, second: 1 })
        .limit(args.limit ?? 50)
        .lean();
    },
    shotHistory: async (player: { id: number }) =>
      await MatchEvent.find({ playerId: player.id, type: "Shot" })
        .sort({ period: 1, minute: 1, second: 1 })
        .lean(),
  },

  Match: {
    homeTeam: (match: { homeTeamId: number }) =>
      prisma.team.findUnique({ where: { id: match.homeTeamId } }),
    awayTeam: (match: { awayTeamId: number }) =>
      prisma.team.findUnique({ where: { id: match.awayTeamId } }),
    events: async (match: { id: number }, args: { type?: string; limit?: number }) => {
      const filter: Record<string, unknown> = { matchId: match.id };
      if (args.type) filter.type = args.type;

      return await MatchEvent.find(filter)
        .sort({ period: 1, minute: 1, second: 1 })
        .limit(args.limit ?? 100)
        .lean();
    },
    stats: async (match: { id: number }) => {
      const matchId = match.id;
      const [totalEvents, shots, passes, fouls, goals] = await Promise.all([
        MatchEvent.countDocuments({ matchId }),
        MatchEvent.countDocuments({ matchId, type: "Shot" }),
        MatchEvent.countDocuments({ matchId, type: "Pass" }),
        MatchEvent.countDocuments({ matchId, type: "Foul Committed" }),
        MatchEvent.countDocuments({ matchId, type: "Shot", "details.shot_outcome": "Goal" }),
      ]);
      return { totalEvents, shots, passes, fouls, goals };
    },
  },
};
