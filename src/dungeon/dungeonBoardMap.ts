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

export const BOARD_SIZE = 30;

export const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  0: { bg: '#032e27', border: '#00ffcc', text: '#00ffcc', label: 'Great Hall (Center)' },
  1: { bg: '#3a2e00', border: '#eab308', text: '#fef08a', label: 'Level 1 (Yellow)' },
  2: { bg: '#3b1c00', border: '#f97316', text: '#fdba74', label: 'Level 2 (Orange - West)' },
  3: { bg: '#0f2942', border: '#3b82f6', text: '#93c5fd', label: 'Level 3 (Blue - West)' },
  4: { bg: '#2e104a', border: '#a855f7', text: '#e9d5ff', label: 'Level 4 (Purple - North)' },
  5: { bg: '#3f0c0c', border: '#ef4444', text: '#fca5a5', label: 'Level 5 (Red - East)' },
  6: { bg: '#1f0033', border: '#d8b4fe', text: '#f5d0fe', label: 'Level 6 (Deep Purple)' },
};

/**
 * 🗺️ ASCII MAP BLUEPRINT
 * This allows us to draw exact 1-tile winding paths and discrete small rooms.
 * 
 * Key:
 * # = WALL (Solid Rock)
 * H = GREAT HALL
 * S = SECRET DOOR
 * 
 * Rooms/Chambers:     Corridors:     Doors:
 * 1 = Level 1         c = L1 Path    d = L1 Door
 * 2 = Level 2         e = L2 Path    f = L2 Door
 * 3 = Level 3         g = L3 Path    h = L3 Door
 * 4 = Level 4         i = L4 Path    j = L4 Door
 * 5 = Level 5         k = L5 Path    l = L5 Door
 * 6 = Level 6         m = L6 Path    n = L6 Door
 */
const ASCII_MAP = [
  "##############################",
  "###22##22####44#44######55####",
  "###22f#22f###44j44#k####55####",
  "####e##e#######i###k#l5555####",
  "##22e##e22###44i44#k##5555####",
  "##22f##f22###44j44#k##########",
  "####e##e#######i###k##5555####",
  "##22e##e11#c#11i###k#l5555####",
  "##22f##d11c#c11d###k####55####",
  "####e###c###c#######k###l#k###",
  "###e#c11c###c11c#k##k5555#k###",
  "###e#d11c#S#c11d#k##l5555#k###",
  "###e##c#######c##k########k###",
  "##22##c11#HHHH#11ck#######k###",
  "##22f#d11dHHHHd11dkk##666#k###",
  "####e##c##HHHH##c##k##666n66##",
  "###33##c##HHHH##c##m##666#66##",
  "###33h#d11dHHHHd11dm#######m##",
  "####g##c11#HHHH#11cm#######m##",
  "##33g##c#######c###m#6666##m##",
  "##33h#d11c#S#c11d#nm#6666##m##",
  "####g#c11c###c11c##m#6666##m##",
  "##33g###c###c######m#######m##",
  "##33h##d11c#c11d###m#6666n66##",
  "####g##e11#c#11m###m#6666#66##",
  "###g##g########m###m#6666#####",
  "##33g33h#######m###m##########",
  "##33#33########m###m#66666####",
  "###############m###n#66666####",
  "##############################"
];

export function generateStaticDungeonBoard(): TileData[][] {
  const grid: TileData[][] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      const char = ASCII_MAP[y][x];
      
      let type: TileType = 'WALL';
      let level = 0;

      // 1. Map Characters to Types
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
        case '5': type = 'CHAMBER'; level = 5; break; 
        case '6': type = 'CHAMBER'; level = 6; break;
      }

      // 2. Generate a Room ID based on rough proximity blocks so the engine can lock them
      let roomId = undefined;
      if (['ROOM', 'CHAMBER', 'DOOR'].includes(type)) {
        // Groups adjacent room tiles into logical blocks
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