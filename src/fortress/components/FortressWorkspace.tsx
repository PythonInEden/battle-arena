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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const getMonsterAssetUrl = (imageKey: string) => {
  const cleanKey = imageKey.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return `${supabaseUrl}/storage/v1/object/public/monsters/${cleanKey}.webp`;
};

const BASE_TURN_MF = 3;

// Helper to generate a random 4-letter uppercase Room Code (e.g. WKYG)
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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
    return sessionStorage.getItem('fortress_player_name') || `Hero_${Math.floor(Math.random() * 899 + 100)}`;
  });

  // Lobby Flow State: 'SELECT_MODE' | 'IN_LOBBY' | 'GAME_STARTED'
  const [lobbyStep, setLobbyStep] = useState<'SELECT_MODE' | 'IN_LOBBY' | 'GAME_STARTED'>('SELECT_MODE');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('');

  const [roomSeed, setRoomSeed] = useState<number>(() => Math.floor(10000 + Math.random() * 90000));
  const [difficulty, setDifficulty] = useState<number>(2);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Synced Player Order from Host
  const [syncedPlayerList, setSyncedPlayerList] = useState<string[]>([]);

  // Synchronized Turn State
  const [isTurnLocked, setIsTurnLocked] = useState<boolean>(false);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  // Admin Dev Tweaker States
  const [isDebugUnlocked, setIsDebugUnlocked] = useState<boolean>(false);
  const [showDebugPasswordModal, setShowDebugPasswordModal] = useState<boolean>(false);
  const [debugPasswordInput, setDebugPasswordInput] = useState<string>('');
  const DEV_PASSCODE = '1234';

  const [otherPlayers, setOtherPlayers] = useState<Record<string, { 
    id: string; 
    name: string; 
    pos: Position; 
    gold: number; 
    mules: number; 
    isReady: boolean;
    isTurnLocked: boolean;
  }>>({});

  const [isTeleportTargeting, setIsTeleportTargeting] = useState<boolean>(false);
  const [spottedOpponentNotice, setSpottedOpponentNotice] = useState<{ name: string; pos: Position } | null>(null);
  const channelRef = useRef<any>(null);
  
  const [grid, setGrid] = useState<TileState[][]>([]);
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 0, y: 0 });
  const [previousPosition, setPreviousPosition] = useState<Position>({ x: 0, y: 0 });
  const [remainingMF, setRemainingMF] = useState<number>(BASE_TURN_MF);

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

  const [droppedGoldNotice, setDroppedGoldNotice] = useState<{ amount: number; pos: Position } | null>(null);
  const [collectedGoldNotice, setCollectedGoldNotice] = useState<{ amount: number; pos: Position } | null>(null);
  const [drownNotice, setDrownNotice] = useState<{ pos: Position } | null>(null);
  const [raidedNotice, setRaidedNotice] = useState<{ attackerName: string; stolenGold: number; stolenMules: number } | null>(null);
  const [relicNotice, setRelicNotice] = useState<string | null>(null);
  const [pendingRelicReward, setPendingRelicReward] = useState<QuestRelic | null>(null);

  const [pendingRumors, setPendingRumors] = useState<string[]>([]);
  const [townRumorNotice, setTownRumorNotice] = useState<string[] | null>(null);

  const [isCitadelSealedNotice, setIsCitadelSealedNotice] = useState<boolean>(false);
  const [isInsideCitadel, setIsInsideCitadel] = useState<boolean>(false);
  const [isTeleportTrapModal, setIsTeleportTrapModal] = useState<boolean>(false);
  const [gameWinnerNotice, setGameWinnerNotice] = useState<{ winnerName: string; isMe: boolean } | null>(null);
  const [isDuelDefeatNotice, setIsDuelDefeatNotice] = useState<boolean>(false);
  const [pendingDungeonRoomIndex, setPendingDungeonRoomIndex] = useState<number | null>(null);

  const [fortressRooms, setFortressRooms] = useState<Array<{
    id: number;
    type: 'WITCH_KING' | 'TELEPORT_TRAP' | 'MONSTER';
    monsterId?: string;
    isRevealed: boolean;
    isCleared: boolean;
  }>>(() => {
    const types: Array<'WITCH_KING' | 'TELEPORT_TRAP' | 'MONSTER'> = [
      'WITCH_KING',
      'TELEPORT_TRAP', 'TELEPORT_TRAP', 'TELEPORT_TRAP', 'TELEPORT_TRAP',
      'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER',
      'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER', 'MONSTER'
    ];
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

  const [activeDuel, setActiveDuel] = useState<{
    round: number;
    playerWins: number;
    bossWins: number;
    lastResult: string | null;
  } | null>(null);

  const sightRadius = LogisticalEngine.calculateSightRadius(troops.scouts);

  const totalPlayersCount = Math.max(1, 1 + Object.keys(otherPlayers).length);
  const calculatedGridSize = totalPlayersCount <= 2 ? 12 : totalPlayersCount <= 4 ? 20 : totalPlayersCount <= 6 ? 28 : totalPlayersCount <= 8 ? 34 : 40;
  const allPlayersReady = isReady && (Object.values(otherPlayers).length === 0 || Object.values(otherPlayers).every((p) => p.isReady));

  // 📡 Realtime Supabase Channel
  useEffect(() => {
    if (!activeRoomCode) return;
    sessionStorage.setItem('fortress_player_name', playerName);

    const channelName = `fortress_room_${activeRoomCode}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'player_update' }, (payload) => {
        const data = payload.payload;
        if (data.id !== playerId) {
          setOtherPlayers((prev) => ({
            ...prev,
            [data.id]: { 
              id: data.id, 
              name: data.name, 
              pos: data.pos, 
              gold: data.gold, 
              mules: data.mules,
              isReady: data.isReady ?? false,
              isTurnLocked: data.isTurnLocked ?? false,
            },
          }));

          if (data.hostSeed && !isHost) setRoomSeed(data.hostSeed);
          if (data.hostDifficulty && !isHost) setDifficulty(data.hostDifficulty);
        }
      })
      .on('broadcast', { event: 'start_game_trigger' }, (payload) => {
        const { seed, difficulty: startDiff, playerIds } = payload.payload || {};
        if (seed) setRoomSeed(seed);
        if (startDiff) setDifficulty(startDiff);
        if (playerIds && Array.isArray(playerIds)) {
          setSyncedPlayerList(playerIds);
        }
        setLobbyStep('GAME_STARTED');
      })
      .on('broadcast', { event: 'global_new_round' }, () => {
        executeEndTurnUpkeep();
      })
      .on('broadcast', { event: 'raid_request' }, (payload) => {
        const data = payload.payload;
        if (data.targetId === playerId) {
          const evasionChance = Math.min(0.8, troops.scouts * 0.2);
          if (Math.random() < evasionChance) {
            setLogs((prev) => [t.raidThwartedLog, ...prev]);
            channel.send({
              type: 'broadcast',
              event: 'raid_thwarted',
              payload: { attackerId: data.attackerId, defenderName: playerName },
            });
            return;
          }

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

          if (stolenRelic) {
            channel.send({
              type: 'broadcast',
              event: 'global_rumor',
              payload: {
                text: `🗡️ ${data.attackerName} ${t.logRumorStolen} [${stolenRelic.toUpperCase()}] ${t.logRumorFrom} ${playerName}!`,
              },
            });
          }

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
        if (payload.payload.attackerId === playerId) {
          setLogs((prev) => [t.raidThwartedAttackerLog, ...prev]);
        }
      })
      .on('broadcast', { event: 'raid_response' }, (payload) => {
        const data = payload.payload;
        if (data.attackerId === playerId) {
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
        setPendingRumors((prev) => [...prev, payload.payload.text]);
      })
      .on('broadcast', { event: 'game_victory' }, (payload) => {
        if (payload.payload.winnerId !== playerId) {
          setGameWinnerNotice({ winnerName: payload.payload.winnerName, isMe: false });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'player_update',
            payload: { 
              id: playerId, 
              name: playerName, 
              pos: playerPosition, 
              gold: inventory.gold, 
              mules: troops.mules,
              isReady,
              isTurnLocked,
              hostSeed: isHost ? roomSeed : undefined,
              hostDifficulty: isHost ? difficulty : undefined,
            },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomCode, roomSeed, difficulty, playerName, playerPosition, inventory.gold, troops.mules, isReady, isTurnLocked, isHost]);

  // Handle Room Creation
  const handleCreateRoom = () => {
    const code = generateRoomCode();
    const newSeed = Math.floor(10000 + Math.random() * 90000);
    setIsHost(true);
    setRoomSeed(newSeed);
    setActiveRoomCode(code);
    setLobbyStep('IN_LOBBY');
  };

  // Handle Joining Existing Room
  const handleJoinRoom = () => {
    const trimmed = roomCodeInput.trim().toUpperCase();
    if (trimmed.length < 4) return alert('Please enter a valid 4-character Room Code!');
    setIsHost(false);
    setActiveRoomCode(trimmed);
    setLobbyStep('IN_LOBBY');
  };

  // 🔄 Reactive Turn Lock Check
  useEffect(() => {
    if (lobbyStep !== 'GAME_STARTED' || !isTurnLocked) return;

    const rivals = Object.values(otherPlayers);
    const areAllRivalsLocked = rivals.length > 0 && rivals.every((r) => r.isTurnLocked);

    if (areAllRivalsLocked) {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'global_new_round',
          payload: {},
        });
      }
      executeEndTurnUpkeep();
    }
  }, [isTurnLocked, otherPlayers, lobbyStep]);

  const toggleReadyState = () => {
    const nextReady = !isReady;
    setIsReady(nextReady);
    broadcastMyState(playerPosition, nextReady, isTurnLocked);
  };

  const handleUnlockDebug = () => {
    if (debugPasswordInput === DEV_PASSCODE) {
      setIsDebugUnlocked(true);
      setShowDebugPasswordModal(false);
      setDebugPasswordInput('');
    } else {
      alert('❌ Incorrect Admin Passcode!');
      setDebugPasswordInput('');
    }
  };

  // 🗺️ Map Generation & Scalable N-Player Radial Ring Spawning
  useEffect(() => {
    if (lobbyStep !== 'GAME_STARTED') return;

    const generatedGrid = MapEngine.generateProceduralMap(roomSeed, difficulty, calculatedGridSize);

    // 🏛️ Seed 4 Quest Relics on Mountain tiles
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

    const roster = syncedPlayerList.length > 0 ? syncedPlayerList : [playerId, ...Object.keys(otherPlayers)].sort();
    const mySlotIndex = Math.max(0, roster.indexOf(playerId));
    const totalP = Math.max(1, roster.length);
    const N = generatedGrid.length;

    // Calculate ideal radial ring coordinate
    const cx = (N - 1) / 2;
    const cy = (N - 1) / 2;
    const R = Math.floor(N * 0.38);

    const angle = (2 * Math.PI * mySlotIndex) / totalP - Math.PI / 2;
    const idealX = Math.max(1, Math.min(N - 2, Math.round(cx + R * Math.cos(angle))));
    const idealY = Math.max(1, Math.min(N - 2, Math.round(cy + R * Math.sin(angle))));

    let spawnPos: Position | null = null;
    let minDistance = Infinity;

    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        const t = generatedGrid[x][y].terrain;
        if (t === 'PLAINS' || t === 'FOREST' || t === 'TOWN' || t === 'SANCTUARY') {
          const dist = Math.hypot(x - idealX, y - idealY);
          if (dist < minDistance) {
            minDistance = dist;
            spawnPos = { x, y };
          }
        }
      }
    }

    const finalSpawnPos: Position = spawnPos || { x: idealX, y: idealY };

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

    broadcastMyState(finalSpawnPos, isReady, false);
  }, [lobbyStep, roomSeed, difficulty, playerId, calculatedGridSize, syncedPlayerList]);

  const broadcastMyState = (newPos?: Position, readyState?: boolean, lockedState?: boolean) => {
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
          isReady: readyState ?? isReady,
          isTurnLocked: lockedState ?? isTurnLocked,
          hostSeed: isHost ? roomSeed : undefined,
          hostDifficulty: isHost ? difficulty : undefined,
        },
      });
    }
  };

  const handleLaunchGame = () => {
    if (!isHost) return;
    const fullRoster = [playerId, ...Object.keys(otherPlayers)].sort();
    setSyncedPlayerList(fullRoster);
    setLobbyStep('GAME_STARTED');

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'start_game_trigger',
        payload: {
          seed: roomSeed,
          difficulty: difficulty,
          playerIds: fullRoster,
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

  const addGoldSafely = (goldAmount: number) => {
    const result = StructuralGuardrails.protectInventoryState(inventory, troops, goldAmount, 0);
    setInventory(result.updatedInventory);
    if (result.droppedGold > 0) {
      depositExcessGoldToTile(playerPosition, result.droppedGold);
    }
  };

  const handleCastSeeingScroll = () => {
    if (inventory.scrollsSeeing <= 0) return alert(t.logNoScrolls);
    setInventory((prev) => ({ ...prev, scrollsSeeing: prev.scrollsSeeing - 1 }));
    revealSightArea(playerPosition, 8);
    setLogs((prev) => [t.logSeeingCast, ...prev]);
  };

  const handleCastTeleportScroll = () => {
    if (inventory.scrollsTeleport <= 0) return alert(t.logNoScrolls);
    setIsTeleportTargeting((prev) => !prev);
  };

  const checkForNearbyOpponents = (myPos: Position) => {
    Object.values(otherPlayers).forEach((opp) => {
      const dx = Math.abs(myPos.x - opp.pos.x);
      const dy = Math.abs(myPos.y - opp.pos.y);
      if (dx <= sightRadius && dy <= sightRadius) {
        setSpottedOpponentNotice({ name: opp.name, pos: opp.pos });
      }
    });
  };

  const getValidRaidTarget = () => {
    const opponents = Object.values(otherPlayers);
    return opponents.find((opp) => {
      const dx = Math.abs(playerPosition.x - opp.pos.x);
      const dy = Math.abs(playerPosition.y - opp.pos.y);
      return dx <= 3 && dy <= 3;
    });
  };
  
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

  const handleExecuteCampRaid = () => {
    if (troops.raiders <= 0) return alert("You need at least 1 Raider Specialist to conduct stealth raids!");
    const validTarget = getValidRaidTarget();
    if (validTarget && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'raid_request',
        payload: { attackerId: playerId, attackerName: playerName, targetId: validTarget.id },
      });
    } else {
      addGoldSafely(150);
      setTroops((prev) => ({ ...prev, mules: prev.mules + 1 }));
      setLogs((prev) => [t.logRaidSuccess, ...prev]);
    }
  };

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
    if (isTurnLocked) return;

    if (isTeleportTargeting) {
      setInventory((prev) => ({ ...prev, scrollsTeleport: prev.scrollsTeleport - 1 }));
      setIsTeleportTargeting(false);

      if (targetTile.terrain === 'LAKE' && !inventory.hasRaft) {
        const safePos = findNearestSafeTile({ x: targetTile.x, y: targetTile.y });
        const drownedWarriors = Math.floor(troops.warriors / 2);
        const survivingWarriors = Math.max(1, troops.warriors - drownedWarriors);
        setPlayerPosition(safePos);
        setInventory((prev) => ({ ...prev, gold: 0, rations: Math.floor(prev.rations / 2) }));
        setTroops((prev) => ({ ...prev, warriors: survivingWarriors, mules: 0 }));
        setMaxWarriors(survivingWarriors);
        setRemainingMF(BASE_TURN_MF);
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

        if (targetTile.terrain === 'CITADEL') {
          const hasHorn = inventory.activeRelics.some((r) => String(r).toLowerCase() === 'horn');
          const successChance = hasHorn ? 0.75 : Math.min(0.80, troops.scouts * 0.05);
          if (Math.random() <= successChance) {
            setIsInsideCitadel(true);
            setLogs((prev) => [t.logCitadelReentered, ...prev]);
          } else {
            setIsCitadelSealedNotice(true);
            setLogs((prev) => [t.logCitadelSealed, ...prev]);
          }
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
      checkForNearbyOpponents({ x: targetTile.x, y: targetTile.y });
      checkGroundLootPickup({ x: targetTile.x, y: targetTile.y }, inventory.gold, maxGoldCapacity);

      const terrainName = (t as any)[`terrain${targetTile.terrain.charAt(0) + targetTile.terrain.slice(1).toLowerCase()}`] || targetTile.terrain;
      setLogs((prev) => [`${t.logMoved} ${terrainName} [${targetTile.x}, ${targetTile.y}] (-${moveCheck.cost} MF). ${nextMF} MF left.`, ...prev]);

      if (targetTile.terrain === 'TOWN' || targetTile.terrain === 'SANCTUARY') {
        if (pendingRumors.length > 0) {
          setTownRumorNotice([...pendingRumors]);
          setPendingRumors([]);
        }
      }

      if (targetTile.terrain === 'TOWN') {
        const availableItems = MarketplaceEngine.generateAvailableInventory(troops, inventory);
        setShopCatalog(availableItems);
        setIsShopOpen(true);
        setLogs((prev) => [t.logEnteredTown, ...prev]);
        return;
      }

      if (targetTile.terrain === 'CITADEL') {
        const hasHorn = inventory.activeRelics.some((r) => String(r).toLowerCase() === 'horn');
        const successChance = hasHorn ? 0.75 : Math.min(0.80, troops.scouts * 0.05);
        if (Math.random() <= successChance) {
          setIsInsideCitadel(true);
          setLogs((prev) => [`🏰 Gates breached! Entering the Witch King's Fortress...`, ...prev]);
        } else {
          setIsCitadelSealedNotice(true);
          setRemainingMF((prev) => Math.max(0, prev - 1));
          setLogs((prev) => [t.logCitadelSealed, ...prev]);
        }
        return;
      }

      const tileRelic = (targetTile as any).relic || (targetTile as any).hasRelic;
      if (tileRelic && !inventory.activeRelics.includes(tileRelic as any)) {
        const guardianBoss = CombatEngine.spawnRelicGuardian(tileRelic as any, troops);
        setActiveEncounter(guardianBoss);
        setPendingRelicReward(tileRelic as any);
        setAllowSurpriseRetreat(false);
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

    const guardrailResult = StructuralGuardrails.protectInventoryState(updatedInventory, updatedTroops, 0, 0);
    setInventory(guardrailResult.updatedInventory);

    if (guardrailResult.droppedGold > 0) {
      depositExcessGoldToTile(playerPosition, guardrailResult.droppedGold);
    }

    let victoryLog = `🏆 Defeated ${activeEncounter?.quantity}x ${monsterName}! Looted +${goldLooted} GP, Harvested +${rationsGained} Rations.`;
    if (guardrailResult.droppedGold > 0) {
      victoryLog += ` (${t.droppedGoldWarn} ${guardrailResult.droppedGold} GP)`;
    }

    if (pendingRelicReward) {
      setInventory((prev) => ({
        ...prev,
        activeRelics: Array.from(new Set([...prev.activeRelics, pendingRelicReward])),
      }));
      setRelicNotice(pendingRelicReward as string);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'global_rumor',
          payload: { text: `👑 ${playerName} ${t.logRumorClaimed} [${String(pendingRelicReward).toUpperCase()}]!` },
        });
      }

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

    if (pendingDungeonRoomIndex !== null) {
      setFortressRooms((prev) =>
        prev.map((r, i) => (i === pendingDungeonRoomIndex ? { ...r, isCleared: true } : r))
      );
      setPendingDungeonRoomIndex(null);
      setIsInsideCitadel(true);
    }

    if (isPoisoned) {
      setRemainingMF((prev) => Math.max(0, prev - 1));
      setLogs((prev) => [t.poisonedMsg, victoryLog, ...prev]);
    } else {
      setLogs((prev) => [victoryLog, ...prev]);
    }
  };

  const handleRoomClick = (roomIndex: number) => {
    const room = fortressRooms[roomIndex];
    if (room.isCleared) return;

    setFortressRooms((prev) =>
      prev.map((r, i) => (i === roomIndex ? { ...r, isRevealed: true } : r))
    );

    if (room.type === 'TELEPORT_TRAP') {
      const landTiles: Position[] = [];
      for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid[x].length; y++) {
          if (grid[x][y].terrain !== 'LAKE' && grid[x][y].terrain !== 'MOUNTAIN') {
            landTiles.push({ x, y });
          }
        }
      }

      const randomWarpPos = landTiles.length > 0 
        ? landTiles[Math.floor(Math.random() * landTiles.length)]
        : playerPosition;

      setPreviousPosition(playerPosition);
      setPlayerPosition(randomWarpPos);
      revealSightArea(randomWarpPos, sightRadius);
      broadcastMyState(randomWarpPos);

      setFortressRooms((prev) =>
        prev.map((r, i) => (i === roomIndex ? { ...r, isCleared: true, isRevealed: true } : r))
      );
      setIsInsideCitadel(false);
      setIsTeleportTrapModal(true);
      setLogs((prev) => [`🌀 Triggered Teleporter Trap in Chamber #${roomIndex + 1}! Teleported to [${randomWarpPos.x}, ${randomWarpPos.y}]!`, ...prev]);
      return;
    }

    if (room.type === 'MONSTER') {
      const monsterProf = MONSTER_DATABASE.find((m) => m.id === room.monsterId) || MONSTER_DATABASE[0];
      const hasBoots = inventory.activeRelics.some(r => String(r).toLowerCase() === 'boots');
      const hasArmor = inventory.activeRelics.some(r => String(r).toLowerCase() === 'armor');
      const hasSword = inventory.activeRelics.some(r => String(r).toLowerCase() === 'sword');

      let monsterMult = hasBoots ? 1.0 : 2.0;
      if (hasArmor) monsterMult *= 0.67;
      let effectiveStrength = monsterProf.strength * monsterMult;
      if (hasSword) effectiveStrength /= 1.5;

      const guardEncounter: EncounterGroup = {
        monster: monsterProf,
        quantity: Math.max(1, Math.floor(troops.warriors / 10)),
        totalHp: Math.max(30, Math.round(effectiveStrength * 10)),
        maxHp: Math.max(30, Math.round(effectiveStrength * 10)),
        groupStrength: Math.round(effectiveStrength * 2),
      };

      setPendingDungeonRoomIndex(roomIndex);
      setIsInsideCitadel(false);
      setActiveEncounter(guardEncounter);
      setAllowSurpriseRetreat(false);
      setLogs((prev) => [`⚔️ Engaged Castle Guard in Chamber #${roomIndex + 1}!`, ...prev]);
      return;
    }

    if (room.type === 'WITCH_KING') {
      setIsInsideCitadel(false);
      setActiveDuel({ round: 1, playerWins: 0, bossWins: 0, lastResult: null });
      setLogs((prev) => [t.witchKingTitle, ...prev]);
    }
  };

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
      lastResult: `[Round #${activeDuel.round}] ${resultMsg}`,
    });
  };

  const handleCombatDefeat = () => {
    setActiveEncounter(null);
    setPendingRelicReward(null);
    setPendingDungeonRoomIndex(null);
    setIsInsideCitadel(false);
    const safePos = findNearestSafeTile(playerPosition);
    setPlayerPosition(safePos);
    setTroops((prev) => ({ ...prev, warriors: 15 }));
    setMaxWarriors(15);
    setInventory((prev) => ({ ...prev, rations: 15, gold: 0 }));
    setRemainingMF(BASE_TURN_MF);
    revealSightArea(safePos, sightRadius);
    broadcastMyState(safePos);
    setLogs((prev) => [`💀 Frontline routed! Retreating to safe grid [${safePos.x}, ${safePos.y}].`, ...prev]);
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
    if (item.id === 'scouts') revealSightArea(playerPosition, LogisticalEngine.calculateSightRadius(updatedTroops.scouts));

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

  const handleLockTurnClick = () => {
    const nextLocked = true;
    setIsTurnLocked(nextLocked);
    broadcastMyState(playerPosition, isReady, nextLocked);
  };

  const executeEndTurnUpkeep = () => {
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
    setRemainingMF(BASE_TURN_MF);
    setIsTurnLocked(false);
    setLogs((prev) => [t.logNewTurn, logMsg + clericHealedMsg, ...prev]);

    broadcastMyState(playerPosition, isReady, false);
  };

  const maxGoldCapacity = StructuralGuardrails.calculateMaxGoldCapacity(troops);

  // --------------------------------------------------------------------------
  // 🏰 STEP 1: ROOM SELECTION & CREATION SCREEN
  // --------------------------------------------------------------------------
  if (lobbyStep === 'SELECT_MODE') {
    return (
      <div style={{ padding: '32px', maxWidth: '600px', margin: '40px auto', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#050505', borderRadius: '12px', border: '3px solid #00ff00', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', textShadow: '0 0 10px #00ff00' }}>{t.lobbyTitle}</h1>
        <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '32px' }}>{t.lobbySubtitle}</p>

        {/* Commander Name Input */}
        <div style={{ backgroundColor: '#111', border: '1px dashed #00ff00', padding: '16px', borderRadius: '8px', marginBottom: '28px', textAlign: 'left' }}>
          <label style={{ display: 'block', color: '#ff0', fontWeight: 'bold' }}>
            {t.enterNamePrompt}
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ backgroundColor: '#000', color: '#ff0', border: '1px solid #ff0', marginLeft: '10px', padding: '6px 10px', width: '200px', fontFamily: 'monospace', fontWeight: 'bold' }}
            />
          </label>
        </div>

        {/* Mode Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={handleCreateRoom}
            style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '16px 32px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '8px', width: '100%', maxWidth: '350px' }}
          >
            {t.createRoomBtn}
          </button>

          <div style={{ color: '#666', fontSize: '12px' }}>— OR JOIN FRIENDS —</div>

          <div style={{ backgroundColor: '#111', border: '1px solid #00ffff', padding: '16px', borderRadius: '8px', width: '100%', maxWidth: '350px', boxSizing: 'border-box' }}>
            <label style={{ display: 'block', color: '#00ffff', fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
              {t.enterRoomCodePrompt}
            </label>
            <input
              type="text"
              maxLength={4}
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. WKYG"
              style={{ backgroundColor: '#000', color: '#00ffff', border: '1px solid #00ffff', padding: '8px', textAlign: 'center', fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', width: '120px', letterSpacing: '4px', marginBottom: '12px' }}
            />
            <button
              onClick={handleJoinRoom}
              disabled={roomCodeInput.trim().length < 4}
              style={{ backgroundColor: roomCodeInput.trim().length >= 4 ? '#00ffff' : '#222', color: roomCodeInput.trim().length >= 4 ? '#000' : '#666', border: 'none', padding: '10px 24px', fontWeight: 'bold', fontSize: '13px', cursor: roomCodeInput.trim().length >= 4 ? 'pointer' : 'not-allowed', fontFamily: 'monospace', borderRadius: '6px', width: '100%' }}
            >
              {t.joinBtnText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 🏰 STEP 2: PRE-GAME LOBBY WAITING ROOM OVERLAY
  // --------------------------------------------------------------------------
  if (lobbyStep === 'IN_LOBBY') {
    return (
      <div style={{ padding: '32px', maxWidth: '700px', margin: '40px auto', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#050505', borderRadius: '12px', border: '3px solid #00ff00', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => setLobbyStep('SELECT_MODE')} style={{ backgroundColor: '#222', color: '#888', border: '1px solid #444', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px', fontSize: '12px' }}>
            {t.backToMenuBtn}
          </button>
          <span style={{ backgroundColor: isHost ? '#ff0' : '#00ffff', color: '#000', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
            {isHost ? t.hostBadge : t.guestBadge}
          </span>
        </div>

        <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', textShadow: '0 0 10px #00ff00' }}>
          {t.roomCodeLabel} <strong style={{ color: '#ff0', letterSpacing: '4px' }}>{activeRoomCode}</strong>
        </h1>
        <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '24px' }}>{t.lobbySubtitle}</p>

        {/* Host Room Settings */}
        <div style={{ backgroundColor: '#111', border: '1px dashed #00ff00', padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left' }}>
          <div style={{ color: '#fff', fontSize: '13px', marginBottom: '8px' }}>
            👤 {t.enterNamePrompt} <strong style={{ color: '#ff0' }}>{playerName}</strong>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ color: '#fff' }}>
              {t.seedLabel}
              <input
                type="number"
                value={roomSeed}
                disabled={!isHost}
                onChange={(e) => setRoomSeed(parseInt(e.target.value) || 10000)}
                style={{ backgroundColor: '#000', color: isHost ? '#00ff00' : '#888', border: '1px solid #00ff00', marginLeft: '8px', padding: '4px', width: '90px', fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ color: '#fff' }}>
              {t.diffLabel}
              <input
                type="number"
                min="1"
                max="4"
                value={difficulty}
                disabled={!isHost}
                onChange={(e) => setDifficulty(parseInt(e.target.value) || 1)}
                style={{ backgroundColor: '#000', color: isHost ? '#00ff00' : '#888', border: '1px solid #00ff00', marginLeft: '8px', padding: '4px', width: '50px', fontFamily: 'monospace' }}
              />
            </label>
            {!isHost && <span style={{ fontSize: '11px', color: '#888' }}>(Configured by Lobby Host)</span>}
          </div>
        </div>

        {/* Dynamic Map Info Card */}
        <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#fff' }}>
          <div>🌐 {t.mapSizeNotice} <strong style={{ color: '#00ffff' }}>{calculatedGridSize} x {calculatedGridSize}</strong> ({totalPlayersCount} Connected Commanders)</div>
        </div>

        {/* Connected Players Roster */}
        <div style={{ backgroundColor: '#111', border: '1px solid #00ff00', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#ff0' }}>{t.playerCountLabel}</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #222', color: '#fff' }}>
            <span>{isHost ? '👑' : '⚔️'} <strong>{playerName}</strong> (You) {isHost && <span style={{ color: '#ff0', fontSize: '11px' }}>[HOST]</span>}</span>
            <span style={{ color: isReady ? '#00ff00' : '#ff3333', fontWeight: 'bold' }}>
              {isReady ? `[ ${t.readyBtnText} ]` : `[ ${t.waitingForPlayers} ]`}
            </span>
          </div>

          {Object.values(otherPlayers).map((opp) => (
            <div key={opp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #222', color: '#aaa' }}>
              <span>⚔️ {opp.name}</span>
              <span style={{ color: opp.isReady ? '#00ff00' : '#ff3333', fontWeight: 'bold' }}>
                {opp.isReady ? '[ READY ]' : '[ WAITING ]'}
              </span>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={toggleReadyState}
            style={{ backgroundColor: isReady ? '#330000' : '#003300', color: isReady ? '#ff3333' : '#00ff00', border: `2px solid ${isReady ? '#ff3333' : '#00ff00'}`, padding: '12px 24px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '6px' }}
          >
            {isReady ? t.unreadyBtnText : t.readyBtnText}
          </button>

          {isHost ? (
            <button
              onClick={handleLaunchGame}
              disabled={!allPlayersReady}
              style={{ backgroundColor: allPlayersReady ? '#00ff00' : '#222', color: allPlayersReady ? '#000' : '#666', border: 'none', padding: '12px 28px', fontWeight: 'bold', fontSize: '14px', cursor: allPlayersReady ? 'pointer' : 'not-allowed', fontFamily: 'monospace', borderRadius: '6px' }}
            >
              {allPlayersReady ? t.startGameBtnText : '⏳ WAITING FOR ALL PLAYERS READY...'}
            </button>
          ) : (
            <div style={{ alignSelf: 'center', color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
              {t.waitingForHost}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 🎮 STEP 3: MAIN OVERWORLD GAME BOARD UI
  // --------------------------------------------------------------------------
  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#000', borderRadius: '8px', border: '2px solid #00ff00' }}>
      <header style={{ borderBottom: '2px solid #00ff00', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{t.headerTitle}</h2>
          <p style={{ margin: '4px 0 0 0', color: '#888' }}>{t.headerSub}</p>
        </div>
        <button
          onClick={() => setShowManualModal(true)}
          style={{ backgroundColor: '#111', color: '#00ffff', border: '1px solid #00ffff', padding: '8px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
        >
          {t.openManualBtn}
        </button>
      </header>

      {/* Control Bar */}
      <div style={{ display: 'flex', gap: '16px', backgroundColor: '#111', padding: '10px 12px', border: '1px dashed #00ff00', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#ff0', fontWeight: 'bold' }}>👤 {playerName} {isHost && '👑'}</span>
        <span style={{ color: '#888', fontSize: '12px' }}>Room Code: <strong style={{ color: '#00ffff' }}>{activeRoomCode}</strong></span>
        <span style={{ color: '#888', fontSize: '12px' }}>{t.diffLabel} <strong>Level {difficulty}</strong></span>
        
        <div style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
          {t.opponentsOnline} <strong style={{ color: Object.values(otherPlayers).length > 0 ? '#00ff00' : '#ff3333' }}>{Object.values(otherPlayers).map(p => p.name).join(', ') || 'None'}</strong>
        </div>

        {isDebugUnlocked ? (
          <button
            onClick={() => setIsDebugUnlocked(false)}
            style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', borderRadius: '3px' }}
          >
            🔒 LOCK TWEAKER
          </button>
        ) : (
          <button
            onClick={() => setShowDebugPasswordModal(true)}
            style={{ backgroundColor: '#111', color: '#555', border: '1px solid #222', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            🔒 Admin Dev Tools
          </button>
        )}
      </div>

      {/* Dev Sandbox Army Tweaker */}
      {isDebugUnlocked && (
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#080808', padding: '8px 12px', border: '1px solid #ff0', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#ff0', fontWeight: 'bold' }}>{t.sandboxTitle}:</span>
          <button onClick={() => { setTroops(p => ({ ...p, warriors: p.warriors + 10 })); setMaxWarriors(p => p + 10); }} style={{ backgroundColor: '#222', color: '#00ff00', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addWarriors}</button>
          <button onClick={() => addGoldSafely(500)} style={{ backgroundColor: '#222', color: '#ff0', border: '1px solid #555', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>{t.addGold}</button>
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
      )}

      {/* Logistical HUD Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#111', padding: '12px', border: '1px solid #00ff00', marginBottom: '16px' }}>
        <div>{t.posLabel} <strong>[{playerPosition.x}, {playerPosition.y}]</strong></div>
        <div>{t.mfLabel} <strong style={{ color: remainingMF > 0 ? '#00ff00' : '#ff3333' }}>{remainingMF} / {BASE_TURN_MF}</strong></div>
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
            disabled={inventory.scrollsSeeing <= 0 || isTurnLocked}
            style={{ backgroundColor: '#111', color: inventory.scrollsSeeing > 0 && !isTurnLocked ? '#00ffff' : '#555', border: `1px solid ${inventory.scrollsSeeing > 0 && !isTurnLocked ? '#00ffff' : '#333'}`, padding: '6px 12px', fontSize: '12px', cursor: inventory.scrollsSeeing > 0 && !isTurnLocked ? 'pointer' : 'default', fontFamily: 'monospace' }}
          >
            {t.castSeeingBtn} ({inventory.scrollsSeeing})
          </button>

          <button
            onClick={handleCastTeleportScroll}
            disabled={inventory.scrollsTeleport <= 0 || isTurnLocked}
            style={{ backgroundColor: '#111', color: inventory.scrollsTeleport > 0 && !isTurnLocked ? '#ab47bc' : '#555', border: `1px solid ${inventory.scrollsTeleport > 0 && !isTurnLocked ? '#ab47bc' : '#333'}`, padding: '6px 12px', fontSize: '12px', cursor: inventory.scrollsTeleport > 0 && !isTurnLocked ? 'pointer' : 'default', fontFamily: 'monospace' }}
          >
            {t.castTeleportBtn} ({inventory.scrollsTeleport})
          </button>

          <button
            onClick={handleExecuteCampRaid}
            disabled={troops.raiders <= 0 || isTurnLocked}
            style={{ backgroundColor: '#111', color: troops.raiders > 0 && !isTurnLocked ? '#ff3333' : '#555', border: `1px solid ${troops.raiders > 0 && !isTurnLocked ? '#ff3333' : '#333'}`, padding: '6px 12px', fontSize: '12px', cursor: troops.raiders > 0 && !isTurnLocked ? 'pointer' : 'default', fontFamily: 'monospace' }}
          >
            {getValidRaidTarget()
              ? `🗡️ Raid [${getValidRaidTarget()?.name}]'s Camp` 
              : t.raidCampBtn} ({troops.raiders})
          </button>
        </div>

        <button
          onClick={handleLockTurnClick}
          disabled={isTurnLocked}
          style={{
            backgroundColor: isTurnLocked ? '#222' : '#00ff00',
            color: isTurnLocked ? '#ff00ff' : '#000',
            border: `2px solid ${isTurnLocked ? '#ff00ff' : '#00ff00'}`,
            padding: '8px 20px',
            fontWeight: 'bold',
            cursor: isTurnLocked ? 'default' : 'pointer',
            fontFamily: 'monospace'
          }}
        >
          {isTurnLocked ? '🔒 TURN LOCKED' : t.endTurnBtn}
        </button>
      </div>

      {isTurnLocked && (
        <div style={{ backgroundColor: '#1a001a', border: '1px dashed #ff00ff', color: '#ff00ff', padding: '10px', textAlign: 'center', fontSize: '12px', marginBottom: '12px', fontWeight: 'bold' }}>
          {t.waitingTurnLockMsg}
        </div>
      )}

      {isTeleportTargeting && (
        <div style={{ backgroundColor: '#ab47bc', color: '#fff', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t.teleportTargetPrompt}</span>
          <button onClick={() => setIsTeleportTargeting(false)} style={{ backgroundColor: '#000', color: '#fff', border: 'none', padding: '4px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>
            {t.teleportCancelBtn}
          </button>
        </div>
      )}

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

      {/* Game Manual Modal */}
      {showManualModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 140 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #00ffff', borderRadius: '10px', padding: '24px', maxWidth: '560px', width: '90%', color: '#fff', fontFamily: 'monospace', textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#00ffff', fontSize: '18px', textAlign: 'center', borderBottom: '1px solid #00ffff', paddingBottom: '8px' }}>
              {t.manualTitle}
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ff0', margin: '0 0 4px 0' }}>{t.manualSecMovementTitle}</h4>
              <p style={{ fontSize: '12px', color: '#ccc', margin: 0, lineHeight: '1.5' }}>{t.manualSecMovementText}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ff3333', margin: '0 0 4px 0' }}>{t.manualSecRaidingTitle}</h4>
              <p style={{ fontSize: '12px', color: '#ccc', margin: 0, lineHeight: '1.5' }}>{t.manualSecRaidingText}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ff00ff', margin: '0 0 4px 0' }}>{t.manualSecRelicsTitle}</h4>
              <p style={{ fontSize: '12px', color: '#ccc', margin: 0, lineHeight: '1.5' }}>{t.manualSecRelicsText}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#ab47bc', margin: '0 0 4px 0' }}>{t.manualSecCitadelTitle}</h4>
              <p style={{ fontSize: '12px', color: '#ccc', margin: 0, lineHeight: '1.5' }}>{t.manualSecCitadelText}</p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setShowManualModal(false)}
                style={{ backgroundColor: '#00ffff', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
              >
                ✅ BACK TO ADVENTURE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Passcode Modal */}
      {showDebugPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff0', borderRadius: '8px', padding: '24px', maxWidth: '380px', width: '90%', color: '#ff0', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>🔑 DEV TOOLS PASSCODE</h3>
            <p style={{ color: '#fff', fontSize: '12px', marginBottom: '16px' }}>Enter admin passcode to unlock dev sandbox tools:</p>

            <input
              type="password"
              value={debugPasswordInput}
              onChange={(e) => setDebugPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockDebug()}
              placeholder="Enter PIN..."
              style={{ backgroundColor: '#000', color: '#ff0', border: '1px solid #ff0', padding: '8px', width: '80%', fontFamily: 'monospace', textAlign: 'center', fontSize: '18px', marginBottom: '20px', letterSpacing: '4px' }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleUnlockDebug}
                style={{ backgroundColor: '#ff0', color: '#000', border: 'none', padding: '8px 20px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
              >
                🔓 UNLOCK
              </button>
              <button
                onClick={() => { setShowDebugPasswordModal(false); setDebugPasswordInput(''); }}
                style={{ backgroundColor: '#333', color: '#fff', border: 'none', padding: '8px 16px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
              >
                ❌ CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

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

      {droppedGoldNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff0', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%', color: '#ff0', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.droppedGoldModalTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.droppedGoldModalMsg}</p>
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff0', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>💰 {t.droppedAmountLabel} <strong style={{ color: '#ff0' }}>+{droppedGoldNotice.amount} GP</strong></div>
              <div style={{ marginTop: '4px' }}>📍 {t.locationLabel} <strong>[{droppedGoldNotice.pos.x}, {droppedGoldNotice.pos.y}]</strong></div>
            </div>
            <button onClick={() => setDroppedGoldNotice(null)} style={{ backgroundColor: '#ff0', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}
      
      {collectedGoldNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #00ff00', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#00ff00', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.goldCollectedModalTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.goldCollectedModalMsg}</p>
            <div style={{ backgroundColor: '#050505', border: '1px dashed #00ff00', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>💰 {t.goldCollectedAmountLabel} <strong style={{ color: '#00ff00' }}>+{collectedGoldNotice.amount} GP</strong></div>
              <div style={{ marginTop: '4px' }}>📍 {t.locationLabel} <strong>[{collectedGoldNotice.pos.x}, {collectedGoldNotice.pos.y}]</strong></div>
            </div>
            <button onClick={() => setCollectedGoldNotice(null)} style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ EXCELLENT
            </button>
          </div>
        </div>
      )}

      {drownNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #0288d1', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#0288d1', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.drownModalTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.drownModalMsg}</p>
            <div style={{ backgroundColor: '#050505', border: '1px dashed #0288d1', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>📍 Rescued Coordinates: <strong style={{ color: '#0288d1' }}>[{drownNotice.pos.x}, {drownNotice.pos.y}]</strong></div>
            </div>
            <button onClick={() => setDrownNotice(null)} style={{ backgroundColor: '#0288d1', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}
      
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
            <button onClick={() => setRaidedNotice(null)} style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}

      {isInsideCitadel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ab47bc', borderRadius: '8px', padding: '20px', maxWidth: '520px', width: '95%', color: '#ab47bc', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{t.citadelTitle}</h3>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>{t.citadelSubtitle}</p>
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
            <button onClick={() => setIsInsideCitadel(false)} style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #666', padding: '8px 20px', cursor: 'pointer', fontFamily: 'monospace' }}>
              🚪 Exit Citadel
            </button>
          </div>
        </div>
      )}

      {isTeleportTrapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ab47bc', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#ab47bc', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.teleportTrapTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>{t.teleportTrapMsg}</p>
            <button onClick={() => setIsTeleportTrapModal(false)} style={{ backgroundColor: '#ab47bc', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}

      {activeDuel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div style={{ backgroundColor: '#111', border: '3px solid #ff00ff', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#ff00ff', fontFamily: 'monospace', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{t.duelTitle}</h2>
            <p style={{ color: '#fff', fontSize: '12px', marginBottom: '16px' }}>{t.duelSubtitle}</p>
            <div style={{ margin: '0 auto 16px auto', width: '120px', height: '120px', border: '2px solid #ff00ff', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={getMonsterAssetUrl('witch_king')}
                alt="The Witch King"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallbackStep) {
                    img.dataset.fallbackStep = '1';
                    img.src = `${supabaseUrl}/storage/v1/object/public/monsters/witch_king.jpeg`;
                  } else if (img.dataset.fallbackStep === '1') {
                    img.dataset.fallbackStep = '2';
                    img.src = '/witch_king.webp';
                  } else if (img.dataset.fallbackStep === '2') {
                    img.dataset.fallbackStep = '3';
                    img.src = '/monsters/witch_king.webp';
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
            </div>
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff00ff', padding: '10px', marginBottom: '16px', fontSize: '13px', color: '#fff' }}>
              <div>{t.duelRound} #{activeDuel.round} | You: <strong style={{ color: '#00ff00' }}>{activeDuel.playerWins}</strong> - Witch King: <strong style={{ color: '#ff3333' }}>{activeDuel.bossWins}</strong></div>
              {activeDuel.lastResult && <div style={{ marginTop: '6px', color: '#ff0' }}>{activeDuel.lastResult}</div>}
            </div>
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

      {isDuelDefeatNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 125 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff3333', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#ff3333', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.duelDefeatTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>{t.duelDefeatMsg}</p>
            <button
              onClick={() => {
                setIsDuelDefeatNotice(false);
                handleCombatDefeat();
              }}
              style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              ✅ RETREAT TO SANCTUARY
            </button>
          </div>
        </div>
      )}

      {isCitadelSealedNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #b71c1c', borderRadius: '8px', padding: '24px', maxWidth: '480px', width: '90%', color: '#b71c1c', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.citadelSealedTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '20px' }}>{t.citadelSealedMsg}</p>
            <button onClick={() => setIsCitadelSealedNotice(false)} style={{ backgroundColor: '#b71c1c', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ UNDERSTOOD
            </button>
          </div>
        </div>
      )}

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
              onClick={() => {
                window.location.reload();
              }} 
              style={{ backgroundColor: gameWinnerNotice.isMe ? '#00ff00' : '#ff3333', color: '#000', border: 'none', padding: '12px 32px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
            >
              🔄 RESTART ADVENTURE
            </button>
          </div>
        </div>
      )}

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
            <button onClick={() => setTownRumorNotice(null)} style={{ backgroundColor: '#00ffff', color: '#000', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ NOTED WITH THANKS
            </button>
          </div>
        </div>
      )}

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
            <button onClick={() => setRelicNotice(null)} style={{ backgroundColor: '#ff00ff', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
              ✅ EXCELLENT
            </button>
          </div>
        </div>
      )}

      {spottedOpponentNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#111', border: '2px solid #ff3333', borderRadius: '8px', padding: '24px', maxWidth: '450px', width: '90%', color: '#ff3333', fontFamily: 'monospace', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{t.opponentSpottedTitle}</h3>
            <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{t.opponentSpottedMsg}</p>
            <div style={{ backgroundColor: '#050505', border: '1px dashed #ff3333', padding: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '13px' }}>
              <div>🧙‍♀️ Player: <strong style={{ color: '#fff' }}>{spottedOpponentNotice.name}</strong></div>
              <div style={{ marginTop: '4px' }}>📍 Coordinates: <strong style={{ color: '#ff3333' }}>[{spottedOpponentNotice.pos.x}, {spottedOpponentNotice.pos.y}]</strong></div>
            </div>
            <button onClick={() => setSpottedOpponentNotice(null)} style={{ backgroundColor: '#ff3333', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}>
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