export const typeDefs = `#graphql
  type Location {
    x: Float!
    y: Float!
    z: Float
  }

  type Team {
    id: Int!
    name: String!
    players: [Player!]!
    homeMatches: [Match!]!
    awayMatches: [Match!]!
  }

  type Player {
    id: Int!
    name: String!
    teamId: Int!
    team: Team!
    events(type: String, limit: Int): [MatchEvent!]!
    shotHistory: [MatchEvent!]!
  }

  type Match {
    id: Int!
    matchDate: String!
    competitionStage: String!
    stadium: String!
    homeScore: Int!
    awayScore: Int!
    homeTeam: Team!
    awayTeam: Team!
    events(type: String, limit: Int): [MatchEvent!]!
    stats: MatchStats!
  }

  type MatchStats {
    totalEvents: Int!
    shots: Int!
    passes: Int!
    fouls: Int!
    goals: Int!
  }

  type MatchEvent {
    eventId: String!
    matchId: Int!
    type: String!
    period: Int!
    minute: Int!
    second: Int!
    timestamp: String!
    team: String!
    teamId: Int!
    player: String
    playerId: Int
    position: String
    location: Location
    playPattern: String!
    duration: Float
    underPressure: Boolean!
    details: JSON
    pitchZone: String
    producedAt: String!
    consumedAt: String!
  }

  scalar JSON

  type Query {
    teams: [Team!]!
    team(id: Int!): Team

    players: [Player!]!
    player(id: Int!): Player

    matches: [Match!]!
    match(id: Int!): Match

    events(
      matchId: Int!
      type: String
      pitchZone: String
      limit: Int
      offset: Int
    ): [MatchEvent!]!

    shotMap(matchId: Int!, teamId: Int): [MatchEvent!]!
  }
`;
