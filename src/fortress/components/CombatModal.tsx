// src/fortress/components/CombatModal.tsx
import React, { useState } from 'react';
import { EncounterGroup, CombatEngine } from '../CombatEngine';
import { TroopRoster, PlayerInventory } from '../types';
import { FORTRESS_LANG, LanguageType } from '../languages';

interface CombatModalProps {
  encounter: EncounterGroup;
  troops: TroopRoster;
  inventory: PlayerInventory;
  locale: LanguageType;
  allowSurpriseRetreat: boolean;
  isHolyVengeanceActive?: boolean;
  onRetreat: (goldDropped?: number) => void;
  onVictory: (updatedTroops: TroopRoster, updatedInventory: PlayerInventory, rationsGained: number, goldLooted: number, isPoisoned: boolean) => void;
  onDefeat: () => void;
  onPrayerRecovery?: (rewardType: 'WARRIORS' | 'RATIONS', amount: number) => void;
}

export const CombatModal: React.FC<CombatModalProps> = ({
  encounter,
  troops,
  inventory,
  locale,
  allowSurpriseRetreat,
  isHolyVengeanceActive = false,
  onRetreat,
  onVictory,
  onDefeat,
  onPrayerRecovery,
}) => {
  const t = FORTRESS_LANG[locale];

  const [phase, setPhase] = useState<'SURPRISE_PROMPT' | 'FIGHTING' | 'PRAYER_PROMPT' | 'VICTORY' | 'DEFEAT'>(
    allowSurpriseRetreat ? 'SURPRISE_PROMPT' : 'FIGHTING'
  );

  const [currentMonsterHp, setCurrentMonsterHp] = useState<number>(encounter.totalHp);
  const [currentWarriors, setCurrentWarriors] = useState<number>(troops.warriors);
  const [currentTroops, setCurrentTroops] = useState<TroopRoster>({ ...troops });
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [goldLoot, setGoldLoot] = useState<number>(0);
  const [isEnemyAsleep, setIsEnemyAsleep] = useState<boolean>(false);
  const [enemyAttackDebuff, setEnemyAttackDebuff] = useState<number>(0);
  const [prayerResult, setPrayerResult] = useState<{ success: boolean; rewardType: 'WARRIORS' | 'RATIONS'; amount: number } | null>(null);

  const fleeGoldDrop = CombatEngine.calculateFleeGoldDrop(inventory.gold);

  const getMonsterName = (nameKey: string) => (t as any)[nameKey] || nameKey;
  // Dynamic Monster Image Fetcher from Supabase Public Storage
  const getMonsterImageUrl = (imageKey: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const cleanKey = imageKey.toLowerCase().trim();
    return `${supabaseUrl}/storage/v1/object/public/hero-images/${cleanKey}.webp`;
  };
  const playerCS = CombatEngine.calculatePlayerCombatStrength({ ...currentTroops, warriors: currentWarriors }, inventory, isHolyVengeanceActive);
  const winChance = CombatEngine.calculateWinChance(playerCS, encounter.groupStrength);

  // Execute Combat Round
  const handleAttackRound = () => {
    const playerDmg = Math.round((0.9 + Math.random() * 0.4) * playerCS * 4);
    const nextMonsterHp = Math.max(0, currentMonsterHp - playerDmg);

    let monsterDmg = 0;
    let warriorLosses = 0;

    if (isEnemyAsleep) {
      setCombatLogs((prev) => [(t as any).logMonsterAsleep || "💤 Monster is asleep!", ...prev]);
      setIsEnemyAsleep(false);
    } else {
      const baseMonsterDmg = (0.5 + Math.random() * 0.3) * encounter.groupStrength * 2;
      const effectiveDebuff = Math.max(0, 1 - enemyAttackDebuff);
      monsterDmg = Math.round(baseMonsterDmg * effectiveDebuff);
      warriorLosses = Math.min(currentWarriors, Math.floor(monsterDmg / 8));
    }

    const nextWarriors = Math.max(0, currentWarriors - warriorLosses);
    setCurrentMonsterHp(nextMonsterHp);
    setCurrentWarriors(nextWarriors);
    setEnemyAttackDebuff(0); // Reset debuff for next round

    // ⚠️ Backline Crossfire Attrition Roll[cite: 1]
    const crossfire = CombatEngine.rollBacklineCrossfire(currentTroops);
    let crossfireLogMsg = '';
    if (crossfire.lostScouts > 0 || crossfire.lostClerics > 0 || crossfire.lostRaiders > 0 || crossfire.lostWizards > 0) {
      const updatedTroops = {
        ...currentTroops,
        scouts: Math.max(0, currentTroops.scouts - crossfire.lostScouts),
        clerics: Math.max(0, currentTroops.clerics - crossfire.lostClerics),
        raiders: Math.max(0, currentTroops.raiders - crossfire.lostRaiders),
        wizards: Math.max(0, currentTroops.wizards - crossfire.lostWizards),
      };
      setCurrentTroops(updatedTroops);

      const lostList: string[] = [];
      if (crossfire.lostScouts > 0) lostList.push(`-${crossfire.lostScouts} Scout`);
      if (crossfire.lostClerics > 0) lostList.push(`-${crossfire.lostClerics} Cleric`);
      if (crossfire.lostRaiders > 0) lostList.push(`-${crossfire.lostRaiders} Raider`);
      if (crossfire.lostWizards > 0) lostList.push(`-${crossfire.lostWizards} Wizard`);
      crossfireLogMsg = ` ${(t as any).crossfireLog || '⚠️ Backline crossfire:'} ${lostList.join(', ')}!`;
    }

    const roundLog = `⚔️ Dealt ${playerDmg} DMG! ${monsterDmg > 0 ? `Monster retaliated dealing ${monsterDmg} DMG (-${warriorLosses} Warriors).` : 'No monster retaliation!'}${crossfireLogMsg}`;
    setCombatLogs((prev) => [roundLog, ...prev]);

    if (nextMonsterHp <= 0) {
      const loot = Math.round(encounter.monster.strength * encounter.quantity * 12);
      setGoldLoot(loot);
      setPhase('VICTORY');
    } else if (nextWarriors <= 0) {
      // 🌿 Trigger Prayer Recovery Action when Warriors hit 0[cite: 1]
      setPhase('PRAYER_PROMPT');
    }
  };

  // 🙏 Handle Prayer Action Execution[cite: 1]
  const handleExecutePrayer = () => {
    const roll = CombatEngine.rollPrayerAction();
    setPrayerResult(roll);

    if (roll.success && onPrayerRecovery) {
      onPrayerRecovery(roll.rewardType, roll.amount);
    }
  };

  // 🧝‍♂️ Bard Active Magic Skills (Requires Elves in Army)
  const handleCastBardSkill = (skill: 'LULLABY' | 'MOCKERY' | 'HEALING') => {
    if (troops.elves <= 0) return;

    if (skill === 'LULLABY') {
      setIsEnemyAsleep(true);
      setCombatLogs((prev) => [(t as any).logBardLullaby || "🎶 Cast Lullaby!", ...prev]);
    } else if (skill === 'MOCKERY') {
      const psychicDmg = Math.round(playerCS * 2);
      setCurrentMonsterHp((prev) => Math.max(0, prev - psychicDmg));
      setEnemyAttackDebuff(0.20); // -20% Enemy Attack Strength[cite: 1]
      setCombatLogs((prev) => [`${(t as any).logBardMockery || "🔮 Cast Vicious Mockery!"} (-${psychicDmg} HP)`, ...prev]);
    } else if (skill === 'HEALING') {
      const healedCount = Math.floor(1 + Math.random() * 5);
      setCurrentWarriors((prev) => prev + healedCount);
      setCombatLogs((prev) => [`${(t as any).logBardHealing || "🎵 Played Healing Tune!"} (+${healedCount})`, ...prev]);
    }
  };

  // Handle Meat Harvesting Choice
  const handleHarvestChoice = (doHarvest: boolean) => {
    let gainedRations = 0;
    let isPoisoned = false;

    if (doHarvest) {
      const harvestResult = CombatEngine.harvestMonsterMeat(
        encounter.monster,
        encounter.quantity,
        troops.scouts
      );
      gainedRations = harvestResult.rationsGained;
      isPoisoned = harvestResult.isPoisoned;
    }

    const updatedTroops: TroopRoster = { ...currentTroops, warriors: currentWarriors };
    const updatedInventory: PlayerInventory = {
      ...inventory,
      gold: inventory.gold + goldLoot,
      rations: inventory.rations + gainedRations,
    };

    onVictory(updatedTroops, updatedInventory, gainedRations, goldLoot, isPoisoned);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ backgroundColor: '#111', border: '2px solid #ff3333', borderRadius: '8px', padding: '24px', maxWidth: '650px', width: '90%', color: '#fff', fontFamily: 'monospace' }}>
        
        <h2 style={{ margin: '0 0 16px 0', color: '#ff3333', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
          {t.combatTitle}
        </h2>

        {/* Surprise Prompt Screen */}
        {phase === 'SURPRISE_PROMPT' && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#ff0' }}>{t.surpriseTitle}</h3>
            <p style={{ margin: '8px 0', color: '#aaa' }}>{t.surpriseMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff3333', padding: '16px', margin: '16px 0', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={getMonsterImageUrl(encounter.monster.imageKey)}
                  alt={encounter.monster.id}
                  style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #ff3333', backgroundColor: '#000' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/180x180/000000/ff3333?text=' + encounter.monster.id; }}
                />
              </div>
              <div>{t.spottedMonster} <strong style={{ color: '#ff3333' }}>x{encounter.quantity} {getMonsterName(encounter.monster.nameKey)}</strong></div>
              <div style={{ marginTop: '6px' }}>{t.winRateEstimate} <strong style={{ color: winChance >= 60 ? '#00ff00' : '#ff3333' }}>{winChance}%</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={() => onRetreat()}
                style={{ backgroundColor: '#333', color: '#00ff00', border: '1px solid #00ff00', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {t.retreatBtn}
              </button>
              <button
                onClick={() => setPhase('FIGHTING')}
                style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {t.fightBtn}
              </button>
            </div>
          </div>
        )}

        {/* Active Fighting View */}
        {phase === 'FIGHTING' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #00ff00', padding: '12px', backgroundColor: '#050505', textAlign: 'center' }}>
                <h4 style={{ color: '#00ff00', margin: '0 0 6px 0' }}>🧙 Your Army</h4>
                <div>⚔️ Warriors: {currentWarriors}</div>
                <div>⚡ CS: {Math.round(playerCS)}</div>
                <div style={{ color: winChance >= 60 ? '#00ff00' : '#ff3333', marginTop: '4px' }}>Win Rate: {winChance}%</div>
              </div>

              <div style={{ border: '1px solid #ff3333', padding: '12px', backgroundColor: '#050505', textAlign: 'center' }}>
                <img
                  src={getMonsterImageUrl(encounter.monster.imageKey)}
                  alt={encounter.monster.id}
                  style={{ width: '130px', height: '130px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ff3333', margin: '0 auto 8px auto', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/130x130/000000/ff3333?text=' + encounter.monster.id; }}
                />
                <h4 style={{ color: '#ff3333', margin: '4px 0 6px 0' }}>{getMonsterName(encounter.monster.nameKey)} (x{encounter.quantity})</h4>
                <div>❤️ HP: {currentMonsterHp} / {encounter.maxHp}</div>
                <div>💪 Str: {encounter.monster.strength}</div>
              </div>
            </div>

            {/* 🧝‍♂️ Elven Bard Skill Controls */}
            {troops.elves > 0 && (
              <div style={{ backgroundColor: '#052005', border: '1px solid #00ff00', padding: '8px', marginBottom: '12px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: '#00ff00', fontWeight: 'bold', marginBottom: '6px' }}>
                  {(t as any).bardTitle || "🧝‍♂️ ELVEN BARD MAGIC"} ({troops.elves}):
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleCastBardSkill('LULLABY')}
                    style={{ backgroundColor: '#111', color: '#00ffff', border: '1px solid #00ffff', padding: '6px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace', flex: 1 }}
                  >
                    {(t as any).bardLullaby || "💤 Lullaby"}
                  </button>
                  <button
                    onClick={() => handleCastBardSkill('MOCKERY')}
                    style={{ backgroundColor: '#111', color: '#ff00ff', border: '1px solid #ff00ff', padding: '6px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace', flex: 1 }}
                  >
                    {(t as any).bardMockery || "🔮 Mockery"}
                  </button>
                  <button
                    onClick={() => handleCastBardSkill('HEALING')}
                    style={{ backgroundColor: '#111', color: '#00ff00', border: '1px solid #00ff00', padding: '6px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace', flex: 1 }}
                  >
                    {(t as any).bardHealing || "🎵 Heal Tunes"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                onClick={handleAttackRound}
                style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', fontFamily: 'monospace', flex: 2 }}
              >
                {t.attackRoundBtn}
              </button>
              
              {/* Mid-Combat Flee Button (with 25% Gold Drop Penalty)[cite: 1] */}
              <button
                onClick={() => onRetreat(fleeGoldDrop)}
                style={{ backgroundColor: '#333', color: '#00ff00', border: '1px solid #00ff00', padding: '12px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace', flex: 1 }}
              >
                {(t as any).fleeMidCombatBtn || "🏃 FLEE"} {fleeGoldDrop > 0 ? `(-${fleeGoldDrop} GP)` : ''}
              </button>
            </div>

            <div style={{ backgroundColor: '#000', border: '1px dashed #444', padding: '10px', maxHeight: '100px', overflowY: 'auto', fontSize: '12px' }}>
              {combatLogs.map((log, idx) => (
                <div key={idx} style={{ color: '#aaa', margin: '2px 0' }}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {phase === 'VICTORY' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#00ff00' }}>{t.victoryTitle}</h2>
            <p>{t.goldLootGained} <strong style={{ color: '#ff0' }}>+{goldLoot} GP</strong></p>

            {encounter.monster.edibility === 'TOXIC' && (
              <p style={{ color: '#ff3333', fontSize: '13px', margin: '12px 0' }}>{t.toxicMeatWarning}</p>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              {encounter.monster.edibility !== 'INEDIBLE' ? (
                <button
                  onClick={() => handleHarvestChoice(true)}
                  style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '12px 20px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  {t.harvestBtn}
                </button>
              ) : (
                <p style={{ color: '#888' }}>{t.inedibleMsg}</p>
              )}

              <button
                onClick={() => handleHarvestChoice(false)}
                style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '12px 20px', cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {t.skipHarvestBtn}
              </button>
            </div>
          </div>
        )}

        {/* 🙏 Prayer Recovery Prompt Screen (0 Warriors)[cite: 1] */}
        {phase === 'PRAYER_PROMPT' && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#ff0' }}>{(t as any).prayerTitle || "🙏 PRAYER FOR SALVATION"}</h3>
            <p style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5', margin: '12px 0' }}>
              {(t as any).prayerDesc || "Your frontline has fallen! Offer a prayer for divine intervention (80% Success Chance)."}
            </p>

            {prayerResult === null ? (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  onClick={handleExecutePrayer}
                  style={{ backgroundColor: '#ff0', color: '#000', border: 'none', padding: '12px 24px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
                >
                  {(t as any).prayBtn || "🙏 Pray (80% Success)"}
                </button>

                <button
                  onClick={() => setPhase('DEFEAT')}
                  style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '12px 20px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
                >
                  {(t as any).acceptSanctuaryBtn || "🏥 Retreat to Sanctuary"}
                </button>
              </div>
            ) : (
              <div style={{ margin: '16px 0', backgroundColor: '#050505', border: `2px solid ${prayerResult.success ? '#00ff00' : '#ff3333'}`, padding: '16px', borderRadius: '8px' }}>
                {prayerResult.success ? (
                  <div>
                    <h4 style={{ color: '#00ff00', margin: '0 0 8px 0' }}>{(t as any).prayerSuccessMsg || "✨ DIVINE MIRACLE!"}</h4>
                    <p style={{ color: '#ff0', fontSize: '16px', fontWeight: 'bold', margin: '8px 0' }}>
                      +{prayerResult.amount} {prayerResult.rewardType === 'WARRIORS' ? '⚔️ Warriors' : '🌾 Rations'}!
                    </p>
                    <button
                      onClick={() => {
                        if (prayerResult.rewardType === 'WARRIORS') {
                          setCurrentWarriors(prayerResult.amount);
                          setPhase('FIGHTING');
                        } else {
                          onDefeat();
                        }
                      }}
                      style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', marginTop: '12px', borderRadius: '4px' }}
                    >
                      {prayerResult.rewardType === 'WARRIORS' ? '⚔️ CONTINUE BATTLE' : '✅ CLAIM RATIONS & RETREAT'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ color: '#ff3333', margin: '0 0 8px 0' }}>{(t as any).prayerFailedMsg || "💀 Prayer unanswered..."}</h4>
                    <button
                      onClick={onDefeat}
                      style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', marginTop: '12px', borderRadius: '4px' }}
                    >
                      {(t as any).acceptSanctuaryBtn || "🏥 Retreat to Sanctuary"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Defeat Screen */}
        {phase === 'DEFEAT' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#ff3333' }}>{t.defeatTitle}</h2>
            <button
              onClick={onDefeat}
              style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', marginTop: '16px', borderRadius: '4px' }}
            >
              {(t as any).acceptSanctuaryBtn || "🏥 RETREAT TO SANCTUARY"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};