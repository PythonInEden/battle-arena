import { useState, useEffect, useRef } from 'react';

interface Question {
  text: string;
  answer: number;
}

interface ScoreRecord {
  username: string;
  score: number;
  attempts: number;
}

interface MonsterData {
  id: number;
  name: string;
  imageKey: string; // Follows the lowercase + underscore rule
  tier: 'TRASH' | 'ELITE' | 'BOSS' | 'LEGENDARY';
  maxHp: number;
}

const MONSTER_ROSTER: MonsterData[] = [
  // 🟢 TIER 1: TRASH MOBS (Score 0 - 30)
  { id: 1, name: "Kobold", imageKey: "kobold", tier: "TRASH", maxHp: 30 },
  { id: 2, name: "Goblin", imageKey: "goblin", tier: "TRASH", maxHp: 40 },
  { id: 3, name: "Zombie", imageKey: "zombie", tier: "TRASH", maxHp: 50 },
  { id: 4, name: "Skeleton Warrior", imageKey: "skeleton_warrior", tier: "TRASH", maxHp: 60 },
  { id: 5, name: "Gelatinous Cube", imageKey: "gelatinous_cube", tier: "TRASH", maxHp: 70 },

  // 🟡 TIER 2: ELITES (Score 30 - 70)
  { id: 6, name: "Orc Berserker", imageKey: "orc_berserker", tier: "ELITE", maxHp: 80 },
  { id: 7, name: "Bugbear", imageKey: "bugbear", tier: "ELITE", maxHp: 90 },
  { id: 8, name: "Gargoyle", imageKey: "gargoyle", tier: "ELITE", maxHp: 100 },
  { id: 9, name: "Mimic Chest", imageKey: "mimic_chest", tier: "ELITE", maxHp: 110 },
  { id: 10, name: "Owlbear", imageKey: "owlbear", tier: "ELITE", maxHp: 120 },

  // 🟠 TIER 3: MINI-BOSSES (Score 70 - 120)
  { id: 11, name: "Displacer Beast", imageKey: "displacer_beast", tier: "BOSS", maxHp: 140 },
  { id: 12, name: "Cave Troll", imageKey: "cave_troll", tier: "BOSS", maxHp: 160 },
  { id: 13, name: "Chimera", imageKey: "chimera", tier: "BOSS", maxHp: 180 },
  { id: 14, name: "Mind Flayer", imageKey: "mind_flayer", tier: "BOSS", maxHp: 200 },
  { id: 15, name: "Iron Golem", imageKey: "iron_golem", tier: "BOSS", maxHp: 220 },

  // 🔴 TIER 4: LEGENDARY BOSSES (Score 120+)
  { id: 16, name: "Frost Giant", imageKey: "frost_giant", tier: "LEGENDARY", maxHp: 250 },
  { id: 17, name: "Shadow Lich", imageKey: "shadow_lich", tier: "LEGENDARY", maxHp: 300 },
  { id: 18, name: "Beholder", imageKey: "beholder", tier: "LEGENDARY", maxHp: 350 },
  { id: 19, name: "Ancient Red Dragon", imageKey: "ancient_red_dragon", tier: "LEGENDARY", maxHp: 400 },
  { id: 20, name: "The Tarrasque", imageKey: "the_tarrasque", tier: "LEGENDARY", maxHp: 500 },
];

const MATH_LANG = {
  en: {
    title: "⚔️ MATH BATTLE ARENA ⚔️",
    sub: "Defeat monsters in 60 seconds!",
    loginTitle: "[ IDENTIFY PLAYER ]",
    loginLabel: "Enter Player Name:",
    loginBtn: "INITIALIZE ARENA",
    time: "⏳ Time:",
    score: "🏆 Score:",
    combo: "🔥 BEYOND GODLIKE COMBO! 🔥",
    timesUp: "⌛ TIME'S UP!",
    points: "points!",
    btnStart: "ENTER THE ARENA",
    btnAgain: "LAUNCH NEXT ATTACK",
    ladderTitle: "📊 DAILY LADDER SCOREBOARD 📊",
    colRank: "RANK",
    colName: "PLAYER",
    colScore: "MAX SCORE",
    colTries: "TRIES"
  },
  vi: {
    title: "⚔️ ĐẤU TRƯỜNG TOÁN HỌC ⚔️",
    sub: "Hạ gục quái vật trong 60 giây!",
    loginTitle: "[ XÁC MINH DANH TÍNH ]",
    loginLabel: "Nhập Tên Của Chiến Binh:",
    loginBtn: "KÍCH HOẠT ĐẤU TRƯỜNG",
    time: "⏳ Thời gian:",
    score: "🏆 Điểm số:",
    combo: "🔥 LIÊN HOÀN BẠO KÍCH! 🔥",
    timesUp: "⌛ HẾT GIỜ!",
    points: "điểm!",
    btnStart: "BẮT ĐẦU CHIẾN",
    btnAgain: "TIẾP TỤC TẤN CÔNG",
    ladderTitle: "📊 BẢNG XẾP HẠNG HÔM NAY 📊",
    colRank: "HẠNG",
    colName: "CHIẾN BINH",
    colScore: "ĐIỂM CAO",
    colTries: "SỐ LƯỢT"
  }
};

