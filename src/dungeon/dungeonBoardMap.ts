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
  roomId?: string;
  doorId?: string;
  isDiscoveredSecret?: boolean;
}

export interface RoomMetadata {
  id: string;
  name: string;
  level: number;
  type: 'ROOM' | 'CHAMBER';
  clearedTokensRequired: number;
}

export const BOARD_SIZE = 30;

/**
 * Color scheme matching the physical board game zones[cite: 1]
 */
export const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  0: { bg: '#032e27', border: '#00ffcc', text: '#00ffcc', label: 'Great Hall (Center)' },
  1: { bg: '#3a2e00', border: '#eab308', text: '#fef08a', label: 'Level 1 (Yellow)' },
  2: { bg: '#06371c', border: '#22c55e', text: '#86efac', label: 'Level 2 (Green - West)' },
  3: { bg: '#0f2942', border: '#3b82f6', text: '#93c5fd', label: 'Level 3 (Blue - West)' },
  4: { bg: '#2e104a', border: '#a855f7', text: '#e9d5ff', label: 'Level 4 (Purple - North)' },
  5: { bg: '#3f0c0c', border: '#ef4444', text: '#fca5a5', label: 'Level 5 (Red - East)' },
  6: { bg: '#1f0033', border: '#d8b4fe', text: '#f5d0fe', label: 'Level 6 (Deep Purple - East Lair)' },
};

/**
 * Master Registry of authentic Board Locations[cite: 1]
 */
