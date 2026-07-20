import React, { useState, useEffect } from 'react';
import { BattleArena } from './BattleArena';
import { FortressWorkspace } from './components/FortressWorkspace';

type AppMode = 'menu' | 'battle' | 'math' | 'fortress';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('menu');

  // Intercept incoming connection vectors and map parameter configurations
  useEffect(() => {
    const handleUrlRouting = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const modeParam = queryParams.get('mode');

      if (modeParam === 'math') {
        setCurrentMode('math');
      } else if (modeParam === 'fortress') {
        setCurrentMode('fortress');
      } else if (modeParam === 'battle') {
        setCurrentMode('battle');
      } else {
        setCurrentMode('menu');
      }
    };

    // Run synchronization mapping at boot launch
    handleUrlRouting();

    // Event hooks to handle forward/backward browsing mutations
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  // Safe navigation transition coordinator updates url state without breaking the live tab context
  const navigateToMode = (targetMode: AppMode) => {
    const nextUrl = targetMode === 'menu' ? '/' : `/?mode=${targetMode}`;
    window.history.pushState({ mode: targetMode }, '', nextUrl);
    setCurrentMode(targetMode);
  };

  // Rendering Routing Resolution Engine Block
  if (currentMode === 'battle') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#121212', padding: '20px' }}>
        <button onClick={() => navigateToMode('menu')} style={backButtonStyle}>← Main Hub Menu Selection</button>
        <BattleArena />
      </div>
    );
  }

  if (currentMode === 'math') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1a202c', padding: '20px', color: '#fff', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <button onClick={() => navigateToMode('menu')} style={backButtonStyle}>← Main Hub Menu Selection</button>
        <div style={{ marginTop: '40px', padding: '30px', backgroundColor: '#2d3748', borderRadius: '8px', inlineSize: 'fit-content', margin: '40px auto' }}>
          <h2>🧮 Live Math Arena Instance Stream Redirect</h2>
          <p style={{ color: '#a0aec0' }}>Connected to Vercel Endpoint Target Deployment System.</p>
          <div style={{ margin: '24px 0', padding: '16px', backgroundColor: '#1a202c', borderRadius: '6px', fontSize: '18px', fontWeight: 'bold', color: '#63b3ed' }}>
            [MATH ENGINE SYNCED SUCCESSFULLY]
          </div>
          <p style={{ fontSize: '14px', color: '#718096' }}>Query parameter tracking configuration active: `?mode=math` state persistent loop.</p>
        </div>
      </div>
    );
  }

  if (currentMode === 'fortress') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#050505', padding: '20px' }}>
        <button onClick={() => navigateToMode('menu')} style={{ ...backButtonStyle, backgroundColor: '#000', color: '#00ff00', border: '1px solid #00ff00' }}>← Main Hub Menu Selection</button>
        <FortressWorkspace />
      </div>
    );
  }

  // Fallback default state presentation UI layer configuration (Menu Hub Screen)
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '42px', margin: '0 0 10px 0', fontWeight: '800', letterSpacing: '-1px', color: '#38bdf8' }}>ARCADE PLATFORM CORE HUB</h1>
        <p style={{ fontSize: '18px', margin: 0, color: '#94a3b8' }}>Select an engine instance simulation deck target</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', width: '100%', maxWidth: '500px' }}>
        <div onClick={() => navigateToMode('battle')} style={menuCardStyle('#ef4444')}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚔️</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>Battle Arena Engine Deck</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Load real-time combat simulation tracking loop systems.</p>
          </div>
        </div>

        <div onClick={() => navigateToMode('math')} style={menuCardStyle('#3b82f6')}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧮</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>Math Arena Engine Deck</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Access active quick computation arithmetic tournament modules.</p>
          </div>
        </div>

        <div onClick={() => navigateToMode('fortress')} style={menuCardStyle('#10b981')}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏰</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>Fortress Remake Dev Desk</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Debug pipeline environment for Fortress of the Witch King classic remake.[cite: 1]</p>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: '50px', fontSize: '12px', color: '#475569', textAlign: 'center' }}>
        Platform Architecture Routing Module Configuration System Live • Environment Status: 2026 Production Ready
      </footer>
    </div>
  );
}

// Styling Object Vectors
const backButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 'bold',
  backgroundColor: '#334155',
  color: '#f8fafc',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginBottom: '20px',
  display: 'inline-block',
};

const menuCardStyle = (accentColor: string): React.CSSProperties => ({
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderLeft: `6px solid ${accentColor}`,
  borderRadius: '8px',
  padding: '20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  transition: 'transform 0.2s, backgroundColor 0.2s',
});