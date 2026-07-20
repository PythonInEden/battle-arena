import React, { useState } from 'react';

interface BattleState {
  playerHp: number;
  enemyHp: number;
  roundCount: number;
  isCombatActive: boolean;
  battleLog: string[];
}

export const BattleArena: React.FC = () => {
  // Robust Parameter & Primitive State Protection Boundaries
  const [gameState, setGameState] = useState<BattleState>({
    playerHp: 100,
    enemyHp: 100,
    roundCount: 1,
    isCombatActive: false,
    battleLog: ['Welcome to the Combat Simulator. Select an action to initiate combat loop.'],
  });

  const runCombatRound = (actionType: 'attack' | 'defend') => {
    if (gameState.playerHp <= 0 || gameState.enemyHp <= 0) {
      return;
    }

    setGameState((prevState) => {
      const playerDamage = actionType === 'attack' ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 5);
      const enemyDamage = Math.floor(Math.random() * 12) + 4;

      const nextEnemyHp = Math.max(0, prevState.enemyHp - playerDamage);
      const nextPlayerHp = Math.max(0, prevState.playerHp - enemyDamage);
      const currentRound = prevState.roundCount + 1;

      const actionLog = `Round ${prevState.roundCount}: Player chose ${actionType.toUpperCase()}, dealing ${playerDamage} DMG. Enemy retaliated with ${enemyDamage} DMG.`;
      
      let finalLog = [actionLog, ...prevState.battleLog];
      if (nextEnemyHp <= 0) finalLog = ['VICTORY: Enemy force has been completely routed.', ...finalLog];
      if (nextPlayerHp <= 0) finalLog = ['DEFEAT: Player front line has collapsed.', ...finalLog];

      return {
        ...prevState,
        playerHp: nextPlayerHp,
        enemyHp: nextEnemyHp,
        roundCount: currentRound,
        isCombatActive: nextPlayerHp > 0 && nextEnemyHp > 0,
        battleLog: finalLog,
      };
    });
  };

  const resetSimulation = () => {
    setGameState({
      playerHp: 100,
      enemyHp: 100,
      roundCount: 1,
      isCombatActive: true,
      battleLog: ['Simulation state cleared. Combat vectors refreshed.'],
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', color: '#fff', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
      <header style={{ borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#e53e3e' }}>⚔️ Core Battle Arena Loop</h2>
        <p style={{ margin: '4px 0 0 0', color: '#a0aec0', fontSize: '14px' }}>Active Gameplay Session Module Instance</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ padding: '16px', backgroundColor: '#2d3748', borderRadius: '6px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Player Status</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: gameState.playerHp > 30 ? '#48bb78' : '#f56565' }}>
            {gameState.playerHp} HP
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#2d3748', borderRadius: '6px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Enemy Status</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: gameState.enemyHp > 0 ? '#ed8936' : '#a0aec0' }}>
            {gameState.enemyHp} HP
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button 
          onClick={() => runCombatRound('attack')} 
          disabled={gameState.playerHp <= 0 || gameState.enemyHp <= 0}
          style={{ flex: 1, padding: '12px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#e53e3e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (gameState.playerHp <= 0 || gameState.enemyHp <= 0) ? 0.5 : 1 }}
        >
          Execute Attack Order
        </button>
        <button 
          onClick={() => runCombatRound('defend')} 
          disabled={gameState.playerHp <= 0 || gameState.enemyHp <= 0}
          style={{ flex: 1, padding: '12px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (gameState.playerHp <= 0 || gameState.enemyHp <= 0) ? 0.5 : 1 }}
        >
          Execute Guard Order
        </button>
        <button 
          onClick={resetSimulation} 
          style={{ padding: '12px 20px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#4a5568', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Reset Vector
        </button>
      </div>

      <div style={{ backgroundColor: '#111', padding: '16px', borderRadius: '6px', height: '200px', overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#a0aec0', borderBottom: '1px solid #222', paddingBottom: '4px' }}>Real-time Transaction Event Ticker</h4>
        {gameState.battleLog.map((log, index) => (
          <div key={index} style={{ fontSize: '14px', margin: '4px 0', color: index === 0 ? '#fff' : '#718096', borderLeft: index === 0 ? '3px solid #e53e3e' : 'none', paddingLeft: index === 0 ? '6px' : '0' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};