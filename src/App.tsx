import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize our Cloud Brain using the keys you added to Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Master Translations Dictionary (Dân Dã Layout)
const LANG = {
  en: {
    title: "⚔️ HEROES LOBBY ⚔️",
    sub: "Pick an existing hero or forge a new legend",
    langBtn: "Tiếng Việt 🇻🇳",
    selectLabel: "Choose a Hero Slot:",
    claimBtn: "Claim Character Slot",
    releaseBtn: "Leave Slot",
    createTitle: "Create New Character",
    namePlace: "Enter hero name...",
    classLabel: "Class / Job:",
    pointsLeft: "Attribute Points Left:",
    saveBtn: "Save Character to Cloud",
    might: "Might (Sức mạnh - +1 Dam/pt)",
    vit: "Vitality (Thể lực - +5 HP/pt)",
    reflex: "Reflex (Phản xạ - +1 Init/pt)",
    skillsLabel: "Select 2 Skills:",
    taken: "Taken by",
  },
  vi: {
    title: "⚔️ PHÒNG CHỜ ANH HÙNG ⚔️",
    sub: "Chọn tướng có sẵn hoặc tạo một huyền thoại mới",
    langBtn: "English 🇬🇧",
    selectLabel: "Chọn nhân vật của bạn:",
    claimBtn: "Vào Trận Ngay",
    releaseBtn: "Đổi Nhân Vật",
    createTitle: "Tạo Anh Hùng Mới",
    namePlace: "Đặt tên chất chơi vào đây...",
    classLabel: "Hệ Phái / Nghề Nghiệp:",
    pointsLeft: "Điểm tiềm năng còn lại:",
    saveBtn: "Lưu Anh Hùng Lên Mây",
    might: "Sức mạnh (+1 Đám đấm/điểm)",
    vit: "Thể lực (+5 Máu trâu/điểm)",
    reflex: "Phản xạ (+1 Tốc đánh/điểm)",
    skillsLabel: "Chọn 2 Kỹ năng bổ trợ:",
    taken: "Đã có chủ:",
  }
};

// 3. The 9 Classes and their Skills Library
const CLASSES_DATA = {
  Fighter: { en: "Fighter (Chiến binh)", vi: "Chiến Binh (Búa)", skills: ["Shield Slam", "Heavy Slash", "Second Wind", "Counter-Stance", "Battle Cry"] },
  Ranger: { en: "Ranger (Cung thủ)", vi: "Cung Thủ (Bao)", skills: ["Sniper Shot", "Double Strafe", "Trap Setter", "Eagle Eye", "Dodge Roll"] },
  Wizard: { en: "Wizard (Pháp sư)", vi: "Pháp Sư (Kéo)", skills: ["Fireball", "Teleport", "Mana Shield", "Chain Lightning", "Freeze Ray"] },
  Barbarian: { en: "Barbarian (Man tộc)", vi: "Man Tộc", skills: ["Berserker Rage", "Leap Slam", "Thick Hide", "Ground Shake", "Executioner"] },
  Rogue: { en: "Rogue (Thích khách)", vi: "Thích Khách", skills: ["Poison Dagger", "Stealth Strike", "Pickpocket", "Smoke Bomb", "Shadow Step"] },
  Cleric: { en: "Cleric (Mục sư)", vi: "Mục Sư", skills: ["Holy Heal", "Holy Smite", "Blessing", "Divine Shield", "Resurrection"] },
  Paladin: { en: "Paladin (Hiệp sĩ thánh)", vi: "Hiệp Sĩ Thánh", skills: ["Divine Aura", "Holy Charge", "Lay on Hands", "Smite Evil", "Guardian Wall"] },
  Necromancer: { en: "Necromancer (Thầy pháp)", vi: "Thầy Pháp Bóng Tối", skills: ["Raise Skeleton", "Life Drain", "Bone Armor", "Corpse Explosion", "Curse Eye"] },
  Bard: { en: "Bard (Nghệ sĩ)", vi: "Nghệ Sĩ Ca Sĩ", skills: ["Distraction Song", "Healing Tune", "Vicious Mockery", "Speed Beat", "Lullaby"] },
};

