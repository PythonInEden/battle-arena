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

const SKILLS_LIBRARY: Record<string, { en: string; vi: string }> = {
  // Fighter Skills
  "Shield Slam": {
    en: "Smash with your shield. Deals solid damage and blocks the enemy's next skill.",
    vi: "Vả thẳng khiên sắt vào mặt, vừa gây sát thương vừa làm địch choáng váng quên bài."
  },
  "Heavy Slash": {
    en: "A massive two-handed swing. Slow, but deals triple damage if it hits!",
    vi: "Chém một phát bổ củi chí mạng. Hên xui dễ hụt nhưng trúng là đi nửa cây máu."
  },
  "Second Wind": {
    en: "Take a deep breath mid-fight. Instantly restores a chunk of health.",
    vi: "Vận nội công thở dốc một cái, tự hồi phục một khúc máu mà không cần bùa chú."
  },
  "Counter-Stance": {
    en: "Defend this round. Automatically strike back every time the enemy hits you.",
    vi: "Đứng im thủ thế, đứa nào dám lao vào đấm mình là ăn đòn vỗ mặt ngược lại ngay."
  },
  "Battle Cry": {
    en: "A terrifying roar that scares the enemy, reducing all their dice rolls by -4.",
    vi: "Hú hét thị uy làm địch đứng hình mất công lực, đổ xúc xắc toàn ra số bé."
  },

  // Ranger Skills
  "Sniper Shot": {
    en: "Shoot from extreme distance. You always attack first in the round.",
    vi: "Bắn tỉa từ xa, giành tuyệt đối quyền bắn trước khi địch kịp chạm vào người."
  },
  "Double Strafe": {
    en: "Fire two arrows at the same time for double physical damage.",
    vi: "Bắn một lúc 2 mũi tên xé gió, gây gấp đôi sát thương vật lý."
  },
  "Trap Setter": {
    en: "Place a hidden spiked trap. Stuns the enemy, making them skip 1 turn.",
    vi: "Đặt bẫy rập dưới đất, làm địch dính bẫy bất động, mất luôn 1 lượt hành động."
  },
  "Eagle Eye": {
    en: "Permanent focus buff. Adds a flat +4 accuracy to all your dice rolls.",
    vi: "Mắt đại bàng siêu tinh anh, cộng thẳng +4 điểm vào mọi lần đổ xúc xắc."
  },
  "Dodge Roll": {
    en: "A quick combat roll. High chance to completely avoid any physical attack.",
    vi: "Lộn người né đòn, né sạch bách các đòn đánh bằng vũ khí thông thường."
  },

  // Wizard Skills
  "Fireball": {
    en: "Explosive magical fire. Completely ignores physical shields and armor.",
    vi: "Chưởng lửa siêu to khổng lồ, xuyên thẳng qua giáp sắt, thiêu cháy đối thủ."
  },
  "Teleport": {
    en: "Blink out of reality. Automatically evades the next incoming attack.",
    vi: "Biến mất trong chớp mắt, khiến đòn đánh tiếp theo của địch hụt ăn hoàn toàn."
  },
  "Mana Shield": {
    en: "Energy barrier. Uses your gold coins to absorb damage instead of your HP.",
    vi: "Lấy tiền đè người, biến vàng trong túi thành lớp bảo vệ chống nát gáo."
  },
  "Chain Lightning": {
    en: "Electric burst. Strikes the enemy and instantly vaporizes summoned minions.",
    vi: "Giật sét tung tóe, giật chết cả chủ lẫn thiêu rụi mấy con đệ đi kèm."
  },
  "Freeze Ray": {
    en: "Ice blast. Freezes the enemy's feet, forcing them to attack last for 2 rounds.",
    vi: "Bắn tia băng giá làm địch cóng giò, mất quyền đánh trước, chỉ có nước đứng chịu trận."
  },

  // Barbarian Skills
  "Berserker Rage": {
    en: "Pure anger. The lower your health drops, the harder your attacks hit.",
    vi: "Máu càng ít đấm càng đau, máu điên cuồng nộ phát tác đấm phát nào thọt phát đấy."
  },
  "Leap Slam": {
    en: "Jump high and crush down. Shatters the opponent's defensive armor.",
    vi: "Nhảy bổ bổ đầu, nện rìu làm vỡ vụn lớp giáp bảo vệ của đối thủ."
  },
  "Thick Hide": {
    en: "Tough mountain skin. Permanently reduces all incoming damage by 3.",
    vi: "Da trâu thịt bắp, giảm thẳng 3 sát thương từ mọi đòn đánh của kẻ địch."
  },
  "Ground Shake": {
    en: "Stomp the earth. Shakes the enemy so hard they cannot use skills next turn.",
    vi: "Dập chân rúng động đất trời, khiến địch hoảng hồn không xài được chiêu lượt sau."
  },
  "Executioner": {
    en: "Finishing blow. Instantly executes the enemy if their HP is below 20%.",
    vi: "Lệnh tử hình, chặt bay đầu tiễn địch lên bảng đếm số nếu địch còn dưới 20% máu."
  },

  // Rogue Skills
  "Poison Dagger": {
    en: "Stab with a toxic blade. Poisons the enemy, draining HP every turn.",
    vi: "Dao găm tẩm độc, rút máu đối thủ từ từ cực kỳ khó chịu trong 3 lượt."
  },
  "Stealth Strike": {
    en: "Ambush from shadows. Deals massive damage if you strike first.",
    vi: "Đâm lén từ bóng tối, sát thương cực khủng nếu giành được quyền đi trước."
  },
  "Pickpocket": {
    en: "Steal gold directly from the enemy's pocket during the fight.",
    vi: "Giở trò đạo tặc, móc túi ăn cắp 5 vàng của địch ngay trong trận chiến."
  },
  "Smoke Bomb": {
    en: "Throw blinding dust. Blinds the enemy, giving their next attack -5 accuracy.",
    vi: "Ném bom khói làm địch mù mắt, đổ xúc xắc lượt sau thọt nặng bị trừ 5 điểm."
  },
  "Shadow Step": {
    en: "Blink behind the target, gaining a +4 speed bonus for the next round.",
    vi: "Đi mây về gió, luồn ra sau lưng địch tăng mạnh tốc đánh cho lượt tiếp theo."
  },

  // Cleric Skills
  "Holy Heal": {
    en: "Call upon divine light to instantly restore a massive amount of HP.",
    vi: "Bơm máu thần thánh, niệm chú hồi lại một khúc máu lớn trên thanh xuân."
  },
  "Holy Smite": {
    en: "Holy bolt. Deals double damage against Undead monsters or Necromancers.",
    vi: "Sét đánh thiên lôi, sát thương nhân đôi nếu gặp Quỷ hoặc Thầy pháp bóng tối."
  },
  "Blessing": {
    en: "Divine buff. Adds +3 to all your attribute dice rolls for 3 turns.",
    vi: "Phép ban phước, tăng +3 công lực cho mọi lần đổ xúc xắc trong 3 lượt."
  },
  "Divine Shield": {
    en: "Holy protection shield. Blocks the next magical spell completely.",
    vi: "Khiên ánh sáng, chặn đứng hoàn toàn chiêu phép thuật tiếp theo của địch."
  },
  "Resurrection": {
    en: "Cheats death. If you die this round, revive once with 10 HP.",
    vi: "Hồi sinh từ cõi chết, nếu hẻo lượt này sẽ bật dậy sống lại với 10 máu."
  },

  // Paladin Skills
  "Divine Aura": {
    en: "Holy protection aura. Permanently cuts all incoming magical/dark damage by 50%.",
    vi: "Hào quang hộ thể, tự động giảm nửa sát thương phép hoặc bóng tối gánh chịu."
  },
  "Holy Charge": {
    en: "Shield bash charge. Deals damage scaled directly from your Vitality stat.",
    vi: "Húc vai thần thánh, lấy máu trâu đè người gây sát thương cực lớn."
  },
  "Lay on Hands": {
    en: "Quick touch healing. Instantly restores a medium amount of health.",
    vi: "Đặt tay chữa lành, hồi phục nhanh một lượng máu vừa phải để cầm cự."
  },
  "Smite Evil": {
    en: "Empower weapon with light. Adds +5 bonus pure damage to your sword.",
    vi: "Trảm yêu trừ ma, cường hóa thanh kiếm chém thêm +5 sát thương chuẩn."
  },
  "Guardian Wall": {
    en: "Unbreakable stance. Grants an extra +5 defense bonus when using Fortify.",
    vi: "Bức tường hộ vệ, tăng mạnh thêm 5 điểm phòng thủ khi chọn thế thủ."
  },

  // Necromancer Skills
  "Raise Skeleton": {
    en: "Summon a bone minion to stand in front of you and absorb incoming attacks.",
    vi: "Gọi đệ xương khô, con đệ này sẽ đứng ra chịu đòn, đỡ hộ toàn bộ sát thương thay chủ."
  },
  "Life Drain": {
    en: "Dark magic curse. Steals HP from the enemy to heal your own health bar.",
    vi: "Hút máu đối thủ để bù thẳng vào thanh máu đang cạn của mình."
  },
  "Bone Armor": {
    en: "Wear a protective ribcage shield. Completely blocks the first 2 physical hits.",
    vi: "Giáp xương khô khốc, chặn đứng hoàn toàn 2 đòn đánh vật lý đầu tiên."
  },
  "Corpse Explosion": {
    en: "Sacrifice a minion to cause massive, unblockable explosion damage.",
    vi: "Nổ xác đệ cưng, gây một lượng sát thương siêu bạo kích không thể cản phá."
  },
  "Curse Eye": {
    en: "Evil eye curse. Permanently reduces the target's Max HP by 10 for the match.",
    vi: "Lời nguyền héo úa, bóp nghẹt làm thanh máu tối đa của địch tụt mất 10 điểm."
  },

  // Bard Skills
  "Distraction Song": {
    en: "Play a confusing song. Steals the enemy's highest dice roll for yourself.",
    vi: "Nhạc đám ma gây lú, cướp luôn điểm xúc xắc cao nhất của địch về cho mình xài."
  },
  "Healing Tune": {
    en: "Play a soothing melody that regenerates health slowly every single turn.",
    vi: "Khúc nhạc du dương, mỗi lượt hồi một ít máu từ từ, mưa dầm thấm lâu."
  },
  "Vicious Mockery": {
    en: "Insult the enemy. Deals mental damage and ruins their next skill execution.",
    vi: "Chửi thề châm chọc, khiến địch cay cú mất tập trung, đánh hụt chiêu."
  },
  "Speed Beat": {
    en: "Fast drum rhythm. Grants you a permanent +5 bonus to strike first.",
    vi: "Nhịp trống tăng tốc, cộng hẳn +5 tốc đánh để luôn giành quyền đi trước."
  },
  "Lullaby": {
    en: "Sing a sleepy song. Puts the enemy to sleep, forcing them to skip an attack.",
    vi: "Hát ru ngủ ngủ, làm địch ngáy o o mất luôn lượt tấn công kế tiếp."
  }
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

            {/* SKILLS BOX WITH DESCRIPTIONS */}
<div>
  <h3>{t.skillsLabel} ({selectedSkills.length}/2)</h3>
  
  {/* The Buttons Layout */}
  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
    {CLASSES_DATA[jobClass as keyof typeof CLASSES_DATA].skills.map(skill => {
      const isSelected = selectedSkills.includes(skill);
      return (
        <button 
          key={skill} 
          type="button" 
          onClick={() => toggleSkill(skill)} 
          style={{ 
            padding: '10px 15px', 
            border: '1px solid #0f0', 
            background: isSelected ? '#0f0' : '#000', 
            color: isSelected ? '#000' : '#0f0', 
            cursor: 'pointer',
            fontWeight: 'bold',
            fontFamily: 'monospace'
          }}
        >
          {skill}
        </button>
      );
    })}
  </div>

  {/* Dynamic Readout List for Android Tablets */}
  <div style={{ border: '1px dashed #050', padding: '10px', backgroundColor: '#050505' }}>
    {CLASSES_DATA[jobClass as keyof typeof CLASSES_DATA].skills.map(skill => {
      const isSelected = selectedSkills.includes(skill);
      const details = SKILLS_LIBRARY[skill] || { en: "No desc", vi: "Chưa có tả" };
      return (
        <div key={skill} style={{ margin: '8px 0', opacity: isSelected ? 1 : 0.4, color: isSelected ? '#0f0' : '#888' }}>
          <span style={{ fontWeight: 'bold' }}>• {skill}:</span>{' '}
          <span style={{ fontStyle: 'italic' }}>
            {locale === 'en' ? details.en : details.vi}
          </span>
          {isSelected && <span style={{ marginLeft: '10px', color: '#ff0' }}>[SELECTED]</span>}
        </div>
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
