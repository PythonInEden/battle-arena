import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Cloud Brain
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🛠 * IMMUTABLE SYSTEM BOSSES (Hardcoded, un-deletable, immune to pool depletion)
const IMMUTABLE_SYSTEM_BOTS = [
  { id: 'sys_bot_1', name: "🤖 Training Golem", job_class: "Fighter", might: 4, vitality: 4, reflex: 2, skills: ["Shield Slam"], assigned_to: "[System Bot]", isBot: true },
  { id: 'sys_bot_2', name: "👹 Shadow Stalker", job_class: "Rogue", might: 5, vitality: 3, reflex: 2, skills: ["Counter-Stance"], assigned_to: "[System Bot]", isBot: true }
];

// 🛠 * Retro Unicode Dice Map
const DICE_ICONS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

// 🛠 * Dynamic Image Link Generator
const getGameAssetUrl = (type: 'avatar' | 'skill' | 'win' | 'lost', className: string, skillName?: string) => {
  const cleanClass = className.toLowerCase().trim();
  if (type === 'avatar') return `${supabaseUrl}/storage/v1/object/public/hero-images/${cleanClass}_avatar.webp`;
  if (type === 'win') return `${supabaseUrl}/storage/v1/object/public/hero-images/${cleanClass}_pose_win.webp`;
  if (type === 'lost') return `${supabaseUrl}/storage/v1/object/public/hero-images/${cleanClass}_pose_lost.webp`;
  const cleanSkill = skillName ? skillName.toLowerCase().trim().replace(/[\s-]+/g, '_') : '';
  return `${supabaseUrl}/storage/v1/object/public/hero-images/${cleanClass}_skill_${cleanSkill}.webp`;
};

// 2. Master Translations Dictionary
const LANG = {
  en: {
    title: "⚔️ HEROES LOBBY & ARENA ⚔️",
    sub: "Enter your name, pick a hero, or enter the ready room to fight",
    langBtn: "Tiếng Việt 🇻🇳",
    nameInputLabel: "Your Player Name:",
    nameInputPlace: "Type your real name...",
    selectLabel: "Choose a Character:",
    claimBtn: "Claim Hero & Join Game",
    releaseBtn: "Leave Slot / Change Hero",
    createTitle: "Create New Character",
    namePlace: "Enter hero name...",
    classLabel: "Class / Job:",
    pointsLeft: "Attribute Points Left:",
    saveBtn: "Save Character to Cloud",
    savingBtn: "Saving to Cloud...",
    might: "Might (Sức mạnh - +1 Dam/pt)",
    vit: "Vitality (Thể lực - +5 HP/pt)",
    reflex: "Reflex (Phản xạ - +1 Init/pt)",
    skillsLabel: "Select 2 Skills:",
    taken: "Claimed by",
    previewTitle: "👁️ Hero Preview",
    classPreview: "Class Portrait Preview:",
    rosterTitle: "🗃️ Server Character Roster (Maintenance Panel)",
    deleteBtn: "Delete",
    protectedText: "Fighting",
    arenaTitle: "🏆 LIVE TOURNAMENT MATCHUPS 🏆",
    rollBtn: "🎲 Roll Round",
    vsText: "VS",
    botLabel: "AI System Bot",
    creatorLabel: "Created by",
    readyBtn: "🟢 MARK AS READY",
    unreadyBtn: "🔴 CANCEL READY",
    waitingRoomTitle: "⏳ ARENA WAITING LOBBY (READY CHECK) ⏳",
    statusWaiting: "WAITING...",
    statusReady: "READY TO FIGHT!",
    lobbyLockAlert: "Tournament is currently active! Please wait until the match ends.",
    matchOverBtn: "💥 COMBAT CONCLUDED",
  },
  vi: {
    title: "⚔️ ĐẤU TRƯỜNG ANH HÙNG ⚔️",
    sub: "Nhập tên của bạn, chọn tướng hoặc tiến vào phòng chờ sẵn sàng",
    langBtn: "English 🇬🇧",
    nameInputLabel: "Tên Người Chơi:",
    nameInputPlace: "Nhập tên thật của bạn...",
    selectLabel: "Chọn Anh Hùng:",
    claimBtn: "Nhận Tướng & Vào Trận",
    releaseBtn: "Đổi Tướng Khác",
    createTitle: "Tạo Anh Hùng Mới",
    namePlace: "Đặt tên chất chơi vào đây...",
    classLabel: "Hệ Phái / Nghề Nghiệp:",
    pointsLeft: "Điểm tiềm năng còn lại:",
    saveBtn: "Lưu Anh Hùng Lên Mây",
    savingBtn: "Đang tải lên mây...",
    might: "Sức mạnh (+1 Đám đấm/điểm)",
    vit: "Thể lực (+5 Máu trâu/điểm)",
    reflex: "Phản xạ (+1 Tốc đánh/điểm)",
    skillsLabel: "Chọn 2 Kỹ năng bổ trợ:",
    taken: "Đã có chủ:",
    previewTitle: "👁️ Xem Trước Tướng",
    classPreview: "Ảnh Đại Diện Hệ Phái:",
    rosterTitle: "🗃️ Danh Sách Máy Chủ (Bảo Trì & Dọn Dẹp)",
    deleteBtn: "Xóa Tướng",
    protectedText: "Đang Chiến Đấu",
    arenaTitle: "🏆 BẢNG ĐẤU GIẢI TOURNAMENT LIVE 🏆",
    rollBtn: "🎲 Đổ Xúc Xắc Hiệp",
    vsText: "ĐẤU VỚI",
    botLabel: "Quái Vật Máy (AI)",
    creatorLabel: "Tạo bởi",
    readyBtn: "🟢 SẴN SÀNG ĐẤU",
    unreadyBtn: "🔴 HỦY SẴN SÀNG",
    waitingRoomTitle: "⏳ PHÒNG CHỜ ĐẤU TRƯỜNG (KIỂM TRA SĨ SỐ) ⏳",
    statusWaiting: "ĐANG CHỜ TỔ ĐỘI...",
    statusReady: "SẴN SÀNG KHÔ MÁU!",
    lobbyLockAlert: "Trận đấu đang diễn ra! Vui lòng đợi các đấu sĩ đánh xong.",
    matchOverBtn: "💥 TRẬN ĐẤU KẾT THÚC",
  }
};