export default function App() {
  const [locale, setLocale] = useState<'en' | 'vi'>('vi');
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [myPlayerSlot, setMyPlayerSlot] = useState<string>(''); // e.g. 'Player 1'

  // Form Creation State
  const [name, setName] = useState('');
  const [jobClass, setJobClass] = useState('Fighter');
  const [might, setMight] = useState(0);
  const [vitality, setVitality] = useState(0);
  const [reflex, setReflex] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const t = LANG[locale];
  const totalPointsSpent = might + vitality + reflex;
  const pointsLeft = 10 - totalPointsSpent;

  // Fetch characters on load and listen for real-time changes
  useEffect(() => {
    fetchCharacters();

    // The Live Cloud Sync Engine Wire
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, () => {
        fetchCharacters();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCharacters = async () => {
    const { data } = await supabase.from('characters').select('*');
    if (data) setCharacters(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedSkills.length !== 2 || pointsLeft !== 0) {
      alert("Please enter a name, allocate exactly 10 points, and pick 2 skills!");
      return;
    }

    await supabase.from('characters').insert([
      { name, job_class: jobClass, might, vitality, reflex, skills: selectedSkills }
    ]);
    
    // Reset Form
    setName(''); setMight(0); setVitality(0); setReflex(0); setSelectedSkills([]);
  };

  const handleClaim = async () => {
    if (!selectedCharId || !myPlayerSlot) return;
    await supabase.from('characters').update({ assigned_to: myPlayerSlot }).eq('id', selectedCharId);
  };

  const handleRelease = async (charId: number) => {
    await supabase.from('characters').update({ assigned_to: null }).eq('id', charId);
    setMyPlayerSlot('');
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else if (selectedSkills.length < 2) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const claimedCharacter = characters.find(c => c.assigned_to === myPlayerSlot && myPlayerSlot !== '');

  return (
    <div style={{ backgroundColor: '#000', color: '#0f0', fontFamily: 'monospace', minHeight: '100vh', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f0', paddingBottom: '10px' }}>
        <div>
          <h1>{t.title}</h1>
          <p style={{ color: '#888' }}>{t.sub}</p>
        </div>
        <button onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')} style={{ background: '#0f0', color: '#000', fontStyle: 'bold', cursor: 'pointer', height: '40px', padding: '0 15px' }}>
          {t.langBtn}
        </button>
      </header>

      {/* CHOOSE SECTION */}
      <section style={{ margin: '30px 0', padding: '20px', border: '1px dashed #0f0' }}>
        {claimedCharacter ? (
          <div>
            <h2>⚔️ Combat Ready: {claimedCharacter.name} ({claimedCharacter.job_class})</h2>
            <p>HP: {40 + claimedCharacter.vitality * 5} | Might: +{claimedCharacter.might} | Speed: +{claimedCharacter.reflex}</p>
            <button onClick={() => handleRelease(claimedCharacter.id)} style={{ background: '#ff0000', color: '#fff', border: 'none', padding: '10px 20px', cursor: 'pointer' }}>
              {t.releaseBtn}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label>{t.selectLabel}</label>
            <select value={myPlayerSlot} onChange={(e) => setMyPlayerSlot(e.target.value)} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px' }}>
              <option value="">-- Who Are You? --</option>
              {['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'].map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>

            <select value={selectedCharId} onChange={(e) => setSelectedCharId(e.target.value)} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px' }}>
              <option value="">-- Select Character --</option>
              {characters.map(char => (
                <option key={char.id} value={char.id} disabled={char.assigned_to !== null}>
                  {char.name} [{CLASSES_DATA[char.job_class as keyof typeof CLASSES_DATA]?.[locale] || char.job_class}] 
                  {char.assigned_to ? ` (${t.taken} ${char.assigned_to})` : ''}
                </option>
              ))}
            </select>
            <button onClick={handleClaim} disabled={!selectedCharId || !myPlayerSlot} style={{ background: '#0f0', color: '#000', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
              {t.claimBtn}
            </button>
          </div>
        )}
      </section>

      {/* CREATE HERO SECTION */}
      {!claimedCharacter && (
        <section style={{ border: '1px solid #0f0', padding: '20px' }}>
          <h2>[ {t.createTitle} ]</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
            <input type="text" placeholder={t.namePlace} value={name} onChange={(e) => setName(e.target.value)} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px' }} required />
            
            <label>{t.classLabel}</label>
            <select value={jobClass} onChange={(e) => { setJobClass(e.target.value); setSelectedSkills([]); }} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px' }}>
              {Object.keys(CLASSES_DATA).map(cls => (
                <option key={cls} value={cls}>{CLASSES_DATA[cls as keyof typeof CLASSES_DATA][locale]}</option>
              ))}
            </select>

            {/* ATTRIBUTE POINT DISTRIBUTOR */}
            <div>
              <h3>{t.pointsLeft} <span style={{ color: pointsLeft === 0 ? '#0f0' : '#ff0', fontSize: '20px' }}>{pointsLeft}</span></h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label>{t.might} : {might} 
                  <button type="button" onClick={() => pointsLeft > 0 && setMight(might + 1)} style={{ marginLeft: '10px', background: '#222', color: '#0f0' }}>+</button>
                  <button type="button" onClick={() => might > 0 && setMight(might - 1)} style={{ marginLeft: '5px', background: '#222', color: '#0f0' }}>-</button>
                </label>
                <label>{t.vit} : {vitality} 
                  <button type="button" onClick={() => pointsLeft > 0 && setVitality(vitality + 1)} style={{ marginLeft: '10px', background: '#222', color: '#0f0' }}>+</button>
                  <button type="button" onClick={() => vitality > 0 && setVitality(vitality - 1)} style={{ marginLeft: '5px', background: '#222', color: '#0f0' }}>-</button>
                </label>
                <label>{t.reflex} : {reflex} 
                  <button type="button" onClick={() => pointsLeft > 0 && setReflex(reflex + 1)} style={{ marginLeft: '10px', background: '#222', color: '#0f0' }}>+</button>
                  <button type="button" onClick={() => reflex > 0 && setReflex(reflex - 1)} style={{ marginLeft: '5px', background: '#222', color: '#0f0' }}>-</button>
                </label>
              </div>
            </div>

            {/* SKILLS BOX */}
            <div>
              <h3>{t.skillsLabel} ({selectedSkills.length}/2)</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {CLASSES_DATA[jobClass as keyof typeof CLASSES_DATA].skills.map(skill => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button key={skill} type="button" onClick={() => toggleSkill(skill)} style={{ padding: '8px', border: '1px solid #0f0', background: isSelected ? '#0f0' : '#000', color: isSelected ? '#000' : '#0f0', cursor: 'pointer' }}>
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={pointsLeft !== 0 || selectedSkills.length !== 2} style={{ background: '#0f0', color: '#000', padding: '15px', border: 'none', fontStyle: 'bold', cursor: 'pointer', opacity: (pointsLeft === 0 && selectedSkills.length === 2) ? 1 : 0.5 }}>
              {t.saveBtn}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
