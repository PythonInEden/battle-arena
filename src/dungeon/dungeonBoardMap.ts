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
export const BOARD_HEIGHT = 42;
export const BOARD_SIZE = BOARD_WIDTH; // Legacy fallback constant

/**
 * 2014 Official Dungeon! Board Tier Colors
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
 * 🗺️ 40x42 CELL-BY-CELL BOARD BLUEPRINT
 */
const ASCII_MAP = [
  "########################################",
  "#####33#####33####2222####33#####33#####",
  "#####33h####33h###2222f###33h####33h####",
  "######g######g#####e#######g######g#####",
  "####33g33##33g33##22e22##33g33##33g33###",
  "####33h33h#33h33h#22f22f#33h33h#33h33h##",
  "#####g##g###g##g###e##e###g##g###g##g###",
  "#####g##g###g##g##222222##g##g###g##g###",
  "#####g##g###g##g##222222f#g##g###g##g###",
  "#####g##g###g##g#####e####g##g###g##g###",
  "####33g33g#22e22e##22e22##33g33g#33g33##",
  "####33h33h#22f22f##22f22f#33h33h#33h33h#",
  "#####g##g###e##e####e##e###g##g###g##g##",
  "#####g##g###e##e#c#11c#e###g##g###g##g##",
  "####44i44i#22e22ed#11d#e#44i44i#44i44i##",
  "####44j44j#22f22f#c#c##e#44j44j#44j44j##",
  "#####i##i###e##e##c#c##e###i##i###i##i##",
  "####44i44i##c11c11c#c11c11ci##i###i##i##",
  "####44j44j##d11d11d#d11d11dj##i###i##i##",
  "#####i##i####c##c#####c##c####i###i##i##",
  "#####i##i###11cc#HHHH#cc11c###i###i##i##",
  "####44i44i##11cd#HHHH#dc11c##44i#44i44i#",
  "####44j44j###c###HHHH###c####44j#44j44j#",
  "#####i##i####c###HHHH###c#####i###i##i##",
  "#####i##i###11cc#HHHH#cc11c###i###i##i##",
  "####44i44i##11cd#HHHH#dc11c##44i#44i44i#",
  "####44j44j###c##c#####c##c###44j#44j44j#",
  "#####i##i####c11c11c#c11c11c##i###i##i##",
  "#####i##i####d11d11d#d11d11d##i###i##i##",
  "####55k55k###c##c#####c##c###55k#55k55k#",
  "####55l55l##55k55k###55k55k##55l#55l55l#",
  "#####k##k###55l55l#S#55l55l###k###k##k##",
  "####55k55k###k##k#####k##k###55k#55k55k#",
  "####55l55l##66m66m###66m66m##55l#55l55l#",
  "#####k##k###66n66n###66n66n###k###k##k##",
  "#####k##k####m##m#####m##m####k###k##k##",
  "####55k55k##66m66m###66m66m##55k#55k55k#",
  "####55l55l##66n66n###66n66n##55l#55l55l#",
  "#####k##k####m##m#####m##m####k###k##k##",
  "####55k55k##6666m6666m6666m##55k#55k55k#",
  "####55l55l##6666n6666n6666n##55l#55l55l#",
  "########################################"
];

/**
 * Registry of Official Named Locations
 */
export const OFFICIAL_NAMED_LOCATIONS: Record<string, { name: string; level: number; x: number; y: number; w: number; h: number }> = {
  great_hall: { name: 'Great Hall', level: 0, x: 17, y: 20, w: 4, h: 6 },
  kitchen: { name: 'Kitchen', level: 2, x: 18, y: 1, w: 4, h: 2 },
  guard_room: { name: 'Guard Room', level: 2, x: 18, y: 7, w: 6, h: 2 },
  armory: { name: 'Armory', level: 3, x: 4, y: 1, w: 2, h: 2 },
  pantry: { name: 'Pantry', level: 3, x: 34, y: 1, w: 2, h: 2 },
  cells: { name: 'Cells', level: 4, x: 4, y: 14, w: 2, h: 2 },
  chapel: { name: 'Chapel', level: 4, x: 34, y: 14, w: 2, h: 2 },
  the_hole: { name: 'The Hole', level: 5, x: 4, y: 30, w: 2, h: 2 },
  torture_chamber: { name: 'Torture Chamber', level: 5, x: 12, y: 30, w: 2, h: 2 },
  laboratory: { name: 'Laboratory', level: 5, x: 34, y: 30, w: 2, h: 2 },
  crypt: { name: 'Crypt', level: 5, x: 34, y: 33, w: 2, h: 2 },
  the_lair: { name: 'THE LAIR', level: 6, x: 13, y: 39, w: 4, h: 2 },
  the_burrow: { name: 'THE BURROW', level: 6, x: 23, y: 39, w: 4, h: 2 },
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

        case 'c': type = 'CORRIDOR'; level = 1; break;
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