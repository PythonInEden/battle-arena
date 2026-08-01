import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { DungeonPlayerState } from './useDungeonSession';

export interface TileData {
  x: number;
  y: number;
  type: 'GREAT_HALL' | 'CORRIDOR' | 'CHAMBER' | 'WALL' | 'SECRET_DOOR';
  level: number; // 0 = Great Hall, 1 to 6 = Dungeon levels
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
  // 1. Calculate Grid Size based on Player Count (2p = 20x20, up to 10p = 40x40)
  const gridSize = useMemo(() => {
    const pCount = Math.max(2, allPlayers.length);
    return Math.min(40, Math.max(20, 16 + pCount * 2));
  }, [allPlayers.length]);

  const [soundPings, setSoundPings] = useState<SoundPing[]>([]);
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(new Set());
  const [isSearchingDoor, setIsSearchingDoor] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<number>(0);
  const [lastMoveTime, setLastMoveTime] = useState<number>(0);

  // Movement tick cooldown: Rogue = 600ms, Others = 800ms
  const moveCooldownMs = player.hero_class.toLowerCase() === 'rogue' ? 600 : 800;

  // 2. Generate Concentric Map Layout (Great Hall center -> Levels 1..6 outwards)
  const mapGrid = useMemo(() => {
    const grid: TileData[][] = [];
    const center = Math.floor(gridSize / 2);

    for (let y = 0; y < gridSize; y++) {
      const row: TileData[] = [];
      for (let x = 0; x < gridSize; x++) {
        const distFromCenter = Math.hypot(x - center, y - center);
        
        // Center 2x2 area = Great Hall
        if (Math.abs(x - center) <= 1 && Math.abs(y - center) <= 1) {
          row.push({ x, y, type: 'GREAT_HALL', level: 0, isCleared: true });
        } else {
          // Concentric Level Zones
          let lvl = Math.min(6, Math.max(1, Math.floor((distFromCenter / (gridSize / 2)) * 6)));
          
          // Patterned Room vs Corridor vs Secret Door generation
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

  // 3. Fog of War Vision Calculation (5-Tile Vision Radius)
  const visibleTiles = useMemo(() => {
    const visible = new Set<string>();
    const radius = 5;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.hypot(dx, dy) <= radius) {
          const vx = player.pos_x + dx;
          const vy = player.pos_y + dy;
          if (vx >= 0 && vx < gridSize && vy >= 0 && vy < gridSize) {
            visible.add(`${vx},${vy}`);
          }
        }
      }
    }
    return visible;
  }, [player.pos_x, player.pos_y, gridSize]);

  // Update Visited (Remembered) Tiles
  useEffect(() => {
    setVisitedTiles(prev => {
      const next = new Set(prev);
      visibleTiles.forEach(tileKey => next.add(tileKey));
      return next;
    });
  }, [visibleTiles]);

  // 4. Movement Handler with Cooldown Ticks
  const handleMove = useCallback(async (newX: number, newY: number) => {
    const now = Date.now();
    if (now - lastMoveTime < moveCooldownMs) return; // Cooldown limit check

    if (newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize) return;
    const targetTile = mapGrid[newY]?.[newX];
    if (!targetTile || targetTile.type === 'WALL') return; // Wall collision

    // Handle Secret Door Search Check
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
            executeMove(newX, newY);
          }
        }, 400); // 2 second total channel
        return;
      }
    } else {
      executeMove(newX, newY);
    }
  }, [lastMoveTime, moveCooldownMs, gridSize, mapGrid, player.hero_class, isSearchingDoor]);

  const executeMove = async (newX: number, newY: number) => {
    setLastMoveTime(Date.now());
    await supabase.from('dungeon_players').update({ pos_x: newX, pos_y: newY }).eq('id', player.id);
  };

  // Keyboard Movement Listener (WASD / Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') handleMove(player.pos_x, player.pos_y - 1);
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') handleMove(player.pos_x, player.pos_y + 1);
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') handleMove(player.pos_x - 1, player.pos_y);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleMove(player.pos_x + 1, player.pos_y);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, player.pos_x, player.pos_y]);

  // 5. Emit Spatial Audio Ping (Broadcast to nearby players within 10 tiles)
  const triggerSoundPing = async (label: string = '⚔️ COMBAT') => {
    const pingPayload: SoundPing = {
      id: crypto.randomUUID(),
      x: player.pos_x,
      y: player.pos_y,
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

  // Listen for Realtime Sound Pings
  useEffect(() => {
    const channel = supabase.channel(`dungeon_room_${roomCode}`);
    channel
      .on('broadcast', { event: 'sound_ping' }, ({ payload }: { payload: SoundPing }) => {
        // Only register sound ping if within 10-tile radius
        const distance = Math.hypot(payload.x - player.pos_x, payload.y - player.pos_y);
        if (distance <= 10) {
          setSoundPings(prev => [...prev, payload]);
          setTimeout(() => {
            setSoundPings(prev => prev.filter(p => p.id !== payload.id));
          }, 2500); // Ping dissipates after 2.5 seconds
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, player.pos_x, player.pos_y]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return '#00ffcc'; // Great Hall
      case 1: return '#ffffff'; // White
      case 2: return '#3b82f6'; // Blue
      case 3: return '#22c55e'; // Green
      case 4: return '#eab308'; // Yellow
      case 5: return '#ef4444'; // Red
      case 6: return '#a855f7'; // Purple
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
          Grid: <strong>{gridSize}x{gridSize}</strong> | Position: <strong>({player.pos_x}, {player.pos_y})</strong> | Sight: <strong>5 Tiles</strong>
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
          gridTemplateColumns: `repeat(${gridSize}, 18px)`, 
          gridTemplateRows: `repeat(${gridSize}, 18px)`, 
          gap: '2px', 
          backgroundColor: '#000', 
          padding: '10px', 
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
            
            // Active Players on this tile (only visible if within Fog of War sight)
            const playersOnTile = allPlayers.filter(p => p.pos_x === x && p.pos_y === y && isVisible);
            const isLocalPlayerHere = player.pos_x === x && player.pos_y === y;

            // Active Sound Ping on this tile
            const activePing = soundPings.find(p => p.x === x && p.y === y);

            if (!isVisible && !isVisited) {
              // PITCH BLACK FOG OF WAR
              return <div key={tileKey} style={{ width: '18px', height: '18px', backgroundColor: '#020408' }} />;
            }

            let tileBg = tile.type === 'WALL' ? '#111b27' : '#070f1e';
            if (tile.type === 'GREAT_HALL') tileBg = '#00332c';
            if (tile.type === 'SECRET_DOOR') tileBg = '#331a00';

            return (
              <div
                key={tileKey}
                onClick={() => handleMove(x, y)}
                style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: tileBg,
                  border: isVisible ? `1px solid ${getLevelColor(tile.level)}` : '1px solid #112233',
                  opacity: isVisible ? 1 : 0.35, // Dim brightness for visited/remembered tiles
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxSizing: 'border-box'
                }}
              >
                {/* Local Player Marker */}
                {isLocalPlayerHere && (
                  <div style={{ width: '10px', height: '10px', backgroundColor: '#00ffcc', borderRadius: '50%', boxShadow: '0 0 8px #00ffcc' }} />
                )}

                {/* Other Players (Visible) */}
                {!isLocalPlayerHere && playersOnTile.length > 0 && (
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#ff3366', borderRadius: '50%' }} />
                )}

                {/* Sound Wave Ripple Effect */}
                {activePing && isVisible && (
                  <div style={{
                    position: 'absolute',
                    width: '24px',
                    height: '24px',
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