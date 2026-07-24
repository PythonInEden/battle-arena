// src/fortress/LogisticalEngine.ts
import { Position, TileState, PlayerInventory } from './types';

export class LogisticalEngine {
  public static calculateSightRadius(scoutCount: number): number {
    const validScouts = Math.max(0, scoutCount);
    return 1 + Math.floor(validScouts / 2);
  }

  public static getMovementCost(
    currentPos: Position,
    targetTile: TileState,
    inventory: PlayerInventory
  ): { cost: number; isValid: boolean; reason?: string } {
    const dx = Math.abs(currentPos.x - targetTile.x);
    const dy = Math.abs(currentPos.y - targetTile.y);

    // 1. ALLOW TAPPING CURRENT TILE (dx === 0 && dy === 0) FOR RE-ENTRY / RESTING (1 MF)
    if (dx === 0 && dy === 0) {
      return { cost: 1, isValid: true };
    }

    // Step must be adjacent
    if (dx > 1 || dy > 1) {
      return { cost: 0, isValid: false, reason: 'Invalid target tile: Must be adjacent.' };
    }

    // Check Lake barriers and Raft requirement
    if (targetTile.terrain === 'LAKE') {
      if (!inventory.hasRaft) {
        return { cost: 0, isValid: false, reason: 'Cannot enter Lake tile without an active Raft.' };
      }
    }

    let baseCost = (dx === 1 && dy === 1) ? 2 : 1;
    if (targetTile.terrain === 'MOUNTAIN') {
      baseCost += 1;
    }

    return { cost: baseCost, isValid: true };
  }

  public static canExecuteStep(remainingMF: number, calculatedCost: number): boolean {
    if (remainingMF <= 0) return false;
    if (remainingMF >= calculatedCost) return true;
    return remainingMF === 1 && calculatedCost > 1;
  }

  public static calculateRationUpkeep(warriorCount: number): number {
    const safeWarriors = Math.max(0, warriorCount);
    return 1 + Math.floor(safeWarriors / 10);
  }

  public static calculateStarvationLosses(warriorCount: number): number {
    if (warriorCount <= 0) return 0;
    const losses = Math.floor(0.08 * warriorCount + 2);
    return Math.min(warriorCount, losses);
  }
}