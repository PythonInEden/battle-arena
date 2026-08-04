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
  roomName?: string;
  doorId?: string;
}

export const BOARD_WIDTH = 40;
export const BOARD_HEIGHT = 40;
export const BOARD_SIZE = BOARD_WIDTH; // Legacy fallback constant

/**
 * 2014 Official Dungeon! Board Tier Colors (from bottom-right Dungeon Key)
 */
export const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  0: { bg: '#032e27', border: '#00ffcc', text: '#00ffcc', label: 'Great Hall (Level 1 Center)' },
  1: { bg: '#3a2e00', border: '#eab308', text: '#fef08a', label: 'Level 1 (Yellow)' },
  2: { bg: '#3b1c00', border: '#f97316', text: '#fdba74', label: 'Level 2 (Orange - North)' },
  3: { bg: '#3f0c0c', border: '#ef4444', text: '#fca5a5', label: 'Level 3 (Red - Top Wings)' },
  4: { bg: '#2e104a', border: '#c084fc', text: '#f0abfc', label: 'Level 4 (Purple - Mid Wings)' },
  5: { bg: '#0f2942', border: '#3b82f6', text: '#93c5fd', label: 'Level 5 (Blue - Lower Wings)' },
  6: { bg: '#042f2e', border: '#14b8a6', text: '#99f6e4', label: 'Level 6 (Teal - Deep Lair)' },
};

/**
 * 🗺️ 40x40 CELL-BY-CELL BOARD BLUEPRINT
 * Directly copied from your Excel layout & official 2014 board game!
 *
 * Blueprint Legend:
 *  # = WALL (Solid Cavern Rock)
 *  H = GREAT HALL (Center Hub)
 *  S = SECRET DOOR (Hidden Passage)
 *
 *  Rooms / Chambers:         1-Tile Corridors:       Door Entrances:
 *  1 = Level 1 (Yellow)      c/C = L1 Path           d = L1 Door
 *  2 = Level 2 (Orange)      e = L2 Path             f = L2 Door
 *  3 = Level 3 (Red)         g = L3 Path             h = L3 Door
 *  4 = Level 4 (Purple)      i = L4 Path             j = L4 Door
 *  5 = Level 5 (Blue)        k = L5 Path             l = L5 Door
 *  6 = Level 6 (Teal)        m = L6 Path             n = L6 Door
 */
const ASCII_MAP = [
  "########################################",
  "#################2222###################",
  "#################2222###################",
  "#################22f2###################",
  "########ggggg########eeeeeeeeee#########",
  "#######33g33g##########e######ed33######",
  "#######33h33h##111#####e######e111######",
  "########g#g###e1d1#222#e######e#########",
  "########g#g###e####222f#d11###ed33######",
  "########g#g###e####222#111####e111######",
  "########g#g####e####e#########e#########",
  "########g#g####eeeeee#########e#########",
  "#######33g33g#######e#########ed11######",
  "#######33h33h#######e#d11#####e111######",
  "########g#g#########e#111#####e#########",
  "###444##g#g#########e#########ed11######",
  "###444j#g#g########111########e111######",
  "#####i##g#g########1d1#c######e#########",
  "#####i##ggggg#######e##c######e#########",
  "###44jiii###########e##c######e#########",
  "###4444i############ccccCCCCCCC#########",
  "###4444i###############cHHHHc###########",
  "#######ij44#######1d1##cHHHHc###########",
  "#######i444#######111##cHHHHc###########",
  "#######i###############cHHHHc###########",
  "#######ij44############CCCCCC###########",
  "#######i444####1d1#####c######m#########",
  "###############111#####c######m#########",
  "########kkkkkkkkkkkkkkkkkkkkkkm#########",
  "########j55##d11#######k######m#########",
  "########555##111#######k######m#########",
  "#######################k######m#########",
  "#######################k######m#########",
  "########mmmmmmmmmmmmmmmmmmmmmmm#########",
  "########n66##d11#######m######m#########",
  "########666##111#######m######m#########",
  "#######################m######m#########",
  "########################################",
  "########################################",
  "########################################"
];

