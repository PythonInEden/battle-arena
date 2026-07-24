// src/fortress/MarketplaceEngine.ts
import { TroopRoster, PlayerInventory } from './types';

export interface ShopItem {
  id: string;
  name: string;
  category: 'TROOP' | 'RESOURCE' | 'SCROLL' | 'EQUIPMENT';
  basePrice: number;
  spawnChance: number;
  description: string;
}

export const MASTER_SHOP_CATALOG: ShopItem[] = [
  { id: 'rations', name: 'Pack of Rations (10x)', category: 'RESOURCE', basePrice: 20, spawnChance: 1.0, description: '10 food supplies for troop upkeep.' },
  { id: 'warriors', name: 'Warriors (5x)', category: 'TROOP', basePrice: 50, spawnChance: 1.0, description: 'Frontline melee combat troops.' },
  { id: 'scouts', name: 'Scout Specialist', category: 'TROOP', basePrice: 40, spawnChance: 1.0, description: 'Increases vision radius and camp evasion.' },
  { id: 'clerics', name: 'Cleric Healer', category: 'TROOP', basePrice: 60, spawnChance: 1.0, description: 'Provides post-combat passive healing.' },
  { id: 'raiders', name: 'Raider Specialist', category: 'TROOP', basePrice: 70, spawnChance: 1.0, description: 'Stealth unit used to raid opponent camps.' },
  { id: 'mules', name: 'Pack Mule', category: 'TROOP', basePrice: 30, spawnChance: 1.0, description: 'Increases gold carrying capacity (+50 GP).' },
  { id: 'raft_bundle', name: 'River Raft + 4 Mules', category: 'EQUIPMENT', basePrice: 300, spawnChance: 0.65, description: 'Allows sailing across Lake tiles.' },
  { id: 'wizard', name: 'Grand Wizard', category: 'TROOP', basePrice: 200, spawnChance: 0.40, description: 'Grants +20% party combat strength & spellfire.' },
  { id: 'scroll_teleport', name: 'Teleport Scroll', category: 'SCROLL', basePrice: 150, spawnChance: 0.30, description: 'Instant transport to safe havens or pins.' },
  { id: 'scroll_seeing', name: 'Spell of Seeing Scroll', category: 'SCROLL', basePrice: 100, spawnChance: 0.10, description: 'Temporarily reveals unexplored regions.' },
];

export type MerchantMood = 'HAPPY' | 'THINKING' | 'ANGRY';

export interface HaggleResult {
  outcome: 'ACCEPTED' | 'COUNTER' | 'EJECTED';
  finalPrice?: number;
  counterPrice?: number;
  mood: MerchantMood;
  message: string;
}

export class MarketplaceEngine {
  /**
   * Generates shop inventory based on specifications and active caps.
   */
  public static generateAvailableInventory(
    troops: TroopRoster,
    inventory: PlayerInventory
  ): ShopItem[] {
    return MASTER_SHOP_CATALOG.filter((item) => {
      // Check spawn chance roll
      if (Math.random() > item.spawnChance) return false;

      // Auto-hiding capacity checks
      if (item.id === 'scouts' && troops.scouts >= 10) return false;
      if (item.id === 'raiders' && troops.raiders >= 14) return false;
      if (item.id === 'wizard' && troops.wizards >= 1) return false;
      if (item.id === 'raft_bundle' && inventory.hasRaft) return false;
      if (item.id === 'scroll_seeing' && inventory.scrollsSeeing >= 1) return false;

      return true;
    });
  }

  /**
   * Evaluates player's price bid against merchant's mood and quotes.
   */
  public static evaluateBid(quotePrice: number, bidPrice: number): HaggleResult {
    const ratio = bidPrice / quotePrice;

    // Safe Zone (R >= 0.90): Instant Deal
    if (ratio >= 0.90) {
      return {
        outcome: 'ACCEPTED',
        finalPrice: bidPrice,
        mood: 'HAPPY',
        message: '😊 Merchant accepts your fair offer gladly!',
      };
    }

    // Haggle Zone (0.70 <= R < 0.90)
    if (ratio >= 0.70) {
      const acceptanceChance = (ratio - 0.50); // (R - 0.50) * 100%
      if (Math.random() <= acceptanceChance) {
        return {
          outcome: 'ACCEPTED',
          finalPrice: bidPrice,
          mood: 'HAPPY',
          message: '🙂 Merchant groans slightly, but agrees to the deal.',
        };
      } else {
        const counter = Math.round((quotePrice + bidPrice) / 2);
        return {
          outcome: 'COUNTER',
          counterPrice: counter,
          mood: 'THINKING',
          message: `🤨 Merchant rejects ${bidPrice} GP. Counter offer: ${counter} GP.`,
        };
      }
    }

    // Greed Zone (R < 0.70): Risk anger ejection
    const angerChance = (0.70 - ratio) * 1.5;
    if (Math.random() <= angerChance) {
      return {
        outcome: 'EJECTED',
        mood: 'ANGRY',
        message: '😡 "Get out of my shop, you cheap insult!" Merchant kicks you out!',
      };
    }

    // Narrow escape in greed zone
    const counter = Math.round((quotePrice + bidPrice) / 2);
    return {
      outcome: 'COUNTER',
      counterPrice: counter,
      mood: 'ANGRY',
      message: `😠 Merchant is offended by your lowball. Hard counter: ${counter} GP!`,
    };
  }
}