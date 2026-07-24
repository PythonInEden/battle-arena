// src/fortress/components/FortressWorkspace.tsx
import React, { useState, useEffect } from 'react';
import { MapEngine } from '../MapEngine';
import { LogisticalEngine } from '../LogisticalEngine';
import { StructuralGuardrails } from '../utils/guardrails';
import { MarketplaceEngine, ShopItem } from '../MarketplaceEngine';
import { TileState, Position, TroopRoster, PlayerInventory } from '../types';
import { MapView } from './MapView';
import { MarketplaceModal } from './MarketplaceModal';

export const FortressWorkspace: React.FC = () => {
  const [roomSeed, setRoomSeed] = useState<number>(54931);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [grid, setGrid] = useState<TileState[][]>([]);
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 0, y: 0 });
  const [remainingMF, setRemainingMF] = useState<number>(10);
  
  const [troops, setTroops] = useState<TroopRoster>({
    warriors: 30, scouts: 2, clerics: 1, wizards: 0, raiders: 0, elves: 0, dwarves: 0, mules: 2
  });

  const [inventory, setInventory] = useState<PlayerInventory>({
    gold: 300, rations: 20, hasRaft: false, activeRelics: [], scrollsTeleport: 0, scrollsSeeing: 0, scrollsSeeking: 0
  });

  const [logs, setLogs] = useState<string[]>([]);
  
  // Marketplace Modal Control
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [shopCatalog, setShopCatalog] = useState<ShopItem[]>([]);

  useEffect(() => {
    const generatedGrid = MapEngine.generateProceduralMap(roomSeed, difficulty);
    setGrid(generatedGrid);

    let spawnPos: Position = { x: 0, y: 0 };
    for (let x = 0; x < generatedGrid.length; x++) {
      for (let y = 0; y < generatedGrid[x].length; y++) {
        if (generatedGrid[x][y].terrain === 'TOWN' || generatedGrid[x][y].terrain === 'SANCTUARY') {
          spawnPos = { x, y };
          break;
        }
      }
    }
    setPlayerPosition(spawnPos);
    setLogs([`🏁 Map Generated (Seed: ${roomSeed}). Spawned at Hub [${spawnPos.x}, ${spawnPos.y}]`]);
  }, [roomSeed, difficulty]);

  const handleTileClick = (targetTile: TileState) => {
    const moveCheck = LogisticalEngine.getMovementCost(playerPosition, targetTile, inventory);
    if (!moveCheck.isValid) return;

    if (LogisticalEngine.canExecuteStep(remainingMF, moveCheck.cost)) {
      const nextMF = Math.max(0, remainingMF - moveCheck.cost);
      setPlayerPosition({ x: targetTile.x, y: targetTile.y });
      setRemainingMF(nextMF);

      setLogs((prev) => [`👟 Moved to ${targetTile.terrain} [${targetTile.x}, ${targetTile.y}] (-${moveCheck.cost} MF). ${nextMF} MF left.`, ...prev]);

      // Check Town Landing Trigger
      if (targetTile.terrain === 'TOWN') {
        const availableItems = MarketplaceEngine.generateAvailableInventory(troops, inventory);
        setShopCatalog(availableItems);
        setIsShopOpen(true);
        setLogs((prev) => [`🏰 Entered Town Marketplace! Opening Merchant Shop...`, ...prev]);
      }
    }
  };

  const handlePurchaseComplete = (item: ShopItem, pricePaid: number) => {
    setInventory((prev) => ({ ...prev, gold: Math.max(0, prev.gold - pricePaid) }));

    // Apply bought item effects
    if (item.id === 'rations') setInventory((prev) => ({ ...prev, rations: prev.rations + 10 }));
    if (item.id === 'warriors') setTroops((prev) => ({ ...prev, warriors: prev.warriors + 5 }));
    if (item.id === 'scouts') setTroops((prev) => ({ ...prev, scouts: prev.scouts + 1 }));
    if (item.id === 'clerics') setTroops((prev) => ({ ...prev, clerics: prev.clerics + 1 }));
    if (item.id === 'raiders') setTroops((prev) => ({ ...prev, raiders: prev.raiders + 1 }));
    if (item.id === 'mules') setTroops((prev) => ({ ...prev, mules: prev.mules + 1 }));
    if (item.id === 'wizard') setTroops((prev) => ({ ...prev, wizards: 1 }));
    if (item.id === 'raft_bundle') {
      setInventory((prev) => ({ ...prev, hasRaft: true }));
      setTroops((prev) => ({ ...prev, mules: prev.mules + 4 }));
    }

    setIsShopOpen(false);
    setLogs((prev) => [`🛒 Purchased [${item.name}] for ${pricePaid} GP! Shop closed.`, ...prev]);
  };

  const handleEjected = () => {
    setIsShopOpen(false);
    setRemainingMF((prev) => Math.max(0, prev - 1)); // Penalty 1 MF
    setLogs((prev) => [`😡 Merchant ejected you for lowballing! Lost 1 MF!`, ...prev]);
  };

  const handleEndTurn = () => {
    const rationUpkeep = LogisticalEngine.calculateRationUpkeep(troops.warriors);
    let newRations = inventory.rations - rationUpkeep;
    let newWarriors = troops.warriors;
    let logMsg = `🌙 Turn Ended. Consumed ${rationUpkeep} Rations.`;

    if (newRations < 0) {
      const casualties = LogisticalEngine.calculateStarvationLosses(troops.warriors);
      newWarriors = Math.max(0, troops.warriors - casualties);
      newRations = 0;
      logMsg += ` ⚠️ STARVATION! Lost ${casualties} Warriors due to lack of food!`;
    }

    setInventory((prev) => ({ ...prev, rations: newRations }));
    setTroops((prev) => ({ ...prev, warriors: newWarriors }));
    setRemainingMF(10);
    setLogs((prev) => [`☀️ New Turn Started! Movement refreshed to 10 MF.`, logMsg, ...prev]);
  };

  const maxGoldCapacity = StructuralGuardrails.calculateMaxGoldCapacity(troops);
  const sightRadius = LogisticalEngine.calculateSightRadius(troops.scouts);

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#000', borderRadius: '8px', border: '2px solid #00ff00' }}>
      <header style={{ borderBottom: '2px solid #00ff00', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>🎮 WITCH KING OVERWORLD ENGINE DECK v0.0.3-ALPHA</h2>
        <p style={{ margin: '4px 0 0 0', color: '#888' }}>Live Navigation & Town Marketplace Integration</p>
      </header>

      {/* Dev Control Toolbar */}
      <div style={{ display: 'flex', gap: '20px', backgroundColor: '#111', padding: '10px 12px', border: '1px dashed #00ff00', marginBottom: '16px', alignItems: 'center' }}>
        <label>
          Seed Key: 
          <input 
            type="number" 
            value={roomSeed} 
            onChange={(e) => setRoomSeed(parseInt(e.target.value) || 10000)}
            style={{ backgroundColor: '#000', color: '#00ff00', border: '1px solid #00ff00', marginLeft: '6px', padding: '4px', width: '90px', fontFamily: 'monospace' }} 
          />
        </label>
        <label>
          Difficulty (1-4): 
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

      {/* Logistical HUD Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#111', padding: '12px', border: '1px solid #00ff00', marginBottom: '16px' }}>
        <div>📍 Pos: <strong>[{playerPosition.x}, {playerPosition.y}]</strong></div>
        <div>⚡ MF: <strong style={{ color: remainingMF > 0 ? '#00ff00' : '#ff3333' }}>{remainingMF} / 10</strong></div>
        <div>🌾 Rations: <strong>{inventory.rations}</strong></div>
        <div>💰 Gold: <strong>{inventory.gold} / {maxGoldCapacity} GP</strong></div>
        <div>⚔️ Warriors: <strong>{troops.warriors}</strong></div>
        <div>🏹 Scouts: <strong>{troops.scouts} (Sight: {sightRadius})</strong></div>
        <div>🫏 Mules: <strong>{troops.mules}</strong></div>
        <div>🚣 Raft: <strong>{inventory.hasRaft ? 'YES' : 'NO'}</strong></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: '#888' }}>
          * Tap Town tiles (🏰) to open the Marketplace.
        </div>
        <button
          onClick={handleEndTurn}
          style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '8px 20px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          🔒 LOCK & END TURN
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
          onTileClick={handleTileClick}
        />
      )}

      {/* Marketplace Modal */}
      {isShopOpen && (
        <MarketplaceModal
          availableItems={shopCatalog}
          inventory={inventory}
          troops={troops}
          onPurchaseComplete={handlePurchaseComplete}
          onEjected={handleEjected}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {/* Action Ticker Log */}
      <div style={{ backgroundColor: '#050505', border: '1px solid #00ff00', padding: '12px', maxHeight: '150px', overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#fff', borderBottom: '1px solid #222' }}>Transaction Log Ticker:</h4>
        {logs.map((log, index) => (
          <div key={index} style={{ fontSize: '13px', margin: '2px 0', color: index === 0 ? '#00ff00' : '#888' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};