// src/fortress/MapEngine.ts
import { TileState, TerrainType, QuestRelic, Position } from './types';

/**
 * Deterministic Pseudo-Random Number Generator (PRNG) to guarantee cross-device sync[cite: 1].
 */
export class SeededPRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  public next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public nextRange(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/**
 * Procedural Map Generation Engine enforcing immutable generation equations[cite: 1].
 */
export class MapEngine {
  public static getGridSize(difficultyLevel: number): number {
    switch (difficultyLevel) {
      case 1: return 12; // 144 Tiles[cite: 1]
      case 2: return 20; // 400 Tiles[cite: 1]
      case 3: return 28; // 784 Tiles[cite: 1]
      case 4: return 34; // 1156 Tiles[cite: 1]
      default: return 20;
    }
  }

  private static getManhattanDistance(p1: Position, p2: Position): number {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  }

  public static generateProceduralMap(seed: number, difficultyLevel: number): TileState[][] {
    const prng = new SeededPRNG(seed);
    const S = this.getGridSize(difficultyLevel);
    const dMin = Math.floor(S / 5); // Anti-Clustering Space Limit[cite: 1]

    // Formulaic Target Quantities[cite: 1]
    const targetTowns = Math.max(1, Math.floor((S * S / 100) * (1.1 - difficultyLevel / 22)));
    const targetSanctuaries = Math.max(1, Math.floor((S * S / 130) * (1.1 - difficultyLevel / 22)));

    // Initialize Baseline Matrix Layout with Weighted Natural Terrain Types[cite: 1]
    const grid: TileState[][] = [];
    for (let x = 0; x < S; x++) {
      grid[x] = [];
      for (let y = 0; y < S; y++) {
        const roll = prng.next();
        let terrain: TerrainType = 'PLAINS';
        if (roll < 0.25) terrain = 'FOREST';
        else if (roll < 0.45) terrain = 'MOUNTAIN';
        else if (roll < 0.55) terrain = 'LAKE';

        grid[x][y] = { x, y, terrain, isExplored: false, hasRelic: null, hasHiddenLoot: null };
      }
    }

    const assignedSafePositions: Position[] = [];

    // Helper to spawn safe structures enforcing the Manhattan dMin constraint[cite: 1]
    const spawnStructureFiltered = (type: 'TOWN' | 'SANCTUARY', count: number) => {
      let spawned = 0;
      let attempts = 0;
      while (spawned < count && attempts < 1000) {
        attempts++;
        const rx = prng.nextRange(0, S - 1);
        const ry = prng.nextRange(0, S - 1);
        const candidate: Position = { x: rx, y: ry };

        const violatesSpacing = assignedSafePositions.some(
          (pos) => this.getManhattanDistance(pos, candidate) < dMin
        );

        if (!violatesSpacing) {
          grid[rx][ry].terrain = type;
          assignedSafePositions.push(candidate);
          spawned++;
        }
      }
    };

    spawnStructureFiltered('TOWN', targetTowns);
    spawnStructureFiltered('SANCTUARY', targetSanctuaries);

    // Position Citadel strictly within a remote quadrant surrounded by an array of Mountain blocks[cite: 1]
    let citadelSpawned = false;
    let citAttempts = 0;
    while (!citadelSpawned && citAttempts < 500) {
      citAttempts++;
      const cx = prng.nextRange(Math.floor(S * 0.6), S - 1);
      const cy = prng.nextRange(Math.floor(S * 0.6), S - 1);

      if (grid[cx][cy].terrain !== 'TOWN' && grid[cx][cy].terrain !== 'SANCTUARY') {
        grid[cx][cy].terrain = 'CITADEL';
        
        // Build protective buffer of mountain zones[cite: 1]
        const directions = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,-1],[1,-1],[-1,1]];
        directions.forEach(([dx, dy]) => {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < S && ny >= 0 && ny < S) {
            if (grid[nx][ny].terrain !== 'CITADEL') {
              grid[nx][ny].terrain = 'MOUNTAIN';
            }
          }
        });
        citadelSpawned = true;
      }
    }

    // Hide the 4 Quest Relics exclusively on Mountain tiles[cite: 1]
    const relics: QuestRelic[] = ['HORN_OF_OPENING', 'BOOTS_OF_STEALTH', 'ARMOR_OF_DEFENSE', 'SWORD_OF_STRENGTH'];
    relics.forEach((relic) => {
      let relicPlaced = false;
      let relAttempts = 0;
      while (!relicPlaced && relAttempts < 1000) {
        relAttempts++;
        const mx = prng.nextRange(0, S - 1);
        const my = prng.nextRange(0, S - 1);
        if (grid[mx][my].terrain === 'MOUNTAIN' && grid[mx][my].hasRelic === null) {
          grid[mx][my].hasRelic = relic;
          relicPlaced = true;
        }
      }
    });

    return grid;
  }
}