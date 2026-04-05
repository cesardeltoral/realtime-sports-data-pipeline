export interface Match {
  id: number;
  matchDate: string;
  competitionStage: string;
  stadium: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  homeScore: number;
  awayScore: number;
  stats: {
    totalEvents: number;
    shots: number;
    passes: number;
    fouls: number;
    goals: number;
  };
}

export interface Shot {
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
