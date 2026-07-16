import { useState, useEffect, useRef } from 'react';

interface Question {
  text: string;
  answer: number;
}

const MATH_LANG = {
  en: {
    title: "⚔️ MATH BATTLE ARENA ⚔️",
    sub: "Defeat monsters in 60 seconds!",
    highScore: "Daily High Score:",
    btnStart: "ENTER THE ARENA",
    btnAgain: "BATTLE AGAIN",
    time: "⏳ Time:",
    score: "🏆 Score:",
    combo: "🔥 COMBO HIT! 🔥",
    timesUp: "⌛ TIME'S UP!",
    newRecord: "🎉 NEW HIGH SCORE! 🎉",
    points: "points!",
    backLobby: "⬅️ Go to Heroes Lobby"
  },
  vi: {
    title: "⚔️ ĐẤU TRƯỜNG TOÁN HỌC ⚔️",
    sub: "Hạ gục quái vật trong 60 giây!",
    highScore: "Kỷ lục cao nhất:",
    btnStart: "BẮT ĐẦU CHIẾN",
    btnAgain: "VÀO TRẬN MỚI",
    time: "⏳ Thời gian:",
    score: "🏆 Điểm:",
    combo: "🔥 BẠO KÍCH LIÊN HOÀN! 🔥",
    timesUp: "⌛ HẾT GIỜ!",
    newRecord: "🎉 PHÁ KỶ LỤC RỒI! 🎉",
    points: "điểm!",
    backLobby: "⬅️ Quay lại Phòng Chờ"
  }
};

const generateQuestion = (): Question => {
  const num1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
  const num2 = Math.floor(Math.random() * 8) + 2; // 2 to 9
  return Math.random() > 0.5 
    ? { text: `${num1 * num2} ÷ ${num1}`, answer: num2 }
    : { text: `${num1} × ${num2}`, answer: num1 * num2 };
};

export default function MathArena({ locale, onBack }: { locale: 'en' | 'vi'; onBack: () => void }) {
  const [gameState, setGameState] = useState<'START' | 'BATTLE' | 'GAMEOVER'>('START');
  const [question, setQuestion] = useState<Question>({ text: '', answer: 0 });
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [monsterHp, setMonsterHp] = useState(100);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('math_arena_highscore') || '0'));
  
  const inputRef = useRef<HTMLInputElement>(null);
  const t = MATH_LANG[locale];

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
      setGameState('GAMEOVER');
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('math_arena_highscore', score.toString());
      }
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, score, highScore]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <h1 style={{ color: '#0f0', fontSize: '2.5rem', textShadow: '0 0 10px #0f0', marginBottom: '5px', textAlign: 'center' }}>{t.title}</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>{t.sub}</p>

      <div style={{ border: '2px solid #0f0', padding: '30px', width: '100%', maxWidth: '400px', backgroundColor: '#050505', textAlign: 'center', boxShadow: '0 0 15px rgba(0,255,0,0.2)' }}>
        
        {gameState === 'START' && (
          <div>
            <p style={{ fontSize: '18px', color: '#fff', marginBottom: '20px' }}>{t.highScore} <strong style={{color: '#ff0'}}>{highScore} pts</strong></p>
            <button onClick={startGame} style={{ background: '#0f0', color: '#000', border: 'none', padding: '15px 30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', width: '100%' }}>
              {t.btnStart}
            </button>
          </div>
        )}

        {gameState === 'BATTLE' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: 'bold', marginBottom: '15px' }}>
              <span style={{ color: '#ff0' }}>{t.time} {timeLeft}s</span>
              <span style={{ color: '#0f0' }}>{t.score} {score}</span>
            </div>

            <div style={{ padding: '10px', background: '#111', border: '1px solid #333', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>{monsterHp > 40 ? '👹' : '💥'}</div>
              <div style={{ background: '#222', height: '15px', border: '1px solid #0f0', overflow: 'hidden' }}>
                <div style={{ background: '#0f0', height: '100%', width: `${monsterHp}%`, transition: 'width 0.1s' }}></div>
              </div>
            </div>

            {streak >= 3 && <div style={{ color: '#ff0055', fontWeight: 'bold', animation: 'blink 0.5s infinite', marginBottom: '10px' }}>{t.combo}</div>}

            <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#fff', margin: '20px 0' }}>{question.text}</div>

            <input
              ref={inputRef}
              type="number"
              value={userInput}
              onChange={handleInputChange}
              style={{ background: '#000', color: '#0f0', border: '2px solid #0f0', fontSize: '3rem', width: '140px', textAlign: 'center', outline: 'none' }}
              placeholder="?"
            />
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div>
            <h2 style={{ color: '#ff3333' }}>{t.timesUp}</h2>
            <p style={{ fontSize: '18px', color: '#fff' }}>Score: <strong>{score}</strong> {t.points}</p>
            {score >= highScore && score > 0 && <p style={{ color: '#ff0' }}>{t.newRecord}</p>}
            <button onClick={startGame} style={{ background: '#0f0', color: '#000', border: 'none', padding: '15px 30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', width: '100%', marginTop: '15px' }}>
              {t.btnAgain}
            </button>
          </div>
        )}
      </div>

      <button onClick={onBack} style={{ background: 'transparent', color: '#555', border: 'none', marginTop: '30px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'monospace' }}>
        {t.backLobby}
      </button>
    </div>
  );
}