const CLASSES_DATA = {
  Fighter: { en: "Fighter", vi: "Chiến Binh (Búa)", skills: ["Shield Slam", "Heavy Slash", "Second Wind", "Counter-Stance", "Battle Cry"] },
  Ranger: { en: "Ranger", vi: "Cung Thủ (Bao)", skills: ["Sniper Shot", "Double Strafe", "Trap Setter", "Eagle Eye", "Dodge Roll"] },
  Wizard: { en: "Wizard", vi: "Pháp Sư (Kéo)", skills: ["Fireball", "Teleport", "Mana Shield", "Chain Lightning", "Freeze Ray"] },
  Barbarian: { en: "Barbarian", vi: "Man Tộc", skills: ["Berserker Rage", "Leap Slam", "Thick Hide", "Ground Shake", "Executioner"] },
  Rogue: { en: "Rogue", vi: "Thích Khách", skills: ["Poison Dagger", "Stealth Strike", "Pickpocket", "Smoke Bomb", "Shadow Step"] },
  Cleric: { en: "Cleric", vi: "Mục Sư", skills: ["Holy Heal", "Holy Smite", "Blessing", "Divine Shield", "Resurrection"] },
  Paladin: { en: "Paladin", vi: "Hiệp Sĩ Thánh", skills: ["Divine Aura", "Holy Charge", "Lay on Hands", "Smite Evil", "Guardian Wall"] },
  Necromancer: { en: "Necromancer", vi: "Thầy Pháp Bóng Tối", skills: ["Raise Skeleton", "Life Drain", "Bone Armor", "Corpse Explosion", "Curse Eye"] },
  Bard: { en: "Bard", vi: "Nghệ Sĩ Ca Sĩ", skills: ["Distraction Song", "Healing Tune", "Vicious Mockery", "Speed Beat", "Lullaby"] },
};

