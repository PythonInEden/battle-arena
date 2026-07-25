// src/fortress/components/FortressWorkspace.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapEngine } from '../MapEngine';
import { LogisticalEngine } from '../LogisticalEngine';
import { StructuralGuardrails } from '../utils/guardrails';
import { MarketplaceEngine, ShopItem } from '../MarketplaceEngine';
import { CombatEngine, EncounterGroup, MONSTER_DATABASE } from '../CombatEngine';
import { TileState, Position, TroopRoster, PlayerInventory, QuestRelic } from '../types';
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

  // Relic Claimed Modal State
  const [relicNotice, setRelicNotice] = useState<string | null>(null);

  // Pending Relic Reward State
  const [pendingRelicReward, setPendingRelicReward] = useState<QuestRelic | null>(null);

  // Pending Town Rumor Intel Queue
  const [pendingRumors, setPendingRumors] = useState<string[]>([]);
  const [townRumorNotice, setTownRumorNotice] = useState<string[] | null>(null);

  // Citadel & 16-Room Memory Crawler States
  const [isCitadelSealedNotice, setIsCitadelSealedNotice] = useState<boolean>(false);
  const [isInsideCitadel, setIsInsideCitadel] = useState<boolean>(false);
  const [isTeleportTrapModal, setIsTeleportTrapModal] = useState<boolean>(false);
  const [gameWinnerNotice, setGameWinnerNotice] = useState<{ winnerName: string; isMe: boolean } | null>(null);

  // Duel Defeat Modal State
  const [isDuelDefeatNotice, setIsDuelDefeatNotice] = useState<boolean>(false);

  // 🏛️ Persistent 16-Room Fortress Layout
  const [fortressRooms, setFortressRooms] = useState<Array<{
    id: number;
    type: 'WITCH_KING' | 'TELEPORT_TRAP' | 'MONSTER';
    monsterId?: string;
    isRevealed: boolean;
    isCleared: boolean;
  }>>(() => {
    // Generate randomized 16 rooms (1 Witch King, 4 Traps, 11 Guards)
    const types: Array<'WITCH_KING' | 'TELEPORT_TRAP' | 'MONSTER'> = [
      'WITCH_KING',
      'TELEPORT_TRAP', 'TELEPORT_TRAP', 'TELEPORT_TRAP', 'TELEPORT_TRAP',
      'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER',
      'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER'
    ];
    
    // Shuffle array
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    const guardPool = ['iron_golem', 'gargoyle', 'shadow_lich', 'chimera', 'frost_giant', 'skeleton_warrior'];

    return types.map((type, idx) => ({
      id: idx,
      type,
      monsterId: type === 'MONSTER' ? guardPool[Math.floor(Math.random() * guardPool.length)] : undefined,
      isRevealed: false,
      isCleared: false,
    }));
  });

  // 👑 1v1 Final Boss Rock-Paper-Scissors Duel State
  const [activeDuel, setActiveDuel] = useState<{
    round: number;
    playerWins: number;
    bossWins: number;
    lastResult: string | null;
  } | null>(null);

  const sightRadius = LogisticalEngine.calculateSightRadius(troops.scouts);

  useEffect(() => {
    const generatedGrid = MapEngine.generateProceduralMap(roomSeed, difficulty);

    // 🏛️ Seed each of the 4 Quest Relics exactly ONCE on distinct Mountain tiles
    const questRelics = ['boots', 'sword', 'armor', 'horn'];
    let relicIdx = 0;
    for (let x = 0; x < generatedGrid.length && relicIdx < questRelics.length; x++) {
      for (let y = 0; y < generatedGrid[x].length && relicIdx < questRelics.length; y++) {
        if (generatedGrid[x][y].terrain === 'MOUNTAIN' && !generatedGrid[x][y].hasRelic) {
          generatedGrid[x][y].hasRelic = questRelics[relicIdx] as any;
          (generatedGrid[x][y] as any).relic = questRelics[relicIdx];
          relicIdx++;
        }
      }
    }

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
  }, [roomSeed, difficulty, playerId]);

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

          // Defender calculates actual lost inventory & check for storable relic theft!
          const stolenGold = Math.min(inventory.gold, 150);
          const stolenMules = Math.min(troops.mules, 1);
          
          let stolenRelic: string | null = null;
          if (inventory.activeRelics.length > 0) {
            stolenRelic = String(inventory.activeRelics[0]);
            setInventory((prev) => ({
              ...prev,
              gold: Math.max(0, prev.gold - stolenGold),
              activeRelics: prev.activeRelics.slice(1),
            }));
          } else {
            setInventory((prev) => ({ ...prev, gold: Math.max(0, prev.gold - stolenGold) }));
          }

          setTroops((prev) => ({ ...prev, mules: Math.max(0, prev.mules - stolenMules) }));
          setRaidedNotice({ attackerName: data.attackerName, stolenGold, stolenMules });
          setLogs((prev) => [`${t.raidedByLog} ${data.attackerName}! Lost -${stolenGold} GP, -${stolenMules} Mule${stolenRelic ? `, and ${stolenRelic}` : ''}!`, ...prev]);

          // Broadcast global event rumor to other players
          if (stolenRelic) {
            channel.send({
              type: 'broadcast',
              event: 'global_rumor',
              payload: {
                text: `🗡️ ${data.attackerName} ${t.logRumorStolen} [${stolenRelic.toUpperCase()}] ${t.logRumorFrom} ${playerName}!`,
              },
            });
          }

          // Send confirmation response back to attacker
          channel.send({
            type: 'broadcast',
            event: 'raid_response',
            payload: {
              attackerId: data.attackerId,
              defenderName: playerName,
              stolenGold,
              stolenMules,
              stolenRelic,
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
          // Attacker receives exact confirmed stolen inventory & stolen relic
          addGoldSafely(data.stolenGold);
          if (data.stolenMules > 0) {
            setTroops((prev) => ({ ...prev, mules: prev.mules + data.stolenMules }));
          }
          if (data.stolenRelic) {
            setInventory((prev) => ({
              ...prev,
              activeRelics: Array.from(new Set([...prev.activeRelics, data.stolenRelic as any])),
            }));
          }
          setLogs((prev) => [`${t.raidedYouLog} ${data.defenderName}! Stole +${data.stolenGold} GP, +${data.stolenMules} Mule${data.stolenRelic ? `, & ${data.stolenRelic}` : ''}!`, ...prev]);
        }
      })
      .on('broadcast', { event: 'global_rumor' }, (payload) => {
        const rumorText = payload.payload.text;
        // Queue rumors until player enters a Town or Sanctuary
        setPendingRumors((prev) => [...prev, rumorText]);
      })

      .on('broadcast', { event: 'game_victory' }, (payload) => {
        const data = payload.payload;
        if (data.winnerId !== playerId) {
          setGameWinnerNotice({ winnerName: data.winnerName, isMe: false });
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
          return;
        }

        // 👑 Allow re-entering Citadel on same-tile click!
        if (targetTile.terrain === 'CITADEL') {
          const hasHorn = inventory.activeRelics.some((r) => String(r).toLowerCase() === 'horn');
          const successChance = hasHorn ? 0.75 : Math.min(0.80, troops.scouts * 0.05);
          const isBreached = Math.random() <= successChance;

          if (!isBreached) {
            setIsCitadelSealedNotice(true);
            setLogs((prev) => [t.logCitadelSealed, ...prev]);
            return;
          }

          setIsInsideCitadel(true);
          setLogs((prev) => [t.logCitadelReentered, ...prev]);
          return;
        }

        setLogs((prev) => [`${t.logRested} [${targetTile.x}, ${targetTile.y}] (-1 MF).`, ...prev]);
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

      // 🏰 / ⛩️ Trigger Town & Sanctuary Rumor Network update if entering hubs!
      if (targetTile.terrain === 'TOWN' || targetTile.terrain === 'SANCTUARY') {
        if (pendingRumors.length > 0) {
          setTownRumorNotice([...pendingRumors]);
          setPendingRumors([]); // Clear queue after reading news!
        }
      }

      if (targetTile.terrain === 'TOWN') {
        const availableItems = MarketplaceEngine.generateAvailableInventory(troops, inventory);
        setShopCatalog(availableItems);
        setIsShopOpen(true);
        setLogs((prev) => [t.logEnteredTown, ...prev]);
        return;
      }

      // 👑 CITADEL STRONGHOLD GATE ENTRY CHECK
      if (targetTile.terrain === 'CITADEL') {
        const hasHorn = inventory.activeRelics.some((r) => String(r).toLowerCase() === 'horn');
        
        // Gate Success Roll: 75% with Horn, or 5% * Scout Count without Horn
        const successChance = hasHorn ? 0.75 : Math.min(0.80, troops.scouts * 0.05);
        const isBreached = Math.random() <= successChance;

        if (!isBreached) {
          setIsCitadelSealedNotice(true);
          setRemainingMF((prev) => Math.max(0, prev - 1));
          setLogs((prev) => [t.logCitadelSealed, ...prev]);
          return;
        }

        // Breached! Enter 16-Room Memory Crawler
        setIsInsideCitadel(true);
        setLogs((prev) => [`🏰 Gates breached! Entering the Witch King's Fortress...`, ...prev]);
        return;
      }

      // 🏛️ Check Relic Tile Guardian Encounter Trigger
      const tileRelic = (targetTile as any).relic || (targetTile as any).hasRelic;
      if (tileRelic && !inventory.activeRelics.includes(tileRelic as any)) {
        const guardianBoss = CombatEngine.spawnRelicGuardian(tileRelic as any, troops);
        setActiveEncounter(guardianBoss);
        setPendingRelicReward(tileRelic as any);
        setAllowSurpriseRetreat(false); // Relic Boss fights cannot be bypassed!
        setLogs((prev) => [t.logRelicFound, ...prev]);
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
    setPendingRelicReward(null);
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

    // Award Relic if defeating a Relic Guardian Boss!
    if (pendingRelicReward) {
      setInventory((prev) => ({
        ...prev,
        activeRelics: Array.from(new Set([...prev.activeRelics, pendingRelicReward])),
      }));
      setRelicNotice(pendingRelicReward as string);

      // Broadcast rumor to town networks
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'global_rumor',
          payload: {
            text: `👑 ${playerName} ${t.logRumorClaimed} [${String(pendingRelicReward).toUpperCase()}]!`,
          },
        });
      }

      // Clear relic icon from current map tile
      setGrid((prevGrid) =>
        prevGrid.map((row) =>
          row.map((tile) => {
            if (tile.x === playerPosition.x && tile.y === playerPosition.y) {
              return { ...tile, relic: undefined, hasRelic: null } as any;
            }
            return tile;
          })
        )
      );

      setPendingRelicReward(null);
    }

    if (isPoisoned) {
      setRemainingMF((prev) => Math.max(0, prev - 1));
      setLogs((prev) => [t.poisonedMsg, victoryLog, ...prev]);
    } else {
      setLogs((prev) => [victoryLog, ...prev]);
    }
  };

  // 🧩 16-Room Memory Crawler Click Handler
  const handleRoomClick = (roomIndex: number) => {
    const room = fortressRooms[roomIndex];
    if (room.isCleared) return;

    // Mark room revealed in persistent state
    setFortressRooms((prev) =>
      prev.map((r, i) => (i === roomIndex ? { ...r, isRevealed: true } : r))
    );

    // 🌀 Teleporter Trap (Mark cleared & eject)
    if (room.type === 'TELEPORT_TRAP') {
      setFortressRooms((prev) =>
        prev.map((r, i) => (i === roomIndex ? { ...r, isCleared: true, isRevealed: true } : r))
      );
      setIsInsideCitadel(false);
      setIsTeleportTrapModal(true);
      setLogs((prev) => [`🌀 Triggered Teleporter Trap in Room #${roomIndex + 1}! Ejected to overworld!`, ...prev]);
      return;
    }

    // ⚔️ Castle Guard Encounter
    if (room.type === 'MONSTER') {
      const monsterProf = MONSTER_DATABASE.find((m) => m.id === room.monsterId) || MONSTER_DATABASE[0];
      const guardEncounter: EncounterGroup = {
        monster: monsterProf,
        quantity: Math.max(1, Math.floor(troops.warriors / 10)),
        totalHp: Math.round(monsterProf.strength * 12),
        maxHp: Math.round(monsterProf.strength * 12),
        groupStrength: monsterProf.strength * 2,
      };

      setActiveEncounter(guardEncounter);
      setAllowSurpriseRetreat(false);
      
      // Mark room cleared upon victory callback!
      setFortressRooms((prev) =>
        prev.map((r, i) => (i === roomIndex ? { ...r, isCleared: true } : r))
      );
      return;
    }

    // 👑 The Witch King Room Uncovered -> Start 1v1 RPS Duel!
    if (room.type === 'WITCH_KING') {
      setIsInsideCitadel(false);
      setActiveDuel({ round: 1, playerWins: 0, bossWins: 0, lastResult: null });
      setLogs((prev) => [t.witchKingTitle, ...prev]);
    }
  };

  // ⚔️ 1v1 Rock-Paper-Scissors Duel Stance Resolver
  const handleExecuteDuelStance = (playerStance: 'BLADE' | 'SHIELD' | 'SPELL') => {
    if (!activeDuel) return;

    const stances: Array<'BLADE' | 'SHIELD' | 'SPELL'> = ['BLADE', 'SHIELD', 'SPELL'];
    const bossStance = stances[Math.floor(Math.random() * stances.length)];

    let pWins = activeDuel.playerWins;
    let bWins = activeDuel.bossWins;
    let resultMsg = '';

    if (playerStance === bossStance) {
      resultMsg = `🤝 ${t.roundDraw} (${playerStance} vs ${bossStance})`;
    } else if (
      (playerStance === 'BLADE' && bossStance === 'SPELL') ||
      (playerStance === 'SPELL' && bossStance === 'SHIELD') ||
      (playerStance === 'SHIELD' && bossStance === 'BLADE')
    ) {
      pWins += 1;
      resultMsg = `🎉 ${t.roundWin} (${playerStance} beats ${bossStance})!`;
    } else {
      bWins += 1;
      resultMsg = `💀 ${t.roundLoss} (${bossStance} beats ${playerStance})!`;
    }

    // Check Victory (First to 2 wins)
    if (pWins >= 2) {
      setActiveDuel(null);
      setGameWinnerNotice({ winnerName: playerName, isMe: true });
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'game_victory',
          payload: { winnerId: playerId, winnerName: playerName },
        });
      }
      return;
    }

    if (bWins >= 2) {
      setActiveDuel(null);
      setIsDuelDefeatNotice(true);
      return;
    }

    setActiveDuel({
      round: activeDuel.round + 1,
      playerWins: pWins,
      bossWins: bWins,
      lastResult: resultMsg,
    });
  };
  
  const handleCombatDefeat = () => {
    setActiveEncounter(null);
    setPendingRelicReward(null);
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
        <button onClick={() => { setInventory(p => ({ ...p, activeRelics: Array.from(new Set([...p.activeRelics, 'boots' as QuestRelic])) })); setRelicNotice('boots'); }} style={{ backgroundColor: '#222', color: '#ff00ff', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>+🥾 Boots</button>
        <button onClick={() => { setInventory(p => ({ ...p, activeRelics: Array.from(new Set([...p.activeRelics, 'sword' as QuestRelic])) })); setRelicNotice('sword'); }} style={{ backgroundColor: '#222', color: '#ff00ff', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>+🗡️ Sword</button>
        <button onClick={() => { setInventory(p => ({ ...p, activeRelics: Array.from(new Set([...p.activeRelics, 'armor' as QuestRelic])) })); setRelicNotice('armor'); }} style={{ backgroundColor: '#222', color: '#ff00ff', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>+🛡️ Armor</button>
        <button onClick={() => { setInventory(p => ({ ...p, activeRelics: Array.from(new Set([...p.activeRelics, 'horn' as QuestRelic])) })); setRelicNotice('horn'); }} style={{ backgroundColor: '#222', color: '#ff00ff', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>+🎺 Horn</button>
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
        <div style={{ gridColumn: 'span 4', color: '#ff00ff', fontSize: '12px', marginTop: '4px' }}>
          🏛️ Active Relics: {inventory.activeRelics.length > 0 ? (
            Array.from(new Set(inventory.activeRelics.map(r => String(r).toLowerCase())))
              .map(r => {
                if (r === 'boots') return '🥾 Boots';
                if (r === 'sword') return '🗡️ Sword';
                if (r === 'armor') return '🛡️ Armor';
                if (r === 'horn') return '🎺 Horn';
                return null;
              })
              .filter(Boolean)
              .join(' | ') || 'None'
          ) : 'None'}
        </div>
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

{/* 🏰 16-Room Memory Crawler Modal */}
      {isInsideCitadel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ab47bc', borderRadius: '8px', padding: '20px', maxWidth: '520px', width: '95%', color: '#ab47bc', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{t.citadelTitle}</h3>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>{t.citadelSubtitle}</p>

            {/* 4x4 Grid of 16 Covered Chambers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {fortressRooms.map((room, idx) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(idx)}
                  disabled={room.isCleared}
                  style={{
                    height: '75px',
                    backgroundColor: room.isCleared
                      ? (room.type === 'TELEPORT_TRAP' ? '#200520' : '#052005')
                      : room.isRevealed ? '#200505' : '#222',
                    border: `2px solid ${
                      room.isCleared
                        ? (room.type === 'TELEPORT_TRAP' ? '#ab47bc' : '#00ff00')
                        : room.isRevealed ? '#ff3333' : '#ab47bc'
                    }`,
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: room.isCleared ? 'default' : 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>
                    {room.isCleared
                      ? (room.type === 'TELEPORT_TRAP' ? '🌀' : room.type === 'WITCH_KING' ? '👑' : '💀')
                      : room.isRevealed
                        ? (room.type === 'TELEPORT_TRAP' ? '🌀' : room.type === 'WITCH_KING' ? '👑' : '⚔️')
                        : '❓'}
                  </span>
                  <span style={{ fontSize: '10px', marginTop: '4px', color: room.isCleared ? (room.type === 'TELEPORT_TRAP' ? '#ab47bc' : '#00ff00') : '#aaa' }}>
                    {room.isCleared
                      ? (room.type === 'TELEPORT_TRAP' ? t.roomTrap : t.roomSlain)
                      : `#${idx + 1}`}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsInsideCitadel(false)}
              style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #666', padding: '8px 20px', cursor: 'pointer', fontFamily: 'monospace' }}
            >
              🚪 Exit Citadel
            </button>
          </div>
        </div>
      )}

{/* 💀 Witch King Duel Defeat Modal */}
      {isDuelDefeatNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 125 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff3333', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#ff3333', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.duelDefeatTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>{t.duelDefeatMsg}</p>

            <button
              onClick={() => {
                setIsDuelDefeatNotice(false);
                handleCombatDefeat(); // Routes player to safe sanctuary tile
              }}
              style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ RETREAT TO SANCTUARY
            </button>
          </div>
        </div>
      )}
      
      {/* 🌀 Teleporter Trap Ejection Modal */}
      {isTeleportTrapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ab47bc', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#ab47bc', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.teleportTrapTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>{t.teleportTrapMsg}</p>

            <button
              onClick={() => setIsTeleportTrapModal(false)}
              style={{ backgroundColor: '#ab47bc', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}

      {/* 👑 1v1 Final Boss Rock-Paper-Scissors Duel Modal */}
      {activeDuel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#111', border: '3px solid #ff00ff', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#ff00ff', fontFamily: 'monospace', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{t.duelTitle}</h2>
            <p style={{ color: '#fff', fontSize: '12px', marginBottom: '16px' }}>{t.duelSubtitle}</p>

            {/* Boss Avatar Display */}
            <div style={{ margin: '0 auto 16px auto', width: '120px', height: '120px', border: '2px solid #ff00ff', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/monsters/witch_king.webp` : '/witch_king.webp'}
                alt="The Witch King"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallbackStep) {
                    img.dataset.fallbackStep = '1';
                    img.src = '/witch_king.webp';
                  } else if (img.dataset.fallbackStep === '1') {
                    img.dataset.fallbackStep = '2';
                    img.src = '/monsters/witch_king.webp';
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
            </div>

            {/* Scoreboard */}
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff00ff', padding: '10px', marginBottom: '16px', fontSize: '13px', color: '#fff' }}>
              <div>{t.duelRound} #{activeDuel.round} | You: <strong style={{ color: '#00ff00' }}>{activeDuel.playerWins}</strong> - Witch King: <strong style={{ color: '#ff3333' }}>{activeDuel.bossWins}</strong></div>
              {activeDuel.lastResult && <div style={{ marginTop: '6px', color: '#ff0' }}>{activeDuel.lastResult}</div>}
            </div>

            {/* RPS Stance Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => handleExecuteDuelStance('BLADE')} style={{ backgroundColor: '#222', color: '#00ff00', border: '1px solid #00ff00', padding: '10px 14px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                {t.stanceBlade}
              </button>
              <button onClick={() => handleExecuteDuelStance('SHIELD')} style={{ backgroundColor: '#222', color: '#00ffff', border: '1px solid #00ffff', padding: '10px 14px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                {t.stanceShield}
              </button>
              <button onClick={() => handleExecuteDuelStance('SPELL')} style={{ backgroundColor: '#222', color: '#ab47bc', border: '1px solid #ab47bc', padding: '10px 14px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                {t.stanceSpell}
              </button>
            </div>
          </div>
        </div>
      )}

{/* Citadel Sealed Warning Modal */}
      {isCitadelSealedNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #b71c1c', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#b71c1c', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.citadelSealedTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>{t.citadelSealedMsg}</p>

            <button
              onClick={() => setIsCitadelSealedNotice(false)}
              style={{ backgroundColor: '#b71c1c', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}

      {/* Grand Game Victory / Game Over Modal */}
      {gameWinnerNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#111', border: `3px solid ${gameWinnerNotice.isMe ? '#00ff00' : '#ff3333'}`, borderRadius: '8px', padding: '32px', maxWidth: '520px', width: '90%', color: gameWinnerNotice.isMe ? '#00ff00' : '#ff3333', fontFamily: 'monospace', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '22px' }}>
              {gameWinnerNotice.isMe ? t.gameVictoryTitle : t.opponentWonTitle}
            </h2>
            <p style={{ color: '#fff', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              {gameWinnerNotice.isMe ? t.victoryMsg : `${t.opponentWonMsg} (${gameWinnerNotice.winnerName})`}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{ backgroundColor: gameWinnerNotice.isMe ? '#00ff00' : '#ff3333', color: '#000', border: 'none', padding: '12px 32px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              🔄 RESTART ADVENTURE
            </button>
          </div>
        </div>
      )}
      
{/* Town & Sanctuary Rumor Network Modal */}
      {townRumorNotice && townRumorNotice.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #00ffff', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%', color: '#00ffff', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.townRumorTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.townRumorMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #00ffff', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px', color: '#fff', maxHeight: '180px', overflowY: 'auto' }}>
              {townRumorNotice.map((rumor, idx) => (
                <div key={idx} style={{ marginBottom: '8px', borderBottom: '1px solid #222', paddingBottom: '4px' }}>
                  {rumor}
                </div>
              ))}
            </div>

            <button
              onClick={() => setTownRumorNotice(null)}
              style={{ backgroundColor: '#00ffff', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ NOTED WITH THANKS
            </button>
          </div>
        </div>
      )}
      
      {/* Relic Acquired MsgBox Modal */}
      {relicNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff00ff', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#ff00ff', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.relicTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.relicAcquiredMsg}</p>
            
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff00ff', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px', color: '#fff' }}>
              <div>✨ Item Unlocked:</div>
              <strong style={{ color: '#ff00ff', display: 'block', marginTop: '6px' }}>
                {relicNotice === 'boots' ? t.relicBootsName : relicNotice === 'sword' ? t.relicSwordName : relicNotice === 'armor' ? t.relicArmorName : t.relicHornName}
              </strong>
            </div>

            <button
              onClick={() => setRelicNotice(null)}
              style={{ backgroundColor: '#ff00ff', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ EXCELLENT
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