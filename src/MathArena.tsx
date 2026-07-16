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

const MATH_LANG = {
  en: {
    title: "⚔️ MATH BATTLE ARENA ⚔️",
    sub: "Defeat monsters in 60 seconds!",
    loginTitle: "[ IDENTIFY PLAYER ]",
    loginLabel: "Enter Brother Name:",
    loginBtn: "INITIALIZE ARENA",
    time: "⏳ Time:",
    score: "🏆 Score:",
    combo: "🔥 BEYOND GODLIKE COMBO! 🔥",
    timesUp: "⌛ TIME'S UP!",
    points: "points!",
    btnAgain: "LAUNCH NEXT ATTACK",
    ladderTitle: "📊 DAILY LADDER SCOREBOARD 📊",
    colRank: "RANK",
    colName: "BROTHER",
    colScore: "MAX SCORE",
    colTries: "TRIES"
  },
  vi: {
    title: "⚔️ ĐẤU TRƯỜNG TOÁN HỌC ⚔️",
    sub: "Hạ gục quái vật trong 60 giây!",
    loginTitle: "[ XÁC MINH DANH TÍNH ]",
    loginLabel: "Nhập Tên Của Anh Em:",
    loginBtn: "KÍCH HOẠT ĐẤU TRƯỜNG",
    time: "⏳ Thời gian:",
    score: "🏆 Điểm số:",
    combo: "🔥 LIÊN HOÀN BẠO KÍCH! 🔥",
    timesUp: "⌛ HẾT GIỜ!",
    points: "điểm!",
    btnAgain: "TIẾP TỤC TẤN CÔNG",
    ladderTitle: "📊 BẢNG XẾP HẠNG HÔM NAY 📊",
    colRank: "HẠNG",
    colName: "ANH EM",
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
  const [monsterHp, setMonsterHp] = useState(100);
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
    setMonsterHp(100);
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
      setMonsterHp((prev) => (prev - 20 <= 0 ? 100 : prev - 20));
      setQuestion(generateQuestion());
      setUserInput('');
    }
  };

  const handleGameOver = async () => {
    setGameState('GAMEOVER');
    
    // Read the current record for this brother today
    const { data } = await supabase
      .from('math_scores')
      .select('*')
      .eq('username', username)
      .eq('score_date', todayStr)
      .substring();

    const existingRow = data && data.length > 0 ? data[0] : null;
    const currentAttempts = existingRow ? parseInt(existingRow.attempts) : 0;
    const currentHighScore = existingRow ? parseInt(existingRow.score) : 0;

    // Upsert tracking state
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

            <div style={{ padding: '10px', background: '#000', border: '1px dashed #0f0', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>{monsterHp > 40 ? '👹' : '💥'}</div>
              <div style={{ background: '#000', height: '15px', border: '1px solid #0f0', overflow: 'hidden' }}>
                <div style={{ background: '#0f0', height: '100%', width: `${monsterHp}%`, transition: 'width 0.1s' }}></div>
              </div>
            </div>

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
