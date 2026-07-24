import React, { useState, useEffect } from 'react';
import { BattleArena } from './BattleArena';
import { FortressWorkspace } from './fortress/components/FortressWorkspace';
import MathArena from './MathArena'; 
import { supabase } from './supabaseClient'; 

type AppMode = 'menu' | 'battle' | 'math' | 'fortress';

const HUB_LANG = {
  en: {
    backBtn: "← Main Hub Menu Selection",
    title: "ARCADE PLATFORM CORE HUB",
    sub: "Select an engine instance simulation deck target",
    battleTitle: "Battle Arena Engine Deck",
    battleSub: "Load real-time combat simulation tracking loop systems.",
    mathTitle: "Math Arena Engine Deck",
    mathSub: "Access active quick computation arithmetic tournament modules.",
    fortressTitle: "Fortress Remake Dev Desk",
    fortressSub: "Debug pipeline environment for Fortress of the Witch King classic remake.",
    footer: "Platform Architecture Routing Module Configuration System Live • Environment Status: 2026 Production Ready"
  },
  vi: {
    backBtn: "← Quay Lại Menu Trung Tâm",
    title: "TRUNG TÂM GAME ARCADE",
    sub: "Chọn chế độ trò chơi để bắt đầu trải nghiệm",
    battleTitle: "Đấu Trường Đối Kháng (RPG)",
    battleSub: "Hệ thống mô phỏng trận chiến theo lượt trực tuyến.",
    mathTitle: "Đấu Trường Toán Học",
    mathSub: "Luyện tập bảng nhân chia 2-9 thần tốc & diệt quái.",
    fortressTitle: "Góc Phát Triển Fortress Remake",
    fortressSub: "Môi trường thử nghiệm game Fortress of the Witch King.",
    footer: "Hệ Thống Trò Chơi Trực Tuyến • Sẵn Sàng Vận Hành 2026"
  }
};

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('menu');
  const [locale, setLocale] = useState<'en' | 'vi'>('vi');

  const t = HUB_LANG[locale];

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

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  const navigateToMode = (targetMode: AppMode) => {
    const nextUrl = targetMode === 'menu' ? '/' : `/?mode=${targetMode}`;
    window.history.pushState({ mode: targetMode }, '', nextUrl);
    setCurrentMode(targetMode);
  };

  if (currentMode === 'battle') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#121212', padding: '15px', boxSizing: 'border-box' }}>
        <button onClick={() => navigateToMode('menu')} style={backButtonStyle}>{t.backBtn}</button>
        <BattleArena />
      </div>
    );
  }

  if (currentMode === 'math') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', padding: '15px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <button onClick={() => navigateToMode('menu')} style={{ ...backButtonStyle, marginBottom: 0 }}>{t.backBtn}</button>
          
          <select 
            value={locale} 
            onChange={(e) => setLocale(e.target.value as 'en' | 'vi')}
            style={selectStyle}
          >
            <option value="vi">Tiếng Việt (VN)</option>
            <option value="en">English (EN)</option>
          </select>
        </div>
        <MathArena locale={locale} supabase={supabase} />
      </div>
    );
  }

  if (currentMode === 'fortress') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#050505', padding: '20px' }}>
        {/* Top Navigation Bar with Language Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => navigateToMode('menu')} 
            style={{ ...backButtonStyle, marginBottom: 0, backgroundColor: '#000', color: '#00ff00', border: '1px solid #00ff00' }}
          >
            {locale === 'vi' ? '← Quay Lại Menu Trung Tâm' : '← Main Hub Menu Selection'}
          </button>

          {/* Retro Fortress Language Selector */}
          <select 
            value={locale} 
            onChange={(e) => setLocale(e.target.value as 'en' | 'vi')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#000',
              color: '#00ff00',
              border: '1px solid #00ff00',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '14px',
              outline: 'none',
            }}
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>

        <FortressWorkspace locale={locale} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <select 
          value={locale} 
          onChange={(e) => setLocale(e.target.value as 'en' | 'vi')}
          style={selectStyle}
        >
          <option value="vi">Tiếng Việt (VN)</option>
          <option value="en">English (EN)</option>
        </select>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '35px', width: '100%', maxWidth: '600px' }}>
        <h1 style={{ fontSize: 'clamp(24px, 5vw, 36px)', margin: '0 0 10px 0', fontWeight: '800', color: '#38bdf8' }}>{t.title}</h1>
        <p style={{ fontSize: '15px', margin: 0, color: '#94a3b8' }}>{t.sub}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', width: '100%', maxWidth: '500px', boxSizing: 'border-box' }}>
        <div onClick={() => navigateToMode('battle')} style={menuCardStyle('#ef4444')}>
          <div style={{ fontSize: '32px' }}>⚔️</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#fff' }}>{t.battleTitle}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>{t.battleSub}</p>
          </div>
        </div>

        <div onClick={() => navigateToMode('math')} style={menuCardStyle('#3b82f6')}>
          <div style={{ fontSize: '32px' }}>🧮</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#fff' }}>{t.mathTitle}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>{t.mathSub}</p>
          </div>
        </div>

        <div onClick={() => navigateToMode('fortress')} style={menuCardStyle('#10b981')}>
          <div style={{ fontSize: '32px' }}>🏰</div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#fff' }}>{t.fortressTitle}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>{t.fortressSub}</p>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: '40px', fontSize: '11px', color: '#475569', textAlign: 'center', maxWidth: '500px' }}>
        {t.footer}
      </footer>
    </div>
  );
}

const backButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 'bold',
  backgroundColor: '#334155',
  color: '#f8fafc',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  marginBottom: '15px',
  fontFamily: 'monospace'
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#1e293b',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'monospace'
};

const menuCardStyle = (accentColor: string): React.CSSProperties => ({
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderLeft: `6px solid ${accentColor}`,
  borderRadius: '8px',
  padding: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  boxSizing: 'border-box'
});