import { useState } from 'react';
import { supabase, supabaseUrl } from '../supabaseClient';
import { useDungeonSession } from './useDungeonSession';
import { DungeonMap } from './DungeonMap';

const getHeroAvatarUrl = (heroClass: string, gender: 'male' | 'female' = 'male') => {
  const cleanClass = heroClass.toLowerCase().trim();
  const filename = gender === 'female' ? `female_${cleanClass}_avatar.webp` : `${cleanClass}_avatar.webp`;
  return `${supabaseUrl}/storage/v1/object/public/hero-images/${filename}`;
};

export function DungeonArena() {
  const [roomCodeInput, setRoomCodeInput] = useState<string>('TEST');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('TEST');
  const [playerNameInput, setPlayerNameInput] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('Rogue');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');

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

    await supabase
      .from('dungeon_sessions')
      .upsert({ room_code: code, host_id: playerNameInput });

    const targetGold = CLASS_CONFIG[selectedClass].targetGold;
    await supabase.from('dungeon_players').upsert({
      room_code: code,
      player_name: playerNameInput,
      hero_class: selectedClass,
      hero_gender: selectedGender,
      target_gold: targetGold,
      client_session_id: clientSessionId,
      connection_status: 'ONLINE',
      pos_x: 10,
      pos_y: 10
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
        <section style={{ backgroundColor: '#0a1424', border: '1px solid #00ffcc', padding: '24px', borderRadius: '8px', maxWidth: '780px', margin: '0 auto 30px auto' }}>
          <h2 style={{ marginTop: 0, color: '#fff', textAlign: 'center', marginBottom: '20px' }}>⚔️ Select Character & Avatar</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '24px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Player Name:</label>
                <input 
                  type="text" 
                  value={playerNameInput} 
                  onChange={(e) => setPlayerNameInput(e.target.value)}
                  placeholder="Enter display name..."
                  style={{ width: '100%', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>4-Letter Room Code:</label>
                <input 
                  type="text" 
                  maxLength={4}
                  value={roomCodeInput} 
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  style={{ width: '100%', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '4px', textAlign: 'center', fontSize: '18px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Choose Hero Class:</label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#000', color: '#00ffcc', border: '1px solid #00ffcc', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                >
                  {Object.keys(CLASS_CONFIG).map(cls => (
                    <option key={cls} value={cls}>
                      {cls} — [{CLASS_CONFIG[cls].category}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>Select Avatar Gender:</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedGender('male')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: selectedGender === 'male' ? '#00ffcc' : '#000',
                      color: selectedGender === 'male' ? '#000' : '#00ffcc',
                      border: '1px solid #00ffcc',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}
                  >
                    ♂️ Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGender('female')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: selectedGender === 'female' ? '#00ffcc' : '#000',
                      color: selectedGender === 'female' ? '#000' : '#00ffcc',
                      border: '1px solid #00ffcc',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: 'monospace'
                    }}
                  >
                    ♀️ Female
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', border: '1px dashed #00ffcc', padding: '15px', backgroundColor: '#030811', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: '#88aaff', display: 'block', marginBottom: '10px', letterSpacing: '1px' }}>AVATAR PREVIEW</span>
              <img 
                src={getHeroAvatarUrl(selectedClass, selectedGender)} 
                alt={`${selectedGender} ${selectedClass}`}
                style={{ width: '210px', height: '210px', objectFit: 'cover', border: '2px solid #00ffcc', backgroundColor: '#000', borderRadius: '6px' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/210x210/000000/00ffcc?text=${selectedGender}+${selectedClass}`;
                }}
              />
              <div style={{ marginTop: '10px', fontWeight: 'bold', color: '#fff', fontSize: '16px' }}>{selectedClass}</div>
              <div style={{ fontSize: '12px', color: '#ffcc00', marginTop: '2px' }}>Goal: {CLASS_CONFIG[selectedClass]?.targetGold.toLocaleString()} GP</div>
            </div>
          </div>

          <button 
            onClick={handleJoinOrCreateRoom}
            style={{ width: '100%', backgroundColor: '#00ffcc', color: '#000', fontWeight: 'bold', border: 'none', padding: '14px', fontSize: '16px', cursor: 'pointer', fontFamily: 'monospace', borderRadius: '4px', marginTop: '24px' }}
          >
            🚀 ENTER DUNGEON LOBBY
          </button>
        </section>
      )}

      {/* Active Game Board & Map View */}
      {player && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
          <div>
            <DungeonMap player={player} allPlayers={lobbyPlayers} roomCode={activeRoomCode} />
          </div>

          {/* Right Sidebar: Active Stats & Roster */}
          <div>
            <section style={{ backgroundColor: '#0a1424', border: '1px solid #00ffcc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>👑 Hero Status</h3>
              <p style={{ margin: '5px 0', fontSize: '13px' }}>Player: <strong>{player.player_name}</strong></p>
              <p style={{ margin: '5px 0', fontSize: '13px' }}>Class: <strong>{player.hero_class}</strong></p>
              <p style={{ margin: '5px 0', fontSize: '13px' }}>Goal: <strong style={{ color: '#ffcc00' }}>{player.target_gold.toLocaleString()} GP</strong></p>
              <p style={{ margin: '5px 0', fontSize: '13px' }}>Current Loot: <strong style={{ color: '#00ffcc' }}>{player.current_gold || 0} GP</strong></p>
            </section>

            <section style={{ backgroundColor: '#02060d', border: '1px dashed #00ffcc', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, color: '#fff' }}>👥 Roster ({lobbyPlayers.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lobbyPlayers.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#09111e', padding: '8px', border: '1px solid #112233', borderRadius: '4px', fontSize: '12px' }}>
                    <span>{p.player_name} ({p.hero_class})</span>
                    <span style={{ color: p.connection_status === 'ONLINE' ? '#00ff00' : '#ff3366' }}>[{p.connection_status}]</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

    </div>
  );
}