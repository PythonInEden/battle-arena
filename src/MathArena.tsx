import { useState, useEffect, useRef } from 'react';

interface Question {
  text: string;
  answer: number;
}

interface ScoreRecord {
  username: string;
  score: number;
  attempts: number;
  max_monster?: number;
}

interface MonsterData {
  id: number;
  name: string;
  imageKey: string;
  tier: 'TRASH' | 'ELITE' | 'BOSS' | 'LEGENDARY';
  maxHp: number;
  damagePerHit: number;
}

const MONSTER_ROSTER: MonsterData[] = [
  // 🟢 TIER 1: TRASH MOBS (Table 2 & Table 3)
  { id: 1, name: "Kobold", imageKey: "kobold", tier: "TRASH", maxHp: 40, damagePerHit: 2 },
  { id: 2, name: "Goblin", imageKey: "goblin", tier: "TRASH", maxHp: 50, damagePerHit: 2 },
  { id: 3, name: "Zombie", imageKey: "zombie", tier: "TRASH", maxHp: 50, damagePerHit: 2 },
  { id: 4, name: "Skeleton Warrior", imageKey: "skeleton_warrior", tier: "TRASH", maxHp: 60, damagePerHit: 2 },
  { id: 5, name: "Gelatinous Cube", imageKey: "gelatinous_cube", tier: "TRASH", maxHp: 60, damagePerHit: 2 },

  // 🟡 TIER 2: ELITES (Table 4, Table 5 & Table 6)
  { id: 6, name: "Orc Berserker", imageKey: "orc_berserker", tier: "ELITE", maxHp: 80, damagePerHit: 4 },
  { id: 7, name: "Bugbear", imageKey: "bugbear", tier: "ELITE", maxHp: 85, damagePerHit: 4 },
  { id: 8, name: "Gargoyle", imageKey: "gargoyle", tier: "ELITE", maxHp: 90, damagePerHit: 4 },
  { id: 9, name: "Mimic Chest", imageKey: "mimic_chest", tier: "ELITE", maxHp: 95, damagePerHit: 4 },
  { id: 10, name: "Owlbear", imageKey: "owlbear", tier: "ELITE", maxHp: 100, damagePerHit: 4 },

  // 🟠 TIER 3: MINI-BOSSES (Table 7 & Table 8)
  { id: 11, name: "Displacer Beast", imageKey: "displacer_beast", tier: "BOSS", maxHp: 120, damagePerHit: 5 },
  { id: 12, name: "Cave Troll", imageKey: "cave_troll", tier: "BOSS", maxHp: 125, damagePerHit: 5 },
  { id: 13, name: "Chimera", imageKey: "chimera", tier: "BOSS", maxHp: 130, damagePerHit: 5 },
  { id: 14, name: "Mind Flayer", imageKey: "mind_flayer", tier: "BOSS", maxHp: 135, damagePerHit: 5 },
  { id: 15, name: "Iron Golem", imageKey: "iron_golem", tier: "BOSS", maxHp: 140, damagePerHit: 5 },

  // 🔴 TIER 4: LEGENDARY BOSSES (Table 9)
  { id: 16, name: "Frost Giant", imageKey: "frost_giant", tier: "LEGENDARY", maxHp: 200, damagePerHit: 10 },
  { id: 17, name: "Shadow Lich", imageKey: "shadow_lich", tier: "LEGENDARY", maxHp: 210, damagePerHit: 10 },
  { id: 18, name: "Beholder", imageKey: "beholder", tier: "LEGENDARY", maxHp: 220, damagePerHit: 10 },
  { id: 19, name: "Ancient Red Dragon", imageKey: "ancient_red_dragon", tier: "LEGENDARY", maxHp: 230, damagePerHit: 10 },
  { id: 20, name: "The Tarrasque", imageKey: "the_tarrasque", tier: "LEGENDARY", maxHp: 250, damagePerHit: 10 },
];

