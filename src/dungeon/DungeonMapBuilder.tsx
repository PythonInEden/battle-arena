import { useState, useRef } from 'react';
import { LEVEL_COLORS } from './dungeonBoardMap';

export type BrushType =
  | '#'  // Wall / Rock
  | '.'  // Corridor Path
  | 'H'  // Great Hall
  | '1' | '2' | '3' | '4' | '5' | '6' // Rooms (Levels 1-6)
  | 'd'  // Door
  | 'S'; // Secret Door

interface BrushTool {
  id: BrushType;
  label: string;
  icon: string;
  color: string;
  category: 'Terrain' | 'Rooms' | 'Special';
}

const BRUSH_TOOLS: BrushTool[] = [
  { id: '#', label: 'Solid Wall', icon: '⬛', color: '#0d1829', category: 'Terrain' },
  { id: '.', label: 'Corridor Path', icon: '🪨', color: '#1e293b', category: 'Terrain' },
  { id: 'H', label: 'Great Hall', icon: '🏛️', color: LEVEL_COLORS[0].bg, category: 'Special' },
  { id: 'd', label: 'Door Threshold', icon: '🚪', color: '#2e1800', category: 'Special' },
  { id: 'S', label: 'Secret Door', icon: '❓', color: '#2e1065', category: 'Special' },
  { id: '1', label: 'L1 Room (Yellow)', icon: '🕸️', color: LEVEL_COLORS[1].bg, category: 'Rooms' },
  { id: '2', label: 'L2 Room (Orange)', icon: '🕸️', color: LEVEL_COLORS[2].bg, category: 'Rooms' },
  { id: '3', label: 'L3 Room (Blue)', icon: '🕸️', color: LEVEL_COLORS[3].bg, category: 'Rooms' },
  { id: '4', label: 'L4 Room (Purple)', icon: '🕸️', color: LEVEL_COLORS[4].bg, category: 'Rooms' },
  { id: '5', label: 'L5 Room (Red)', icon: '💀', color: LEVEL_COLORS[5].bg, category: 'Rooms' },
  { id: '6', label: 'L6 Chamber (Teal)', icon: '💀', color: LEVEL_COLORS[6].bg, category: 'Rooms' },
];

