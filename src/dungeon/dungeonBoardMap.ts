export type TileType =
  | 'GREAT_HALL'
  | 'CORRIDOR'
  | 'ROOM'
  | 'CHAMBER'
  | 'WALL'
  | 'DOOR'
  | 'SECRET_DOOR';

export interface TileData {
  x: number;
  y: number;
  type: TileType;
  level: number; // 0: Great Hall, 1-6: Dungeon Levels
  roomId?: string; // Group ID for locking & clearing multi-tile rooms/chambers
  doorId?: string;
  isDiscoveredSecret?: boolean;
}

export interface RoomMetadata {
  id: string;
  name: string;
  level: number;
  type: 'ROOM' | 'CHAMBER';
  clearedTokensRequired: number; // 1 for Room, 3 for Chamber
}

/**
 * Official Color Scheme mapping for Dungeon! board tiers[cite: 1]
 */
export const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  0: { bg: '#032e27', border: '#00ffcc', text: '#00ffcc', label: 'Great Hall (Safe Zone)' },
  1: { bg: '#3a2e00', border: '#eab308', text: '#fef08a', label: 'Level 1 (Yellow)' },
  2: { bg: '#06371c', border: '#22c55e', text: '#86efac', label: 'Level 2 (Green)' },
  3: { bg: '#0f2942', border: '#3b82f6', text: '#93c5fd', label: 'Level 3 (Blue)' },
  4: { bg: '#2e104a', border: '#a855f7', text: '#e9d5ff', label: 'Level 4 (Purple)' },
  5: { bg: '#3f0c0c', border: '#ef4444', text: '#fca5a5', label: 'Level 5 (Red)' },
  6: { bg: '#28003a', border: '#d8b4fe', text: '#f5d0fe', label: 'Level 6 (Deep Purple)' },
};

export const BOARD_SIZE = 21;

/**
 * Predefined Registry of Dungeon Rooms & Chambers[cite: 1]
 */