const MATH_LANG = {
  en: {
    title: "⚔️ MATH BATTLE ARENA ⚔️",
    sub: "Master math tables & slay monsters!",
    loginTitle: "[ IDENTIFY PLAYER ]",
    loginLabel: "Enter Player Name:",
    loginBtn: "INITIALIZE ARENA",
    time: "⏳ Time:",
    score: "🏆 Score:",
    lives: "❤️ Lives:",
    modeTrain: "🎓 TRAINING MODE (Select Table)",
    modeChallenge: "⚡ CHALLENGE ARENA (Mixed 2-9)",
    selectMode: "SELECT GAME MODE:",
    selectTableLabel: "🎯 TARGET TIMES TABLE TO PRACTICE:",
    optTable: "Table",
    badgeTrain: "🎓 TRAINING MODE",
    badgeChallenge: "⚡ CHALLENGE ARENA",
    tableFocus: "FOCUS: TABLE",
    hitsLeft: "questions to slay!",
    combo: "🔥 BEYOND GODLIKE COMBO! 🔥",
    timesUp: "⌛ TIME'S UP!",
    killedMsg: "💀 YOU WERE KILLED BY THE MONSTER!",
    wrongWarn: "❌ WRONG ANSWER! (-1 LIFE)",
    points: "points!",
    btnStart: "ENTER THE ARENA",
    btnAgain: "PLAY AGAIN",
    victoryTitle: "🎉 MONSTER SLAIN! 🎉",
    victorySub: "You crushed",
    btnNextStage: "NEXT MONSTER ⚔️",
    ladderTitle: "📊 DAILY LADDER SCOREBOARD 📊",
    colRank: "RANK",
    colName: "PLAYER",
    colMonster: "MAX LEVEL",
    colScore: "SCORE",
    colTries: "TRIES"
  },
  vi: {
    title: "⚔️ ĐẤU TRƯỜNG TOÁN HỌC ⚔️",
    sub: "Luyện thuộc bảng nhân chia & diệt quái!",
    loginTitle: "[ XÁC MINH DANH TÍNH ]",
    loginLabel: "Nhập Tên Của Chiến Binh:",
    loginBtn: "KÍCH HOẠT ĐẤU TRƯỜNG",
    time: "⏳ Thời gian:",
    score: "🏆 Điểm số:",
    lives: "❤️ Máu:",
    modeTrain: "🎓 CHẾ ĐỘ LUYỆN TẬP (Chọn Bảng)",
    modeChallenge: "⚡ ĐẤU TRƯỜNG THỬ THÁCH (Tổng Hợp)",
    selectMode: "CHỌN CHẾ ĐỘ CHƠI:",
    selectTableLabel: "🎯 CHỌN BẢNG CẦN TẬP TRUNG LUYỆN:",
    optTable: "Bảng",
    badgeTrain: "🎓 CHẾ ĐỘ LUYỆN TẬP",
    badgeChallenge: "⚡ ĐẤU TRƯỜNG THỬ THÁCH",
    tableFocus: "ĐANG TẬP BẢNG",
    hitsLeft: "câu đúng để diệt!",
    combo: "🔥 LIÊN HOÀN BẠO KÍCH! 🔥",
    timesUp: "⌛ HẾT GIỜ!",
    killedMsg: "💀 BẠN ĐÃ BỊ QUÁI VẬT BẮT BÀI & HẠ GỤC!",
    wrongWarn: "❌ SAI RỒI! (-1 MÁU)",
    points: "điểm!",
    btnStart: "BẮT ĐẦU CHIẾN",
    btnAgain: "TIẾP TỤC TẤN CÔNG",
    victoryTitle: "🎉 ĐÃ DIỆT ĐƯỢC QUÁI VẬT! 🎉",
    victorySub: "Chiến binh đã hạ gục thành công",
    btnNextStage: "SĂN QUÁI TIẾP THEO ⚔️",
    ladderTitle: "📊 BẢNG XẾP HẠNG HÔM NAY 📊",
    colRank: "HẠNG",
    colName: "CHIẾN BINH",
    colMonster: "CẤP QUÁI",
    colScore: "ĐIỂM CAO",
    colTries: "SỐ LƯỢT"
  }
};

// Generates targeted questions based on mode and chosen table
const generateQuestion = (mode: 'TRAIN' | 'CHALLENGE', targetTable: number): Question => {
  let table = 2;
  if (mode === 'TRAIN') {
    table = targetTable; // Lock 100% of questions to the kid's chosen practice table!
  } else {
    table = Math.floor(Math.random() * 8) + 2; // Random 2 to 9
  }

  const multiplier = Math.floor(Math.random() * 10) + 1; // 1 to 10
  const isDivision = Math.random() > 0.5;

  if (isDivision) {
    const product = table * multiplier;
    return { text: `${product} ÷ ${table}`, answer: multiplier };
  } else {
    const swap = Math.random() > 0.5;
    return swap 
      ? { text: `${multiplier} × ${table}`, answer: table * multiplier }
      : { text: `${table} × ${multiplier}`, answer: table * multiplier };
  }
};

