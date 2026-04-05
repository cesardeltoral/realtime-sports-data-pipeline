/**
 * Strict TypeScript interfaces for StatsBomb event payloads
 * as transformed by the Python producer.
 */

// --- Location Types ---

export interface Location2D {
  x: number;
  y: number;
}

export interface Location3D extends Location2D {
  z: number;
}

export type Location = Location2D | Location3D;

// --- Match Metadata (attached by producer) ---

export interface MatchMeta {
  match_id: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  match_date: string;
  competition_stage: string;
  stadium: string;
}

// --- Base Event ---

export interface BaseEvent {
  id: string;
  index: number;
  match_id: number;
  type: string;
  period: number;
  minute: number;
  second: number;
  timestamp: string;
  possession: number;
  possession_team: string;
  possession_team_id: number;
  team: string;
  team_id: number;
  player?: string;
  player_id?: number;
  position?: string;
  play_pattern: string;
  duration?: number;
  location?: Location;
  under_pressure?: boolean;
  off_camera?: boolean;
  out?: boolean;
  related_events?: string[];
  match_meta: MatchMeta;
  produced_at: string;
}

// --- Specific Event Types ---

export interface PassEvent extends BaseEvent {
  type: "Pass";
  pass_end_location?: Location;
  pass_recipient?: string;
  pass_recipient_id?: number;
  pass_length?: number;
  pass_angle?: number;
  pass_height?: string;
  pass_body_part?: string;
  pass_type?: string;
  pass_outcome?: string;
  pass_cross?: boolean;
  pass_switch?: boolean;
  pass_through_ball?: boolean;
  pass_goal_assist?: boolean;
  pass_shot_assist?: boolean;
  pass_technique?: string;
}

export interface ShotEvent extends BaseEvent {
  type: "Shot";
  shot_end_location?: Location;
  shot_outcome?: string;
  shot_body_part?: string;
  shot_technique?: string;
  shot_type?: string;
  shot_statsbomb_xg?: number;
  shot_first_time?: boolean;
  shot_freeze_frame?: unknown[];
  shot_key_pass_id?: string;
}

export interface CarryEvent extends BaseEvent {
  type: "Carry";
  carry_end_location?: Location;
}

export interface DuelEvent extends BaseEvent {
  type: "Duel";
  duel_type?: string;
  duel_outcome?: string;
}

export interface GoalkeeperEvent extends BaseEvent {
  type: "Goal Keeper";
  goalkeeper_end_location?: Location;
  goalkeeper_type?: string;
  goalkeeper_outcome?: string;
  goalkeeper_body_part?: string;
  goalkeeper_technique?: string;
  goalkeeper_position?: string;
}

export interface FoulEvent extends BaseEvent {
  type: "Foul Committed";
  foul_committed_type?: string;
  foul_committed_advantage?: boolean;
  foul_committed_offensive?: boolean;
  foul_committed_penalty?: boolean;
}

export interface SubstitutionEvent extends BaseEvent {
  type: "Substitution";
  substitution_replacement?: string;
  substitution_replacement_id?: number;
  substitution_outcome?: string;
}

export interface TacticsInfo {
  formation: number;
  lineup: Array<{
    player: { id: number; name: string };
    position: { id: number; name: string };
    jersey_number: number;
  }>;
}

export interface StartingXIEvent extends BaseEvent {
  type: "Starting XI";
  tactics?: TacticsInfo;
}

// --- Union Type ---

export type StatsBombEvent =
  | PassEvent
  | ShotEvent
  | CarryEvent
  | DuelEvent
  | GoalkeeperEvent
  | FoulEvent
  | SubstitutionEvent
  | StartingXIEvent
  | BaseEvent;

// --- Event Type Guards ---

export function isPassEvent(event: StatsBombEvent): event is PassEvent {
  return event.type === "Pass";
}

export function isShotEvent(event: StatsBombEvent): event is ShotEvent {
  return event.type === "Shot";
}

export function isCarryEvent(event: StatsBombEvent): event is CarryEvent {
  return event.type === "Carry";
}

export function isGoalkeeperEvent(event: StatsBombEvent): event is GoalkeeperEvent {
  return event.type === "Goal Keeper";
}

export function isStartingXIEvent(event: StatsBombEvent): event is StartingXIEvent {
  return event.type === "Starting XI";
}

// --- Metadata event types (routed to MySQL) ---

const METADATA_EVENT_TYPES = new Set(["Starting XI", "Substitution", "Half Start", "Half End"]);

// --- Pitch event types (routed to MongoDB) ---

export function isMetadataEvent(event: StatsBombEvent): boolean {
  return METADATA_EVENT_TYPES.has(event.type);
}

export function isPitchEvent(event: StatsBombEvent): boolean {
  return !METADATA_EVENT_TYPES.has(event.type);
}
