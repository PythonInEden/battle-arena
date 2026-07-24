// src/fortress/MarketplaceEngine.ts
import { TroopRoster, PlayerInventory } from './types';
import { FORTRESS_LANG } from './languages';

export interface ShopItem {
  id: string;
  nameKey: string;
  descKey: string;
  category: 'TROOP' | 'RESOURCE' | 'SCROLL' | 'EQUIPMENT';
  basePrice: number;
  spawnChance: number;
}

export const MASTER_SHOP_CATALOG: ShopItem[] = [
  { id: 'rations', nameKey: 'itemRationsName', descKey: 'itemRationsDesc', category: 'RESOURCE', basePrice: 20, spawnChance: 1.0 },
  { id: 'warriors', nameKey: 'itemWarriorsName', descKey: 'itemWarriorsDesc', category: 'TROOP', basePrice: 50, spawnChance: 1.0 },
  { id: 'scouts', nameKey: 'itemScoutsName', descKey: 'itemScoutsDesc', category: 'TROOP', basePrice: 40, spawnChance: 1.0 },
  { id: 'clerics', nameKey: 'itemClericsName', descKey: 'itemClericsDesc', category: 'TROOP', basePrice: 60, spawnChance: 1.0 },
  { id: 'raiders', nameKey: 'itemRaidersName', descKey: 'itemRaidersDesc', category: 'TROOP', basePrice: 70, spawnChance: 1.0 },
  { id: 'mules', nameKey: 'itemMulesName', descKey: 'itemMulesDesc', category: 'TROOP', basePrice: 30, spawnChance: 1.0 },
  { id: 'raft_bundle', nameKey: 'itemRaftName', descKey: 'itemRaftDesc', category: 'EQUIPMENT', basePrice: 300, spawnChance: 0.65 },
  { id: 'wizard', nameKey: 'itemWizardName', descKey: 'itemWizardDesc', category: 'TROOP', basePrice: 200, spawnChance: 0.40 },
  { id: 'scroll_teleport', nameKey: 'itemTeleportName', descKey: 'itemTeleportDesc', category: 'SCROLL', basePrice: 150, spawnChance: 0.30 },
  { id: 'scroll_seeing', nameKey: 'itemSeeingName', descKey: 'itemSeeingDesc', category: 'SCROLL', basePrice: 100, spawnChance: 0.10 },
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
  public static generateAvailableInventory(
    troops: TroopRoster,
    inventory: PlayerInventory
  ): ShopItem[] {
    return MASTER_SHOP_CATALOG.filter((item) => {
      if (Math.random() > item.spawnChance) return false;
      if (item.id === 'scouts' && troops.scouts >= 10) return false;
      if (item.id === 'raiders' && troops.raiders >= 14) return false;
      if (item.id === 'wizard' && troops.wizards >= 1) return false;
      if (item.id === 'raft_bundle' && inventory.hasRaft) return false;
      if (item.id === 'scroll_seeing' && inventory.scrollsSeeing >= 1) return false;

      return true;
    });
  }

  public static evaluateBid(quotePrice: number, bidPrice: number, locale: 'en' | 'vi'): HaggleResult {
    const t = FORTRESS_LANG[locale];
    const ratio = bidPrice / quotePrice;

    // Safe Zone (R >= 0.90)
    if (ratio >= 0.90) {
      return {
        outcome: 'ACCEPTED',
        finalPrice: bidPrice,
        mood: 'HAPPY',
        message: t.merchantHappy,
      };
    }

    // Haggle Zone (0.70 <= R < 0.90)
    if (ratio >= 0.70) {
      const acceptanceChance = (ratio - 0.50);
      if (Math.random() <= acceptanceChance) {
        return {
          outcome: 'ACCEPTED',
          finalPrice: bidPrice,
          mood: 'HAPPY',
          message: t.merchantGroan,
        };
      } else {
        const counter = Math.round((quotePrice + bidPrice) / 2);
        return {
          outcome: 'COUNTER',
          counterPrice: counter,
          mood: 'THINKING',
          message: `${t.merchantCounter} ${counter} GP.`,
        };
      }
    }

    // Greed Zone (R < 0.70)
    const angerChance = (0.70 - ratio) * 1.5;
    if (Math.random() <= angerChance) {
      return {
        outcome: 'EJECTED',
        mood: 'ANGRY',
        message: t.merchantAngry,
      };
    }

    const counter = Math.round((quotePrice + bidPrice) / 2);
    return {
      outcome: 'COUNTER',
      counterPrice: counter,
      mood: 'ANGRY',
      message: `${t.merchantOffended} ${counter} GP!`,
    };
  }
}