// Maps chosen Times Table (2-9) to initial starting Monster index
const getInitialMonsterIndexForTable = (table: number): number => {
  switch (table) {
    case 2: return 0;  // Kobold
    case 3: return 2;  // Zombie
    case 4: return 4;  // Gelatinous Cube
    case 5: return 6;  // Orc Berserker
    case 6: return 8;  // Mimic Chest
    case 7: return 10; // Displacer Beast
    case 8: return 12; // Chimera
    case 9: return 15; // Frost Giant
    default: return 0;
  }
};

export default function MathArena({ locale, supabase }: { locale: 'en' | 'vi'; supabase: any }) {
  const [username, setUsername] = useState(() => localStorage.getItem('math_brother_name') || '');
  const [typedName, setTypedName] = useState('');
  const [gameMode, setGameMode] = useState<'TRAIN' | 'CHALLENGE'>('TRAIN');
  const [selectedTable, setSelectedTable] = useState<number>(2); // Default to Table 2
  
  const [gameState, setGameState] = useState<'START' | 'BATTLE' | 'VICTORY' | 'GAMEOVER'>('START');
  const [deathReason, setDeathReason] = useState<'TIMEOUT' | 'KILLED' | null>(null);
  
  const [question, setQuestion] = useState<Question>({ text: '', answer: 0 });
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [flashError, setFlashError] = useState(false);
  
  const [currentMonsterIdx, setCurrentMonsterIdx] = useState(0);
  const [highestMonsterReached, setHighestMonsterReached] = useState(1);
  const [monsterHp, setMonsterHp] = useState(MONSTER_ROSTER[0].maxHp);
  const [timeLeft, setTimeLeft] = useState(60);
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const t = MATH_LANG[locale];
  const todayStr = new Date().toISOString().split('T')[0];

  const themeColor = gameMode === 'TRAIN' ? '#00f0ff' : '#ffaa00'; 

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    document.title = locale === 'en' ? "⚔️ MATH BATTLE ARENA ⚔️" : "⚔️ ĐẤU TRƯỜNG TOÁN HỌC ⚔️";
  }, [locale]);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('math_scores')
      .select('username, score, attempts, max_monster')
      .eq('score_date', todayStr)
      .order('score', { ascending: false });
    if (data) setLeaderboard(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = typedName.trim().toUpperCase();
    if (!clean) return;
    setUsername(clean);
    localStorage.setItem('math_brother_name', clean);
  };

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setLives(3);
    setDeathReason(null);
    
    // Jump directly to appropriate monster level based on mode & chosen table!
    const startIdx = gameMode === 'TRAIN' ? getInitialMonsterIndexForTable(selectedTable) : 0;
    
    setCurrentMonsterIdx(startIdx);
    setHighestMonsterReached(startIdx + 1);
    setMonsterHp(MONSTER_ROSTER[startIdx].maxHp);
    setTimeLeft(60);
    setQuestion(generateQuestion(gameMode, selectedTable));
    setGameState('BATTLE');
    setUserInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const startNextStage = () => {
    const nextIdx = (currentMonsterIdx + 1) % MONSTER_ROSTER.length;
    setCurrentMonsterIdx(nextIdx);
    
    const newHighest = Math.max(highestMonsterReached, nextIdx + 1);
    setHighestMonsterReached(newHighest);

    setMonsterHp(MONSTER_ROSTER[nextIdx].maxHp);
    setQuestion(generateQuestion(gameMode, selectedTable));
    setGameState('BATTLE');
    setUserInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (gameState !== 'BATTLE') return;
    if (timeLeft <= 0) {
      handleGameOver('TIMEOUT');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    const targetAnsStr = question.answer.toString();
    const activeMonster = MONSTER_ROSTER[currentMonsterIdx];

    if (parseInt(value) === question.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore(score + 10 + (newStreak > 3 ? 5 : 0));
      
      const newHp = monsterHp - activeMonster.damagePerHit;
      if (newHp <= 0) {
        setMonsterHp(0);
        setGameState('VICTORY');
        return;
      }

      setMonsterHp(newHp);
      setQuestion(generateQuestion(gameMode, selectedTable));
      setUserInput('');
      return;
    }

    if (value.length >= targetAnsStr.length && parseInt(value) !== question.answer) {
      const remainingLives = lives - 1;
      setLives(remainingLives);
      setStreak(0);
      setFlashError(true);
      setTimeout(() => setFlashError(false), 600);
      setUserInput('');

      if (remainingLives <= 0) {
        handleGameOver('KILLED');
      }
    }
  };

  const handleGameOver = async (reason: 'TIMEOUT' | 'KILLED') => {
    setGameState('GAMEOVER');
    setDeathReason(reason);

    const { data } = await supabase
      .from('math_scores')
      .select('*')
      .eq('username', username)
      .eq('score_date', todayStr);

    const existingRow = data && data.length > 0 ? data[0] : null;
    const currentAttempts = existingRow ? parseInt(existingRow.attempts) : 0;
    const currentHighScore = existingRow ? parseInt(existingRow.score) : 0;
    const currentMaxMonster = existingRow && existingRow.max_monster ? parseInt(existingRow.max_monster) : 1;

    await supabase.from('math_scores').upsert(
      {
        username: username,
        score: Math.max(currentHighScore, score),
        attempts: currentAttempts + 1,
        max_monster: Math.max(currentMaxMonster, highestMonsterReached),
        score_date: todayStr
      },
      { onConflict: 'username,score_date' }
    );

    fetchLeaderboard();
  };

  if (!username) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ border: '2px dashed #0f0', padding: '25px', width: '100%', maxWidth: '400px', backgroundColor: '#000', textAlign: 'center', boxSizing: 'border-box' }}>
          <h2 style={{ color: '#ff0', marginBottom: '20px' }}>{t.loginTitle}</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ color: '#0f0', textAlign: 'left', fontWeight: 'bold' }}>{t.loginLabel}</label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '12px', fontSize: '18px', fontFamily: 'monospace', textTransform: 'uppercase', outline: 'none' }}
              required
            />
            <button type="submit" style={{ background: '#0f0', color: '#000', border: 'none', padding: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', fontFamily: 'monospace' }}>
              {t.loginBtn}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeMonster = MONSTER_ROSTER[currentMonsterIdx];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const monsterImgUrl = `${supabaseUrl}/storage/v1/object/public/hero-images/${activeMonster.imageKey}.webp`;
  const hitsRemaining = Math.ceil(monsterHp / activeMonster.damagePerHit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto', gap: '20px', boxSizing: 'border-box' }}>
      
      {/* Title Layout */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h1 style={{ color: '#0f0', fontSize: 'clamp(20px, 4vw, 32px)', textShadow: '0 0 8px #0f0', marginBottom: '5px' }}>{t.title}</h1>
        <p style={{ color: '#888', margin: '0', fontSize: '13px' }}>{t.sub} | USER: <span style={{color: '#ff0'}}>{username}</span></p>
      </div>

      {/* Main Play Arena Box */}
      <div style={{ 
        border: flashError ? '3px solid #ff0000' : `3px solid ${themeColor}`, 
        padding: '20px', 
        width: '100%', 
        maxWidth: '450px', 
        backgroundColor: '#000', 
        textAlign: 'center', 
        boxSizing: 'border-box', 
        transition: 'border 0.2s',
        boxShadow: `0 0 15px ${flashError ? '#ff0000' : themeColor}44`
      }}>
        
        {/* START SCREEN: Mode & Times Table Selection */}
        {gameState === 'START' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ color: '#ff0', fontWeight: 'bold', fontSize: '15px' }}>{t.selectMode}</div>
            
            {/* Mode 1: Training Mode Button */}
            <button 
              onClick={() => setGameMode('TRAIN')} 
              style={{ 
                background: gameMode === 'TRAIN' ? '#00f0ff' : '#000', 
                color: gameMode === 'TRAIN' ? '#000' : '#00f0ff', 
                border: '2px solid #00f0ff', 
                padding: '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                fontFamily: 'monospace', 
                textAlign: 'left',
                fontSize: '13px'
              }}
            >
              {t.modeTrain}
            </button>

            {/* 🎯 TARGET TABLE DROPDOWN (Visible when Training Mode active) */}
            {gameMode === 'TRAIN' && (
              <div style={{ background: '#021820', border: '1px dashed #00f0ff', padding: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#00f0ff', fontSize: '12px', fontWeight: 'bold' }}>
                  {t.selectTableLabel}
                </label>
                <select 
                  value={selectedTable} 
                  onChange={(e) => setSelectedTable(parseInt(e.target.value))}
                  style={{
                    background: '#000',
                    color: '#00f0ff',
                    border: '2px solid #00f0ff',
                    padding: '10px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9].map((tbl) => (
                    <option key={tbl} value={tbl}>
                      🎯 {t.optTable} {tbl} ({tbl} × 1 → {tbl} × 10 & ÷ {tbl})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode 2: Challenge Mode Button */}
            <button 
              onClick={() => setGameMode('CHALLENGE')} 
              style={{ 
                background: gameMode === 'CHALLENGE' ? '#ffaa00' : '#000', 
                color: gameMode === 'CHALLENGE' ? '#000' : '#ffaa00', 
                border: '2px solid #ffaa00', 
                padding: '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                fontFamily: 'monospace', 
                textAlign: 'left',
                fontSize: '13px'
              }}
            >
              {t.modeChallenge}
            </button>

            <button 
              onClick={startGame} 
              style={{ 
                background: themeColor, 
                color: '#000', 
                border: 'none', 
                padding: '14px 20px', 
                fontWeight: 'bold', 
                fontSize: '16px', 
                cursor: 'pointer', 
                width: '100%', 
                fontFamily: 'monospace', 
                marginTop: '10px' 
              }}
            >
              {t.btnStart}
            </button>
          </div>
        )}

        {/* BATTLE SCREEN */}
        {gameState === 'BATTLE' && (
          <div>
            <div style={{ background: themeColor, color: '#000', fontWeight: 'bold', padding: '6px', marginBottom: '12px', fontSize: '12px', letterSpacing: '1px' }}>
              {gameMode === 'TRAIN' ? `${t.badgeTrain}: ${t.tableFocus} ${selectedTable}` : `${t.badgeChallenge}`}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold', marginBottom: '12px', fontSize: '13px' }}>
              <span style={{ color: '#ff0' }}>{t.time} {timeLeft}s</span>
              <span style={{ color: '#ff3333' }}>
                {t.lives} {'❤️ '.repeat(lives)}{'🖤 '.repeat(3 - lives)}
              </span>
              <span style={{ color: '#0f0' }}>{t.score} {score}</span>
            </div>

            {/* Dynamic Monster Target Card */}
            <div style={{ padding: '12px', background: '#000', border: `1px solid ${themeColor}`, marginBottom: '15px' }}>
              <div style={{ color: '#ff0', fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', textTransform: 'uppercase' }}>
                TARGET #{currentMonsterIdx + 1}: {activeMonster.name} [{activeMonster.tier}]
              </div>
              <img 
                src={monsterImgUrl} 
                alt={activeMonster.name} 
                style={{ width: '130px', height: '130px', objectFit: 'cover', border: `2px solid ${themeColor}`, marginBottom: '8px', backgroundColor: '#111' }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/130x130/000000/00ff00?text=' + activeMonster.name; }}
              />
              <div style={{ background: '#000', height: '12px', border: `1px solid ${themeColor}`, overflow: 'hidden' }}>
                <div style={{ background: themeColor, height: '100%', width: `${(monsterHp / activeMonster.maxHp) * 100}%`, transition: 'width 0.1s' }}></div>
              </div>
              <div style={{ color: '#ff0', fontSize: '12px', marginTop: '6px', fontWeight: 'bold' }}>
                ⚔️ {hitsRemaining} {t.hitsLeft}
              </div>
            </div>

            {flashError && <div style={{ color: '#ff3333', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>{t.wrongWarn}</div>}
            {streak >= 3 && !flashError && <div style={{ color: '#ff0', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>{t.combo}</div>}

            <div style={{ fontSize: 'clamp(2.5rem, 8vw, 3.8rem)', fontWeight: 'bold', color: '#fff', margin: '10px 0' }}>{question.text}</div>

            <input
              ref={inputRef}
              type="number"
              value={userInput}
              onChange={handleInputChange}
              style={{ 
                background: '#000', 
                color: flashError ? '#ff3333' : themeColor, 
                border: `2px solid ${flashError ? '#ff3333' : themeColor}`, 
                fontSize: '2.5rem', 
                width: '120px', 
                textAlign: 'center', 
                outline: 'none', 
                fontFamily: 'monospace' 
              }}
              placeholder="?"
            />
          </div>
        )}

        {/* VICTORY PAUSE SCREEN */}
        {gameState === 'VICTORY' && (
          <div style={{ padding: '5px 0' }}>
            <h2 style={{ color: '#0f0', margin: '0 0 10px 0', fontSize: '20px' }}>{t.victoryTitle}</h2>
            <p style={{ color: '#fff', fontSize: '14px', margin: '0 0 12px 0' }}>
              {t.victorySub} <strong style={{ color: '#ff0' }}>{activeMonster.name}</strong>!
            </p>
            <img 
              src={monsterImgUrl} 
              alt={activeMonster.name} 
              style={{ width: '120px', height: '120px', objectFit: 'cover', border: '2px solid #0f0', marginBottom: '12px', filter: 'grayscale(70%) opacity(0.8)' }}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/120x120/000000/00ff00?text=' + activeMonster.name; }}
            />
            <p style={{ color: '#00f0ff', fontWeight: 'bold', fontSize: '14px', marginBottom: '15px' }}>
              Current Score: {score} pts | Time Left: {timeLeft}s
            </p>
            <button 
              onClick={startNextStage}
              style={{ 
                background: '#0f0', 
                color: '#000', 
                border: 'none', 
                padding: '14px 20px', 
                fontWeight: 'bold', 
                fontSize: '16px', 
                cursor: 'pointer', 
                width: '100%', 
                fontFamily: 'monospace' 
              }}
            >
              {t.btnNextStage}
            </button>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div>
            <h2 style={{ color: '#ff3333', marginTop: 0, fontSize: '18px' }}>
              {deathReason === 'KILLED' ? t.killedMsg : t.timesUp}
            </h2>
            <p style={{ fontSize: '15px', color: '#fff', margin: '10px 0' }}>
              Reached Stage: <strong style={{ color: '#00f0ff' }}>Monster #{highestMonsterReached}</strong>
            </p>
            <p style={{ fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
              Final Score: <strong style={{color:'#ff0'}}>{score}</strong> {t.points}
            </p>
            <button 
              onClick={startGame} 
              style={{ 
                background: themeColor, 
                color: '#000', 
                border: 'none', 
                padding: '14px 20px', 
                fontWeight: 'bold', 
                fontSize: '16px', 
                cursor: 'pointer', 
                width: '100%', 
                fontFamily: 'monospace' 
              }}
            >
              {t.btnAgain}
            </button>
          </div>
        )}
      </div>

      {/* Cyberpunk Daily Ladder Scoreboard Table */}
      <div style={{ width: '100%', maxWidth: '650px', border: '1px solid #0f0', padding: '15px', backgroundColor: '#000', boxSizing: 'border-box' }}>
        <h3 style={{ color: '#ff0', textAlign: 'center', marginTop: 0, borderBottom: '1px solid #0f0', paddingBottom: '8px', fontSize: '15px' }}>{t.ladderTitle}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0f0', borderBottom: '1px dashed #0f0', paddingBottom: '4px', fontSize: '12px' }}>
            <span style={{ width: '10%' }}>{t.colRank}</span>
            <span style={{ width: '35%' }}>{t.colName}</span>
            <span style={{ width: '25%', textAlign: 'center' }}>{t.colMonster}</span>
            <span style={{ width: '15%', textAlign: 'right' }}>{t.colScore}</span>
            <span style={{ width: '15%', textAlign: 'right' }}>{t.colTries}</span>
          </div>
          {leaderboard.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: row.username === username ? '#ff0' : '#fff', fontSize: '13px', padding: '3px 0' }}>
              <span style={{ width: '10%' }}>#{idx + 1}</span>
              <span style={{ width: '35%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.username}</span>
              <span style={{ width: '25%', textAlign: 'center', color: '#00f0ff' }}>
                #{row.max_monster || 1} {MONSTER_ROSTER[(row.max_monster || 1) - 1]?.name || 'Kobold'}
              </span>
              <span style={{ width: '15%', textAlign: 'right', fontWeight: 'bold' }}>{row.score}</span>
              <span style={{ width: '15%', textAlign: 'right', color: '#888' }}>{row.attempts}</span>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}