const SKILLS_LIBRARY: Record<string, { en: string; vi: string }> = {
  "Shield Slam": { en: "Smash with shield. Deals solid damage and blocks enemy's next skill.", vi: "Vả khiên sắt vào mặt, gây sát thương và làm địch choáng váng quên bài." },
  "Heavy Slash": { en: "A massive two-handed swing. Slow, but deals triple damage if it hits!", vi: "Chém bổ củi chí mạng. Hên xui dễ hụt nhưng trúng là đi nửa cây máu." },
  "Second Wind": { en: "Take a deep breath mid-fight. Instantly restores a chunk of health.", vi: "Vận nội công thở dốc một cái, tự hồi phục một khúc máu không cần bùa." },
  "Counter-Stance": { en: "Defend this round. Automatically strike back every time enemy hits you.", vi: "Thủ thế phản đòn, đứa nào dám lao vào đấm là ăn đòn vỗ mặt ngược lại ngay." },
  "Battle Cry": { en: "A terrifying roar that scares the enemy, reducing their dice rolls by -4.", vi: "Hú hét thị uy làm địch đứng hình mất công lực, đổ xúc xắc toàn số bé." },
  "Sniper Shot": { en: "Shoot from extreme distance. You always attack first in the round.", vi: "Bắn tỉa từ xa, giành tuyệt đối quyền bắn trước khi địch kịp chạm vào người." },
  "Double Strafe": { en: "Fire two arrows at the same time for double physical damage.", vi: "Bắn một lúc 2 mũi tên xé gió, gây gấp đôi sát thương vật lý." },
  "Trap Setter": { en: "Place a hidden spiked trap. Stuns the enemy, making them skip 1 turn.", vi: "Đặt bẫy rập dưới đất, làm địch dính bẫy bất động, mất luôn 1 lượt." },
  "Eagle Eye": { en: "Permanent focus buff. Adds a flat +4 accuracy to all your dice rolls.", vi: "Mắt đại bàng siêu tinh anh, cộng thẳng +4 điểm vào mọi lần đổ xúc xắc." },
  "Dodge Roll": { en: "A quick combat roll. High chance to completely avoid any physical attack.", vi: "Lộn người né đòn, né sạch bách các đòn đánh bằng vũ khí thông thường." },
  "Fireball": { en: "Explosive magical fire. Completely ignores physical shields and armor.", vi: "Chưởng lửa siêu to khổng lồ, xuyên thẳng qua giáp sắt, thiêu cháy đối thủ." },
  "Teleport": { en: "Blink out of reality. Automatically evades the next incoming attack.", vi: "Biến mất trong chớp mắt, khiến đòn đánh tiếp theo của địch hụt ăn hoàn toàn." },
  "Mana Shield": { en: "Energy barrier. Uses your gold coins to absorb damage instead of your HP.", vi: "Lấy tiền đè người, biến vàng trong túi thành lớp bảo vệ chống nát gáo." },
  "Chain Lightning": { en: "Electric burst. Strikes the enemy and instantly vaporizes summoned minions.", vi: "Giật sét tung tóe, giật chết cả chủ lẫn thiêu rụi mấy con đệ đi kèm." },
  "Freeze Ray": { en: "Ice blast. Freezes the enemy's feet, forcing them to attack last for 2 rounds.", vi: "Bắn tia băng giá làm địch cóng giò, mất quyền đánh trước, đứng chịu trận." },
  "Berserker Rage": { en: "Pure anger. The lower your health drops, the harder your attacks hit.", vi: "Máu càng ít đấm càng đau, máu điên cuồng nộ phát tác đấm thọt phát đấy." },
  "Leap Slam": { en: "Jump high and crush down. Shatters the opponent's defensive armor.", vi: "Nhảy bổ bổ đầu, nện rìu làm vỡ vụn lớp giáp bảo vệ của đối thủ." },
  "Thick Hide": { en: "Tough mountain skin. Permanently reduces all incoming damage by 3.", vi: "Da trâu thịt bắp, giảm thẳng 3 sát thương từ mọi đòn đánh của kẻ địch." },
  "Ground Shake": { en: "Stomp the earth. Shakes the enemy so hard they cannot use skills next turn.", vi: "Dập chân rúng động đất trời, khiến địch hoảng hồn không xài được chiêu." },
  "Executioner": { en: "Finishing blow. Instantly executes the enemy if their HP is below 20%.", vi: "Lệnh tử hình, chặt bay đầu tiễn địch lên bảng nếu còn dưới 20% máu." },
  "Poison Dagger": { en: "Stab with a toxic blade. Poisons the enemy, draining HP every turn.", vi: "Dao găm tẩm độc, rút máu đối thủ từ từ cực kỳ khó chịu trong 3 lượt." },
  "Stealth Strike": { en: "Ambush from shadows. Deals massive damage if you strike first.", vi: "Đâm lén từ bóng tối, sát thương cực khủng nếu giành được quyền đi trước." },
  "Pickpocket": { en: "Steal gold directly from the enemy's pocket during the fight.", vi: "Giở trò đạo tặc, móc túi ăn cắp 5 vàng của địch ngay trong trận chiến." },
  "Smoke Bomb": { en: "Throw blinding dust. Blinds the enemy, giving their next attack -5 accuracy.", vi: "Ném bom khói làm địch mù mắt, đổ xúc xắc lượt sau thọt nặng trừ 5 điểm." },
  "Shadow Step": { en: "Blink behind the target, gaining a +4 speed bonus for the next round.", vi: "Đi mây về gió, luồn ra sau lưng địch tăng mạnh tốc đánh cho lượt sau." },
  "Holy Heal": { en: "Call upon divine light to instantly restore a massive amount of HP.", vi: "Bơm máu thần thánh, niệm chú hồi lại một khúc máu lớn trên thanh xuân." },
  "Holy Smite": { en: "Holy bolt. Deals double damage against Undead monsters or Necromancers.", vi: "Sét đánh thiên lôi, sát thương nhân đôi nếu gặp Quỷ hoặc Thầy pháp bóng tối." },
  "Blessing": { en: "Divine buff. Adds +3 to all your attribute dice rolls for 3 turns.", vi: "Phép ban phước, tăng +3 công lực cho mọi lần đổ xúc xắc trong 3 lượt." },
  "Divine Shield": { en: "Holy protection shield. Blocks the next magical spell completely.", vi: "Khiên ánh sáng, chặn đứng hoàn toàn chiêu phép thuật tiếp theo của địch." },
  "Resurrection": { en: "Cheats death. If you die this round, revive once with 10 HP.", vi: "Hồi sinh từ cõi chết, nếu hẻo lượt này sẽ bật dậy sống lại with 10 máu." },
  "Divine Aura": { en: "Holy protection aura. Permanently cuts all incoming magical/dark damage by 50%.", vi: "Hào quang hộ thể, tự động giảm nửa sát thương phép hoặc bóng tối." },
  "Holy Charge": { en: "Shield bash charge. Deals damage scaled directly from your Vitality stat.", vi: "Húc vai thần thánh, lấy máu trâu đè người gây sát thương cực lớn." },
  "Lay on Hands": { en: "Quick touch healing. Instantly restores a medium amount of health.", vi: "Đặt tay chữa lành, hồi phục nhanh một lượng máu vừa phải để cầm cự." },
  "Smite Evil": { en: "Empower weapon with light. Adds +5 bonus pure damage to your sword.", vi: "Trảm yêu trừ ma, cường hóa thanh kiếm chém thêm +5 sát thương chuẩn." },
  "Guardian Wall": { en: "Unbreakable stance. Grants an extra +5 defense bonus when using Fortify.", vi: "Bức tường hộ vệ, tăng mạnh thêm 5 điểm phòng thủ khi chọn thế thủ." },
  "Raise Skeleton": { en: "Summon a bone minion to stand in front of you and absorb incoming attacks.", vi: "Gọi đệ xương khô, đệ này sẽ đứng ra chịu đòn, đỡ hộ toàn bộ sát thương." },
  "Life Drain": { en: "Dark magic curse. Steals HP from the enemy to heal your own health bar.", vi: "Hút máu đối thủ để bù thẳng vào thanh máu đang cạn của mình." },
  "Bone Armor": { en: "Wear a protective ribcage shield. Completely blocks the first 2 physical hits.", vi: "Giáp xương khô khốc, chặn đứng hoàn toàn 2 đòn đánh vật lý đầu tiên." },
  "Corpse Explosion": { en: "Sacrifice a minion to cause massive, unblockable explosion damage.", vi: "Nổ xác đệ cưng, gây một lượng sát thương bạo kích không thể cản phá." },
  "Curse Eye": { en: "Evil eye curse. Permanently reduces the target's Max HP by 10 for the match.", vi: "Lời nguyền héo úa, bóp nghẹt làm thanh máu tối đa của địch tụt 10 điểm." },
  "Distraction Song": { en: "Play a confusing song. Steals the enemy's highest dice roll for yourself.", vi: "Nhạc đám ma gây lú, cướp luôn điểm xúc xắc cao nhất của địch về xài." },
  "Healing Tune": { en: "Play a soothing melody that regenerates health slowly every single turn.", vi: "Khúc nhạc du dương, mỗi lượt hồi một ít máu từ từ, mưa dầm thấm lâu." },
  "Vicious Mockery": { en: "Insult the enemy. Deals mental damage and ruins their next skill execution.", vi: "Chửi thề châm chọc, khiến địch cay cú mất tập trung, đánh hụt chiêu." },
  "Speed Beat": { en: "Fast drum rhythm. Grants you a permanent +5 bonus to strike first.", vi: "Nhịp trống tăng tốc, cộng hẳn +5 tốc đánh để luôn giành quyền đi trước." },
  "Lullaby": { en: "Sing a sleepy song. Puts the enemy to sleep, forcing them to skip an attack.", vi: "Hát ru ngủ ngủ, làm địch ngáy o o mất luôn lượt tấn công kế tiếp." }
};

