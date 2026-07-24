// src/fortress/types.ts

export type TerrainType = 'PLAINS' | 'FOREST' | 'MOUNTAIN' | 'LAKE' | 'TOWN' | 'SANCTUARY' | 'CITADEL';

export type QuestRelic = 'HORN_OF_OPENING' | 'BOOTS_OF_STEALTH' | 'ARMOR_OF_DEFENSE' | 'SWORD_OF_STRENGTH';

export interface Position {
  x: number;
  y: number;
}

export interface TileState {
  x: number;
  y: number;
  terrain: TerrainType;
  isExplored: boolean;
  hasRelic: QuestRelic | null;
  hasHiddenLoot: {
    gold: number;
    hasRaft: boolean;
    turnsRemaining: number;
  } | null;
}

export interface TroopRoster {
  warriors: number;
  scouts: number;
  clerics: number;
  wizards: number;
  raiders: number;
  elves: number;
  dwarves: number;
  mules: number;
}

export interface PlayerInventory {
  gold: number;
  rations: number;
  hasRaft: boolean;
  activeRelics: QuestRelic[];
  scrollsTeleport: number;
  scrollsSeeing: number;
  scrollsSeeking: number;
}

export interface GameSessionConfig {
  roomCode: string;
  seed: number;
  difficultyLevel: 1 | 2 | 3 | 4;
  gridSize: number;
  globalTurn: number;
}