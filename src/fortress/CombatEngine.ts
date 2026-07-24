// src/fortress/CombatEngine.ts
import { TroopRoster } from './types';

export type EdibilityType = 'EDIBLE' | 'TOXIC' | 'INEDIBLE';

export interface MonsterProfile {
  id: string;
  nameKey: string;
  strength: number;
  imageKey: string;
  edibility: EdibilityType;
}

export const MONSTER_DATABASE: MonsterProfile[] = [
  { id: 'kobold', nameKey: 'monsterKobold', strength: 0.3, imageKey: 'kobold', edibility: 'EDIBLE' },
  { id: 'goblin', nameKey: 'monsterGoblin', strength: 0.5, imageKey: 'goblin', edibility: 'EDIBLE' },
  { id: 'bugbear', nameKey: 'monsterBugbear', strength: 0.6, imageKey: 'bugbear', edibility: 'EDIBLE' },
  { id: 'orc_berserker', nameKey: 'monsterOrc', strength: 0.7, imageKey: 'orc_berserker', edibility: 'EDIBLE' },
  { id: 'owlbear', nameKey: 'monsterOwlbear', strength: 5.0, imageKey: 'owlbear', edibility: 'EDIBLE' },
  { id: 'cave_troll', nameKey: 'monsterTroll', strength: 10.0, imageKey: 'cave_troll', edibility: 'EDIBLE' },
  { id: 'gargoyle', nameKey: 'monsterGargoyle', strength: 16.0, imageKey: 'gargoyle', edibility: 'EDIBLE' },
  { id: 'frost_giant', nameKey: 'monsterGiant', strength: 20.0, imageKey: 'frost_giant', edibility: 'EDIBLE' },
  { id: 'chimera', nameKey: 'monsterChimera', strength: 35.0, imageKey: 'chimera', edibility: 'EDIBLE' },
  
  // Toxic Monsters
  { id: 'mind_flayer', nameKey: 'monsterMindFlayer', strength: 25.0, imageKey: 'mind_flayer', edibility: 'TOXIC' },
  { id: 'displacer_beast', nameKey: 'monsterDisplacer', strength: 8.0, imageKey: 'displacer_beast', edibility: 'TOXIC' },
  { id: 'gelatinous_cube', nameKey: 'monsterCube', strength: 2.5, imageKey: 'gelatinous_cube', edibility: 'TOXIC' },
  { id: 'ancient_red_dragon', nameKey: 'monsterDragon', strength: 40.0, imageKey: 'ancient_red_dragon', edibility: 'TOXIC' },
  { id: 'beholder', nameKey: 'monsterBeholder', strength: 100.0, imageKey: 'beholder', edibility: 'TOXIC' },
  { id: 'the_tarrasque', nameKey: 'monsterTarrasque', strength: 120.0, imageKey: 'the_tarrasque', edibility: 'TOXIC' },

  // Inedible Monsters
  { id: 'zombie', nameKey: 'monsterZombie', strength: 0.4, imageKey: 'zombie', edibility: 'INEDIBLE' },
  { id: 'skeleton_warrior', nameKey: 'monsterSkeleton', strength: 0.8, imageKey: 'skeleton_warrior', edibility: 'INEDIBLE' },
  { id: 'mimic_chest', nameKey: 'monsterMimic', strength: 5.0, imageKey: 'mimic_chest', edibility: 'INEDIBLE' },
  { id: 'iron_golem', nameKey: 'monsterIronGolem', strength: 30.0, imageKey: 'iron_golem', edibility: 'INEDIBLE' },
  { id: 'shadow_lich', nameKey: 'monsterLich', strength: 50.0, imageKey: 'shadow_lich', edibility: 'INEDIBLE' },
];

export interface EncounterGroup {
  monster: MonsterProfile;
  quantity: number;
  totalHp: number;
  maxHp: number;
  groupStrength: number;
}

export class CombatEngine {
  public static calculatePlayerCombatStrength(troops: TroopRoster): number {
    const csBase = (1.0 * troops.warriors) + (3.0 * troops.dwarves) + (2.0 * troops.elves);
    const wizardBonus = troops.wizards > 0 ? 0.20 : 0.0;
    return Math.max(1, csBase * (1.0 + wizardBonus));
  }

  public static calculateWinChance(playerCS: number, monsterCS: number): number {
    const total = playerCS + monsterCS;
    if (total <= 0) return 50;
    const chance = Math.round((playerCS / total) * 100);
    return Math.min(99, Math.max(1, chance));
  }

  public static checkEncounterTrigger(terrain: 'FOREST' | 'MOUNTAIN'): boolean {
    const roll = Math.random();
    if (terrain === 'FOREST') return roll <= 0.28;
    if (terrain === 'MOUNTAIN') return roll <= 0.80;
    return false;
  }

  public static spawnEncounter(terrain: 'FOREST' | 'MOUNTAIN', troops: TroopRoster): EncounterGroup {
    const playerCS = this.calculatePlayerCombatStrength(troops);
    const targetStrength = (0.4 + Math.random() * 0.5) * playerCS; // 40%-90% of player CS

    let candidates = MONSTER_DATABASE.filter(m => m.id !== 'shadow_lich');
    if (terrain === 'FOREST') {
      candidates = candidates.filter(m => m.strength <= 10.0);
    }

    const selectedMonster = candidates[Math.floor(Math.random() * candidates.length)];
    const quantity = Math.max(1, Math.floor(targetStrength / selectedMonster.strength));
    const groupStrength = quantity * selectedMonster.strength;
    
    // Recalibrated HP multiplier from 20 -> 6 for fast-paced 2-4 round tactical combat
    const totalHp = Math.max(15, Math.round(groupStrength * 6));

    return {
      monster: selectedMonster,
      quantity,
      totalHp,
      maxHp: totalHp,
      groupStrength,
    };
  }

  public static checkSurpriseRetreatOption(): boolean {
    return Math.random() <= 0.80;
  }

  public static calculatePoisonRisk(scoutCount: number): number {
    return Math.max(0, 0.30 - 0.05 * scoutCount);
  }

  public static harvestMonsterMeat(
    monster: MonsterProfile,
    quantity: number,
    scoutCount: number
  ): { rationsGained: number; isPoisoned: boolean } {
    if (monster.edibility === 'INEDIBLE') {
      return { rationsGained: 0, isPoisoned: false };
    }

    const baseYield = Math.max(1, Math.min(8, Math.floor(monster.strength * quantity)));

    if (monster.edibility === 'EDIBLE') {
      return { rationsGained: baseYield, isPoisoned: false };
    }

    const toxicYield = baseYield * 2;
    const poisonRisk = this.calculatePoisonRisk(scoutCount);
    const isPoisoned = Math.random() <= poisonRisk;

    return { rationsGained: toxicYield, isPoisoned };
  }
}