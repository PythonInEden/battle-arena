// src/fortress/MapEngine.ts
import { TileState, TerrainType, QuestRelic, Position } from './types';

/**
 * Deterministic Pseudo-Random Number Generator (PRNG).
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

export class MapEngine {
  public static getGridSize(difficultyLevel: number): number {
    switch (difficultyLevel) {
      case 1: return 12; // 144 Tiles
      case 2: return 20; // 400 Tiles
      case 3: return 28; // 784 Tiles[cite: 1]
      case 4: return 34; // 1156 Tiles[cite: 1]
      default: return 20;
    }
  }

  private static getManhattanDistance(p1: Position, p2: Position): number {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  }

  /**
   * Generates a procedural map with clustered contiguous lakes, mountain ranges, and forests[cite: 1].
   */
  public static generateProceduralMap(seed: number, difficultyLevel: number): TileState[][] {
    const prng = new SeededPRNG(seed);
    const S = this.getGridSize(difficultyLevel);
    const dMin = Math.floor(S / 5); // Anti-Clustering Spacing Constraint[cite: 1]

    // Target safe structures[cite: 1]
    const targetTowns = Math.max(1, Math.floor((S * S / 100) * (1.1 - difficultyLevel / 22)));
    const targetSanctuaries = Math.max(1, Math.floor((S * S / 130) * (1.1 - difficultyLevel / 22)));

    // 1. Initialize Baseline Plain Matrix[cite: 1]
    const grid: TileState[][] = [];
    for (let x = 0; x < S; x++) {
      grid[x] = [];
      for (let y = 0; y < S; y++) {
        grid[x][y] = { x, y, terrain: 'PLAINS', isExplored: false, hasRelic: null, hasHiddenLoot: null };
      }
    }

    // Helper: Expand a cluster of terrain from a center point[cite: 1]
    const growCluster = (center: Position, type: TerrainType, targetSize: number) => {
      const queue: Position[] = [center];
      let currentSize = 0;

      while (queue.length > 0 && currentSize < targetSize) {
        const curr = queue.shift()!;
        if (curr.x >= 0 && curr.x < S && curr.y >= 0 && curr.y < S) {
          if (grid[curr.x][curr.y].terrain === 'PLAINS') {
            grid[curr.x][curr.y].terrain = type;
            currentSize++;

            // Push neighboring orthogonal and diagonal tiles to expand blob[cite: 1]
            const neighbors = [
              { x: curr.x + 1, y: curr.y },
              { x: curr.x - 1, y: curr.y },
              { x: curr.x, y: curr.y + 1 },
              { x: curr.x, y: curr.y - 1 },
              { x: curr.x + 1, y: curr.y + 1 },
              { x: curr.x - 1, y: curr.y - 1 },
            ];

            // Shuffle neighbors deterministically using PRNG[cite: 1]
            for (const n of neighbors) {
              if (prng.next() > 0.3) {
                queue.push(n);
              }
            }
          }
        }
      }
    };

    // Dynamically calculate lake blob sizes based on grid dimension S
const minBlob = Math.max(4, Math.floor((S * S) * 0.02)); // ~2% of total map
const maxBlob = Math.max(8, Math.floor((S * S) * 0.04)); // ~4% of total map

const lakeClusterCount = Math.max(2, Math.floor(S / 5));
for (let i = 0; i < lakeClusterCount; i++) {
  const lx = prng.nextRange(2, S - 3);
  const ly = prng.nextRange(2, S - 3);
  const lakeBlobSize = prng.nextRange(minBlob, maxBlob);
  growCluster({ x: lx, y: ly }, 'LAKE', lakeBlobSize);
}

    // 3. Spawn Mountain Ranges[cite: 1]
    const mountainClusterCount = Math.max(3, Math.floor(S / 4));
    for (let i = 0; i < mountainClusterCount; i++) {
      const mx = prng.nextRange(1, S - 2);
      const my = prng.nextRange(1, S - 2);
      const mountainRangeSize = prng.nextRange(6, 14);
      growCluster({ x: mx, y: my }, 'MOUNTAIN', mountainRangeSize);
    }

    // 4. Spawn Dense Forest Woods[cite: 1]
    const forestClusterCount = Math.max(4, Math.floor(S / 3));
    for (let i = 0; i < forestClusterCount; i++) {
      const fx = prng.nextRange(1, S - 2);
      const fy = prng.nextRange(1, S - 2);
      const forestWoodSize = prng.nextRange(8, 16);
      growCluster({ x: fx, y: fy }, 'FOREST', forestWoodSize);
    }

    // 5. Spawn Towns & Sanctuaries enforcing Manhattan dMin spacing[cite: 1]
    const assignedSafePositions: Position[] = [];
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

    // 6. Spawn Citadel surrounded by protective mountain buffer[cite: 1]
    let citadelSpawned = false;
    let citAttempts = 0;
    while (!citadelSpawned && citAttempts < 500) {
      citAttempts++;
      const cx = prng.nextRange(Math.floor(S * 0.6), S - 1);
      const cy = prng.nextRange(Math.floor(S * 0.6), S - 1);

      if (grid[cx][cy].terrain !== 'TOWN' && grid[cx][cy].terrain !== 'SANCTUARY') {
        grid[cx][cy].terrain = 'CITADEL';
        
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

    // 7. Hide 4 Quest Relics on Mountain tiles[cite: 1]
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