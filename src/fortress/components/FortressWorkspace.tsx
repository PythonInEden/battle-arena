// src/fortress/components/FortressWorkspace.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
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

// Initialize Supabase Client for Realtime 2-Player Sync
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FortressWorkspaceProps {
  locale?: LanguageType;
}

export const FortressWorkspace: React.FC<FortressWorkspaceProps> = ({ locale = 'vi' }) => {
  const t = FORTRESS_LANG[locale];

  const [playerId] = useState<string>(() => {
    let id = sessionStorage.getItem('fortress_player_id');
    if (!id) {
      id = `pid_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('fortress_player_id', id);
    }
    return id;
  });
  const [playerName, setPlayerName] = useState<string>(() => {
    return sessionStorage.getItem('fortress_player_name') || `Player_${Math.floor(Math.random() * 899 + 100)}`;
  });
  const [roomSeed, setRoomSeed] = useState<number>(54931);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [otherPlayers, setOtherPlayers] = useState<Record<string, { id: string; name: string; pos: Position; gold: number; mules: number }>>({});
  const [isTeleportTargeting, setIsTeleportTargeting] = useState<boolean>(false);
  const [spottedOpponentNotice, setSpottedOpponentNotice] = useState<{ name: string; pos: Position } | null>(null);
  const channelRef = useRef<any>(null);
  const [grid, setGrid] = useState<TileState[][]>([]);
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 0, y: 0 });
  const [previousPosition, setPreviousPosition] = useState<Position>({ x: 0, y: 0 });
  const [remainingMF, setRemainingMF] = useState<number>(10);
  
  const [troops, setTroops] = useState<TroopRoster>({
    warriors: 30, scouts: 2, clerics: 1, wizards: 0, raiders: 0, elves: 0, dwarves: 0, mules: 2
  });

  const [maxWarriors, setMaxWarriors] = useState<number>(30);

  const [inventory, setInventory] = useState<PlayerInventory>({
    gold: 300, rations: 20, hasRaft: false, activeRelics: [], scrollsTeleport: 0, scrollsSeeing: 0, scrollsSeeking: 0
  });

  const [logs, setLogs] = useState<string[]>([]);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [shopCatalog, setShopCatalog] = useState<ShopItem[]>([]);

  const [activeEncounter, setActiveEncounter] = useState<EncounterGroup | null>(null);
  const [allowSurpriseRetreat, setAllowSurpriseRetreat] = useState<boolean>(false);

  // Dropped Gold Modal State
  const [droppedGoldNotice, setDroppedGoldNotice] = useState<{ amount: number; pos: Position } | null>(null);

  // Collected Gold Modal State
  const [collectedGoldNotice, setCollectedGoldNotice] = useState<{ amount: number; pos: Position } | null>(null);

  // Drown Event Modal State
  const [drownNotice, setDrownNotice] = useState<{ pos: Position } | null>(null);

  // Raided Warning Modal State
  const [raidedNotice, setRaidedNotice] = useState<{ attackerName: string; stolenGold: number; stolenMules: number } | null>(null);

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

    // Calculate unique player spawn position offset based on playerId
    const playerHash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const spawnOffsets = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
    const myOffset = spawnOffsets[playerHash % spawnOffsets.length];

    const finalSpawnPos: Position = {
      x: Math.max(0, Math.min(generatedGrid.length - 1, spawnPos.x + myOffset.x)),
      y: Math.max(0, Math.min(generatedGrid[0].length - 1, spawnPos.y + myOffset.y)),
    };

    const updatedGrid = generatedGrid.map((row) =>
      row.map((tile) => {
        const dx = Math.abs(finalSpawnPos.x - tile.x);
        const dy = Math.abs(finalSpawnPos.y - tile.y);
        return dx <= sightRadius && dy <= sightRadius ? { ...tile, isExplored: true } : tile;
      })
    );

    setGrid(updatedGrid);
    setPlayerPosition(finalSpawnPos);
    setPreviousPosition(finalSpawnPos);
    setLogs([`${t.logSpawn} [${finalSpawnPos.x}, ${finalSpawnPos.y}]`]);
  }, [roomSeed, difficulty, locale, playerId]);

  // 📡 Realtime Supabase Channel for 2-Player Sync across Desktop & iPad[cite: 2]
  useEffect(() => {
    sessionStorage.setItem('fortress_player_name', playerName);

    const channelName = `fortress_room_${roomSeed}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'player_update' }, (payload) => {
        const data = payload.payload;
        if (data.id !== playerId) {
          // Key by unique playerId to fix input typing duplication bug![cite: 2]
          setOtherPlayers((prev) => ({
            ...prev,
            [data.id]: { id: data.id, name: data.name, pos: data.pos, gold: data.gold, mules: data.mules },
          }));

          // Scout Enemy Player Detection Check[cite: 1]
          const dx = Math.abs(playerPosition.x - data.pos.x);
          const dy = Math.abs(playerPosition.y - data.pos.y);
          if (dx <= sightRadius && dy <= sightRadius) {
            setSpottedOpponentNotice({ name: data.name, pos: data.pos });
          }
        }
      })
      .on('broadcast', { event: 'raid_request' }, (payload) => {
        const data = payload.payload;
        if (data.targetId === playerId) {
          // Scout Sentry Defense Check (20% per Scout, max 80%)
          const evasionChance = Math.min(0.8, troops.scouts * 0.2);
          const isThwarted = Math.random() < evasionChance;

          if (isThwarted) {
            setLogs((prev) => [t.raidThwartedLog, ...prev]);
            channel.send({
              type: 'broadcast',
              event: 'raid_thwarted',
              payload: { attackerId: data.attackerId, defenderName: playerName },
            });
            return;
          }

          // Defender calculates actual lost inventory
          const stolenGold = Math.min(inventory.gold, 150);
          const stolenMules = Math.min(troops.mules, 1);

          setInventory((prev) => ({ ...prev, gold: Math.max(0, prev.gold - stolenGold) }));
          setTroops((prev) => ({ ...prev, mules: Math.max(0, prev.mules - stolenMules) }));
          setRaidedNotice({ attackerName: data.attackerName, stolenGold, stolenMules });
          setLogs((prev) => [`${t.raidedByLog} ${data.attackerName}! Lost -${stolenGold} GP and -${stolenMules} Mule!`, ...prev]);

          // Send confirmation response back to attacker
          channel.send({
            type: 'broadcast',
            event: 'raid_response',
            payload: {
              attackerId: data.attackerId,
              defenderName: playerName,
              stolenGold,
              stolenMules,
            },
          });
        }
      })
      .on('broadcast', { event: 'raid_thwarted' }, (payload) => {
        const data = payload.payload;
        if (data.attackerId === playerId) {
          setLogs((prev) => [t.raidThwartedAttackerLog, ...prev]);
        }
      })
      .on('broadcast', { event: 'raid_response' }, (payload) => {
        const data = payload.payload;
        if (data.attackerId === playerId) {
          // Attacker receives exact confirmed stolen inventory
          addGoldSafely(data.stolenGold);
          if (data.stolenMules > 0) {
            setTroops((prev) => ({ ...prev, mules: prev.mules + data.stolenMules }));
          }
          setLogs((prev) => [`${t.raidedYouLog} ${data.defenderName}! Stole +${data.stolenGold} GP and +${data.stolenMules} Mule!`, ...prev]);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Broadcast my presence to other devices with playerId included
          channel.send({
            type: 'broadcast',
            event: 'player_update',
            payload: { id: playerId, name: playerName, pos: playerPosition, gold: inventory.gold, mules: troops.mules },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomSeed, playerName, playerPosition, inventory.gold, troops.mules]);

  // Helper to broadcast position or state changes to opponent device
  const broadcastMyState = (newPos?: Position) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_update',
        payload: {
          id: playerId,
          name: playerName,
          pos: newPos || playerPosition,
          gold: inventory.gold,
          mules: troops.mules,
        },
      });
    }
  };

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

  // Deposit excess gold onto current tile ground stack & trigger modal
  const depositExcessGoldToTile = (pos: Position, excessAmount: number) => {
    if (excessAmount <= 0) return;

    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((tile) => {
          if (tile.x === pos.x && tile.y === pos.y) {
            const currentTileGold = tile.droppedGold ?? 0;
            return { ...tile, droppedGold: currentTileGold + excessAmount };
          }
          return tile;
        })
      )
    );

    setDroppedGoldNotice({ amount: excessAmount, pos });
  };

  // Helper to add gold with capacity guardrails + ground drop
  const addGoldSafely = (goldAmount: number) => {
    const result = StructuralGuardrails.protectInventoryState(inventory, troops, goldAmount, 0);
    setInventory(result.updatedInventory);

    if (result.droppedGold > 0) {
      depositExcessGoldToTile(playerPosition, result.droppedGold);
    }
  };

  // 📜 Spell of Seeing Handler
  const handleCastSeeingScroll = () => {
    if (inventory.scrollsSeeing <= 0) {
      alert(t.logNoScrolls);
      return;
    }
    setInventory((prev) => ({ ...prev, scrollsSeeing: prev.scrollsSeeing - 1 }));
    revealSightArea(playerPosition, 8); // Reveals 8-tile radius!
    setLogs((prev) => [t.logSeeingCast, ...prev]);
  };

  // 🌀 Teleport Scroll Targeting Handler
  const handleCastTeleportScroll = () => {
    if (inventory.scrollsTeleport <= 0) {
      alert(t.logNoScrolls);
      return;
    }
    setIsTeleportTargeting((prev) => !prev);
  };

  // Helper to check for nearby opponent players using Scout sight radius
  const checkForNearbyOpponents = (myPos: Position) => {
    Object.values(otherPlayers).forEach((opp) => {
      const dx = Math.abs(myPos.x - opp.pos.x);
      const dy = Math.abs(myPos.y - opp.pos.y);
      if (dx <= sightRadius && dy <= sightRadius) {
        setSpottedOpponentNotice({ name: opp.name, pos: opp.pos });
      }
    });
  };

  // Helper to find connected target within 3 tiles range
  const getValidRaidTarget = () => {
    const opponents = Object.values(otherPlayers);
    return opponents.find((opp) => {
      const dx = Math.abs(playerPosition.x - opp.pos.x);
      const dy = Math.abs(playerPosition.y - opp.pos.y);
      return dx <= 3 && dy <= 3;
    });
  };
  
  // Helper to find the nearest non-lake, non-mountain land tile for local respawns
  const findNearestSafeTile = (currentPos: Position): Position => {
    for (let radius = 1; radius < grid.length; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const nx = currentPos.x + dx;
          const ny = currentPos.y + dy;
          if (nx >= 0 && nx < grid.length && ny >= 0 && ny < grid[0].length) {
            const tile = grid[nx][ny];
            if (tile.terrain !== 'LAKE' && tile.terrain !== 'MOUNTAIN') {
              return { x: nx, y: ny };
            }
          }
        }
      }
    }
    return currentPos;
  };

  // 🗡️ Raider Stealth Raid Handler (With Dynamic Range Guardrail)
  const handleExecuteCampRaid = () => {
    if (troops.raiders <= 0) {
      alert("You need at least 1 Raider Specialist to conduct stealth raids!");
      return;
    }

    const validTarget = getValidRaidTarget();

    if (validTarget && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'raid_request',
        payload: {
          attackerId: playerId,
          attackerName: playerName,
          targetId: validTarget.id,
        },
      });
    } else {
      // Offline / Wild Bandit Camp Raid Fallback
      addGoldSafely(150);
      setTroops((prev) => ({ ...prev, mules: prev.mules + 1 }));
      setLogs((prev) => [t.logRaidSuccess, ...prev]);
    }
  };

  // Check and auto-pickup ground gold when stepping on a tile
  const checkGroundLootPickup = (pos: Position, currentGold: number, currentCap: number) => {
    const targetTile = grid[pos.x]?.[pos.y];
    const tileGold = targetTile?.droppedGold ?? 0;

    if (tileGold > 0 && currentGold < currentCap) {
      const freeCap = currentCap - currentGold;
      const pickupAmount = Math.min(tileGold, freeCap);
      const remainingTileGold = tileGold - pickupAmount;

      setInventory((prev) => ({ ...prev, gold: prev.gold + pickupAmount }));

      setGrid((prevGrid) =>
        prevGrid.map((row) =>
          row.map((tile) => {
            if (tile.x === pos.x && tile.y === pos.y) {
              return { ...tile, droppedGold: remainingTileGold };
            }
            return tile;
          })
        )
      );

      setLogs((prev) => [`${t.pickupGoldLog} +${pickupAmount} GP [${pos.x}, ${pos.y}]!`, ...prev]);
      setCollectedGoldNotice({ amount: pickupAmount, pos });
    }
  };

  const handleTileClick = (targetTile: TileState) => {
    // Execute Targeted Teleportation (With Lake Drowning Rescue Rule!)
    if (isTeleportTargeting) {
      setInventory((prev) => ({ ...prev, scrollsTeleport: prev.scrollsTeleport - 1 }));
      setIsTeleportTargeting(false);

      if (targetTile.terrain === 'LAKE' && !inventory.hasRaft) {
        const safePos = findNearestSafeTile({ x: targetTile.x, y: targetTile.y });

        // Drowning Penalties: 50% Warriors drowned, all Mules drowned, Gold lost, 50% Rations lost
        const drownedWarriors = Math.floor(troops.warriors / 2);
        const survivingWarriors = Math.max(1, troops.warriors - drownedWarriors);

        setPlayerPosition(safePos);
        setInventory((prev) => ({ ...prev, gold: 0, rations: Math.floor(prev.rations / 2) }));
        setTroops((prev) => ({ ...prev, warriors: survivingWarriors, mules: 0 }));
        setMaxWarriors(survivingWarriors);
        setRemainingMF(10);
        revealSightArea(safePos, sightRadius);
        broadcastMyState(safePos);
        setDrownNotice({ pos: safePos });
        setLogs((prev) => [`${t.drownLog} [${safePos.x}, ${safePos.y}]! Drowned -${drownedWarriors} Warriors and all Mules!`, ...prev]);
        return;
      }

      setPreviousPosition(playerPosition);
      setPlayerPosition({ x: targetTile.x, y: targetTile.y });
      revealSightArea({ x: targetTile.x, y: targetTile.y }, sightRadius);
      broadcastMyState({ x: targetTile.x, y: targetTile.y });
      setLogs((prev) => [`${t.logTeleportCast} [${targetTile.x}, ${targetTile.y}]`, ...prev]);
      return;
    }

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

      broadcastMyState({ x: targetTile.x, y: targetTile.y });

      revealSightArea({ x: targetTile.x, y: targetTile.y }, sightRadius);

      // Check if stepping closer to any existing opponent triggers Scout detection
      checkForNearbyOpponents({ x: targetTile.x, y: targetTile.y });

      // Check auto-pickup ground gold on tile arrival
      checkGroundLootPickup({ x: targetTile.x, y: targetTile.y }, inventory.gold, maxGoldCapacity);

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

    if (guardrailResult.droppedGold > 0) {
      depositExcessGoldToTile(playerPosition, guardrailResult.droppedGold);
    }

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
    const safePos = findNearestSafeTile(playerPosition);
    setPlayerPosition(safePos);
    setTroops((prev) => ({ ...prev, warriors: 15 }));
    setMaxWarriors(15);
    setInventory((prev) => ({ ...prev, rations: 15, gold: 0 }));
    setRemainingMF(10);
    revealSightArea(safePos, sightRadius);
    broadcastMyState(safePos);
    setLogs((prev) => [`💀 Frontline routed! Retreating to nearby safe grid [${safePos.x}, ${safePos.y}].`, ...prev]);
  };

  const handlePurchaseComplete = (item: ShopItem, pricePaid: number) => {
    setInventory((prev) => ({ ...prev, gold: Math.max(0, prev.gold - pricePaid) }));

    let updatedTroops = { ...troops };
    if (item.id === 'rations') setInventory((prev) => ({ ...prev, rations: prev.rations + 10 }));
    if (item.id === 'warriors') {
      updatedTroops.warriors += 5;
      setMaxWarriors((prev) => prev + 5);
    }
    if (item.id === 'scouts') updatedTroops.scouts += 1;
    if (item.id === 'clerics') updatedTroops.clerics += 1;
    if (item.id === 'raiders') updatedTroops.raiders += 1;
    if (item.id === 'mules') updatedTroops.mules += 1;
    if (item.id === 'wizard') updatedTroops.wizards = 1;
    if (item.id === 'raft_bundle') {
      setInventory((prev) => ({ ...prev, hasRaft: true }));
      updatedTroops.mules += 4;
    }

    setTroops(updatedTroops);

    if (item.id === 'scouts') {
      revealSightArea(playerPosition, LogisticalEngine.calculateSightRadius(updatedTroops.scouts));
    }

    // Auto-pickup ground gold if capacity increased from bought Mules/Warriors!
    const newCap = StructuralGuardrails.calculateMaxGoldCapacity(updatedTroops);
    checkGroundLootPickup(playerPosition, inventory.gold - pricePaid, newCap);

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

    // Passive Cleric Healing on Rest/Pass Turn (+1 Warrior per Cleric up to max recruited capacity)
    let clericHealedMsg = '';
    if (troops.clerics > 0 && newWarriors < maxWarriors) {
      const healedWarriors = Math.min(maxWarriors, newWarriors + troops.clerics);
      if (healedWarriors > newWarriors) {
        const diff = healedWarriors - newWarriors;
        newWarriors = healedWarriors;
        clericHealedMsg = ` 📿 Clerics healed +${diff} wounded Warriors during rest!`;
      }
    }

    setInventory((prev) => ({ ...prev, rations: newRations }));
    setTroops((prev) => ({ ...prev, warriors: newWarriors }));
    setRemainingMF(10);
    setLogs((prev) => [t.logNewTurn, logMsg + clericHealedMsg, ...prev]);
  };

  const maxGoldCapacity = StructuralGuardrails.calculateMaxGoldCapacity(troops);

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#000', borderRadius: '8px', border: '2px solid #00ff00' }}>
      <header style={{ borderBottom: '2px solid #00ff00', paddingBottom: '12px', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>{t.headerTitle}</h2>
        <p style={{ margin: '4px 0 0 0', color: '#888' }}>{t.headerSub}</p>
      </header>

      {/* Dev Control Toolbar & Player Identity */}
      <div style={{ display: 'flex', gap: '16px', backgroundColor: '#111', padding: '10px 12px', border: '1px dashed #00ff00', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ color: '#ff0', fontWeight: 'bold' }}>
          {t.playerNameLabel} 
          <input 
            type="text" 
            value={playerName} 
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ backgroundColor: '#000', color: '#ff0', border: '1px solid #ff0', marginLeft: '6px', padding: '4px', width: '130px', fontFamily: 'monospace', fontWeight: 'bold' }} 
          />
        </label>
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
        <div style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
          {t.opponentsOnline} <strong style={{ color: Object.values(otherPlayers).length > 0 ? '#00ff00' : '#ff3333' }}>{Object.values(otherPlayers).map(p => p.name).join(', ') || 'None'}</strong>
        </div>
      </div>

      {/* Dev Sandbox Army Tweaker */}
      <div style={{ display: 'flex', gap: '8px', backgroundColor: '#080808', padding: '8px 12px', border: '1px solid #333', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#ff0', fontWeight: 'bold' }}>{t.sandboxTitle}:</span>
        <button onClick={() => { setTroops(p => ({ ...p, warriors: p.warriors + 10 })); setMaxWarriors(p => p + 10); }} style={{ backgroundColor: '#222', color: '#00ff00', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addWarriors}</button>
        <button onClick={() => addGoldSafely(500)} style={{ backgroundColor: '#222', color: '#ff0', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>
    {t.addGold}
  </button>
        <button onClick={() => setInventory(p => ({ ...p, rations: p.rations + 20 }))} style={{ backgroundColor: '#222', color: '#00ff00', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addRations}</button>
        <button onClick={() => setTroops(p => ({ ...p, wizards: 1 }))} style={{ backgroundColor: '#222', color: '#ab47bc', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addWizard}</button>
        <button onClick={() => setInventory(p => ({ ...p, scrollsSeeing: p.scrollsSeeing + 1 }))} style={{ backgroundColor: '#222', color: '#00ffff', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>+1 Seeing Scroll</button>
        <button onClick={() => setInventory(p => ({ ...p, scrollsTeleport: p.scrollsTeleport + 1 }))} style={{ backgroundColor: '#222', color: '#ab47bc', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>+1 Teleport Scroll</button>
        <button onClick={() => setTroops(p => ({ ...p, raiders: p.raiders + 1 }))} style={{ backgroundColor: '#222', color: '#ff3333', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>+1 Raider</button>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCastSeeingScroll}
            disabled={inventory.scrollsSeeing <= 0}
            style={{ backgroundColor: '#111', color: inventory.scrollsSeeing > 0 ? '#00ffff' : '#555', border: `1px solid ${inventory.scrollsSeeing > 0 ? '#00ffff' : '#333'}`, padding: '6px 12px', fontSize: '12px', cursor: inventory.scrollsSeeing > 0 ? 'pointer' : 'default', fontFamily: 'monospace' }}
          >
            {t.castSeeingBtn} ({inventory.scrollsSeeing})
          </button>

          <button
            onClick={handleCastTeleportScroll}
            disabled={inventory.scrollsTeleport <= 0}
            style={{ backgroundColor: '#111', color: inventory.scrollsTeleport > 0 ? '#ab47bc' : '#555', border: `1px solid ${inventory.scrollsTeleport > 0 ? '#ab47bc' : '#333'}`, padding: '6px 12px', fontSize: '12px', cursor: inventory.scrollsTeleport > 0 ? 'pointer' : 'default', fontFamily: 'monospace' }}
          >
            {t.castTeleportBtn} ({inventory.scrollsTeleport})
          </button>

          <button
            onClick={handleExecuteCampRaid}
            disabled={troops.raiders <= 0}
            style={{ backgroundColor: '#111', color: troops.raiders > 0 ? '#ff3333' : '#555', border: `1px solid ${troops.raiders > 0 ? '#ff3333' : '#333'}`, padding: '6px 12px', fontSize: '12px', cursor: troops.raiders > 0 ? 'pointer' : 'default', fontFamily: 'monospace' }}
          >
            {getValidRaidTarget()
              ? `🗡️ Raid [${getValidRaidTarget()?.name}]'s Camp` 
              : t.raidCampBtn} ({troops.raiders})
          </button>
        </div>

        <button
          onClick={handleEndTurn}
          style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '8px 20px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          {t.endTurnBtn}
        </button>
      </div>

      {/* Teleport Targeting Banner */}
      {isTeleportTargeting && (
        <div style={{ backgroundColor: '#ab47bc', color: '#fff', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t.teleportTargetPrompt}</span>
          <button onClick={() => setIsTeleportTargeting(false)} style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>
            {t.teleportCancelBtn}
          </button>
        </div>
      )}

      {/* Map Viewport Area */}
      {grid.length > 0 && (
        <MapView
          grid={grid}
          playerPosition={playerPosition}
          otherPlayers={otherPlayers}
          sightRadius={sightRadius}
          remainingMF={remainingMF}
          hasRaft={inventory.hasRaft}
          isTeleportTargeting={isTeleportTargeting}
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

{/* Dropped Gold Modal Dialog (Requires explicit OK click) */}
      {droppedGoldNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff0', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%', color: '#ff0', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.droppedGoldModalTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.droppedGoldModalMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff0', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>💰 {t.droppedAmountLabel} <strong style={{ color: '#ff0' }}>+{droppedGoldNotice.amount} GP</strong></div>
              <div style={{ marginTop: '4px' }}>📍 {t.locationLabel} <strong>[{droppedGoldNotice.pos.x}, {droppedGoldNotice.pos.y}]</strong></div>
            </div>

            <button
              onClick={() => setDroppedGoldNotice(null)}
              style={{ backgroundColor: '#ff0', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}
      
      {/* Gold Collected Modal Dialog */}
      {collectedGoldNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #00ff00', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#00ff00', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.goldCollectedModalTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.goldCollectedModalMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #00ff00', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>💰 {t.goldCollectedAmountLabel} <strong style={{ color: '#00ff00' }}>+{collectedGoldNotice.amount} GP</strong></div>
              <div style={{ marginTop: '4px' }}>📍 {t.locationLabel} <strong>[{collectedGoldNotice.pos.x}, {collectedGoldNotice.pos.y}]</strong></div>
            </div>

            <button
              onClick={() => setCollectedGoldNotice(null)}
              style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ EXCELLENT
            </button>
          </div>
        </div>
      )}

{/* Lake Drown Warning Modal */}
      {drownNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #0288d1', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#0288d1', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.drownModalTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.drownModalMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #0288d1', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>📍 Rescued Coordinates: <strong style={{ color: '#0288d1' }}>[{drownNotice.pos.x}, {drownNotice.pos.y}]</strong></div>
            </div>

            <button
              onClick={() => setDrownNotice(null)}
              style={{ backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}
      
      {/* Camp Raided MsgBox Modal */}
      {raidedNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff3333', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#ff3333', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.raidModalTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.raidModalMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff3333', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>🗡️ {t.raidedByLabel} <strong style={{ color: '#fff' }}>{raidedNotice.attackerName}</strong></div>
              <div style={{ marginTop: '4px' }}>💰 {t.goldStolenLabel} <strong style={{ color: '#ff3333' }}>-{raidedNotice.stolenGold} GP</strong></div>
              <div style={{ marginTop: '4px' }}>🫏 {t.mulesLootedLabel} <strong style={{ color: '#ff3333' }}>-{raidedNotice.stolenMules} Mule</strong></div>
            </div>

            <button
              onClick={() => setRaidedNotice(null)}
              style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}
      
      {/* Scout Opponent Spotted Modal */}
      {spottedOpponentNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff3333', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#ff3333', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.opponentSpottedTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.opponentSpottedMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff3333', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>🧙‍♀️ Player: <strong style={{ color: '#fff' }}>{spottedOpponentNotice.name}</strong></div>
              <div style={{ marginTop: '4px' }}>📍 Coordinates: <strong style={{ color: '#ff3333' }}>[{spottedOpponentNotice.pos.x}, {spottedOpponentNotice.pos.y}]</strong></div>
            </div>

            <button
              onClick={() => setSpottedOpponentNotice(null)}
              style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
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