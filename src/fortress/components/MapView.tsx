// src/fortress/components/MapView.tsx
import React from 'react';
import { TileState, Position } from '../types';
import { LogisticalEngine } from '../LogisticalEngine';

interface MapViewProps {
  grid: TileState[][];
  playerPosition: Position;
  sightRadius: number;
  remainingMF: number;
  hasRaft: boolean;
  onTileClick: (targetTile: TileState) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  grid,
  playerPosition,
  sightRadius,
  remainingMF,
  hasRaft,
  onTileClick,
}) => {
  const gridSize = grid.length;

  // Helper to check if coordinate is inside player sight radius[cite: 1]
  const isTileVisible = (x: number, y: number): boolean => {
    const dx = Math.abs(playerPosition.x - x);
    const dy = Math.abs(playerPosition.y - y);
    return dx <= sightRadius && dy <= sightRadius;
  };

  // Helper to render terrain styling and emoji indicators[cite: 1]
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
            const visible = isTileVisible(x, y);

            // Calculate movement validity for adjacent tiles[cite: 1]
            const moveCheck = LogisticalEngine.getMovementCost(
              playerPosition,
              tile,
              { gold: 0, rations: 0, hasRaft, activeRelics: [], scrollsTeleport: 0, scrollsSeeing: 0, scrollsSeeking: 0 }
            );

            const isAdjacent = moveCheck.isValid;
            const canAfford = LogisticalEngine.canExecuteStep(remainingMF, moveCheck.cost);
            const isSelectable = isAdjacent && canAfford;

            const visuals = getTerrainVisuals(tile);

            return (
              <div
                key={`tile_${x}_${y}`}
                onClick={() => isSelectable && onTileClick(tile)}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: visible ? visuals.color : '#000000',
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
                  opacity: visible ? 1 : 0.15,
                  position: 'relative',
                  userSelect: 'none',
                }}
                title={visible ? `[${x},${y}] ${tile.terrain} (Cost: ${moveCheck.cost} MF)` : 'Unexplored (Fog of War)'}
              >
                {isPlayerHere ? (
                  <span style={{ fontSize: '18px', zIndex: 2 }}>🧙‍♂️</span>
                ) : visible ? (
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