// src/fortress/components/MapView.tsx
import React from 'react';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '20px 0' }}>
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 32px)`,
          gridTemplateRows: `repeat(${gridSize}, 32px)`,
          gap: '2px',
          backgroundColor: '#111',
          padding: '8px',
          border: '2px solid #00ff00',
          borderRadius: '6px',
          maxHeight: '70vh',
          overflow: 'auto',
        }}
      >
        {grid.map((row, x) =>
          row.map((tile, y) => {
            const isPlayerHere = playerPosition.x === x && playerPosition.y === y;
            const inSight = isTileInSight(x, y);
            const isExplored = tile.isExplored || inSight; // Keep explored tiles revealed!

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
                onClick={() => isSelectable && onTileClick(tile)}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: isExplored ? visuals.color : '#000000',
                  border: isPlayerHere
                    ? '2px solid #ffffff'
                    : isSelectable
                    ? '2px dashed #00ff00'
                    : '1px solid #222222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  cursor: isSelectable ? 'pointer' : 'default',
                  opacity: inSight ? 1 : isExplored ? 0.55 : 0.15, // Dims explored tiles outside active sight
                  position: 'relative',
                  userSelect: 'none',
                }}
                title={tooltipText}
              >
                {isPlayerHere ? (
                  <span style={{ fontSize: '18px', zIndex: 2 }}>🧙‍♂️</span>
                ) : isExplored ? (
                  <>
                    <span>{visuals.label}</span>
                    {tile.hasRelic && <span style={{ position: 'absolute', top: 0, right: 0, fontSize: '10px' }}>✨</span>}
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