export const ROOM_REGISTRY: Record<string, RoomMetadata> = {
  // Center (Level 1)
  room_l1_01: { id: 'room_l1_01', name: 'Guard Room Entrance', level: 1, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l1_01: { id: 'chamber_l1_01', name: 'Great Hall Foyer', level: 1, type: 'CHAMBER', clearedTokensRequired: 3 },

  // West Wing (Levels 2 & 3)
  room_l2_kitchen: { id: 'room_l2_kitchen', name: 'Dungeon Kitchen', level: 2, type: 'ROOM', clearedTokensRequired: 1 },
  room_l2_pantry: { id: 'room_l2_pantry', name: 'Food Storage Pantry', level: 2, type: 'ROOM', clearedTokensRequired: 1 },
  chamber_l3_armory: { id: 'chamber_l3_armory', name: 'The Armory Chamber', level: 3, type: 'CHAMBER', clearedTokensRequired: 3 },

  // East Wing (Levels 5 & 6)
  chamber_l5_torture: { id: 'chamber_l5_torture', name: 'Torture Chamber', level: 5, type: 'CHAMBER', clearedTokensRequired: 3 },
  chamber_l6_lair: { id: 'chamber_l6_lair', name: 'THE LAIR (Dragon Den)', level: 6, type: 'CHAMBER', clearedTokensRequired: 3 },
  chamber_l6_burrow: { id: 'chamber_l6_burrow', name: 'The Burrow Vault', level: 6, type: 'CHAMBER', clearedTokensRequired: 3 },
};

export function generateStaticDungeonBoard(): TileData[][] {
  const grid: TileData[][] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      
      // 1. Outer Solid Perimeter Wall
      if (x === 0 || x === BOARD_SIZE - 1 || y === 0 || y === BOARD_SIZE - 1) {
        row.push({ x, y, type: 'WALL', level: 0 });
        continue;
      }

      // 2. Center Hub: Great Hall (13,13 to 16,16)[cite: 1]
      if (x >= 13 && x <= 16 && y >= 13 && y <= 16) {
        row.push({ x, y, type: 'GREAT_HALL', level: 0 });
        continue;
      }

      // 3. Level 1 Yellow Ring around Great Hall (X: 11-18, Y: 11-18)
      if (x >= 11 && x <= 18 && y >= 11 && y <= 18) {
        // North & South Entrance Doors
        if ((x === 14 || x === 15) && (y === 11 || y === 18)) {
          row.push({ x, y, type: 'DOOR', level: 1, roomId: 'room_l1_01' });
          continue;
        }
        // Room Tiles
        if (x === 11 || x === 18 || y === 11 || y === 18) {
          row.push({ x, y, type: 'ROOM', level: 1, roomId: 'room_l1_01' });
          continue;
        }
        row.push({ x, y, type: 'CORRIDOR', level: 1 });
        continue;
      }

      // 4. WEST WING: Level 2 (Green) & Level 3 (Blue)[cite: 1]
      if (x >= 2 && x <= 9) {
        // Kitchen (Level 2 Room)
        if (x >= 3 && x <= 5 && y >= 3 && y <= 5) {
          row.push({ x, y, type: 'ROOM', level: 2, roomId: 'room_l2_kitchen' });
          continue;
        }
        if (x === 6 && y === 4) {
          row.push({ x, y, type: 'DOOR', level: 2, roomId: 'room_l2_kitchen' });
          continue;
        }

        // Armory (Level 3 Multi-tile Chamber)
        if (x >= 3 && x <= 6 && y >= 20 && y <= 23) {
          row.push({ x, y, type: 'CHAMBER', level: 3, roomId: 'chamber_l3_armory' });
          continue;
        }
        if (x === 7 && y === 21) {
          row.push({ x, y, type: 'DOOR', level: 3, roomId: 'chamber_l3_armory' });
          continue;
        }

        // Secret Door Shortcut to Central Corridor[cite: 1]
        if (x === 9 && y === 15) {
          row.push({ x, y, type: 'SECRET_DOOR', level: 3 });
          continue;
        }
      }

      // 5. EAST WING: Level 5 (Red) & Level 6 (Deep Purple)[cite: 1]
      if (x >= 20 && x <= 27) {
        // The Lair (Level 6 Major 3x3 Chamber)
        if (x >= 23 && x <= 26 && y >= 20 && y <= 23) {
          row.push({ x, y, type: 'CHAMBER', level: 6, roomId: 'chamber_l6_lair' });
          continue;
        }
        if (x === 22 && y === 21) {
          row.push({ x, y, type: 'DOOR', level: 6, roomId: 'chamber_l6_lair' });
          continue;
        }

        // Torture Chamber (Level 5 Chamber)
        if (x >= 22 && x <= 25 && y >= 4 && y <= 7) {
          row.push({ x, y, type: 'CHAMBER', level: 5, roomId: 'chamber_l5_torture' });
          continue;
        }
        if (x === 21 && y === 5) {
          row.push({ x, y, type: 'DOOR', level: 5, roomId: 'chamber_l5_torture' });
          continue;
        }

        // Secret Passage from Lair to South Corridor[cite: 1]
        if (x === 25 && y === 24) {
          row.push({ x, y, type: 'SECRET_DOOR', level: 6 });
          continue;
        }
      }

      // 6. INTERNAL WALL STRUCTURES
      if (
        (x === 10 && (y < 12 || y > 17)) ||
        (x === 19 && (y < 12 || y > 17)) ||
        (y === 10 && (x < 12 || x > 17)) ||
        (y === 19 && (x < 12 || x > 17))
      ) {
        // Doorway gaps in main corridor walls
        if (y === 5 || y === 24 || x === 5 || x === 24) {
          row.push({ x, y, type: 'CORRIDOR', level: x < 10 ? 2 : x > 19 ? 5 : 4 });
          continue;
        }
        row.push({ x, y, type: 'WALL', level: 0 });
        continue;
      }

      // 7. DEFAULT OPEN CORRIDORS (Color-coded by region)
      let corridorLevel = 1;
      if (x < 10) corridorLevel = y < 15 ? 2 : 3;
      else if (x > 19) corridorLevel = y < 15 ? 5 : 6;
      else if (y < 10 || y > 19) corridorLevel = 4;

      row.push({ x, y, type: 'CORRIDOR', level: corridorLevel });
    }
    grid.push(row);
  }

  return grid;
}

export function isTilePassable(tile: TileData, isSecretDiscovered: boolean = false): boolean {
  if (tile.type === 'WALL') return false;
  if (tile.type === 'SECRET_DOOR' && !isSecretDiscovered) return false;
  return true;
}

export const STATIC_DUNGEON_BOARD = generateStaticDungeonBoard();