interface Combatant {
  id: number | string;
  name: string;
  job_class: string;
  might: number;
  vitality: number;
  reflex: number;
  skills: string[];
  assigned_to: string | null;
  is_ready?: boolean;
  isBot?: boolean;
}

export default function App() {
  const [locale, setLocale] = useState<'en' | 'vi'>('vi');
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  
  const [currentPlayerName, setCurrentPlayerName] = useState<string>(() => {
    return localStorage.getItem('forest_game_username') || '';
  });
  const [typedName, setTypedName] = useState<string>('');

  const [name, setName] = useState('');
  const [jobClass, setJobClass] = useState('Fighter');
  const [might, setMight] = useState(0);
  const [vitality, setVitality] = useState(0);
  const [reflex, setReflex] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [arenaState, setArenaState] = useState<Record<string, {
    hp1: number;
    hp2: number;
    round: number;
    logs: string[];
    winner: string | null;
  }>>({});

  const t = LANG[locale];
  const totalPointsSpent = might + vitality + reflex;
  const pointsLeft = 10 - totalPointsSpent;

  useEffect(() => {
    fetchCharacters();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, () => {
        fetchCharacters();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCharacters = async () => {
    const { data } = await supabase.from('characters').select('*').order('id', { ascending: false });
    if (data) setCharacters(data);
  };

  const savePlayerIdentity = (nameString: string) => {
    const trimmed = nameString.trim();
    if (!trimmed) return;
    setCurrentPlayerName(trimmed);
    localStorage.setItem('forest_game_username', trimmed);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedSkills.length !== 2 || pointsLeft !== 0 || isSaving) return;
    setIsSaving(true);
    try {
      await supabase.from('characters').insert([{ name, job_class: jobClass, might, vitality, reflex, skills: selectedSkills, created_by: currentPlayerName }]);
      setName(''); setMight(0); setVitality(0); setReflex(0); setSelectedSkills([]);
      await fetchCharacters();
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  // 🌟 FALLBACK REPAIR FIXED: Forces immediate app refresh upon asset claims
  const handleClaim = async () => {
    if (!selectedCharId || !currentPlayerName) return;
    if (isTournamentActive) return alert(t.lobbyLockAlert);
    await supabase.from('characters').update({ assigned_to: currentPlayerName, is_ready: false }).eq('id', selectedCharId);
    setSelectedCharId('');
    await fetchCharacters(); 
  };

  // 🌟 FALLBACK REPAIR FIXED: Forces immediate app refresh upon releases
  const handleRelease = async (charId: number) => {
    await supabase.from('characters').update({ assigned_to: null, is_ready: false }).eq('id', charId);
    await fetchCharacters();
  };

  // 🌟 FALLBACK REPAIR FIXED: Forces immediate app refresh upon ticking ready boxes
  const handleToggleReady = async (charId: number, currentReadyState: boolean) => {
    await supabase.from('characters').update({ is_ready: !currentReadyState }).eq('id', charId);
    await fetchCharacters();
  };

  const handleDeleteCharacter = async (charId: number, createdBy: string | null) => {
    const msg = locale === 'en' ? "Permanently destroy this hero data?" : "Xóa vĩnh viễn anh hùng này khỏi máy chủ?";
    if (!window.confirm(msg)) return;
    if (createdBy && createdBy !== currentPlayerName) return alert("Access Denied!");
    await supabase.from('characters').delete().eq('id', charId);
    await fetchCharacters();
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else if (selectedSkills.length < 2) {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const activeClaimed = characters
    .filter(c => c.assigned_to !== null && c.assigned_to !== '')
    .sort((a, b) => a.assigned_to.localeCompare(b.assigned_to));

  const isTournamentActive = activeClaimed.length > 0 && activeClaimed.every(c => c.is_ready === true);

  const generateTournamentPairs = () => {
    if (!isTournamentActive) return [];
    const pairs: [Combatant, Combatant][] = [];
    
    for (let i = 0; i < activeClaimed.length; i += 2) {
      if (i + 1 < activeClaimed.length) {
        pairs.push([activeClaimed[i], activeClaimed[i + 1]]);
      } else {
        const unclaimedPool = characters.filter(c => c.assigned_to === null || c.assigned_to === '');
        let botTemplate = unclaimedPool[0] || IMMUTABLE_SYSTEM_BOTS[i % IMMUTABLE_SYSTEM_BOTS.length];
        
        const shadowBot: Combatant = {
          id: botTemplate.id.toString().includes('sys') ? botTemplate.id : `bot_${botTemplate.id}_${i}`,
          name: botTemplate.name,
          job_class: botTemplate.job_class,
          might: botTemplate.might,
          vitality: botTemplate.vitality,
          reflex: botTemplate.reflex,
          skills: botTemplate.skills,
          assigned_to: `[${t.botLabel}]`,
          is_ready: true,
          isBot: true
        };
        pairs.push([activeClaimed[i], shadowBot]);
      }
    }
    return pairs;
  };

  const runInteractiveRound = (matchId: string, p1: Combatant, p2: Combatant) => {
    const current = arenaState[matchId] || {
      hp1: 40 + p1.vitality * 5,
      hp2: 40 + p2.vitality * 5,
      round: 1,
      logs: [`🏁 Battle Commenced! ${p1.name} vs ${p2.name}`],
      winner: null
    };

    if (current.winner) return;

    let h1 = current.hp1;
    let h2 = current.hp2;
    let rNum = current.round;
    let nextLogs = [...current.logs];

    nextLogs.push(`⚔️ --- Round ${rNum} ---`);

    const icon1 = DICE_ICONS[Math.floor(Math.random() * DICE_ICONS.length)];
    const icon2 = DICE_ICONS[Math.floor(Math.random() * DICE_ICONS.length)];

    const r1 = Math.floor(Math.random() * 20) + 1 + p1.reflex;
    const r2 = Math.floor(Math.random() * 20) + 1 + p2.reflex;
    const first = r1 >= r2 ? p1 : p2;
    const second = r1 >= r2 ? p2 : p1;
    
    const d1 = Math.floor(Math.random() * 10) + 1 + first.might;
    if (first.id === p1.id) { h2 -= d1; nextLogs.push(`💥 ${first.name} rolls ${icon1} Initiative: ${r1} -> Strikes for ${d1} DMG.`); }
    else { h1 -= d1; nextLogs.push(`💥 ${first.name} rolls ${icon2} Initiative: ${r2} -> Strikes for ${d1} DMG.`); }

    if (h1 > 0 && h2 > 0) {
      const d2 = Math.floor(Math.random() * 10) + 1 + second.might;
      if (second.id === p1.id) { h2 -= d2; nextLogs.push(`⚡ ${second.name} rolls ${icon1} Counter -> Hits back for ${d2} DMG.`); }
      else { h1 -= d2; nextLogs.push(`⚡ ${second.name} rolls ${icon2} Counter -> Hits back for ${d2} DMG.`); }
    }

    nextLogs.push(`❤️ Remaining HP -> ${p1.name}: ${Math.max(0, h1)} | ${p2.name}: ${Math.max(0, h2)}`);

    let finalWinner = null;
    if (h1 <= 0 || h2 <= 0) {
      finalWinner = h1 > h2 ? p1.name : p2.name;
      nextLogs.push(`🎉 WINNER: ${finalWinner} stands victorious!`);
    }

    setArenaState(prev => ({
      ...prev,
      [matchId]: { hp1: h1, hp2: h2, round: rNum + 1, logs: nextLogs, winner: finalWinner }
    }));
  };

  const myClaimedCharacter = characters.find(c => c.assigned_to === currentPlayerName && currentPlayerName !== '');
  const currentlyBrowsingCharacter = characters.find(c => c.id.toString() === selectedCharId);
  const tournamentMatches = generateTournamentPairs();

  return (
    <div style={{ backgroundColor: '#000', color: '#0f0', fontFamily: 'monospace', minHeight: '100vh', width: '100%', boxSizing: 'border-box', padding: '20px' }}>
      
      <style>{`
        body, html, #root { background-color: #000 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
      `}</style>

      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f0', paddingBottom: '10px' }}>
        <div>
          <h1>{t.title}</h1>
          <p style={{ color: '#888' }}>{t.sub}</p>
        </div>
        <button onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')} style={{ background: '#0f0', color: '#000', fontWeight: 'bold', cursor: 'pointer', height: '40px', padding: '0 15px', border: 'none' }}>
          {t.langBtn}
        </button>
      </header>

      {/* REGISTRATION SYSTEM */}
      <section style={{ margin: '20px 0', padding: '20px', border: '1px dashed #0f0', backgroundColor: '#050505' }}>
        {!currentPlayerName ? (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 'bold' }}>{t.nameInputLabel}</label>
            <input type="text" placeholder={t.nameInputPlace} value={typedName} onChange={(e) => setTypedName(e.target.value)} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px', fontSize: '16px' }} />
            <button onClick={() => savePlayerIdentity(typedName)} disabled={!typedName.trim()} style={{ background: '#0f0', color: '#000', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>Join Lobby</button>
          </div>
        ) : myClaimedCharacter ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <img src={getGameAssetUrl('avatar', myClaimedCharacter.job_class)} alt="avatar" style={{ width: '100px', height: '100px', border: '2px solid #0f0', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/000000/00ff00?text=' + myClaimedCharacter.job_class; }} />
              <div>
                <h2 style={{ color: '#fff', margin: '0' }}>👑 {currentPlayerName} ({myClaimedCharacter.name})</h2>
                <p style={{ margin: '5px 0 0 0' }}>Class: {myClaimedCharacter.job_class} | HP: {40 + myClaimedCharacter.vitality * 5} | Might: +{myClaimedCharacter.might} | Speed: +{myClaimedCharacter.reflex}</p>
                <button 
                  onClick={() => handleToggleReady(myClaimedCharacter.id, myClaimedCharacter.is_ready || false)} 
                  style={{ marginTop: '10px', background: myClaimedCharacter.is_ready ? '#300' : '#040', color: myClaimedCharacter.is_ready ? '#ff3333' : '#0f0', border: `1px solid ${myClaimedCharacter.is_ready ? '#ff3333' : '#0f0'}`, padding: '6px 15px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}
                >
                  {myClaimedCharacter.is_ready ? t.unreadyBtn : t.readyBtn}
                </button>
              </div>
            </div>
            <button onClick={() => handleRelease(myClaimedCharacter.id)} style={{ background: '#ff0000', color: '#fff', border: 'none', padding: '12px 25px', cursor: 'pointer', fontWeight: 'bold' }}>{t.releaseBtn}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#fff' }}>Player: <strong>{currentPlayerName}</strong></span>
              <button onClick={() => { setCurrentPlayerName(''); localStorage.removeItem('forest_game_username'); setSelectedCharId(''); }} style={{ background: '#333', color: '#aaa', border: '1px solid #555', padding: '5px 10px', cursor: 'pointer' }}>Change User</button>
              <select value={selectedCharId} onChange={(e) => setSelectedCharId(e.target.value)} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px', minWidth: '200px' }}>
                <option value="">-- Select Character --</option>
                {characters.map(char => (
                  <option key={char.id} value={char.id} disabled={char.assigned_to !== null}>{char.name} [{char.job_class}] {char.assigned_to ? `(${t.taken} ${char.assigned_to})` : ''}</option>
                ))}
              </select>
              <button onClick={handleClaim} disabled={!selectedCharId} style={{ background: '#0f0', color: '#000', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>{t.claimBtn}</button>
            </div>
            {currentlyBrowsingCharacter && (
              <div style={{ display: 'flex', gap: '20px', border: '1px solid #0f0', padding: '15px', backgroundColor: '#000', maxWidth: '500px', alignItems: 'center' }}>
                <img src={getGameAssetUrl('avatar', currentlyBrowsingCharacter.job_class)} alt="avatar" style={{ width: '120px', height: '120px', border: '2px solid #0f0', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/120x120/000000/00ff00?text=' + currentlyBrowsingCharacter.job_class; }} />
                <div>
                  <h3 style={{ color: '#fff', margin: '0' }}>{currentlyBrowsingCharacter.name}</h3>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}>HP: {40 + currentlyBrowsingCharacter.vitality * 5} | Might: +{currentlyBrowsingCharacter.might} | Speed: +{currentlyBrowsingCharacter.reflex}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* READY CHECK ROOM */}
      {activeClaimed.length > 0 && !isTournamentActive && (
        <section style={{ margin: '20px 0', padding: '20px', border: '1px dashed #ff0', backgroundColor: '#0a0a00' }}>
          <h3 style={{ color: '#ff0', marginTop: 0 }}>{t.waitingRoomTitle}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeClaimed.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #220', paddingBottom: '8px' }}>
                <span style={{ color: '#fff' }}>👤 <strong>@{c.assigned_to}</strong> leading <strong>{c.name}</strong> ({c.job_class})</span>
                <span style={{ color: c.is_ready ? '#0f0' : '#ff3333', fontWeight: 'bold' }}>{c.is_ready ? `[ ${t.statusReady} ]` : `[ ${t.statusWaiting} ]`}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TOURNAMENT LIVE INTERFACE */}
      {isTournamentActive && tournamentMatches.length > 0 && (
        <section style={{ margin: '30px 0', padding: '20px', border: '2px solid #0f0', backgroundColor: '#020a02' }}>
          <h2 style={{ textAlign: 'center', color: '#fff', letterSpacing: '2px' }}>{t.arenaTitle}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '20px' }}>
            {tournamentMatches.map((match) => {
              const [p1, p2] = match;
              const matchId = `match_${p1.id}_vs_${p2.id}`;
              
              const liveState = arenaState[matchId] || {
                hp1: 40 + p1.vitality * 5,
                hp2: 40 + p2.vitality * 5,
                round: 1,
                logs: [`🏁 Ready Check Verified. Click below to roll dice!`],
                winner: null
              };

              return (
                <div key={matchId} style={{ border: '1px solid #0f0', padding: '20px', backgroundColor: '#000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    
                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                      <img src={getGameAssetUrl(liveState.winner === p1.name ? 'win' : liveState.winner === p2.name ? 'lost' : 'avatar', p1.job_class)} style={{ width: '110px', height: '110px', border: '1px solid #0f0', objectFit: 'cover' }} alt="avatar" />
                      <h3 style={{ color: '#fff', margin: '5px 0 0 0' }}>{p1.name}</h3>
                      <div style={{ color: '#0f0', fontSize: '14px', marginTop: '3px' }}>❤️ HP: {Math.max(0, liveState.hp1)}</div>
                      <span style={{ color: '#888', fontSize: '12px' }}>@{p1.assigned_to}</span>
                    </div>

                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff0' }}>{t.vsText}</div>

                    <div style={{ textAlign: 'center', minWidth: '150px' }}>
                      <img src={getGameAssetUrl(liveState.winner === p2.name ? 'win' : liveState.winner === p1.name ? 'lost' : 'avatar', p2.job_class)} style={{ width: '110px', height: '110px', border: p2.isBot ? '1px dashed #ff0' : '1px solid #0f0', objectFit: 'cover' }} alt="avatar" />
                      <h3 style={{ color: p2.isBot ? '#ff0' : '#fff', margin: '5px 0 0 0' }}>{p2.name} {p2.isBot && `(${t.botLabel})`}</h3>
                      <div style={{ color: '#0f0', fontSize: '14px', marginTop: '3px' }}>❤️ HP: {Math.max(0, liveState.hp2)}</div>
                      <span style={{ color: '#888', fontSize: '12px' }}>@{p2.assigned_to}</span>
                    </div>

                  </div>

                  <div style={{ textAlign: 'center', marginTop: '15px' }}>
                    {liveState.winner ? (
                      <div style={{ color: '#ff0', fontWeight: 'bold', border: '1px solid #ff0', padding: '8px', background: '#220', display: 'inline-block' }}>
                        {t.matchOverBtn}
                      </div>
                    ) : (
                      <button 
                        onClick={() => runInteractiveRound(matchId, p1, p2)} 
                        style={{ background: '#0f0', color: '#000', border: 'none', padding: '10px 25px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', fontSize: '15px' }}
                      >
                        {t.rollBtn} {liveState.round}
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: '15px', border: '1px dashed #050', padding: '12px', backgroundColor: '#050505', maxHeight: '180px', overflowY: 'auto', fontSize: '13px' }}>
                    {liveState.logs.map((log, lIdx) => (
                      <div key={lIdx} style={{ margin: '4px 0', color: log.includes('WINNER') ? '#ff0' : log.includes('Round') ? '#fff' : '#888' }}>{log}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CREATE HERO SECTION */}
      {!myClaimedCharacter && !isTournamentActive && (
        <section style={{ border: '1px solid #0f0', padding: '20px', maxWidth: '800px', marginBottom: '30px' }}>
          <h2>[ {t.createTitle} ]</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder={t.namePlace} value={name} onChange={(e) => setName(e.target.value)} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px', fontSize: '16px' }} required />
            <select value={jobClass} onChange={(e) => { setJobClass(e.target.value); setSelectedSkills([]); }} style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '10px', fontSize: '16px' }}>
              {Object.keys(CLASSES_DATA).map(cls => <option key={cls} value={cls}>{CLASSES_DATA[cls as keyof typeof CLASSES_DATA][locale]}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '10px', border: '1px dashed #030', backgroundColor: '#020202', maxWidth: '350px' }}>
              <img src={getGameAssetUrl('avatar', jobClass)} alt="Preview" style={{ width: '100px', height: '100px', border: '2px solid #0f0', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/000000/00ff00?text=' + jobClass; }} />
              <div><span style={{ color: '#888', fontSize: '12px', display: 'block' }}>{t.classPreview}</span><strong>{jobClass}</strong></div>
            </div>

            {/* ATTRIBUTES */}
            <div>
              <h3>{t.pointsLeft} <span style={{ color: pointsLeft === 0 ? '#0f0' : '#ff0', fontSize: '22px' }}>{pointsLeft}</span></h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[ ['might', t.might, might, setMight], ['vitality', t.vit, vitality, setVitality], ['reflex', t.reflex, reflex, setReflex] ].map(([key, label, val, setVal]: any) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ minWidth: '250px' }}>{label} : <strong>{val}</strong></span>
                    <button type="button" onClick={() => pointsLeft > 0 && setVal(val + 1)} style={{ background: '#222', color: '#0f0', border: '1px solid #0f0', width: '35px', height: '35px', cursor: 'pointer' }}>+</button>
                    <button type="button" onClick={() => val > 0 && setVal(val - 1)} style={{ background: '#222', color: '#0f0', border: '1px solid #0f0', width: '35px', height: '35px', cursor: 'pointer' }}>-</button>
                  </label>
                ))}
              </div>
            </div>

            {/* SKILLS PANEL */}
            <div>
              <h3>{t.skillsLabel} ({selectedSkills.length}/2)</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                {CLASSES_DATA[jobClass as keyof typeof CLASSES_DATA].skills.map(skill => {
                  const isSelected = selectedSkills.includes(skill);
                  return <button key={skill} type="button" onClick={() => toggleSkill(skill)} style={{ padding: '10px 15px', border: '1px solid #0f0', background: isSelected ? '#0f0' : '#000', color: isSelected ? '#000' : '#0f0', cursor: 'pointer', fontWeight: 'bold' }}>{skill}</button>;
                })}
              </div>

              <div style={{ border: '1px dashed #050', padding: '15px', backgroundColor: '#050505' }}>
                {CLASSES_DATA[jobClass as keyof typeof CLASSES_DATA].skills.map(skill => {
                  const isSelected = selectedSkills.includes(skill);
                  const details = SKILLS_LIBRARY[skill] || { en: "Class spell card asset.", vi: "Kỹ năng bổ trợ hệ phái." };
                  return (
                    <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '15px 0', opacity: isSelected ? 1 : 0.4, color: isSelected ? '#0f0' : '#888', fontSize: '15px' }}>
                      {isSelected && (
                        <img src={getGameAssetUrl('skill', jobClass, skill)} alt={skill} style={{ width: '100px', height: '100px', border: '1px solid #0f0', backgroundColor: '#111', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/000000/00ff00?text=Skill'; }} />
                      )}
                      <div>
                        <span style={{ fontWeight: 'bold' }}>• {skill}:</span>{' '}
                        <span style={{ fontStyle: 'italic' }}>{locale === 'en' ? details.en : details.vi}</span>
                        {isSelected && <span style={{ marginLeft: '10px', color: '#ff0' }}>[SELECTED]</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={pointsLeft !== 0 || selectedSkills.length !== 2 || isSaving} style={{ background: '#0f0', color: '#000', padding: '15px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', opacity: (pointsLeft === 0 && selectedSkills.length === 2 && !isSaving) ? 1 : 0.5 }}>
              {isSaving ? t.savingBtn : t.saveBtn}
            </button>
          </form>
        </section>
      )}

      {/* ROSTER / MAINTENANCE */}
      <section style={{ border: '1px solid #500', padding: '20px', backgroundColor: '#0a0000' }}>
        <h2 style={{ color: '#ff3333', marginTop: 0 }}>{t.rosterTitle}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {characters.map(char => {
            const hasCreatorRegistered = char.created_by !== null && char.created_by !== undefined && char.created_by !== '';
            const isMyOwnCreation = char.created_by === currentPlayerName;
            const canIDeleteThis = !hasCreatorRegistered || isMyOwnCreation;

            return (
              <div key={char.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #300', padding: '10px', backgroundColor: '#000' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img src={getGameAssetUrl('avatar', char.job_class)} alt="avatar" style={{ width: '40px', height: '40px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/40x40/000000/ff0000?text=?'; }} />
                  <div>
                    <strong>{char.name}</strong> <span style={{ color: '#888' }}>({char.job_class})</span> 
                    {char.assigned_to && <span style={{ marginLeft: '10px', color: '#ff0', fontSize: '12px' }}>★ {t.taken} {char.assigned_to}</span>}
                    {hasCreatorRegistered && <span style={{ marginLeft: '10px', color: '#888', fontSize: '11px', fontStyle: 'italic' }}>({t.creatorLabel}: {char.created_by})</span>}
                  </div>
                </div>
                {canIDeleteThis ? <button onClick={() => handleDeleteCharacter(char.id, char.created_by)} style={{ background: '#300', color: '#ff3333', border: '1px solid #ff3333', padding: '5px 12px', cursor: 'pointer' }}>{t.deleteBtn}</button> : <span style={{ color: '#444', fontStyle: 'italic', fontSize: '13px' }}>[Locked by {char.created_by}]</span>}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}