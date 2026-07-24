// src/fortress/components/FortressWorkspace.tsx
import React, { useState, useEffect } from 'react';
import { MapEngine } from '../MapEngine';
import { LogisticalEngine } from '../LogisticalEngine';
import { StructuralGuardrails } from '../utils/guardrails';
import { MarketplaceEngine, ShopItem } from '../MarketplaceEngine';
import { CombatEngine, EncounterGroup } from '../CombatEngine';
import { TileState, Position, TroopRoster, PlayerInventory } from '../types';
import { MapView } from './MapView';
import { MarketplaceModal } from './MarketplaceModal';
import { CombatModal } from './CombatModal';
import { FORTRESS_LANG, LanguageType } from '../languages';

interface FortressWorkspaceProps {
  locale?: LanguageType;
}

export const FortressWorkspace: React.FC<FortressWorkspaceProps> = ({ locale = 'vi' }) => {
  const t = FORTRESS_LANG[locale];

  const [roomSeed, setRoomSeed] = useState<number>(54931);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [grid, setGrid] = useState<TileState[][]>([]);
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 0, y: 0 });
  const [previousPosition, setPreviousPosition] = useState<Position>({ x: 0, y: 0 });
  const [remainingMF, setRemainingMF] = useState<number>(10);
  
  const [troops, setTroops] = useState<TroopRoster>({
    warriors: 30, scouts: 2, clerics: 1, wizards: 0, raiders: 0, elves: 0, dwarves: 0, mules: 2
  });

  const [inventory, setInventory] = useState<PlayerInventory>({
    gold: 300, rations: 20, hasRaft: false, activeRelics: [], scrollsTeleport: 0, scrollsSeeing: 0, scrollsSeeking: 0
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [shopCatalog, setShopCatalog] = useState<ShopItem[]>([]);

  const [activeEncounter, setActiveEncounter] = useState<EncounterGroup | null>(null);
  const [allowSurpriseRetreat, setAllowSurpriseRetreat] = useState<boolean>(false);

  const sightRadius = LogisticalEngine.calculateSightRadius(troops.scouts);

  useEffect(() => {
    const generatedGrid = MapEngine.generateProceduralMap(roomSeed, difficulty);

    let spawnPos: Position = { x: 0, y: 0 };
    for (let x = 0; x < generatedGrid.length; x++) {
      for (let y = 0; y < generatedGrid[x].length; y++) {
        if (generatedGrid[x][y].terrain === 'TOWN' || generatedGrid[x][y].terrain === 'SANCTUARY') {
          spawnPos = { x, y };
          break;
        }
      }
    }

    const updatedGrid = generatedGrid.map((row) =>
      row.map((tile) => {
        const dx = Math.abs(spawnPos.x - tile.x);
        const dy = Math.abs(spawnPos.y - tile.y);
        return dx <= sightRadius && dy <= sightRadius ? { ...tile, isExplored: true } : tile;
      })
    );

    setGrid(updatedGrid);
    setPlayerPosition(spawnPos);
    setPreviousPosition(spawnPos);
    setLogs([`${t.logSpawn} [${spawnPos.x}, ${spawnPos.y}]`]);
  }, [roomSeed, difficulty, locale]);

  const revealSightArea = (pos: Position, radius: number) => {
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((tile) => {
          const dx = Math.abs(pos.x - tile.x);
          const dy = Math.abs(pos.y - tile.y);
          return dx <= radius && dy <= radius ? { ...tile, isExplored: true } : tile;
        })
      )
    );
  };

  // Helper to add gold with capacity guardrail checks
  const addGoldSafely = (goldAmount: number, sourceName: string) => {
    const result = StructuralGuardrails.protectInventoryState(inventory, troops, goldAmount, 0);
    setInventory(result.updatedInventory);

    if (result.droppedGold > 0) {
      setLogs((prev) => [`${t.droppedGoldWarn} ${result.droppedGold} GP!`, ...prev]);
    }
  };

  const handleTileClick = (targetTile: TileState) => {
    const isSameTile = playerPosition.x === targetTile.x && playerPosition.y === targetTile.y;
    const moveCheck = LogisticalEngine.getMovementCost(playerPosition, targetTile, inventory);
    if (!moveCheck.isValid) return;

    if (LogisticalEngine.canExecuteStep(remainingMF, moveCheck.cost)) {
      const nextMF = Math.max(0, remainingMF - moveCheck.cost);

      if (isSameTile) {
        setRemainingMF(nextMF);
        if (targetTile.terrain === 'TOWN') {
          const availableItems = MarketplaceEngine.generateAvailableInventory(troops, inventory);
          setShopCatalog(availableItems);
          setIsShopOpen(true);
          setLogs((prev) => [t.logReentered, ...prev]);
        } else {
          setLogs((prev) => [`${t.logRested} [${targetTile.x}, ${targetTile.y}] (-1 MF).`, ...prev]);
        }
        return;
      }

      setPreviousPosition(playerPosition);
      setPlayerPosition({ x: targetTile.x, y: targetTile.y });
      setRemainingMF(nextMF);

      revealSightArea({ x: targetTile.x, y: targetTile.y }, sightRadius);

      const terrainName = (t as any)[`terrain${targetTile.terrain.charAt(0) + targetTile.terrain.slice(1).toLowerCase()}`] || targetTile.terrain;
      setLogs((prev) => [`${t.logMoved} ${terrainName} [${targetTile.x}, ${targetTile.y}] (-${moveCheck.cost} MF). ${nextMF} MF left.`, ...prev]);

      if (targetTile.terrain === 'TOWN') {
        const availableItems = MarketplaceEngine.generateAvailableInventory(troops, inventory);
        setShopCatalog(availableItems);
        setIsShopOpen(true);
        setLogs((prev) => [t.logEnteredTown, ...prev]);
        return;
      }

      if (targetTile.terrain === 'FOREST' || targetTile.terrain === 'MOUNTAIN') {
        if (CombatEngine.checkEncounterTrigger(targetTile.terrain)) {
          const encounter = CombatEngine.spawnEncounter(targetTile.terrain, troops);
          const allowRetreat = CombatEngine.checkSurpriseRetreatOption();
          setActiveEncounter(encounter);
          setAllowSurpriseRetreat(allowRetreat);
          setLogs((prev) => [t.logEncounterTrigger, ...prev]);
        }
      }
    }
  };

  const handleRetreatFromCombat = () => {
    setActiveEncounter(null);
    setPlayerPosition(previousPosition);
    setLogs((prev) => [t.logRetreated, ...prev]);
  };

  const handleCombatVictory = (
    updatedTroops: TroopRoster,
    updatedInventory: PlayerInventory,
    rationsGained: number,
    goldLooted: number,
    isPoisoned: boolean
  ) => {
    const monsterName = activeEncounter ? (t as any)[activeEncounter.monster.nameKey] : 'Monster';
    setActiveEncounter(null);
    setTroops(updatedTroops);

    // Apply Gold Guardrails on combat loot
    const guardrailResult = StructuralGuardrails.protectInventoryState(
      updatedInventory,
      updatedTroops,
      0,
      0
    );
    setInventory(guardrailResult.updatedInventory);

    let victoryLog = `🏆 Defeated ${activeEncounter?.quantity}x ${monsterName}! Looted +${goldLooted} GP, Harvested +${rationsGained} Rations.`;
    if (guardrailResult.droppedGold > 0) {
      victoryLog += ` (${t.droppedGoldWarn} ${guardrailResult.droppedGold} GP)`;
    }

    if (isPoisoned) {
      setRemainingMF((prev) => Math.max(0, prev - 1));
      setLogs((prev) => [t.poisonedMsg, victoryLog, ...prev]);
    } else {
      setLogs((prev) => [victoryLog, ...prev]);
    }
  };

  const handleCombatDefeat = () => {
    setActiveEncounter(null);
    setTroops((prev) => ({ ...prev, warriors: 15 }));
    setInventory((prev) => ({ ...prev, rations: 15, gold: 0 }));
    setRemainingMF(10);
    setLogs((prev) => [`💀 Frontline routed! Washed ashore at Sanctuary with rescue pack.`, ...prev]);
  };

  const handlePurchaseComplete = (item: ShopItem, pricePaid: number) => {
    setInventory((prev) => ({ ...prev, gold: Math.max(0, prev.gold - pricePaid) }));

    if (item.id === 'rations') setInventory((prev) => ({ ...prev, rations: prev.rations + 10 }));
    if (item.id === 'warriors') setTroops((prev) => ({ ...prev, warriors: prev.warriors + 5 }));
    if (item.id === 'scouts') {
      const newScoutCount = troops.scouts + 1;
      setTroops((prev) => ({ ...prev, scouts: newScoutCount }));
      revealSightArea(playerPosition, LogisticalEngine.calculateSightRadius(newScoutCount));
    }
    if (item.id === 'clerics') setTroops((prev) => ({ ...prev, clerics: prev.clerics + 1 }));
    if (item.id === 'raiders') setTroops((prev) => ({ ...prev, raiders: prev.raiders + 1 }));
    if (item.id === 'mules') setTroops((prev) => ({ ...prev, mules: prev.mules + 1 }));
    if (item.id === 'wizard') setTroops((prev) => ({ ...prev, wizards: 1 }));
    if (item.id === 'raft_bundle') {
      setInventory((prev) => ({ ...prev, hasRaft: true }));
      setTroops((prev) => ({ ...prev, mules: prev.mules + 4 }));
    }

    const itemName = (t as any)[item.nameKey] || item.id;
    setIsShopOpen(false);
    setLogs((prev) => [`${t.logPurchased} [${itemName}] ${t.forText} ${pricePaid} GP!`, ...prev]);
  };

  const handleEjected = () => {
    setIsShopOpen(false);
    setRemainingMF((prev) => Math.max(0, prev - 1));
    setLogs((prev) => [t.logEjected, ...prev]);
  };

  const handleEndTurn = () => {
    const rationUpkeep = LogisticalEngine.calculateRationUpkeep(troops.warriors);
    let newRations = inventory.rations - rationUpkeep;
    let newWarriors = troops.warriors;
    let logMsg = `${t.logTurnEnded} ${rationUpkeep} ${t.logRations}`;

    if (newRations < 0) {
      const casualties = LogisticalEngine.calculateStarvationLosses(troops.warriors);
      newWarriors = Math.max(0, troops.warriors - casualties);
      newRations = 0;
      logMsg += ` ${t.logStarvation} ${casualties} ${t.logWarriorsLost}`;
    }

    setInventory((prev) => ({ ...prev, rations: newRations }));
    setTroops((prev) => ({ ...prev, warriors: newWarriors }));
    setRemainingMF(10);
    setLogs((prev) => [t.logNewTurn, logMsg, ...prev]);
  };

  const maxGoldCapacity = StructuralGuardrails.calculateMaxGoldCapacity(troops);

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#000', borderRadius: '8px', border: '2px solid #00ff00' }}>
      <header style={{ borderBottom: '2px solid #00ff00', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>{t.headerTitle}</h2>
        <p style={{ margin: '4px 0 0 0', color: '#888' }}>{t.headerSub}</p>
      </header>

      {/* Dev Control Toolbar */}
      <div style={{ display: 'flex', gap: '16px', backgroundColor: '#111', padding: '10px 12px', border: '1px dashed #00ff00', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          {t.seedLabel} 
          <input 
            type="number" 
            value={roomSeed} 
            onChange={(e) => setRoomSeed(parseInt(e.target.value) || 10000)}
            style={{ backgroundColor: '#000', color: '#00ff00', border: '1px solid #00ff00', marginLeft: '6px', padding: '4px', width: '90px', fontFamily: 'monospace' }} 
          />
        </label>
        <label>
          {t.diffLabel} 
          <input 
            type="number" 
            min="1" 
            max="4" 
            value={difficulty} 
            onChange={(e) => setDifficulty(parseInt(e.target.value) || 1)}
            style={{ backgroundColor: '#000', color: '#00ff00', border: '1px solid #00ff00', marginLeft: '6px', padding: '4px', width: '50px', fontFamily: 'monospace' }} 
          />
        </label>
      </div>

      {/* Dev Sandbox Army Tweaker */}
      <div style={{ display: 'flex', gap: '8px', backgroundColor: '#080808', padding: '8px 12px', border: '1px solid #333', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#ff0', fontWeight: 'bold' }}>{t.sandboxTitle}:</span>
        <button onClick={() => setTroops(p => ({ ...p, warriors: p.warriors + 10 }))} style={{ backgroundColor: '#222', color: '#00ff00', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addWarriors}</button>
        <button onClick={() => addGoldSafely(500, 'SANDBOX')} style={{ backgroundColor: '#222', color: '#ff0', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addGold}</button>
        <button onClick={() => setInventory(p => ({ ...p, rations: p.rations + 20 }))} style={{ backgroundColor: '#222', color: '#00ff00', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addRations}</button>
        <button onClick={() => setTroops(p => ({ ...p, wizards: 1 }))} style={{ backgroundColor: '#222', color: '#ab47bc', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addWizard}</button>
      </div>

      {/* Logistical HUD Bar with Wizards, Clerics, & Raiders Displayed! */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#111', padding: '12px', border: '1px solid #00ff00', marginBottom: '16px' }}>
        <div>{t.posLabel} <strong>[{playerPosition.x}, {playerPosition.y}]</strong></div>
        <div>{t.mfLabel} <strong style={{ color: remainingMF > 0 ? '#00ff00' : '#ff3333' }}>{remainingMF} / 10</strong></div>
        <div>{t.rationsLabel} <strong>{inventory.rations}</strong></div>
        <div>{t.goldLabel} <strong style={{ color: inventory.gold >= maxGoldCapacity ? '#ff0' : '#00ff00' }}>{inventory.gold} / {maxGoldCapacity} GP</strong></div>
        <div>{t.warriorsLabel} <strong>{troops.warriors}</strong></div>
        <div>{t.scoutsLabel} <strong>{troops.scouts} ({t.sightLabel} {sightRadius})</strong></div>
        <div>{t.mulesLabel} <strong>{troops.mules}</strong></div>
        <div>{t.wizardsLabel} <strong style={{ color: troops.wizards > 0 ? '#ab47bc' : '#888' }}>{troops.wizards > 0 ? t.yes : t.no}</strong></div>
        <div>{t.clericsLabel} <strong>{troops.clerics}</strong></div>
        <div>{t.raidersLabel} <strong>{troops.raiders}</strong></div>
        <div>{t.raftLabel} <strong>{inventory.hasRaft ? t.yes : t.no}</strong></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: '#888' }}>
          {t.navTip}
        </div>
        <button
          onClick={handleEndTurn}
          style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '8px 20px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          {t.endTurnBtn}
        </button>
      </div>

      {/* Map Viewport Area */}
      {grid.length > 0 && (
        <MapView
          grid={grid}
          playerPosition={playerPosition}
          sightRadius={sightRadius}
          remainingMF={remainingMF}
          hasRaft={inventory.hasRaft}
          locale={locale}
          onTileClick={handleTileClick}
        />
      )}

      {/* Marketplace Modal */}
      {isShopOpen && (
        <MarketplaceModal
          availableItems={shopCatalog}
          inventory={inventory}
          troops={troops}
          locale={locale}
          onPurchaseComplete={handlePurchaseComplete}
          onEjected={handleEjected}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {/* PvE Combat Modal */}
      {activeEncounter && (
        <CombatModal
          encounter={activeEncounter}
          troops={troops}
          inventory={inventory}
          locale={locale}
          allowSurpriseRetreat={allowSurpriseRetreat}
          onRetreat={handleRetreatFromCombat}
          onVictory={handleCombatVictory}
          onDefeat={handleCombatDefeat}
        />
      )}

      {/* Action Ticker Log */}
      <div style={{ backgroundColor: '#050505', border: '1px solid #00ff00', padding: '12px', maxHeight: '150px', overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#fff', borderBottom: '1px solid #222' }}>{t.logHeader}</h4>
        {logs.map((log, index) => (
          <div key={index} style={{ fontSize: '13px', margin: '2px 0', color: index === 0 ? '#00ff00' : '#888' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};