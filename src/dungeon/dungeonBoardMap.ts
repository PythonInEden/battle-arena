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
  level: number;
  roomId?: string;
  doorId?: string;
}

export const BOARD_SIZE = 36;

export const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  0: { bg: '#032e27', border: '#00ffcc', text: '#00ffcc', label: 'Great Hall (Center)' },
  1: { bg: '#3a2e00', border: '#eab308', text: '#fef08a', label: 'Level 1 (Yellow)' },
  2: { bg: '#3b1c00', border: '#f97316', text: '#fdba74', label: 'Level 2 (Orange - West)' },
  3: { bg: '#0f2942', border: '#3b82f6', text: '#93c5fd', label: 'Level 3 (Blue - West)' },
  4: { bg: '#2e104a', border: '#a855f7', text: '#e9d5ff', label: 'Level 4 (Purple - North)' },
  5: { bg: '#3f0c0c', border: '#ef4444', text: '#fca5a5', label: 'Level 5 (Red - East)' },
  6: { bg: '#1f0033', border: '#d8b4fe', text: '#f5d0fe', label: 'Level 6 (Deep Purple - East Lair)' },
};

export function generateStaticDungeonBoard(): TileData[][] {
  // 1. Fill entire 36x36 board with solid cavern rock (WALL)
  const grid: TileData[][] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push({ x, y, type: 'WALL', level: 0 });
    }
    grid.push(row);
  }

  const setTile = (x: number, y: number, type: TileType, level: number, roomId?: string) => {
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
      grid[y][x] = { x, y, type, level, roomId };
    }
  };

  // 🧱 Helper A: Stamp discrete room blocks with single door
  const stampRoom = (
    x: number,
    y: number,
    w: number,
    h: number,
    level: number,
    roomId: string,
    doorPos: { x: number; y: number },
    isChamber: boolean = false
  ) => {
    const tileType: TileType = isChamber ? 'CHAMBER' : 'ROOM';
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        setTile(rx, ry, tileType, level, roomId);
      }
    }
    // Stamp entrance door
    setTile(doorPos.x, doorPos.y, 'DOOR', level, roomId);
  };

  // 🛣️ Helper B: Stamp 1-tile wide corridor streets
  const stampPath = (x1: number, y1: number, x2: number, y2: number, level: number) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        if (grid[cy][cx].type === 'WALL' || grid[cy][cx].type === 'CORRIDOR') {
          setTile(cx, cy, 'CORRIDOR', level);
        }
      }
    }
  };

  // --------------------------------------------------------------------------
  // 🏛️ CENTRAL HUB: Great Hall (Level 0) & 8 Encircled Level 1 Rooms
  // --------------------------------------------------------------------------
  // Great Hall 4x4 Center
  for (let gy = 16; gy <= 19; gy++) {
    for (let gx = 16; gx <= 19; gx++) {
      setTile(gx, gy, 'GREAT_HALL', 0);
    }
  }

  // 8 Level 1 Yellow Room Blocks around Great Hall
  stampRoom(13, 12, 2, 2, 1, 'room_l1_01', { x: 14, y: 14 }); // NW
  stampRoom(17, 12, 2, 2, 1, 'room_l1_02', { x: 17, y: 14 }); // N
  stampRoom(21, 12, 2, 2, 1, 'room_l1_03', { x: 21, y: 14 }); // NE
  stampRoom(12, 17, 2, 2, 1, 'room_l1_04', { x: 14, y: 17 }); // W
  stampRoom(22, 17, 2, 2, 1, 'room_l1_05', { x: 21, y: 17 }); // E
  stampRoom(13, 22, 2, 2, 1, 'room_l1_06', { x: 14, y: 21 }); // SW
  stampRoom(17, 22, 2, 2, 1, 'room_l1_07', { x: 17, y: 21 }); // S
  stampRoom(21, 22, 2, 2, 1, 'room_l1_08', { x: 21, y: 21 }); // SE

  // Central Ring Streets
  stampPath(15, 15, 20, 15, 1);
  stampPath(15, 20, 20, 20, 1);
  stampPath(15, 15, 15, 20, 1);
  stampPath(20, 15, 20, 20, 1);

  // --------------------------------------------------------------------------
  // 🟠 WEST WING: Level 2 (Orange - 11 Rooms)
  // --------------------------------------------------------------------------
  stampPath(8, 17, 15, 17, 2); // West Main Trunk
  stampPath(8, 3, 8, 17, 2);   // North-West Street

  // 11 Orange Rooms
  stampRoom(2, 2, 2, 2, 2, 'room_l2_01', { x: 4, y: 3 });
  stampRoom(5, 2, 2, 2, 2, 'room_l2_02', { x: 6, y: 4 });
  stampRoom(10, 2, 2, 2, 2, 'room_l2_03', { x: 10, y: 4 });
  stampRoom(13, 2, 2, 2, 2, 'room_l2_04', { x: 13, y: 4 });

  stampRoom(2, 6, 2, 2, 2, 'room_l2_05', { x: 4, y: 7 });
  stampRoom(10, 6, 2, 2, 2, 'room_l2_06', { x: 10, y: 7 });

  stampRoom(2, 10, 2, 2, 2, 'room_l2_07', { x: 4, y: 11 });
  stampRoom(5, 10, 2, 2, 2, 'room_l2_08', { x: 6, y: 11 });
  stampRoom(10, 10, 2, 2, 2, 'room_l2_09', { x: 10, y: 11 });

  stampRoom(2, 14, 2, 2, 2, 'room_l2_10', { x: 4, y: 15 });
  stampRoom(5, 14, 2, 2, 2, 'room_l2_11', { x: 6, y: 15 });

  // Corridor connections
  stampPath(4, 3, 13, 3, 2);
  stampPath(4, 7, 10, 7, 2);
  stampPath(4, 11, 10, 11, 2);
  stampPath(4, 15, 8, 15, 2);

  // --------------------------------------------------------------------------
  // 🔵 SOUTH-WEST WING: Level 3 (Blue - 9 Rooms + Armory Chamber)
  // --------------------------------------------------------------------------
  stampPath(8, 17, 8, 33, 3); // South-West Street

  // 9 Blue Rooms
  stampRoom(2, 19, 2, 2, 3, 'room_l3_01', { x: 4, y: 20 });
  stampRoom(5, 19, 2, 2, 3, 'room_l3_02', { x: 6, y: 20 });
  stampRoom(10, 19, 2, 2, 3, 'room_l3_03', { x: 10, y: 20 });

  stampRoom(2, 23, 2, 2, 3, 'room_l3_04', { x: 4, y: 24 });
  stampRoom(10, 23, 2, 2, 3, 'room_l3_05', { x: 10, y: 24 });

  stampRoom(2, 27, 2, 2, 3, 'room_l3_06', { x: 4, y: 28 });
  stampRoom(5, 27, 2, 2, 3, 'room_l3_07', { x: 6, y: 28 });

  stampRoom(2, 31, 2, 2, 3, 'room_l3_08', { x: 4, y: 32 });
  stampRoom(5, 31, 2, 2, 3, 'room_l3_09', { x: 6, y: 32 });

  // Armory Chamber (3x3)
  stampRoom(10, 27, 3, 3, 3, 'chamber_l3_armory', { x: 10, y: 28 }, true);

  // Corridor connections
  stampPath(4, 20, 10, 20, 3);
  stampPath(4, 24, 10, 24, 3);
  stampPath(4, 28, 8, 28, 3);
  stampPath(4, 32, 8, 32, 3);

  // --------------------------------------------------------------------------
  // 🟣 NORTH-EAST WING: Level 4 (Purple - 8 Rooms)
  // --------------------------------------------------------------------------
  stampPath(17, 8, 17, 15, 4);  // North Street
  stampPath(17, 8, 33, 8, 4);   // North-East Main Highway

  stampRoom(19, 2, 2, 2, 4, 'room_l4_01', { x: 20, y: 4 });
  stampRoom(23, 2, 2, 2, 4, 'room_l4_02', { x: 24, y: 4 });
  stampRoom(27, 2, 2, 2, 4, 'room_l4_03', { x: 28, y: 4 });
  stampRoom(31, 2, 2, 2, 4, 'room_l4_04', { x: 32, y: 4 });

  stampRoom(19, 10, 2, 2, 4, 'room_l4_05', { x: 20, y: 10 });
  stampRoom(23, 10, 2, 2, 4, 'room_l4_06', { x: 24, y: 10 });
  stampRoom(27, 10, 2, 2, 4, 'room_l4_07', { x: 28, y: 10 });
  stampRoom(31, 10, 2, 2, 4, 'room_l4_08', { x: 32, y: 10 });

  stampPath(20, 4, 32, 4, 4);
  stampPath(20, 10, 32, 10, 4);

  // --------------------------------------------------------------------------
  // 🔴 SOUTH-EAST MID: Level 5 (Red - 7 Rooms + Torture Chamber)
  // --------------------------------------------------------------------------
  stampPath(20, 17, 28, 17, 5); // East Main Trunk
  stampPath(28, 14, 28, 22, 5); // Red Street

  stampRoom(23, 13, 2, 2, 5, 'room_l5_01', { x: 24, y: 15 });
  stampRoom(31, 13, 2, 2, 5, 'room_l5_02', { x: 31, y: 15 });

  stampRoom(23, 18, 2, 2, 5, 'room_l5_03', { x: 24, y: 18 });
  stampRoom(31, 18, 2, 2, 5, 'room_l5_04', { x: 31, y: 18 });

  stampRoom(23, 21, 2, 2, 5, 'room_l5_05', { x: 24, y: 21 });
  stampRoom(31, 21, 2, 2, 5, 'room_l5_06', { x: 31, y: 21 });

  // Torture Chamber (3x3)
  stampRoom(25, 21, 3, 3, 5, 'chamber_l5_torture', { x: 28, y: 21 }, true);

  stampPath(24, 15, 31, 15, 5);
  stampPath(24, 18, 31, 18, 5);

  // --------------------------------------------------------------------------
  // 🟣 DEEP SOUTH-EAST: Level 6 (Deep Purple - 6 Rooms + The Lair & Burrow)
  // --------------------------------------------------------------------------
  stampPath(28, 22, 28, 33, 6); // Lair Deep Street

  stampRoom(23, 26, 2, 2, 6, 'room_l6_01', { x: 24, y: 26 });
  stampRoom(32, 26, 2, 2, 6, 'room_l6_02', { x: 32, y: 26 });

  stampRoom(23, 30, 2, 2, 6, 'room_l6_03', { x: 24, y: 30 });
  stampRoom(32, 30, 2, 2, 6, 'room_l6_04', { x: 32, y: 30 });

  // THE LAIR (3x3 Major Chamber)
  stampRoom(25, 25, 3, 3, 6, 'chamber_l6_lair', { x: 28, y: 26 }, true);

  // THE BURROW (3x3 Major Chamber)
  stampRoom(25, 29, 3, 3, 6, 'chamber_l6_burrow', { x: 28, y: 30 }, true);

  stampPath(24, 26, 32, 26, 6);
  stampPath(24, 30, 32, 30, 6);

  // --------------------------------------------------------------------------
  // 🔓 SECRET DOOR PASSAGES
  // --------------------------------------------------------------------------
  setTile(8, 11, 'SECRET_DOOR', 2);  // L2 -> West Trunk shortcut
  setTile(28, 12, 'SECRET_DOOR', 5); // L5 -> L4 shortcut
  setTile(28, 24, 'SECRET_DOOR', 6); // L6 -> L5 shortcut

  return grid;
}

export function isTilePassable(tile: TileData, isSecretDiscovered: boolean = false): boolean {
  if (tile.type === 'WALL') return false;
  if (tile.type === 'SECRET_DOOR' && !isSecretDiscovered) return false;
  return true;
}

export const STATIC_DUNGEON_BOARD = generateStaticDungeonBoard();