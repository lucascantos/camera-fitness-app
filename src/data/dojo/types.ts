export type CharacterId = "cael" | "bryn";

export interface Character {
  id: CharacterId;
  name: string;
  species: string;
  gender: "boy" | "girl";
}

export interface CharacterProgress {
  level: number;
  totalSeconds: number;
}

export interface ActiveSession {
  characterId: CharacterId;
  startedAt: number;       // ms epoch
  powerCommitted: number;  // seconds
  multiplier: number;      // 1.0 base, grows with cheers
}

export interface DojoState {
  power: number;           // seconds available, cap POWER_CAP
  progress: Record<CharacterId, CharacterProgress>;
  activeSession: ActiveSession | null;
}
