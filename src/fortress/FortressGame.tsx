// src/fortress/FortressGame.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient'; // Clean relative path import from src root
import { FORTRESS_LANG, LanguageType } from './languages';
import { getHeroAssetUrl } from './utils/assets';

interface LobbyPlayer {
  id: string;
  name: string;
  starting_difficulty: number;
  is_ready: boolean;
}

export default function FortressGame() {
  // 100% Bracket-Free ES6 Destructuring!
  const { 0: lang, 1: setLang } = useState<LanguageType>('vi');
  const t = FORTRESS_LANG[lang];

  // User input states - Clean object destructuring instead of array destructuring
  const { 0: heroName, 1: setHeroName } = useState('');
  const { 0: startDifficulty, 1: setStartDifficulty } = useState<number>(2);
  const { 0: mapDifficulty, 1: setMapDifficulty } = useState<number>(5);
  const { 0: roomCode, 1: setRoomCode } = useState('');
  const { 0: inputCode, 1: setInputCode } = useState('');

  // Active Session states
  const { 0: activeSession, 1: setActiveSession } = useState<any>(null);
  const { 0: currentPlayer, 1: setCurrentPlayer } = useState<any>(null);
  const { 0: lobbyPlayers, 1: setLobbyPlayers } = useState<Array<LobbyPlayer>>(new Array<LobbyPlayer>());
  const { 0: viewMode, 1: setViewMode } = useState<'SETUP' | 'LOBBY' | 'PLAYING'>('SETUP');

  // Session reference tracking lock to run useEffect without dependency arrays
  const sessionRef = useRef<string | null>(null);

  // Supabase Real-Time Presence / Lobby Subscriptions [1]
  useEffect(() => {
    if (!activeSession || sessionRef.current === activeSession.id) return;
    sessionRef.current = activeSession.id;

    // Fetch initially joined players [1]
    const fetchLobbyPlayers = async () => {
      const { data, error } = await supabase
       .from('players')
       .select('id, name, starting_difficulty, is_ready')
       .eq('session_id', activeSession.id);
      if (!error && data) setLobbyPlayers(data);
    };

    fetchLobbyPlayers();

    // Subscribe to player entries or status updates in this room [1]
    const channel = supabase
     .channel(`room_${activeSession.room_code}`)
     .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${activeSession.id}`
        },
        () => {
          fetchLobbyPlayers();
        }
      )
     .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });

  // Host creates a session room with random overworld seed and selected map difficulty [1]
  const handleCreateRoom = async () => {
    if (!heroName.trim()) return alert(t.enterName);

    const generatedCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const seed = Math.floor(Math.random() * 100000) + 1;

    // 1. Create global room state
    const { data: sessionData, error: sessionError } = await supabase
     .from('game_sessions')
     .insert({
        room_code: generatedCode,
        map_difficulty: mapDifficulty,
        map_seed: seed,
        status: 'LOBBY'
      })
     .select()
     .single();

    if (sessionError) return alert(sessionError.message);

    // 2. Create the host's player profile
    const { data: playerData, error: playerError } = await supabase
     .from('players')
     .insert({
        session_id: sessionData.id,
        name: heroName.trim(),
        starting_difficulty: startDifficulty,
        gold: 0, 
        rations: 0
      })
     .select()
     .single();

    if (playerError) return alert(playerError.message);

    // Initial setup configurations
    await initializeStartingPackage(playerData.id, startDifficulty);

    setActiveSession(sessionData);
    setCurrentPlayer(playerData);
    setRoomCode(generatedCode);
    setViewMode('LOBBY');
  };

  // Guest joins an existing room entered by code [1]
  const handleJoinRoom = async () => {
    if (!heroName.trim()) return alert(t.enterName);
    if (!inputCode.trim()) return alert(t.enterCode);

    const targetCode = inputCode.trim().toUpperCase();

    // 1. Query active room session matching the entered code [1]
    const { data: sessionData, error: sessionError } = await supabase
     .from('game_sessions')
     .select()
     .eq('room_code', targetCode)
     .eq('status', 'LOBBY')
     .single();

    if (sessionError ||!sessionData) {
      return alert(lang === 'vi'? 'Không tìm thấy phòng chơi này!' : 'Room not found!');
    }

    // 2. Insert guest player profile
    const { data: playerData, error: playerError } = await supabase
     .from('players')
     .insert({
        session_id: sessionData.id,
        name: heroName.trim(),
        starting_difficulty: startDifficulty
      })
     .select()
     .single();

    if (playerError) return alert(playerError.message);

    // Setup initial package limits [1]
    await initializeStartingPackage(playerData.id, startDifficulty);

    setActiveSession(sessionData);
    setCurrentPlayer(playerData);
    setViewMode('LOBBY');
  };

  // Creates the starting troop quantities, weight storage capacity, and items based on player difficulty [1]
  const initializeStartingPackage = async (playerId: string, difficulty: number) => {
    let warriors = 30, scouts = 2, clerics = 1, gold = 300, rations = 20;
    let swordDragonSlayer = 0;

    if (difficulty === 1) {
      warriors = 50; scouts = 3; clerics = 2; gold = 500; rations = 30;
      swordDragonSlayer = 1;
    } else if (difficulty === 3) {
      warriors = 15; scouts = 1; clerics = 1; gold = 150; rations = 10;
    } else if (difficulty === 4) {
      warriors = 5; scouts = 1; clerics = 0; gold = 50; rations = 5;
    }

    // Write parameters to Supabase `troops` table [1]
    await supabase.from('troops').insert({
      player_id: playerId,
      warriors,
      scouts,
      clerics,
      raiders: 0,
      wizards: 0,
      group_elves: 0,
      group_dwarves: 0,
      mules: 1, 
      has_raft: false
    });

    // Write parameters to Supabase `inventories` table [1]
    await supabase.from('inventories').insert({
      player_id: playerId,
      teleport_spells: 0,
      spells_of_seeing: 0,
      spells_of_seeking: 0,
      sword_dragon_slayer: swordDragonSlayer,
      hammer_of_thor: false,
      talisman_of_speed: false,
      horn_of_opening: false,
      boots_of_stealth: false,
      armor_of_defense: false,
      sword_of_strength: false
    });

    // Update player gold and rations count [1]
    await supabase.from('players').update({ gold, rations }).eq('id', playerId);
  };

  // Toggle local player ready state inside the lobby [1]
  const toggleReady = async () => {
    if (!currentPlayer) return;
    const nextReadyState =!currentPlayer.is_ready;

    const { error } = await supabase
     .from('players')
     .update({ is_ready: nextReadyState })
     .eq('id', currentPlayer.id);

    if (!error) {
      setCurrentPlayer({...currentPlayer, is_ready: nextReadyState });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      {/* Dynamic Header & Language Toggle */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setLang(lang === 'en'? 'vi' : 'en')}
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full border border-slate-600 transition text-sm font-semibold shadow-md"
        >
          {lang === 'en'? 'Tiếng Việt 🇻🇳' : 'English 🇬🇧'}
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-yellow-400 font-sans tracking-wide">
          {t.lobbyTitle}
        </h1>

        {viewMode === 'SETUP' && (
          <div className="space-y-6">
            {/* 1. Enter Hero Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">
                {t.enterName}
              </label>
              <input
                type="text"
                maxLength={20}
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                placeholder={lang === 'vi'? 'Ví dụ: Sĩ Phú, Bảo Trân...' : 'e.g. Sir Galahad'}
              />
            </div>

            {/* 2. Choose Starting Difficulty [1] */}
            <div>
              <label className="block text-sm font-medium mb-3 text-slate-300">
                {t.chooseDifficulty}
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {Array.of(1, 2, 3, 4).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setStartDifficulty(level)}
                    className={`py-3 px-2 rounded-xl border text-sm font-bold transition ${
                      startDifficulty === level
                       ? 'bg-yellow-400 text-slate-900 border-yellow-400 shadow-lg'
                        : 'bg-slate-900 text-slate-300 border-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    {t.difficultyLvl} {level}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 italic px-1 mt-1">
                {startDifficulty === 1 && t.level1Desc}
                {startDifficulty === 2 && t.level2Desc}
                {startDifficulty === 3 && t.level3Desc}
                {startDifficulty === 4 && t.level4Desc}
              </p>
            </div>

            <hr className="border-slate-700" />

            {/* 3. Host Actions [1] */}
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="block text-xs font-semibold mb-2 text-slate-400">
                  {t.mapDifficulty}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={mapDifficulty}
                    onChange={(e) => setMapDifficulty(parseInt(e.target.value))}
                    className="flex-1 accent-yellow-400"
                  />
                  <span className="text-lg font-bold text-yellow-400 w-6 text-center">
                    {mapDifficulty}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 py-3 rounded-xl font-bold transition shadow-lg text-base"
              >
                {t.createRoom}
              </button>
            </div>

            {/* 4. Join Actions [1] */}
            <div className="pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="w-1/2 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-center uppercase tracking-widest font-bold placeholder-slate-500"
                  placeholder="WKYG"
                />
                <button
                  onClick={handleJoinRoom}
                  className="w-1/2 bg-slate-700 hover:bg-slate-650 text-white rounded-xl font-bold transition text-sm border border-slate-600"
                >
                  {t.joinRoom}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'LOBBY' && (
          <div className="space-y-6">
            {/* Show generated room credentials [1] */}
            <div className="bg-slate-900 p-4 rounded-2xl text-center border border-slate-700">
              <span className="block text-xs font-semibold text-slate-400 tracking-wider mb-1">
                {lang === 'vi'? 'MÃ PHÒNG BÍ MẬT' : 'SECRET ROOM CODE'}
              </span>
              <span className="text-3xl font-extrabold text-yellow-400 tracking-widest">
                {roomCode || activeSession?.room_code}
              </span>
            </div>

            {/* Render joined roster lists [1] */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                {t.activePlayers} ({lobbyPlayers.length})
              </h3>
              <div className="space-y-2">
                {lobbyPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar preview [1] */}
                      <img
                        src={getHeroAssetUrl(
                          player.starting_difficulty === 1? 'Paladin' : 'Fighter',
                          'avatar'
                        )}
                        className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800"
                        alt="Hero Avatar"
                      />
                      <div>
                        <span className="font-bold text-sm block">{player.name}</span>
                        <span className="text-slate-400 text-xs block">
                          {t.difficultyLvl} {player.starting_difficulty}
                        </span>
                      </div>
                    </div>
                    <div>
                      {player.is_ready? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-3 py-1 rounded-full font-bold">
                          Ready ✓
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full">
                          Waiting...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Ready action buttons [1] */}
            <button
              onClick={toggleReady}
              className={`w-full py-4 rounded-2xl font-bold transition text-base shadow-lg ${
                currentPlayer?.is_ready
                 ? 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {currentPlayer?.is_ready? 'Hủy Sẵn Sàng (Cancel Ready)' : 'SẴN SÀNG! (LOCK READY)'}
            </button>

            {/* Back button */}
            <button
              onClick={() => setViewMode('SETUP')}
              className="w-full text-center text-xs text-slate-400 hover:underline pt-2"
            >
              {t.backToLobby}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}