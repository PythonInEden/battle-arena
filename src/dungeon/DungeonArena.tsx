import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useDungeonSession } from './useDungeonSession';

export function DungeonArena() {
  const [roomCodeInput, setRoomCodeInput] = useState<string>('TEST');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('TEST');
  const [playerNameInput, setPlayerNameInput] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('Rogue');

  const { clientSessionId, player, lobbyPlayers, isReconnecting, reconnect } = useDungeonSession(activeRoomCode);

  const CLASS_CONFIG: Record<string, { targetGold: number; speed: number; category: string }> = {
    Rogue: { targetGold: 10000, speed: 6, category: 'Rogue / Speed' },
    Ranger: { targetGold: 10000, speed: 6, category: 'Rogue / Speed' },
    Bard: { targetGold: 10000, speed: 6, category: 'Rogue / Speed' },
    Cleric: { targetGold: 10000, speed: 5, category: 'Cleric / Sustain' },
    Paladin: { targetGold: 10000, speed: 5, category: 'Cleric / Sustain' },
    Fighter: { targetGold: 15000, speed: 5, category: 'Fighter / Combat' },
    Barbarian: { targetGold: 15000, speed: 5, category: 'Fighter / Combat' },
    Wizard: { targetGold: 30000, speed: 5, category: 'Wizard / Spells' },
    Necromancer: { targetGold: 30000, speed: 5, category: 'Wizard / Spells' }
  };

  const handleJoinOrCreateRoom = async () => {
    if (!playerNameInput.trim()) return alert('Please enter your player name!');
    const code = roomCodeInput.trim().toUpperCase();
    setActiveRoomCode(code);

    // 1. Ensure room session exists
    await supabase
      .from('dungeon_sessions')
      .upsert({ room_code: code, host_id: playerNameInput });

    // 2. Register or update player entry
    const targetGold = CLASS_CONFIG[selectedClass].targetGold;
    await supabase.from('dungeon_players').upsert({
      room_code: code,
      player_name: playerNameInput,
      hero_class: selectedClass,
      target_gold: targetGold,
      client_session_id: clientSessionId,
      connection_status: 'ONLINE'
    });

    reconnect();
  };

  return (
    <div style={{ backgroundColor: '#050b14', color: '#00ffcc', fontFamily: 'monospace', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      
      {/* Header Bar */}
      <header style={{ borderBottom: '2px solid #00ffcc', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ margin: 0, textShadow: '0 0 10px #00ffcc' }}>🏰 DUNGEON! REAL-TIME ARENA</h1>
          <p style={{ color: '#88aaff', margin: '5px 0 0 0' }}>Room Code: <strong style={{ color: '#fff' }}>{activeRoomCode}</strong></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Session Token: <span style={{ color: '#888', fontSize: '11px' }}>{clientSessionId.slice(0, 8)}...</span></div>
          <div>Status: <strong>{isReconnecting ? "🔄 Syncing..." : player ? `✅ Online (${player.player_name})` : "❌ Unregistered"}</strong></div>
        </div>
      </header>

      {/* Hero Registration Panel */}
      {!player && (
        <section style={{ backgroundColor: '#0a1424', border: '1px solid #00ffcc', padding: '20px', borderRadius: '8px', maxWidth: '600px', margin: '0 auto 30px auto' }}>
          <h2 style={{ marginTop: 0, color: '#fff' }}>⚔️ Select Character & Join Room</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Player Name:</label>
              <input 
                type="text" 
                value={playerNameInput} 
                onChange={(e) => setPlayerNameInput(e.target.value)}
                placeholder="Enter display name..."
                style={{ width: '100%', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>4-Letter Room Code:</label>
              <input 
                type="text" 
                maxLength={4}
                value={roomCodeInput} 
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                style={{ width: '100%', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '4px', textAlign: 'center', fontSize: '18px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Choose Hero Class:</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ width: '100%', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace' }}
              >
                {Object.keys(CLASS_CONFIG).map(cls => (
                  <option key={cls} value={cls}>
                    {cls} — [{CLASS_CONFIG[cls].category}] Goal: {CLASS_CONFIG[cls].targetGold.toLocaleString()} GP
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleJoinOrCreateRoom}
              style={{ backgroundColor: '#00ffcc', color: '#000', fontWeight: 'bold', border: 'none', padding: '12px', fontSize: '16px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px', marginTop: '10px' }}
            >
              🚀 ENTER DUNGEON LOBBY
            </button>
          </div>
        </section>
      )}

      {/* Active Player Card & Controls */}
      {player && (
        <section style={{ backgroundColor: '#0a1424', border: '1px solid #00ffcc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h2 style={{ color: '#fff', margin: '0 0 10px 0' }}>👑 Active Hero: {player.player_name}</h2>
          <p style={{ margin: '5px 0' }}>
            Class: <strong>{player.hero_class}</strong> | Victory Goal: <strong style={{ color: '#ffcc00' }}>{player.target_gold.toLocaleString()} GP</strong> | Speed: <strong>{CLASS_CONFIG[player.hero_class]?.speed || 5} tiles/tick</strong>
          </p>

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', backgroundColor: '#00ffcc', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
              🔄 Test Page Refresh
            </button>
            <button onClick={reconnect} style={{ padding: '8px 16px', backgroundColor: '#ffcc00', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
              ⚡ Force RPC Re-Sync
            </button>
          </div>
        </section>
      )}

      {/* Live Lobby Roster */}
      <section style={{ backgroundColor: '#02060d', border: '1px dashed #00ffcc', padding: '20px', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0, color: '#fff' }}>👥 Live Room Roster ({lobbyPlayers.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lobbyPlayers.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09111e', padding: '12px', border: '1px solid #112233', borderRadius: '4px' }}>
              <div>
                <strong style={{ color: '#fff' }}>{p.player_name}</strong> <span style={{ color: '#88aaff' }}>({p.hero_class})</span>
                <div style={{ fontSize: '12px', color: '#888' }}>Target: {p.target_gold.toLocaleString()} GP</div>
              </div>
              <div>
                <span style={{ color: p.connection_status === 'ONLINE' ? '#00ff00' : '#ff3366', fontWeight: 'bold' }}>
                  [{p.connection_status}]
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}