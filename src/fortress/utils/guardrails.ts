// src/fortress/utils/guardrails.ts
import { TroopRoster, PlayerInventory } from '../types';

/**
 * Enforces strict carrying limits and maximum thresholds on resource mutations.
 * If gold exceeds active troop capacities, handles calculation overflow limits.
 */
export class StructuralGuardrails {
  private static readonly ABSOLUTE_GOLD_MAX = 30000;

  public static calculateMaxGoldCapacity(troops: TroopRoster): number {
    // Max Gold Pieces = 10 + (10 * W) + (5 * Sc) + (50 * M)
    const capacity = 10 + (10 * troops.warriors) + (5 * troops.scouts) + (50 * troops.mules);
    return Math.min(this.ABSOLUTE_GOLD_MAX, Math.max(0, capacity));
  }

  public static protectInventoryState(
    currentInventory: PlayerInventory,
    troops: TroopRoster,
    goldDelta: number,
    rationsDelta: number
  ): { updatedInventory: PlayerInventory; droppedGold: number } {
    let newGold = Math.max(0, currentInventory.gold + goldDelta);
    const newRations = Math.max(0, currentInventory.rations + rationsDelta);
    
    const maxCapacity = this.calculateMaxGoldCapacity(troops);
    let droppedGold = 0;

    if (newGold > maxCapacity) {
      droppedGold = newGold - maxCapacity;
      newGold = maxCapacity;
    }

    return {
      updatedInventory: {
        ...currentInventory,
        gold: newGold,
        rations: newRations,
      },
      droppedGold,
    };
  }
}