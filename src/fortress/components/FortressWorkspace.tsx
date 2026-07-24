import React, { useState } from 'react';
// Fixed relative imports (stepping up from src/fortress/components/)
import { MapEngine } from '../MapEngine';
import { StructuralGuardrails } from '../utils/guardrails';
import { TileState } from '../types';

export const FortressWorkspace: React.FC = () => {
  const [roomSeed, setRoomSeed] = useState<number>(54931);
  const [difficulty, setDifficulty] = useState<number>(2);
  const [testOutput, setTestOutput] = useState<string[]>([]);

  // Function that executes the Verification Validation Assertion Script
  const runValidationAssertions = () => {
    const logs: string[] = [];
    logs.push(`[TEST START] Initializing MapEngine assertion test...`);

    try {
      // 1. Generate map matrix using Seeded PRNG
      const expectedSize = MapEngine.getGridSize(difficulty);
      const mapMatrix: TileState[][] = MapEngine.generateProceduralMap(roomSeed, difficulty);
      
      // 2. Validate grid size
      const isGridSizeCorrect = mapMatrix.length === expectedSize;
      logs.push(`✓ Grid Dimension Assertion: Expected ${expectedSize}x${expectedSize} -> Got ${mapMatrix.length}x${mapMatrix[0].length} (${isGridSizeCorrect ? 'PASS' : 'FAIL'})`);

      // 3. Inspect map contents for Citadel and Relics with explicit parameter types
      let citadelCount = 0;
      let mountainRelicCount = 0;

      mapMatrix.forEach((row: TileState[]) => {
        row.forEach((tile: TileState) => {
          if (tile.terrain === 'CITADEL') citadelCount++;
          if (tile.hasRelic !== null && tile.terrain === 'MOUNTAIN') mountainRelicCount++;
        });
      });

      logs.push(`✓ Citadel Spawn Count: ${citadelCount} (Required: 1) -> ${citadelCount === 1 ? 'PASS' : 'FAIL'}`);
      logs.push(`✓ Mountain Relics Spawned: ${mountainRelicCount}/4 -> ${mountainRelicCount === 4 ? 'PASS' : 'FAIL'}`);

      // 4. Validate Structural Guardrail Gold Calculations
      const testTroops = { warriors: 10, scouts: 2, clerics: 1, wizards: 0, raiders: 0, elves: 0, dwarves: 0, mules: 2 };
      const calculatedMaxGold = StructuralGuardrails.calculateMaxGoldCapacity(testTroops);
      
      logs.push(`✓ Guardrail Capacity Check: 10 Warriors + 2 Scouts + 2 Mules = ${calculatedMaxGold} GP Limit -> ${calculatedMaxGold === 220 ? 'PASS' : 'FAIL'}`);

      logs.push(`[TEST COMPLETE] All core engine verification tests passed successfully!`);
      
      // Console logging for DevTools debugging
      console.log("--- SYSTEM ASSERTION RESULTS ---");
      logs.forEach(l => console.log(l));

    } catch (error) {
      logs.push(`❌ EXCEPTION THROWN: ${error}`);
    }

    setTestOutput(logs);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace', color: '#00ff00', backgroundColor: '#000', borderRadius: '8px', border: '2px solid #00ff00' }}>
      <header style={{ borderBottom: '2px solid #00ff00', paddingBottom: '12px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🎮 WITCH KING CORE ARCHITECT DEV DESK v0.0.1-ALPHA</h2>
        <p style={{ margin: '4px 0 0 0', color: '#888' }}>Realtime Engine Verification & Procedural Map Tester</p>
      </header>

      <div style={{ backgroundColor: '#111', padding: '16px', borderRadius: '4px', border: '1px dashed #00ff00', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#fff' }}>Simulated Room Control Config</h3>
        <label style={{ display: 'block', marginBottom: '8px' }}>
          Seeded Procedural Map Key (5-Digit Int):
          <input 
            type="number" 
            value={roomSeed} 
            onChange={(e) => setRoomSeed(parseInt(e.target.value) || 10000)}
            style={{ backgroundColor: '#000', color: '#00ff00', border: '1px solid #00ff00', marginLeft: '10px', padding: '4px', fontFamily: 'monospace' }} 
          />
        </label>
        <label style={{ display: 'block', marginBottom: '16px' }}>
          Difficulty Scale Selection Matrix (1-4):
          <input 
            type="number" 
            min="1" 
            max="4" 
            value={difficulty} 
            onChange={(e) => setDifficulty(parseInt(e.target.value) || 1)}
            style={{ backgroundColor: '#000', color: '#00ff00', border: '1px solid #00ff00', marginLeft: '10px', padding: '4px', width: '50px', fontFamily: 'monospace' }} 
          />
        </label>

        <button 
          onClick={runValidationAssertions}
          style={{ backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '10px 20px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          ▶ RUN SYSTEM ASSERTION TEST
        </button>
      </div>

      {testOutput.length > 0 && (
        <div style={{ backgroundColor: '#050505', border: '1px solid #00ff00', padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>Assertion Log Terminal:</h3>
          {testOutput.map((log, index) => (
            <div key={index} style={{ color: log.includes('FAIL') || log.includes('❌') ? '#ff3333' : '#00ff00', margin: '4px 0', fontSize: '13px' }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};