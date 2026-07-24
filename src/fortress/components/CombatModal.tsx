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
  onRetreat: () => void;
  onVictory: (updatedTroops: TroopRoster, updatedInventory: PlayerInventory, isPoisoned: boolean) => void;
  onDefeat: () => void;
}

export const CombatModal: React.FC<CombatModalProps> = ({
  encounter,
  troops,
  inventory,
  locale,
  allowSurpriseRetreat,
  onRetreat,
  onVictory,
  onDefeat,
}) => {
  const t = FORTRESS_LANG[locale];

  const [phase, setPhase] = useState<'SURPRISE_PROMPT' | 'FIGHTING' | 'VICTORY' | 'DEFEAT'>(
    allowSurpriseRetreat ? 'SURPRISE_PROMPT' : 'FIGHTING'
  );

  const [currentMonsterHp, setCurrentMonsterHp] = useState<number>(encounter.totalHp);
  const [currentWarriors, setCurrentWarriors] = useState<number>(troops.warriors);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [goldLoot, setGoldLoot] = useState<number>(0);

  const getMonsterName = (nameKey: string) => (t as any)[nameKey] || nameKey;

  // Execute Combat Round
  const handleAttackRound = () => {
    const playerCS = CombatEngine.calculatePlayerCombatStrength({ ...troops, warriors: currentWarriors });
    const playerDmg = Math.round((0.8 + Math.random() * 0.4) * playerCS * 5);
    const nextMonsterHp = Math.max(0, currentMonsterHp - playerDmg);

    const monsterDmg = Math.round((0.8 + Math.random() * 0.4) * encounter.monster.strength * encounter.quantity * 3);
    const warriorLosses = Math.min(currentWarriors, Math.floor(monsterDmg / 10));
    const nextWarriors = Math.max(0, currentWarriors - warriorLosses);

    setCurrentMonsterHp(nextMonsterHp);
    setCurrentWarriors(nextWarriors);

    const roundLog = `⚔️ Dealt ${playerDmg} DMG! Monster retaliated dealing ${monsterDmg} DMG (-${warriorLosses} Warriors).`;
    setCombatLogs((prev) => [roundLog, ...prev]);

    if (nextMonsterHp <= 0) {
      const loot = Math.round(encounter.monster.strength * encounter.quantity * 10);
      setGoldLoot(loot);
      setPhase('VICTORY');
    } else if (nextWarriors <= 0) {
      setPhase('DEFEAT');
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

    const updatedTroops: TroopRoster = { ...troops, warriors: currentWarriors };
    const updatedInventory: PlayerInventory = {
      ...inventory,
      gold: inventory.gold + goldLoot,
      rations: inventory.rations + gainedRations,
    };

    onVictory(updatedTroops, updatedInventory, isPoisoned);
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
            <p style={{ margin: '16px 0 24px 0', color: '#aaa' }}>{t.surpriseMsg}</p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button
                onClick={onRetreat}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ border: '1px solid #00ff00', padding: '12px', backgroundColor: '#050505', textAlign: 'center' }}>
                <h4 style={{ color: '#00ff00', margin: '0 0 6px 0' }}>🧙 Your Army</h4>
                <div>⚔️ Warriors: {currentWarriors}</div>
                <div>⚡ CS: {Math.round(CombatEngine.calculatePlayerCombatStrength({ ...troops, warriors: currentWarriors }))}</div>
              </div>

              <div style={{ border: '1px solid #ff3333', padding: '12px', backgroundColor: '#050505', textAlign: 'center' }}>
                <h4 style={{ color: '#ff3333', margin: '0 0 6px 0' }}>👹 {getMonsterName(encounter.monster.nameKey)} (x{encounter.quantity})</h4>
                <div>❤️ HP: {currentMonsterHp} / {encounter.maxHp}</div>
                <div>💪 Str: {encounter.monster.strength}</div>
              </div>
            </div>

            <button
              onClick={handleAttackRound}
              style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', fontFamily: 'monospace', width: '100%', marginBottom: '16px' }}
            >
              {t.attackRoundBtn}
            </button>

            <div style={{ backgroundColor: '#000', border: '1px dashed #444', padding: '10px', maxHeight: '120px', overflowY: 'auto', fontSize: '12px' }}>
              {combatLogs.map((log, idx) => (
                <div key={idx} style={{ color: '#aaa', margin: '2px 0' }}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Victory Screen & Meat Harvesting */}
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

        {/* Defeat Screen */}
        {phase === 'DEFEAT' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#ff3333' }}>{t.defeatTitle}</h2>
            <button
              onClick={onDefeat}
              style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', marginTop: '16px' }}
            >
              OK (WASH ASHORE AT SANCTUARY)
            </button>
          </div>
        )}

      </div>
    </div>
  );
};