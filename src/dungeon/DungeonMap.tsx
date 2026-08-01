import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { DungeonPlayerState } from './useDungeonSession';

export interface TileData {
  x: number;
  y: number;
  type: 'GREAT_HALL' | 'CORRIDOR' | 'CHAMBER' | 'WALL' | 'SECRET_DOOR';
  level: number;
  isCleared?: boolean;
}

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
  // ⚡ Optimistic Local Position State for 0ms instant input response
  const [localPos, setLocalPos] = useState({ x: player.pos_x ?? 10, y: player.pos_y ?? 10 });

  // Sync with prop if updated externally
  useEffect(() => {
    if (player.pos_x !== undefined && player.pos_y !== undefined) {
      setLocalPos({ x: player.pos_x, y: player.pos_y });
    }
  }, [player.pos_x, player.pos_y]);

  const gridSize = useMemo(() => {
    const pCount = Math.max(2, allPlayers.length);
    return Math.min(40, Math.max(20, 16 + pCount * 2));
  }, [allPlayers.length]);

  const [soundPings, setSoundPings] = useState<SoundPing[]>([]);
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(new Set());
  const [isSearchingDoor, setIsSearchingDoor] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<number>(0);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);

  const moveCooldownMs = player.hero_class.toLowerCase() === 'rogue' ? 600 : 800;

  // Concentric Map Layout
  const mapGrid = useMemo(() => {
    const grid: TileData[][] = [];
    const center = Math.floor(gridSize / 2);

    for (let y = 0; y < gridSize; y++) {
      const row: TileData[] = [];
      for (let x = 0; x < gridSize; x++) {
        const distFromCenter = Math.hypot(x - center, y - center);
        
        if (Math.abs(x - center) <= 1 && Math.abs(y - center) <= 1) {
          row.push({ x, y, type: 'GREAT_HALL', level: 0, isCleared: true });
        } else {
          let lvl = Math.min(6, Math.max(1, Math.floor((distFromCenter / (gridSize / 2)) * 6)));
          
          const isRoom = (x % 3 === 0 && y % 3 === 0);
          const isSecret = (x % 7 === 0 && y % 7 === 0);
          const isWall = (x % 4 === 0 && y % 2 === 0 && !isRoom && !isSecret);

          if (isSecret) {
            row.push({ x, y, type: 'SECRET_DOOR', level: lvl });
          } else if (isRoom) {
            row.push({ x, y, type: 'CHAMBER', level: lvl, isCleared: false });
          } else if (isWall) {
            row.push({ x, y, type: 'WALL', level: lvl });
          } else {
            row.push({ x, y, type: 'CORRIDOR', level: lvl, isCleared: true });
          }
        }
      }
      grid.push(row);
    }
    return grid;
  }, [gridSize]);

  // Dynamic 5-Tile Vision Fog of War
  const visibleTiles = useMemo(() => {
    const visible = new Set<string>();
    const radius = 5;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.hypot(dx, dy) <= radius) {
          const vx = localPos.x + dx;
          const vy = localPos.y + dy;
          if (vx >= 0 && vx < gridSize && vy >= 0 && vy < gridSize) {
            visible.add(`${vx},${vy}`);
          }
        }
      }
    }
    return visible;
  }, [localPos.x, localPos.y, gridSize]);

  useEffect(() => {
    setVisitedTiles(prev => {
      const next = new Set(prev);
      visibleTiles.forEach(tileKey => next.add(tileKey));
      return next;
    });
  }, [visibleTiles]);

  // Execute Position Change
  const executeMove = async (newX: number, newY: number) => {
    setLastMoveTime(Date.now());
    
    // 1. Instant local update
    setLocalPos({ x: newX, y: newY });

    // 2. Background DB Sync
    await supabase
      .from('dungeon_players')
      .update({ pos_x: newX, pos_y: newY })
      .eq('client_session_id', player.client_session_id);
  };

  // Smart Directional Movement Handler
  const handleMove = useCallback(async (targetX: number, targetY: number) => {
    const now = Date.now();
    if (now - lastMoveTime < moveCooldownMs) return;

    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) return;

    // Calculate 1-step direction towards target
    const dx = Math.sign(targetX - localPos.x);
    const dy = Math.sign(targetY - localPos.y);

    if (dx === 0 && dy === 0) return;

    const stepX = localPos.x + dx;
    const stepY = localPos.y + dy;

    const targetTile = mapGrid[stepY]?.[stepX];
    if (!targetTile || targetTile.type === 'WALL') return; // Wall collision check

    // Secret Door Search Channeling
    if (targetTile.type === 'SECRET_DOOR' && player.hero_class.toLowerCase() !== 'rogue') {
      if (!isSearchingDoor) {
        setIsSearchingDoor(true);
        setSearchProgress(0);
        
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          setSearchProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setIsSearchingDoor(false);
            executeMove(stepX, stepY);
          }
        }, 400);
        return;
      }
    } else {
      executeMove(stepX, stepY);
    }
  }, [localPos, lastMoveTime, moveCooldownMs, gridSize, mapGrid, player.hero_class, isSearchingDoor]);

  // Keyboard Movement Listener (WASD & Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault(); // Prevent page scrolling
      }

      if (key === 'arrowup' || key === 'w') handleMove(localPos.x, localPos.y - 1);
      if (key === 'arrowdown' || key === 's') handleMove(localPos.x, localPos.y + 1);
      if (key === 'arrowleft' || key === 'a') handleMove(localPos.x - 1, localPos.y);
      if (key === 'arrowright' || key === 'd') handleMove(localPos.x + 1, localPos.y);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, localPos]);

  // Spatial Sound Ping
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

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return '#00ffcc';
      case 1: return '#ffffff';
      case 2: return '#3b82f6';
      case 3: return '#22c55e';
      case 4: return '#eab308';
      case 5: return '#ef4444';
      case 6: return '#a855f7';
      default: return '#333333';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      
      {/* Map Controls & Status HUD */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={() => triggerSoundPing('💥 SPELL CAST')} 
          style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
        >
          🔊 Test Spell Sound Ping
        </button>
        <div style={{ color: '#88aaff', fontSize: '13px' }}>
          Grid: <strong>{gridSize}x{gridSize}</strong> | Position: <strong>({localPos.x}, {localPos.y})</strong> | Sight: <strong>5 Tiles</strong>
        </div>
      </div>

      {/* Secret Door Search Channel Progress Bar */}
      {isSearchingDoor && (
        <div style={{ width: '100%', maxWidth: '300px', backgroundColor: '#111', border: '1px solid #00ffcc', borderRadius: '4px', padding: '4px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#00ffcc', marginBottom: '4px' }}>🔍 Searching Secret Door ({searchProgress}%)</div>
          <div style={{ height: '8px', backgroundColor: '#00ffcc', width: `${searchProgress}%`, transition: 'width 0.4s' }} />
        </div>
      )}

      {/* 2D Top-Down Tile Grid Viewport */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${gridSize}, 22px)`, 
          gridTemplateRows: `repeat(${gridSize}, 22px)`, 
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
        {mapGrid.map((row, y) =>
          row.map((tile, x) => {
            const tileKey = `${x},${y}`;
            const isVisible = visibleTiles.has(tileKey);
            const isVisited = visitedTiles.has(tileKey);
            
            const playersOnTile = allPlayers.filter(p => p.pos_x === x && p.pos_y === y && isVisible);
            const isLocalPlayerHere = localPos.x === x && localPos.y === y;
            const activePing = soundPings.find(p => p.x === x && p.y === y);

            if (!isVisible && !isVisited) {
              return <div key={tileKey} style={{ width: '22px', height: '22px', backgroundColor: '#020408' }} />;
            }

            let tileBg = tile.type === 'WALL' ? '#111b27' : '#070f1e';
            if (tile.type === 'GREAT_HALL') tileBg = '#00332c';
            if (tile.type === 'SECRET_DOOR') tileBg = '#331a00';

            return (
              <div
                key={tileKey}
                onClick={() => handleMove(x, y)}
                style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: tileBg,
                  border: isVisible ? `1px solid ${getLevelColor(tile.level)}` : '1px solid #112233',
                  opacity: isVisible ? 1 : 0.35,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxSizing: 'border-box'
                }}
              >
                {/* Local Player Avatar Marker */}
                {isLocalPlayerHere && (
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#00ffcc', borderRadius: '50%', boxShadow: '0 0 8px #00ffcc' }} />
                )}

                {/* Other Visible Players */}
                {!isLocalPlayerHere && playersOnTile.length > 0 && (
                  <div style={{ width: '10px', height: '10px', backgroundColor: '#ff3366', borderRadius: '50%' }} />
                )}

                {/* Sound Wave Ripple Effect */}
                {activePing && isVisible && (
                  <div style={{
                    position: 'absolute',
                    width: '28px',
                    height: '28px',
                    border: '2px solid #ffcc00',
                    borderRadius: '50%',
                    animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
                  }} />
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}