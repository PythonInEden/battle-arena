import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { DungeonPlayerState } from './useDungeonSession';
import {
  STATIC_DUNGEON_BOARD,
  BOARD_SIZE,
  LEVEL_COLORS,
  isTilePassable,
  TileData
} from './dungeonBoardMap';

export interface SoundPing {
  id: string;
  x: number;
  y: number;
  timestamp: number;
  label: string;
}

interface DungeonMapProps {
  player: DungeonPlayerState;
  allPlayers: DungeonPlayerState[];
  roomCode: string;
}

export function DungeonMap({ player, allPlayers, roomCode }: DungeonMapProps) {
  // 1. Optimistic Local Position State
  const [localPos, setLocalPos] = useState({ x: player.pos_x ?? 10, y: player.pos_y ?? 10 });

  // 2. 5-Step Movement Budget System[cite: 1]
  const [stepsRemaining, setStepsRemaining] = useState<number>(5);

  // Track discovered secret doors locally per session[cite: 1]
  const [discoveredSecrets, setDiscoveredSecrets] = useState<Set<string>>(new Set());

  // Secret Door Roll Modal state[cite: 1]
  const [secretDoorTarget, setSecretDoorTarget] = useState<{ x: number; y: number } | null>(null);

  // Sound Pings & Fog of War
  const [soundPings, setSoundPings] = useState<SoundPing[]>([]);
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(new Set());

  // Keep local position in sync with incoming server state
  useEffect(() => {
    if (player.pos_x !== undefined && player.pos_y !== undefined) {
      setLocalPos({ x: player.pos_x, y: player.pos_y });
    }
  }, [player.pos_x, player.pos_y]);

  // Dynamic 5-Tile Vision Fog of War
  const visibleTiles = useMemo(() => {
    const visible = new Set<string>();
    const radius = 5;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.hypot(dx, dy) <= radius) {
          const vx = localPos.x + dx;
          const vy = localPos.y + dy;
          if (vx >= 0 && vx < BOARD_SIZE && vy >= 0 && vy < BOARD_SIZE) {
            visible.add(`${vx},${vy}`);
          }
        }
      }
    }
    return visible;
  }, [localPos.x, localPos.y]);

  useEffect(() => {
    setVisitedTiles(prev => {
      const next = new Set(prev);
      visibleTiles.forEach(tileKey => next.add(tileKey));
      return next;
    });
  }, [visibleTiles]);

  // Execute Position Change & Step Deduction
  const executeMove = async (newX: number, newY: number, targetTile: TileData) => {
    setLocalPos({ x: newX, y: newY });

    // Deduct steps remaining. Stop immediately if entering an uncleared room/chamber or door[cite: 1]
    setStepsRemaining(prev => {
      if (['ROOM', 'CHAMBER', 'DOOR'].includes(targetTile.type)) {
        return 0; // Forced turn stop upon entering room threshold[cite: 1]
      }
      return Math.max(0, prev - 1);
    });

    // Background DB Sync
    await supabase
      .from('dungeon_players')
      .update({ pos_x: newX, pos_y: newY })
      .eq('client_session_id', player.client_session_id);
  };

  // Recharge Movement Points
  const handleRechargeMovement = () => {
    setStepsRemaining(5);
  };

  // Secret Door 1d6 Roll Resolution (3-6 Rogue sub-classes, 5-6 Standard)[cite: 1]
  const handleAttemptSecretDoor = (targetX: number, targetY: number) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    const isRogueClass = ['rogue', 'ranger', 'bard'].includes(player.hero_class.toLowerCase());
    const requiredRoll = isRogueClass ? 3 : 5;

    if (roll >= requiredRoll) {
      alert(`🎲 Rolled ${roll}! Secret Door Discovered!`);
      const tileKey = `${targetX},${targetY}`;
      setDiscoveredSecrets(prev => new Set(prev).add(tileKey));
      const targetTile = STATIC_DUNGEON_BOARD[targetY][targetX];
      executeMove(targetX, targetY, targetTile);
    } else {
      alert(`🎲 Rolled ${roll}. Failed to open Secret Door (Needed ${requiredRoll}+). Movement point spent!`);
      setStepsRemaining(prev => Math.max(0, prev - 1));
    }
    setSecretDoorTarget(null);
  };

  // Directional Movement Handler
  const handleMove = useCallback(async (targetX: number, targetY: number) => {
    if (stepsRemaining <= 0) return;
    if (targetX < 0 || targetX >= BOARD_SIZE || targetY < 0 || targetY >= BOARD_SIZE) return;

    // Must be 1 cardinal step away
    const dx = Math.abs(targetX - localPos.x);
    const dy = Math.abs(targetY - localPos.y);
    if (dx + dy !== 1) return;

    const targetTile = STATIC_DUNGEON_BOARD[targetY]?.[targetX];
    if (!targetTile) return;

    const tileKey = `${targetX},${targetY}`;
    const isSecretDiscovered = discoveredSecrets.has(tileKey);

    // Passability Check
    if (!isTilePassable(targetTile, isSecretDiscovered)) {
      if (targetTile.type === 'SECRET_DOOR' && !isSecretDiscovered) {
        setSecretDoorTarget({ x: targetX, y: targetY });
      }
      return;
    }

    executeMove(targetX, targetY, targetTile);
  }, [localPos, stepsRemaining, discoveredSecrets]);

  // Keyboard Movement Listener (WASD & Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
      }

      if (key === 'arrowup' || key === 'w') handleMove(localPos.x, localPos.y - 1);
      if (key === 'arrowdown' || key === 's') handleMove(localPos.x, localPos.y + 1);
      if (key === 'arrowleft' || key === 'a') handleMove(localPos.x - 1, localPos.y);
      if (key === 'arrowright' || key === 'd') handleMove(localPos.x + 1, localPos.y);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, localPos]);

  // Spatial Sound Ping Broadcast
  const triggerSoundPing = async (label: string = '⚔️ COMBAT') => {
    const pingPayload: SoundPing = {
      id: crypto.randomUUID(),
      x: localPos.x,
      y: localPos.y,
      timestamp: Date.now(),
      label
    };

    const channel = supabase.channel(`dungeon_room_${roomCode}`);
    await channel.send({
      type: 'broadcast',
      event: 'sound_ping',
      payload: pingPayload
    });
  };

  useEffect(() => {
    const channel = supabase.channel(`dungeon_room_${roomCode}`);
    channel
      .on('broadcast', { event: 'sound_ping' }, ({ payload }: { payload: SoundPing }) => {
        const distance = Math.hypot(payload.x - localPos.x, payload.y - localPos.y);
        if (distance <= 10) {
          setSoundPings(prev => [...prev, payload]);
          setTimeout(() => {
            setSoundPings(prev => prev.filter(p => p.id !== payload.id));
          }, 2500);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, localPos.x, localPos.y]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>

      {/* Movement HUD & Actions */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ padding: '8px 16px', backgroundColor: '#0f172a', border: '1px solid #00ffcc', borderRadius: '6px', color: '#fff', fontSize: '14px' }}>
          👟 Movement Steps: <strong style={{ color: stepsRemaining > 0 ? '#00ffcc' : '#ff3366', fontSize: '16px' }}>{stepsRemaining} / 5</strong>
        </div>

        {stepsRemaining === 0 ? (
          <button
            onClick={handleRechargeMovement}
            style={{ padding: '8px 16px', backgroundColor: '#eab308', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
          >
            🔄 Recharge Movement (End Turn Step)
          </button>
        ) : (
          <button
            onClick={() => setStepsRemaining(0)}
            style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#aaa', border: '1px solid #555', fontFamily: 'monospace', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛑 End Movement Early
          </button>
        )}

        <button
          onClick={() => triggerSoundPing('💥 SPELL CAST')}
          style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
        >
          🔊 Sound Ping
        </button>
      </div>

      {/* Secret Door Search Modal */}
      {secretDoorTarget && (
        <div style={{ backgroundColor: '#1e1b4b', border: '2px solid #a855f7', padding: '12px 20px', borderRadius: '8px', color: '#fff', textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
            🚪 Found Secret Door at ({secretDoorTarget.x}, {secretDoorTarget.y})!
            <br />
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
              Req Roll: <strong>{['rogue', 'ranger', 'bard'].includes(player.hero_class.toLowerCase()) ? '3–6 (Rogue Bonus)' : '5–6 (Standard)'}</strong> on 1d6[cite: 1]
            </span>
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => handleAttemptSecretDoor(secretDoorTarget.x, secretDoorTarget.y)}
              style={{ padding: '6px 16px', backgroundColor: '#a855f7', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
            >
              🎲 Roll 1d6
            </button>
            <button
              onClick={() => setSecretDoorTarget(null)}
              style={{ padding: '6px 16px', backgroundColor: '#334155', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 2D Top-Down Board Viewport */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 26px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 26px)`,
          gap: '2px',
          backgroundColor: '#000',
          padding: '12px',
          border: '2px solid #00ffcc',
          borderRadius: '8px',
          boxShadow: '0 0 20px rgba(0,255,204,0.15)',
          overflow: 'auto',
          maxHeight: '80vh'
        }}
      >
        {STATIC_DUNGEON_BOARD.map((row, y) =>
          row.map((tile, x) => {
            const tileKey = `${x},${y}`;
            const isVisible = visibleTiles.has(tileKey);
            const isVisited = visitedTiles.has(tileKey);

            const playersOnTile = allPlayers.filter(p => p.pos_x === x && p.pos_y === y && isVisible);
            const isLocalPlayerHere = localPos.x === x && localPos.y === y;
            const activePing = soundPings.find(p => p.x === x && p.y === y);

            if (!isVisible && !isVisited) {
              return <div key={tileKey} style={{ width: '26px', height: '26px', backgroundColor: '#020408' }} />;
            }

            const levelConfig = LEVEL_COLORS[tile.level] || LEVEL_COLORS[1];
            let tileBg = levelConfig.bg;
            let tileBorder = levelConfig.border;
            let tileContent = '';

            if (tile.type === 'WALL') {
              tileBg = '#0d131f';
              tileBorder = '#1e293b';
            } else if (tile.type === 'GREAT_HALL') {
              tileBg = LEVEL_COLORS[0].bg;
              tileBorder = LEVEL_COLORS[0].border;
              tileContent = '🏛️';
            } else if (tile.type === 'DOOR') {
              tileContent = '🚪';
            } else if (tile.type === 'SECRET_DOOR') {
              const isDiscovered = discoveredSecrets.has(tileKey);
              tileContent = isDiscovered ? '🔓' : '❓';
              tileBg = isDiscovered ? '#312e81' : '#2e1065';
            } else if (tile.type === 'ROOM') {
              tileContent = '🕸️';
            } else if (tile.type === 'CHAMBER') {
              tileContent = '💀';
            }

            return (
              <div
                key={tileKey}
                onClick={() => handleMove(x, y)}
                title={`(${x}, ${y}) - Level ${tile.level} ${tile.type}`}
                style={{
                  width: '26px',
                  height: '26px',
                  backgroundColor: tileBg,
                  border: isVisible ? `1px solid ${tileBorder}` : '1px solid #1e293b',
                  opacity: isVisible ? 1 : 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: stepsRemaining > 0 ? 'pointer' : 'not-allowed',
                  position: 'relative',
                  boxSizing: 'border-box',
                  fontSize: '11px'
                }}
              >
                {!isLocalPlayerHere && playersOnTile.length === 0 && tileContent}

                {/* Local Player Marker */}
                {isLocalPlayerHere && (
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: '#00ffcc',
                      borderRadius: '50%',
                      boxShadow: '0 0 10px #00ffcc',
                      zIndex: 2
                    }}
                  />
                )}

                {/* Other Visible Players */}
                {!isLocalPlayerHere && playersOnTile.length > 0 && (
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      backgroundColor: '#ff3366',
                      borderRadius: '50%',
                      zIndex: 2
                    }}
                  />
                )}

                {/* Sound Ping Effect */}
                {activePing && isVisible && (
                  <div
                    style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      border: '2px solid #eab308',
                      borderRadius: '50%',
                      animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Board Tier Color Legend */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '11px' }}>
        {Object.entries(LEVEL_COLORS).map(([lvl, cfg]) => (
          <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#090d16', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${cfg.border}` }}>
            <div style={{ width: '10px', height: '10px', backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }} />
            <span style={{ color: cfg.text }}>{cfg.label}</span>
          </div>
        ))}
      </div>

    </div>
  );
}