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

export const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  0: { bg: '#032e27', border: '#00ffcc', text: '#00ffcc', label: 'Great Hall' },
  1: { bg: '#3a2e00', border: '#eab308', text: '#fef08a', label: 'Level 1 (Yellow)' },
  2: { bg: '#3b1c00', border: '#f97316', text: '#fdba74', label: 'Level 2 (Orange - West)' },
  3: { bg: '#0f2942', border: '#3b82f6', text: '#93c5fd', label: 'Level 3 (Blue - West)' },
  4: { bg: '#2e104a', border: '#a855f7', text: '#e9d5ff', label: 'Level 4 (Purple - North)' },
  5: { bg: '#3f0c0c', border: '#ef4444', text: '#fca5a5', label: 'Level 5 (Red - East)' },
  6: { bg: '#1f0033', border: '#d8b4fe', text: '#f5d0fe', label: 'Level 6 (Deep Purple - East Lair)' },
};

/**
 * 🗺️ EXCEL-CELL DIGITAL BOARD BLUEPRINT
 * 
 * Legend:
 *  W = Solid Rock Wall      . = Corridor Path      H = Great Hall
 *  D = Doorway (🚪)         S = Secret Door (❓)
 *  1 = L1 Room              2 = L2 Room            3 = L3 Room
 *  4 = L4 Room              5 = L5 Chamber         6 = L6 Chamber
 */
const EXCEL_BOARD_MAP = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WW2222WWWW2222WWWW4444WWWW555555WWWW",
  "WW2222DWWW2222DWWW4444DWWW555555DWWW",
  "WWWW.WWWWWW.WWWWWW.WWWWWWWW.WWWWWWWW",
  "WW2222WWWW2222WWWW4444WWWW555555WWWW",
  "WW2222DWWW2222DWWW4444DWWW555555DWWW",
  "WWWW.WWWWWW.WWWWWW.WWWWWWWW.WWWWWWWW",
  "WWWW.........1111..1111........WWWWW",
  "WWWW.1111....1111DWD1111...1111.WWWW",
  "WWWW.1111DWD.HHHHHHHHHHH.WD1111.WWWW",
  "WWWW.........HHHHHHHHHHH........WWWW",
  "WWWW.1111DWD.HHHHHHHHHHH.WD1111.WWWW",
  "WWWW.1111....1111DWD1111...1111.WWWW",
  "WWWW.........1111..1111........WWWWW",
  "WWWW.WWWWWW.WWWWWW.WWWWWWWW.WWWWWWWW",
  "WW3333DWWW3333DWWW6666DWWW666666DWWW",
  "WW3333WWWW3333WWWW6666WWWW666666WWWW",
  "WWWW.WWWWWW.WWWWWW.WWWWWWWW.WWWWWWWW",
  "WW3333DWWW3333DWWW6666DWWW666666DWWW",
  "WW3333WWWW3333WWWW6666WWWW666666WWWW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
];

export const BOARD_SIZE_X = EXCEL_BOARD_MAP[0].length;
export const BOARD_SIZE_Y = EXCEL_BOARD_MAP.length;
export const BOARD_SIZE = Math.max(BOARD_SIZE_X, BOARD_SIZE_Y);

export function generateStaticDungeonBoard(): TileData[][] {
  const grid: TileData[][] = [];

  for (let y = 0; y < BOARD_SIZE_Y; y++) {
    const row: TileData[] = [];
    const line = EXCEL_BOARD_MAP[y];

    for (let x = 0; x < BOARD_SIZE_X; x++) {
      const char = line[x] || 'W';
      let type: TileType = 'WALL';
      let level = 0;

      switch (char) {
        case 'W': type = 'WALL'; level = 0; break;
        case 'H': type = 'GREAT_HALL'; level = 0; break;
        case '.': type = 'CORRIDOR'; level = 1; break;
        case 'D': type = 'DOOR'; level = 1; break;
        case 'S': type = 'SECRET_DOOR'; level = 1; break;
        case '1': type = 'ROOM'; level = 1; break;
        case '2': type = 'ROOM'; level = 2; break;
        case '3': type = 'ROOM'; level = 3; break;
        case '4': type = 'ROOM'; level = 4; break;
        case '5': type = 'CHAMBER'; level = 5; break;
        case '6': type = 'CHAMBER'; level = 6; break;
      }

      // Assign a contiguous Room ID based on block regions
      let roomId = undefined;
      if (['ROOM', 'CHAMBER', 'DOOR'].includes(type)) {
        roomId = `room_${level}_${Math.floor(x / 4)}_${Math.floor(y / 4)}`;
      }

      row.push({ x, y, type, level, roomId });
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