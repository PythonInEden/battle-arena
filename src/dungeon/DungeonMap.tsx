import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

export function DungeonMap({ player, allPlayers, roomCode: _roomCode }: DungeonMapProps) {
  const [localPos, setLocalPos] = useState({ x: player.pos_x ?? 14, y: player.pos_y ?? 14 });
  const [stepsRemaining, setStepsRemaining] = useState<number>(5);

  // 🔓 DEBUG MODE: Reveal entire map toggle
  const [isDebugRevealMap, setIsDebugRevealMap] = useState<boolean>(true);

  // Zoom & Viewport state
  const [tileSize, setTileSize] = useState<number>(28);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerTileRef = useRef<HTMLDivElement>(null);

  const [discoveredSecrets, setDiscoveredSecrets] = useState<Set<string>>(new Set());
  const [secretDoorTarget, setSecretDoorTarget] = useState<{ x: number; y: number } | null>(null);
  const [_soundPings, _setSoundPings] = useState<SoundPing[]>([]);
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (player.pos_x !== undefined && player.pos_y !== undefined) {
      setLocalPos({ x: player.pos_x, y: player.pos_y });
    }
  }, [player.pos_x, player.pos_y]);

  const centerCamera = useCallback(() => {
    if (playerTileRef.current && containerRef.current) {
      playerTileRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, []);

  useEffect(() => {
    centerCamera();
  }, [localPos.x, localPos.y, tileSize, centerCamera]);

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

  const executeMove = async (newX: number, newY: number, targetTile: TileData) => {
    setLocalPos({ x: newX, y: newY });

    setStepsRemaining(prev => {
      if (['ROOM', 'CHAMBER', 'DOOR'].includes(targetTile.type)) {
        return 0;
      }
      return Math.max(0, prev - 1);
    });

    await supabase
      .from('dungeon_players')
      .update({ pos_x: newX, pos_y: newY })
      .eq('client_session_id', player.client_session_id);
  };

  const handleRechargeMovement = () => setStepsRemaining(5);

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
      alert(`🎲 Rolled ${roll}. Failed to open Secret Door (Needed ${requiredRoll}+). Step spent!`);
      setStepsRemaining(prev => Math.max(0, prev - 1));
    }
    setSecretDoorTarget(null);
  };

  const handleMove = useCallback(async (targetX: number, targetY: number) => {
    if (stepsRemaining <= 0) return;
    if (targetX < 0 || targetX >= BOARD_SIZE || targetY < 0 || targetY >= BOARD_SIZE) return;

    const dx = Math.abs(targetX - localPos.x);
    const dy = Math.abs(targetY - localPos.y);
    if (dx + dy !== 1) return;

    const targetTile = STATIC_DUNGEON_BOARD[targetY]?.[targetX];
    if (!targetTile) return;

    const tileKey = `${targetX},${targetY}`;
    const isSecretDiscovered = discoveredSecrets.has(tileKey);

    if (!isTilePassable(targetTile, isSecretDiscovered)) {
      if (targetTile.type === 'SECRET_DOOR' && !isSecretDiscovered) {
        setSecretDoorTarget({ x: targetX, y: targetY });
      }
      return;
    }

    executeMove(targetX, targetY, targetTile);
  }, [localPos, stepsRemaining, discoveredSecrets]);

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

  const fontSize = Math.max(10, Math.floor(tileSize * 0.45));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>

      {/* Control Panel Header */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ padding: '6px 14px', backgroundColor: '#0f172a', border: '1px solid #00ffcc', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
          👟 Steps Left: <strong style={{ color: stepsRemaining > 0 ? '#00ffcc' : '#ff3366', fontSize: '15px' }}>{stepsRemaining} / 5</strong>
        </div>

        {stepsRemaining === 0 ? (
          <button
            onClick={handleRechargeMovement}
            style={{ padding: '6px 14px', backgroundColor: '#eab308', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px' }}
          >
            🔄 Recharge Turn
          </button>
        ) : (
          <button
            onClick={() => setStepsRemaining(0)}
            style={{ padding: '6px 14px', backgroundColor: '#334155', color: '#aaa', border: '1px solid #555', fontFamily: 'monospace', borderRadius: '4px', cursor: 'pointer' }}
          >
            🛑 End Movement
          </button>
        )}

        {/* 🔓 MAP DEBUG TOGGLE */}
        <button
          onClick={() => setIsDebugRevealMap(prev => !prev)}
          style={{
            padding: '6px 14px',
            backgroundColor: isDebugRevealMap ? '#ef4444' : '#10b981',
            color: '#fff',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontFamily: 'monospace',
            borderRadius: '4px'
          }}
        >
          {isDebugRevealMap ? '🔒 Hide FoW' : '🔓 Reveal Full Map (Debug)'}
        </button>
      </div>

      {/* Zoom Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => setTileSize(prev => Math.max(16, prev - 4))}
          style={{ backgroundColor: '#111', color: '#00ffcc', border: '1px solid #00ffcc', padding: '4px 10px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '4px' }}
        >
          🔍 -
        </button>

        <span style={{ fontSize: '12px', color: '#888', minWidth: '45px', textAlign: 'center' }}>
          {Math.round((tileSize / 28) * 100)}%
        </span>

        <button
          onClick={() => setTileSize(prev => Math.min(56, prev + 4))}
          style={{ backgroundColor: '#111', color: '#00ffcc', border: '1px solid #00ffcc', padding: '4px 10px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '4px' }}
        >
          🔍 +
        </button>

        <button
          onClick={centerCamera}
          style={{ backgroundColor: '#00ffcc', color: '#000', border: 'none', padding: '4px 12px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '4px', marginLeft: '6px' }}
        >
          🎯 Center Cam
        </button>
      </div>

      {/* Secret Door Search Modal */}
      {secretDoorTarget && (
        <div style={{ backgroundColor: '#1e1b4b', border: '2px solid #a855f7', padding: '12px 20px', borderRadius: '8px', color: '#fff', textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>
            🚪 Secret Door at ({secretDoorTarget.x}, {secretDoorTarget.y})!
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

      {/* Viewport Frame */}
      <div
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${tileSize}px)`,
          gap: '2px',
          backgroundColor: '#020408',
          padding: '8px',
          border: '2px solid #00ffcc',
          borderRadius: '8px',
          maxHeight: '62vh',
          maxWidth: '100%',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'manipulation',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
      >
        {STATIC_DUNGEON_BOARD.map((row, y) =>
          row.map((tile, x) => {
            const tileKey = `${x},${y}`;
            const isVisible = isDebugRevealMap || visibleTiles.has(tileKey);
            const isVisited = isDebugRevealMap || visitedTiles.has(tileKey);

            const playersOnTile = allPlayers.filter(p => p.pos_x === x && p.pos_y === y && isVisible);
            const isLocalPlayerHere = localPos.x === x && localPos.y === y;

            if (!isVisible && !isVisited) {
              return <div key={tileKey} style={{ width: `${tileSize}px`, height: `${tileSize}px`, backgroundColor: '#020408' }} />;
            }

            const levelConfig = LEVEL_COLORS[tile.level] || LEVEL_COLORS[1];
            let tileBg = levelConfig.bg;
            let tileBorder = levelConfig.border;
            let tileContent = '';

            if (tile.type === 'WALL') {
              tileBg = '#050a12'; // Dark cavern wall fill
              tileBorder = '#0d1829';
            } else if (tile.type === 'GREAT_HALL') {
              tileBg = LEVEL_COLORS[0].bg;
              tileBorder = LEVEL_COLORS[0].border;
              tileContent = '🏛️';
            } else if (tile.type === 'DOOR') {
              tileContent = '🚪';
              tileBg = '#2e1800';
            } else if (tile.type === 'SECRET_DOOR') {
              const isDiscovered = discoveredSecrets.has(tileKey) || isDebugRevealMap;
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
                ref={isLocalPlayerHere ? playerTileRef : null}
                onClick={() => handleMove(x, y)}
                title={`(${x}, ${y}) - Level ${tile.level} ${tile.type}`}
                style={{
                  width: `${tileSize}px`,
                  height: `${tileSize}px`,
                  backgroundColor: tileBg,
                  border: isLocalPlayerHere
                    ? '2px solid #ffffff'
                    : tile.type === 'WALL'
                    ? '1px solid #0d1829'
                    : `1px solid ${tileBorder}`,
                  opacity: isVisible ? 1 : 0.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: stepsRemaining > 0 && tile.type !== 'WALL' ? 'pointer' : 'default',
                  position: 'relative',
                  boxSizing: 'border-box',
                  fontSize: `${fontSize}px`,
                  userSelect: 'none',
                }}
              >
                {!isLocalPlayerHere && playersOnTile.length === 0 && tileContent}

                {/* Local Player Marker */}
                {isLocalPlayerHere && (
                  <div
                    style={{
                      width: `${Math.floor(tileSize * 0.5)}px`,
                      height: `${Math.floor(tileSize * 0.5)}px`,
                      backgroundColor: '#00ffcc',
                      borderRadius: '50%',
                      boxShadow: '0 0 10px #00ffcc',
                      zIndex: 2
                    }}
                  />
                )}

                {/* Other Players */}
                {!isLocalPlayerHere && playersOnTile.length > 0 && (
                  <div
                    style={{
                      width: `${Math.floor(tileSize * 0.4)}px`,
                      height: `${Math.floor(tileSize * 0.4)}px`,
                      backgroundColor: '#ff3366',
                      borderRadius: '50%',
                      zIndex: 2
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '11px' }}>
        {Object.entries(LEVEL_COLORS).map(([lvl, cfg]) => (
          <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#090d16', padding: '3px 8px', borderRadius: '4px', border: `1px solid ${cfg.border}` }}>
            <div style={{ width: '8px', height: '8px', backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }} />
            <span style={{ color: cfg.text }}>{cfg.label}</span>
          </div>
        ))}
      </div>

    </div>
  );
}