export function DungeonMapBuilder() {
  const [gridWidth, setGridWidth] = useState<number>(40);
  const [gridHeight, setGridHeight] = useState<number>(40);

  // Custom Dimensions Inputs
  const [customWInput, setCustomWInput] = useState<string>('50');
  const [customHInput, setCustomHInput] = useState<string>('50');

  const [selectedBrush, setSelectedBrush] = useState<BrushType>('.');
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [exportedCode, setExportedCode] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');

  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: 40 }, () => Array(40).fill('#'))
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Resize Grid helper (preserves existing drawn cells)
  const handleResizeGrid = (newW: number, newH: number) => {
    const validW = Math.max(10, Math.min(100, newW));
    const validH = Math.max(10, Math.min(100, newH));

    setGridWidth(validW);
    setGridHeight(validH);
    setCustomWInput(String(validW));
    setCustomHInput(String(validH));

    setGrid(prev => {
      return Array.from({ length: validH }, (_, y) =>
        Array.from({ length: validW }, (_, x) => prev[y]?.[x] || '#')
      );
    });
  };

  const handleApplyCustomSize = () => {
    const w = parseInt(customWInput, 10) || 40;
    const h = parseInt(customHInput, 10) || 40;
    handleResizeGrid(w, h);
  };

  const applyBrush = (x: number, y: number) => {
    setGrid(prev => {
      if (prev[y]?.[x] === selectedBrush) return prev;
      const next = prev.map(row => [...row]);
      if (next[y]) next[y][x] = selectedBrush;
      return next;
    });
  };

  // Stamp Preset Templates
  const stampTemplate = (templateType: 'ROOM_2X2' | 'CHAMBER_3X3' | 'GREAT_HALL') => {
    setGrid(prev => {
      const next = prev.map(row => [...row]);
      const centerX = Math.floor(gridWidth / 2) - 1;
      const centerY = Math.floor(gridHeight / 2) - 1;

      if (templateType === 'GREAT_HALL') {
        for (let y = centerY - 1; y <= centerY + 2; y++) {
          for (let x = centerX - 1; x <= centerX + 2; x++) {
            if (next[y]?.[x] !== undefined) next[y][x] = 'H';
          }
        }
      } else if (templateType === 'ROOM_2X2') {
        for (let y = centerY; y <= centerY + 1; y++) {
          for (let x = centerX; x <= centerX + 1; x++) {
            if (next[y]?.[x] !== undefined) next[y][x] = selectedBrush === '#' ? '1' : selectedBrush;
          }
        }
        if (next[centerY + 2]?.[centerX] !== undefined) next[centerY + 2][centerX] = 'd';
      } else if (templateType === 'CHAMBER_3X3') {
        for (let y = centerY - 1; y <= centerY + 1; y++) {
          for (let x = centerX - 1; x <= centerX + 1; x++) {
            if (next[y]?.[x] !== undefined) next[y][x] = selectedBrush === '#' ? '5' : selectedBrush;
          }
        }
        if (next[centerY + 2]?.[centerX] !== undefined) next[centerY + 2][centerX] = 'd';
      }
      return next;
    });
  };

  // Export Map as TS Code
  const handleExport = () => {
    const formattedRows = grid.map(row => `  "${row.join('')}"`).join(',\n');
    const tsCode = `export const BOARD_WIDTH = ${gridWidth};\nexport const BOARD_HEIGHT = ${gridHeight};\nexport const BOARD_SIZE = BOARD_WIDTH;\n\nconst ASCII_MAP = [\n${formattedRows}\n];`;
    setExportedCode(tsCode);
    setShowExportModal(true);
  };

  // Import Map from ASCII String
  const handleImport = () => {
    try {
      const cleanedLines = importText
        .split('\n')
        .map(l => l.trim().replace(/^"|",?$|";?$/g, ''))
        .filter(l => l.length > 0 && (l.includes('#') || l.includes('.') || l.includes('1') || l.includes('H')));

      if (cleanedLines.length === 0) return alert('No valid map rows found!');

      const newH = cleanedLines.length;
      const newW = cleanedLines[0].length;

      const newGrid = cleanedLines.map(line => line.split(''));
      setGridWidth(newW);
      setGridHeight(newH);
      setCustomWInput(String(newW));
      setCustomHInput(String(newH));
      setGrid(newGrid);
      setImportText('');
      alert(`✅ Imported ${newW}x${newH} Map Layout!`);
    } catch {
      alert('Error parsing map code. Ensure lines contain valid ASCII map characters.');
    }
  };

  const getCellVisuals = (char: string) => {
    switch (char) {
      case '#': return { bg: '#050a12', border: '#0d1829', icon: '' };
      case '.': return { bg: '#1e293b', border: '#334155', icon: '▦' };
      case 'H': return { bg: LEVEL_COLORS[0].bg, border: LEVEL_COLORS[0].border, icon: '🏛️' };
      case 'd': return { bg: '#2e1800', border: '#eab308', icon: '🚪' };
      case 'S': return { bg: '#2e1065', border: '#a855f7', icon: '❓' };
      case '1': return { bg: LEVEL_COLORS[1].bg, border: LEVEL_COLORS[1].border, icon: '⓵' };
      case '2': return { bg: LEVEL_COLORS[2].bg, border: LEVEL_COLORS[2].border, icon: '⓶' };
      case '3': return { bg: LEVEL_COLORS[3].bg, border: LEVEL_COLORS[3].border, icon: '⓷' };
      case '4': return { bg: LEVEL_COLORS[4].bg, border: LEVEL_COLORS[4].border, icon: '⓸' };
      case '5': return { bg: LEVEL_COLORS[5].bg, border: LEVEL_COLORS[5].border, icon: '⓹' };
      case '6': return { bg: LEVEL_COLORS[6].bg, border: LEVEL_COLORS[6].border, icon: '⓺' };
      default: return { bg: '#000', border: '#222', icon: '' };
    }
  };

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#00ffcc', fontFamily: 'monospace' }}
      onMouseUp={() => setIsMouseDown(false)}
    >
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', backgroundColor: '#0a1424', padding: '12px 16px', borderRadius: '8px', border: '1px solid #00ffcc' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff' }}>🛠️ DUNGEON MAP CREATOR STUDIO</h2>
          <span style={{ fontSize: '12px', color: '#88aaff' }}>Current Size: <strong style={{ color: '#00ffcc' }}>{gridWidth}x{gridHeight}</strong> | Click & drag mouse to paint</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => stampTemplate('ROOM_2X2')}
            style={{ padding: '6px 12px', backgroundColor: '#eab308', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
          >
            ➕ Stamp 2x2 Room
          </button>
          <button
            onClick={() => stampTemplate('CHAMBER_3X3')}
            style={{ padding: '6px 12px', backgroundColor: '#a855f7', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
          >
            ➕ Stamp 3x3 Chamber
          </button>
          <button
            onClick={() => stampTemplate('GREAT_HALL')}
            style={{ padding: '6px 12px', backgroundColor: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
          >
            🏛️ Stamp Great Hall
          </button>
          <button
            onClick={handleExport}
            style={{ padding: '6px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
          >
            💾 Export Code
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px' }}>
        
        {/* Left Control Panel: Preset Sizes, Custom Sizing & Brush Palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#070f1e', padding: '12px', borderRadius: '8px', border: '1px solid #112233' }}>
          
          {/* Preset Sizing Buttons */}
          <div>
            <label style={{ fontSize: '12px', color: '#88aaff', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Preset Grid Sizes:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[30, 40, 50, 60].map(sz => (
                <button 
                  key={sz}
                  onClick={() => handleResizeGrid(sz, sz)} 
                  style={{ 
                    padding: '6px', 
                    backgroundColor: gridWidth === sz && gridHeight === sz ? '#00ffcc' : '#000', 
                    color: gridWidth === sz && gridHeight === sz ? '#000' : '#00ffcc', 
                    border: '1px solid #00ffcc', 
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: 'monospace' 
                  }}
                >
                  {sz}x{sz}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Size Configurator */}
          <div style={{ borderTop: '1px dashed #112233', paddingTop: '10px' }}>
            <label style={{ fontSize: '12px', color: '#88aaff', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Custom Map Size (W x H):</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
              <input 
                type="number"
                min={10}
                max={100}
                value={customWInput}
                onChange={e => setCustomWInput(e.target.value)}
                style={{ width: '50px', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '4px', textAlign: 'center', fontFamily: 'monospace' }}
              />
              <span style={{ color: '#fff' }}>x</span>
              <input 
                type="number"
                min={10}
                max={100}
                value={customHInput}
                onChange={e => setCustomHInput(e.target.value)}
                style={{ width: '50px', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '4px', textAlign: 'center', fontFamily: 'monospace' }}
              />
              <button
                onClick={handleApplyCustomSize}
                style={{ flex: 1, padding: '5px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '3px', fontSize: '11px' }}
              >
                Apply
              </button>
            </div>
            <span style={{ fontSize: '10px', color: '#666' }}>Range: 10x10 to 100x100</span>
          </div>

          {/* Brush Tool Selection */}
          <div style={{ borderTop: '1px dashed #112233', paddingTop: '10px' }}>
            <label style={{ fontSize: '12px', color: '#88aaff', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Active Brush Tool:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
              {BRUSH_TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedBrush(tool.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    backgroundColor: selectedBrush === tool.id ? '#00ffcc' : tool.color,
                    color: selectedBrush === tool.id ? '#000' : '#fff',
                    border: `1px solid ${selectedBrush === tool.id ? '#00ffcc' : '#334155'}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    textAlign: 'left',
                    fontWeight: selectedBrush === tool.id ? 'bold' : 'normal'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{tool.icon || '▪️'}</span>
                  <span style={{ fontSize: '11px' }}>{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Interactive Map Painting Frame */}
        <div 
          ref={containerRef}
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${gridWidth}, 20px)`, 
            gridTemplateRows: `repeat(${gridHeight}, 20px)`, 
            gap: '1px', 
            backgroundColor: '#000', 
            padding: '12px', 
            border: '2px solid #00ffcc', 
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '75vh',
            maxWidth: '100%'
          }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const vis = getCellVisuals(cell);
              return (
                <div
                  key={`${x}_${y}`}
                  onMouseDown={() => {
                    setIsMouseDown(true);
                    applyBrush(x, y);
                  }}
                  onMouseEnter={() => {
                    if (isMouseDown) applyBrush(x, y);
                  }}
                  title={`(${x}, ${y}) - Brush: ${cell}`}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: vis.bg,
                    border: `1px solid ${vis.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'crosshair',
                    fontSize: '10px',
                    userSelect: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {vis.icon}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#0a1424', border: '2px solid #00ffcc', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '700px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#00ffcc' }}>📋 Exported Map Blueprint Code ({gridWidth}x{gridHeight})</h3>
            <p style={{ fontSize: '12px', color: '#88aaff', margin: '0 0 12px 0' }}>Copy this code and paste it directly into <code>src/dungeon/dungeonBoardMap.ts</code>!</p>
            
            <textarea
              readOnly
              value={exportedCode}
              rows={16}
              style={{ width: '100%', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '10px', fontFamily: 'monospace', fontSize: '11px', boxSizing: 'border-box', marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportedCode);
                  alert('📋 Code copied to clipboard!');
                }}
                style={{ padding: '8px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
              >
                📋 Copy Code
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ padding: '8px 20px', backgroundColor: '#334155', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Code Area */}
      <div style={{ backgroundColor: '#070f1e', border: '1px dashed #00ffcc', padding: '12px', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 6px 0', color: '#fff' }}>📥 Import Existing Map Code</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='Paste ASCII_MAP array lines here'
            rows={2}
            style={{ flex: 1, backgroundColor: '#000', color: '#00ffcc', border: '1px solid #334155', padding: '6px', fontFamily: 'monospace', fontSize: '11px' }}
          />
          <button
            onClick={handleImport}
            style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
          >
            📥 Load Map
          </button>
        </div>
      </div>
    </div>
  );
}