// src/fortress/LogisticalEngine.ts
import { Position, TileState, PlayerInventory } from './types';

export class LogisticalEngine {
  /**
   * Calculates total player sight radius based on Scout count.
   * Base vision: 1 tile. +1 tile radius per 2 active Scouts.
   */
  public static calculateSightRadius(scoutCount: number): number {
    const validScouts = Math.max(0, scoutCount);
    return 1 + Math.floor(validScouts / 2);
  }

  /**
   * Calculates Movement Factor (MF) cost for moving from currentPos to targetTile.
   */
  public static getMovementCost(
    currentPos: Position,
    targetTile: TileState,
    inventory: PlayerInventory
  ): { cost: number; isValid: boolean; reason?: string } {
    const dx = Math.abs(currentPos.x - targetTile.x);
    const dy = Math.abs(currentPos.y - targetTile.y);

    // Step must be adjacent (1 tile distance in any direction)
    if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
      return { cost: 0, isValid: false, reason: 'Invalid target tile: Must be adjacent.' };
    }

    // Check Lake barriers and Raft requirement
    if (targetTile.terrain === 'LAKE') {
      if (!inventory.hasRaft) {
        return { cost: 0, isValid: false, reason: 'Cannot enter Lake tile without an active Raft.' };
      }
    }

    // Base cost: Orthogonal (N, S, E, W) = 1 MF, Diagonal = 2 MF
    let baseCost = (dx === 1 && dy === 1) ? 2 : 1;

    // Mountain terrain penalty (+1 MF)[cite: 1]
    if (targetTile.terrain === 'MOUNTAIN') {
      baseCost += 1;
    }

    return { cost: baseCost, isValid: true };
  }

  /**
   * Evaluates the Last Factor Rule: If remaining MF is exactly 1, permits diagonal or mountain steps[cite: 1].
   */
  public static canExecuteStep(remainingMF: number, calculatedCost: number): boolean {
    if (remainingMF <= 0) return false;
    if (remainingMF >= calculatedCost) return true;
    
    // The Last Factor Rule: If player has exactly 1 MF left, allow step even if cost > 1[cite: 1]
    return remainingMF === 1 && calculatedCost > 1;
  }

  /**
   * Calculates end-of-turn Logistics Upkeep Ration Consumption[cite: 1].
   * Formula: U = 1 + floor(Warriors / 10)[cite: 1]
   */
  public static calculateRationUpkeep(warriorCount: number): number {
    const safeWarriors = Math.max(0, warriorCount);
    return 1 + Math.floor(safeWarriors / 10);
  }

  /**
   * Calculates Starvation Casualties when Rations hit 0[cite: 1, 2].
   * Formula: S = floor(0.08 * W + 2)[cite: 1, 2]
   */
  public static calculateStarvationLosses(warriorCount: number): number {
    if (warriorCount <= 0) return 0;
    const losses = Math.floor(0.08 * warriorCount + 2);
    return Math.min(warriorCount, losses);
  }
}