import mongoose, { Schema, Document } from "mongoose";

export interface IMatchEvent extends Document {
  eventId: string;
  matchId: number;
  type: string;
  period: number;
  minute: number;
  second: number;
  timestamp: string;
  team: string;
  teamId: number;
  player: string | null;
  playerId: number | null;
  position: string | null;
  location: { x: number; y: number; z?: number } | null;
  playPattern: string;
  duration: number | null;
  underPressure: boolean;
  details: Record<string, unknown>;
  pitchZone: string | null;
  producedAt: Date;
  consumedAt: Date;
}

const MatchEventSchema = new Schema<IMatchEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    matchId: { type: Number, required: true, index: true },
    type: { type: String, required: true, index: true },
    period: { type: Number, required: true },
    minute: { type: Number, required: true },
    second: { type: Number, required: true },
    timestamp: { type: String, required: true },
    team: { type: String, required: true },
    teamId: { type: Number, required: true },
    player: { type: String, default: null },
    playerId: { type: Number, default: null, index: true },
    position: { type: String, default: null },
    location: {
      type: {
        x: Number,
        y: Number,
        z: Number,
      },
      default: null,
    },
    playPattern: { type: String, required: true },
    duration: { type: Number, default: null },
    underPressure: { type: Boolean, default: false },
    details: { type: Schema.Types.Mixed, default: {} },
    pitchZone: { type: String, default: null },
    producedAt: { type: Date, required: true },
    consumedAt: { type: Date, required: true },
  },
  {
    collection: "match_events",
    timestamps: false,
  }
);

MatchEventSchema.index({ matchId: 1, period: 1, minute: 1, second: 1 });

export const MatchEvent = mongoose.model<IMatchEvent>("MatchEvent", MatchEventSchema);