/**
 * Registry of Official Named Locations
 */
export const OFFICIAL_NAMED_LOCATIONS: Record<string, { name: string; level: number; x: number; y: number; w: number; h: number }> = {
  great_hall: { name: 'Great Hall', level: 0, x: 23, y: 21, w: 4, h: 4 },
  kitchen: { name: 'Kitchen', level: 2, x: 17, y: 1, w: 4, h: 3 },
  guard_room: { name: 'Guard Room', level: 2, x: 15, y: 7, w: 3, h: 3 },
  armory: { name: 'Armory', level: 3, x: 7, y: 5, w: 2, h: 2 },
  pantry: { name: 'Pantry', level: 3, x: 31, y: 5, w: 2, h: 2 },
  cells: { name: 'Cells', level: 4, x: 3, y: 15, w: 3, h: 2 },
  chapel: { name: 'Chapel', level: 4, x: 31, y: 15, w: 2, h: 2 },
  the_hole: { name: 'The Hole', level: 5, x: 9, y: 29, w: 2, h: 2 },
  torture_chamber: { name: 'Torture Chamber', level: 5, x: 23, y: 29, w: 2, h: 2 },
  laboratory: { name: 'Laboratory', level: 5, x: 31, y: 29, w: 2, h: 2 },
  the_lair: { name: 'THE LAIR', level: 6, x: 9, y: 34, w: 2, h: 2 },
  the_burrow: { name: 'THE BURROW', level: 6, x: 23, y: 34, w: 2, h: 2 },
};

export function generateStaticDungeonBoard(): TileData[][] {
  const grid: TileData[][] = [];

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const char = ASCII_MAP[y]?.[x] || '#';

      let type: TileType = 'WALL';
      let level = 0;

      switch (char) {
        case '#': type = 'WALL'; level = 0; break;
        case 'H': type = 'GREAT_HALL'; level = 0; break;
        case 'S': type = 'SECRET_DOOR'; level = 0; break;

        case 'c':
        case 'C': type = 'CORRIDOR'; level = 1; break;
        case 'e': type = 'CORRIDOR'; level = 2; break;
        case 'g': type = 'CORRIDOR'; level = 3; break;
        case 'i': type = 'CORRIDOR'; level = 4; break;
        case 'k': type = 'CORRIDOR'; level = 5; break;
        case 'm': type = 'CORRIDOR'; level = 6; break;

        case 'd': type = 'DOOR'; level = 1; break;
        case 'f': type = 'DOOR'; level = 2; break;
        case 'h': type = 'DOOR'; level = 3; break;
        case 'j': type = 'DOOR'; level = 4; break;
        case 'l': type = 'DOOR'; level = 5; break;
        case 'n': type = 'DOOR'; level = 6; break;

        case '1': type = 'ROOM'; level = 1; break;
        case '2': type = 'ROOM'; level = 2; break;
        case '3': type = 'ROOM'; level = 3; break;
        case '4': type = 'ROOM'; level = 4; break;
        case '5': type = 'ROOM'; level = 5; break;
        case '6': type = 'ROOM'; level = 6; break;
      }

      let roomId = undefined;
      let roomName = undefined;

      if (['ROOM', 'CHAMBER', 'GREAT_HALL', 'DOOR'].includes(type)) {
        for (const [key, loc] of Object.entries(OFFICIAL_NAMED_LOCATIONS)) {
          if (x >= loc.x && x < loc.x + loc.w && y >= loc.y && y < loc.y + loc.h) {
            roomId = key;
            roomName = loc.name;
            if (type === 'ROOM' && (key === 'the_lair' || key === 'the_burrow' || key === 'torture_chamber' || key === 'crypt')) {
              type = 'CHAMBER';
            }
            break;
          }
        }
        if (!roomId) {
          roomId = `room_l${level}_${Math.floor(x / 3)}_${Math.floor(y / 3)}`;
          roomName = `Level ${level} Chamber (${x}, ${y})`;
        }
      }

      row.push({ x, y, type, level, roomId, roomName });
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