const generateQuestion = (): Question => {
  const num1 = Math.floor(Math.random() * 8) + 2; 
  const num2 = Math.floor(Math.random() * 8) + 2; 
  return Math.random() > 0.5 
    ? { text: `${num1 * num2} ÷ ${num1}`, answer: num2 }
    : { text: `${num1} × ${num2}`, answer: num1 * num2 };
};

export default function MathArena({ locale, supabase }: { locale: 'en' | 'vi'; supabase: any }) {
  const [username, setUsername] = useState(() => localStorage.getItem('math_brother_name') || '');
  const [typedName, setTypedName] = useState('');
  const [gameState, setGameState] = useState<'START' | 'BATTLE' | 'GAMEOVER'>('START');
  const [question, setQuestion] = useState<Question>({ text: '', answer: 0 });
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentMonsterIdx, setCurrentMonsterIdx] = useState(0);
  const [monsterHp, setMonsterHp] = useState(MONSTER_ROSTER[0].maxHp);
  const [timeLeft, setTimeLeft] = useState(60);
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const t = MATH_LANG[locale];
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('math_scores')
      .select('username, score, attempts')
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
    setCurrentMonsterIdx(0);
    setMonsterHp(MONSTER_ROSTER[0].maxHp);
    setTimeLeft(60);
    setQuestion(generateQuestion());
    setGameState('BATTLE');
    setUserInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (gameState !== 'BATTLE') return;
    if (timeLeft <= 0) {
      handleGameOver();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);

    if (parseInt(value) === question.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore(score + 10 + (newStreak > 3 ? 5 : 0));
      
      setMonsterHp((prev) => {
        const nextHp = prev - 20;
        if (nextHp <= 0) {
          const nextIdx = (currentMonsterIdx + 1) % MONSTER_ROSTER.length;
          setCurrentMonsterIdx(nextIdx);
          return MONSTER_ROSTER[nextIdx].maxHp;
        }
        return nextHp;
      });

      setQuestion(generateQuestion());
      setUserInput('');
    }
  };

  const handleGameOver = async () => {
    setGameState('GAMEOVER');
    
    const { data } = await supabase
      .from('math_scores')
      .select('*')
      .eq('username', username)
      .eq('score_date', todayStr);

    const existingRow = data && data.length > 0 ? data[0] : null;
    const currentAttempts = existingRow ? parseInt(existingRow.attempts) : 0;
    const currentHighScore = existingRow ? parseInt(existingRow.score) : 0;

    await supabase.from('math_scores').upsert(
      {
        username: username,
        score: Math.max(currentHighScore, score),
        attempts: currentAttempts + 1,
        score_date: todayStr
      },
      { onConflict: 'username,score_date' }
    );

    fetchLeaderboard();
  };

  if (!username) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
        <div style={{ border: '2px dashed #0f0', padding: '30px', width: '100%', maxWidth: '400px', backgroundColor: '#000', textAlign: 'center' }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto', gap: '30px', boxSizing: 'border-box' }}>
      
      {/* Title Layout */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#0f0', fontSize: '2.5rem', textShadow: '0 0 8px #0f0', marginBottom: '5px' }}>{t.title}</h1>
        <p style={{ color: '#888', margin: '0' }}>{t.sub} | USER: <span style={{color: '#ff0'}}>{username}</span></p>
      </div>

      {/* Main Play Arena Box */}
      <div style={{ border: '2px solid #0f0', padding: '30px', width: '100%', maxWidth: '450px', backgroundColor: '#000', textAlign: 'center', boxSizing: 'border-box' }}>
        {gameState === 'START' && (
          <button onClick={startGame} style={{ background: '#0f0', color: '#000', border: 'none', padding: '15px 30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', width: '100%', fontFamily: 'monospace' }}>
            {t.btnStart}
          </button>
        )}

        {gameState === 'BATTLE' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold', marginBottom: '15px' }}>
              <span style={{ color: '#ff0' }}>{t.time} {timeLeft}s</span>
              <span style={{ color: '#0f0' }}>{t.score} {score}</span>
            </div>

            {/* Dynamic Monster Display Sub-engine */}
            {(() => {
              const activeMonster = MONSTER_ROSTER[currentMonsterIdx];
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const monsterImgUrl = `${supabaseUrl}/storage/v1/object/public/hero-images/${activeMonster.imageKey}.webp`;
              const hpPercentage = (monsterHp / activeMonster.maxHp) * 100;

              return (
                <div style={{ padding: '15px', background: '#000', border: '1px solid #0f0', marginBottom: '20px' }}>
                  <div style={{ color: '#ff0', fontWeight: 'bold', fontSize: '15px', marginBottom: '10px', textTransform: 'uppercase' }}>
                    TARGET: {activeMonster.name} [{activeMonster.tier}]
                  </div>
                  <img 
                    src={monsterImgUrl} 
                    alt={activeMonster.name} 
                    style={{ width: '150px', height: '150px', objectFit: 'cover', border: '2px solid #0f0', marginBottom: '10px', backgroundColor: '#111' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x150/000000/00ff00?text=' + activeMonster.name; }}
                  />
                  <div style={{ background: '#000', height: '15px', border: '1px solid #0f0', overflow: 'hidden' }}>
                    <div style={{ background: '#0f0', height: '100%', width: `${hpPercentage}%`, transition: 'width 0.1s' }}></div>
                  </div>
                  <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                    HP: {monsterHp} / {activeMonster.maxHp}
                  </div>
                </div>
              );
            })()}

            {streak >= 3 && <div style={{ color: '#ff0', fontWeight: 'bold', marginBottom: '10px' }}>{t.combo}</div>}

            <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#fff', margin: '20px 0' }}>{question.text}</div>

            <input
              ref={inputRef}
              type="number"
              value={userInput}
              onChange={handleInputChange}
              style={{ background: '#000', color: '#0f0', border: '2px solid #0f0', fontSize: '3rem', width: '140px', textAlign: 'center', outline: 'none', fontFamily: 'monospace' }}
              placeholder="?"
            />
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div>
            <h2 style={{ color: '#ff3333', marginTop: 0 }}>{t.timesUp}</h2>
            <p style={{ fontSize: '20px', color: '#fff', marginBottom: '25px' }}>Score: <strong style={{color:'#ff0'}}>{score}</strong> {t.points}</p>
            <button onClick={startGame} style={{ background: '#0f0', color: '#000', border: 'none', padding: '15px 30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', width: '100%', fontFamily: 'monospace' }}>
              {t.btnAgain}
            </button>
          </div>
        )}
      </div>

      {/* Cyberpunk Daily Ladder Scoreboard Table */}
      <div style={{ width: '100%', maxWidth: '600px', border: '1px solid #0f0', padding: '20px', backgroundColor: '#000', boxSizing: 'border-box' }}>
        <h3 style={{ color: '#ff0', textAlign: 'center', marginTop: 0, borderBottom: '1px solid #0f0', paddingBottom: '10px' }}>{t.ladderTitle}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#0f0', borderBottom: '1px dashed #0f0', paddingBottom: '5px', fontSize: '14px' }}>
            <span style={{ width: '15%' }}>{t.colRank}</span>
            <span style={{ width: '45%' }}>{t.colName}</span>
            <span style={{ width: '25%', textAlign: 'right' }}>{t.colScore}</span>
            <span style={{ width: '15%', textAlign: 'right' }}>{t.colTries}</span>
          </div>
          {leaderboard.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: row.username === username ? '#ff0' : '#fff', fontSize: '15px', padding: '4px 0' }}>
              <span style={{ width: '15%' }}>#{idx + 1}</span>
              <span style={{ width: '45%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.username}</span>
              <span style={{ width: '25%', textAlign: 'right', fontWeight: 'bold' }}>{row.score}</span>
              <span style={{ width: '15%', textAlign: 'right', color: '#888' }}>{row.attempts}</span>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}