export const ROOM_REGISTRY: Record<string, RoomMetadata> = {
  // Level 1 Rooms
  room_l1_01: { id: 'room_l1_01', name: "Goblin Guard Post", level: 1, type: 'ROOM', clearedTokensRequired: 1 },
  room_l1_02: { id: 'room_l1_02', name: "Rat's Nest", level: 1, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l1_01: { id: 'chamber_l1_01', name: "Entrance Grand Chamber", level: 1, type: 'CHAMBER', clearedTokensRequired: 3 },

  // Level 2 Rooms
  room_l2_01: { id: 'room_l2_01', name: "Orc Barracks", level: 2, type: 'ROOM', clearedTokensRequired: 1 },
  room_l2_02: { id: 'room_l2_02', name: "Gnoll Armory", level: 2, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l2_01: { id: 'chamber_l2_01', name: "The Sunken Chamber", level: 2, type: 'CHAMBER', clearedTokensRequired: 3 },

  // Level 3 Rooms
  room_l3_01: { id: 'room_l3_01', name: "Ogre Den", level: 3, type: 'ROOM', clearedTokensRequired: 1 },
  room_l3_02: { id: 'room_l3_02', name: "Gargoyle Perch", level: 3, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l3_01: { id: 'chamber_l3_01', name: "Crypt of the Undead", level: 3, type: 'CHAMBER', clearedTokensRequired: 3 },

  // Level 4 Rooms
  room_l4_01: { id: 'room_l4_01', name: "Mummy Tomb", level: 4, type: 'ROOM', clearedTokensRequired: 1 },
  room_l4_02: { id: 'room_l4_02', name: "Hill Giant Outpost", level: 4, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l4_01: { id: 'chamber_l4_01', name: "Drow Council Chamber", level: 4, type: 'CHAMBER', clearedTokensRequired: 3 },

  // Level 5 Rooms
  room_l5_01: { id: 'room_l5_01', name: "Vampire Sanctum", level: 5, type: 'ROOM', clearedTokensRequired: 1 },
  room_l5_02: { id: 'room_l5_02', name: "Mind Flayer Laboratory", level: 5, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l5_01: { id: 'chamber_l5_01', name: "Abyssal Rift Chamber", level: 5, type: 'CHAMBER', clearedTokensRequired: 3 },

  // Level 6 Rooms
  room_l6_01: { id: 'room_l6_01', name: "Red Dragon Lair", level: 6, type: 'ROOM', clearedTokensRequired: 1 },
  room_l6_02: { id: 'room_l6_02', name: "Dracolich Vault", level: 6, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l6_01: { id: 'chamber_l6_01', name: "The Sovereign Chamber", level: 6, type: 'CHAMBER', clearedTokensRequired: 3 },
};

/**
 * Static Matrix Generator for deterministic board rendering
 */
export function generateStaticDungeonBoard(): TileData[][] {
  const grid: TileData[][] = [];
  const centerMin = 9;
  const centerMax = 11;

  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      // 1. Central Safe Zone: Great Hall (Level 0)[cite: 1]
      if (x >= centerMin && x <= centerMax && y >= centerMin && y <= centerMax) {
        row.push({ x, y, type: 'GREAT_HALL', level: 0 });
        continue;
      }

      // Calculate distance from Great Hall center to derive concentric Level Tiers (1 to 6)
      const maxDist = Math.max(Math.abs(x - 10), Math.abs(y - 10));
      let level = Math.min(6, Math.max(1, Math.floor((maxDist / 10) * 6)));

      // 2. Outer Perimeter & Structural Solid Walls
      if (x === 0 || x === BOARD_SIZE - 1 || y === 0 || y === BOARD_SIZE - 1) {
        row.push({ x, y, type: 'WALL', level });
        continue;
      }

      // 3. Multi-tile Chambers (Level 1 to 6)
      if (x >= 2 && x <= 4 && y >= 2 && y <= 4) {
        row.push({ x, y, type: 'CHAMBER', level: 1, roomId: 'chamber_l1_01' });
        continue;
      }
      if (x >= 16 && x <= 18 && y >= 2 && y <= 4) {
        row.push({ x, y, type: 'CHAMBER', level: 2, roomId: 'chamber_l2_01' });
        continue;
      }
      if (x >= 2 && x <= 4 && y >= 16 && y <= 18) {
        row.push({ x, y, type: 'CHAMBER', level: 5, roomId: 'chamber_l5_01' });
        continue;
      }
      if (x >= 16 && x <= 18 && y >= 16 && y <= 18) {
        row.push({ x, y, type: 'CHAMBER', level: 6, roomId: 'chamber_l6_01' });
        continue;
      }

      // 4. Single-tile & Multi-tile Rooms with Door Entrances
      if ((x === 6 && y === 3) || (x === 7 && y === 3)) {
        row.push({ x, y, type: 'ROOM', level: 1, roomId: 'room_l1_01' });
        continue;
      }
      if (x === 5 && y === 3) {
        row.push({ x, y, type: 'DOOR', level: 1, roomId: 'room_l1_01', doorId: 'door_l1_01' });
        continue;
      }

      if ((x === 13 && y === 3) || (x === 14 && y === 3)) {
        row.push({ x, y, type: 'ROOM', level: 2, roomId: 'room_l2_01' });
        continue;
      }
      if (x === 12 && y === 3) {
        row.push({ x, y, type: 'DOOR', level: 2, roomId: 'room_l2_01', doorId: 'door_l2_01' });
        continue;
      }

      if ((x === 3 && y === 8) || (x === 4 && y === 8)) {
        row.push({ x, y, type: 'ROOM', level: 3, roomId: 'room_l3_01' });
        continue;
      }
      if (x === 5 && y === 8) {
        row.push({ x, y, type: 'DOOR', level: 3, roomId: 'room_l3_01', doorId: 'door_l3_01' });
        continue;
      }

      if ((x === 16 && y === 8) || (x === 17 && y === 8)) {
        row.push({ x, y, type: 'ROOM', level: 4, roomId: 'room_l4_01' });
        continue;
      }
      if (x === 15 && y === 8) {
        row.push({ x, y, type: 'DOOR', level: 4, roomId: 'room_l4_01', doorId: 'door_l4_01' });
        continue;
      }

      // 5. Secret Door Passages[cite: 1]
      if ((x === 5 && y === 16) || (x === 15 && y === 16)) {
        row.push({ x, y, type: 'SECRET_DOOR', level, roomId: `room_l${level}_02` });
        continue;
      }

      // 6. Corridor Wall Division Matrix
      if ((x % 4 === 0 && y % 2 === 0 && maxDist > 3) || (y % 4 === 0 && x % 2 === 0 && maxDist > 3)) {
        row.push({ x, y, type: 'WALL', level });
        continue;
      }

      // 7. Default Open Flagstone Corridor
      row.push({ x, y, type: 'CORRIDOR', level });
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Utility: Checks if a tile allows physical movement through it
 */
export function isTilePassable(tile: TileData, isSecretDiscovered: boolean = false): boolean {
  if (tile.type === 'WALL') return false;
  if (tile.type === 'SECRET_DOOR' && !isSecretDiscovered) return false;
  return true;
}

/**
 * Singleton instance of the static board grid
 */
export const STATIC_DUNGEON_BOARD = generateStaticDungeonBoard();