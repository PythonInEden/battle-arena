// src/fortress/components/MapView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TileState, Position } from '../types';
import { LogisticalEngine } from '../LogisticalEngine';
import { FORTRESS_LANG, LanguageType } from '../languages';

interface MapViewProps {
  grid: TileState[][];
  playerPosition: Position;
  sightRadius: number;
  remainingMF: number;
  hasRaft: boolean;
  locale: LanguageType;
  onTileClick: (targetTile: TileState) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  grid,
  playerPosition,
  sightRadius,
  remainingMF,
  hasRaft,
  locale,
  onTileClick,
}) => {
  const t = FORTRESS_LANG[locale];
  const gridSize = grid.length;

  // Dynamic Tile Rescaling (18px = Bird's Eye View, 52px = Touch Zoom)
  const [tileSize, setTileSize] = useState<number>(28);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerTileRef = useRef<HTMLDivElement>(null);

  // Auto-center camera on player whenever position or tile zoom changes
  const centerCamera = () => {
    if (playerTileRef.current && containerRef.current) {
      playerTileRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  };

  useEffect(() => {
    centerCamera();
  }, [playerPosition.x, playerPosition.y, tileSize]);

  const isTileInSight = (x: number, y: number): boolean => {
    const dx = Math.abs(playerPosition.x - x);
    const dy = Math.abs(playerPosition.y - y);
    return dx <= sightRadius && dy <= sightRadius;
  };

  const getTerrainName = (terrain: string) => {
    switch (terrain) {
      case 'PLAINS': return t.terrainPlains;
      case 'FOREST': return t.terrainForest;
      case 'MOUNTAIN': return t.terrainMountain;
      case 'LAKE': return t.terrainLake;
      case 'TOWN': return t.terrainTown;
      case 'SANCTUARY': return t.terrainSanctuary;
      case 'CITADEL': return t.terrainCitadel;
      default: return terrain;
    }
  };

  const getTerrainVisuals = (tile: TileState) => {
    switch (tile.terrain) {
      case 'PLAINS': return { color: '#2e7d32', label: '🌿' };
      case 'FOREST': return { color: '#1b5e20', label: '🌲' };
      case 'MOUNTAIN': return { color: '#424242', label: '⛰️' };
      case 'LAKE': return { color: '#0288d1', label: '🌊' };
      case 'TOWN': return { color: '#fbc02d', label: '🏰' };
      case 'SANCTUARY': return { color: '#ab47bc', label: '⛩️' };
      case 'CITADEL': return { color: '#b71c1c', label: '👑' };
      default: return { color: '#000000', label: '❓' };
    }
  };

  const fontSize = Math.max(10, Math.floor(tileSize * 0.45));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0', width: '100%' }}>
      
      {/* Zoom & Camera Toolbar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setTileSize((prev) => Math.max(18, prev - 4))}
          style={{ backgroundColor: '#111', color: '#00ff00', border: '1px solid #00ff00', padding: '4px 10px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '4px' }}
          title={t.zoomOut}
        >
          🔍 -
        </button>

        <span style={{ fontSize: '12px', color: '#888', minWidth: '45px', textAlign: 'center' }}>
          {Math.round((tileSize / 28) * 100)}%
        </span>

        <button
          onClick={() => setTileSize((prev) => Math.min(52, prev + 4))}
          style={{ backgroundColor: '#111', color: '#00ff00', border: '1px solid #00ff00', padding: '4px 10px', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '4px' }}
          title={t.zoomIn}
        >
          🔍 +
        </button>

        <button
          onClick={centerCamera}
          style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '4px 12px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '4px', marginLeft: '8px' }}
        >
          {t.centerCam}
        </button>
      </div>

      {/* Responsive Viewport Frame */}
      <div 
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, ${tileSize}px)`,
          gap: '2px',
          backgroundColor: '#111',
          padding: '8px',
          border: '2px solid #00ff00',
          borderRadius: '6px',
          maxHeight: '55vh',
          maxWidth: '100%',
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'manipulation',
          boxSizing: 'border-box',
        }}
      >
        {grid.map((row, x) =>
          row.map((tile, y) => {
            const isPlayerHere = playerPosition.x === x && playerPosition.y === y;
            const inSight = isTileInSight(x, y);
            const isExplored = tile.isExplored || inSight;

            const moveCheck = LogisticalEngine.getMovementCost(
              playerPosition,
              tile,
              { gold: 0, rations: 0, hasRaft, activeRelics: [], scrollsTeleport: 0, scrollsSeeing: 0, scrollsSeeking: 0 }
            );

            const isAdjacent = moveCheck.isValid;
            const canAfford = LogisticalEngine.canExecuteStep(remainingMF, moveCheck.cost);
            const isSelectable = isAdjacent && canAfford;

            const visuals = getTerrainVisuals(tile);
            const terrainName = getTerrainName(tile.terrain);

            const tooltipText = isExplored
              ? `[${x},${y}] ${terrainName} (${t.costLabel}: ${moveCheck.cost} MF)`
              : t.unexploredLabel;

            return (
              <div
                key={`tile_${x}_${y}`}
                ref={isPlayerHere ? playerTileRef : null}
                onClick={() => isSelectable && onTileClick(tile)}
                style={{
                  width: `${tileSize}px`,
                  height: `${tileSize}px`,
                  backgroundColor: isExplored ? visuals.color : '#000000',
                  border: isPlayerHere
                    ? '2px solid #ffffff'
                    : isSelectable
                    ? '2px dashed #00ff00'
                    : '1px solid #222222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: `${fontSize}px`,
                  cursor: isSelectable ? 'pointer' : 'default',
                  opacity: inSight ? 1 : isExplored ? 0.55 : 0.15,
                  position: 'relative',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                }}
                title={tooltipText}
              >
                {isPlayerHere ? (
                  <span style={{ fontSize: `${Math.floor(fontSize * 1.3)}px`, zIndex: 2 }}>🧙‍♂️</span>
                ) : isExplored ? (
                  <>
                    <span>{visuals.label}</span>
                    {(tile.droppedGold ?? 0) > 0 && (
                      <span style={{ position: 'absolute', bottom: 0, right: 0, fontSize: `${Math.max(9, fontSize - 3)}px`, zIndex: 1 }}>
                        💰
                      </span>
                    )}
                    {tile.hasRelic && <span style={{ position: 'absolute', top: 0, right: 0, fontSize: `${Math.max(8, fontSize - 4)}px` }}>✨</span>}
                  </>
                ) : (
                  <span style={{ color: '#333' }}>🌫️</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};