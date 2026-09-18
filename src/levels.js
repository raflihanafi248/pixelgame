// Level definitions and story text for Pixel Forest Adventure.

const GAME_W = 960;
const GAME_H = 540;
const GROUND_TILE = 64;
const GROUND_ROWS = 2;
const GROUND_Y = GAME_H - GROUND_TILE * GROUND_ROWS; // top surface of the ground
const LIGHT_SIZE = 448; // must match light.png in tools/generate_assets.py

// Platform tiers, tuned to the jump arc: a -700 jump under 1500 gravity rises
// ~163px, so LOW is both reachable from the ground and high enough to walk
// under; MID and HIGH are only reachable by hopping up from the tier below.
const LOW = 282;   // reachable from the ground, and you can still walk under it
const MID = 200;
const HIGH = 130;

// Helper: an arc of collectible crystals, the shape of a jump.
function arc(x, y, count, step = 54, rise = 26) {
  const out = [];
  const mid = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    const t = i - mid;
    out.push({ x: x + t * step, y: y - (rise - Math.abs(t) * (rise / (mid + 0.8))) });
  }
  return out;
}

// Helper: a straight row of crystals.
function row(x, y, count, step = 52) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ x: x + i * step, y });
  return out;
}

const LEVELS = [
  {
    key: "forest",
    name: "Hutan Musim Gugur",
    theme: "autumn",
    width: 5400,
    goalX: 5200,
    story: [
      "Dedaunan gugur jauh lebih cepat dari musim mana pun.",
      "Lentera-lentera penjaga padam satu per satu, tanpa angin.",
      "Sesuatu yang besar sedang terbangun di jantung hutan.",
    ],
    gaps: [[1632, 192], [3104, 192]],
    platforms: [
      { x: 1735, y: LOW }, { x: 2200, y: MID },
      { x: 3225, y: LOW }, { x: 3600, y: MID },
      { x: 4240, y: LOW }, { x: 4600, y: MID },
    ],
    spikes: [{ x: 2380, count: 2 }],
    enemies: [
      { type: "slime", x: 760 }, { type: "goblin", x: 1150 },
      { type: "slime", x: 2050 }, { type: "wolf", x: 2500 },
      { type: "goblin", x: 2900 }, { type: "goblin", x: 3700 },
      { type: "wolf", x: 4100 }, { type: "slime", x: 4500 },
      { type: "goblin", x: 4850 },
    ],
    crystals: [
      ...row(600, 330, 4), ...arc(1735, 244, 5), ...row(2140, 162, 3),
      ...arc(3225, 244, 5), ...row(3540, 162, 3), ...row(4560, 162, 4),
    ],
    checkpoints: [1250, 2700, 4050],
  },
  {
    key: "nightwood",
    name: "Hutan Malam Berkabut",
    theme: "night",
    width: 5800,
    goalX: 5600,
    dark: 340, // radius of the lantern light; presence of this enables darkness
    story: [
      "Malam turun lebih cepat dari seharusnya.",
      "Kabut membawa bisikan — dan itu bukan bahasa manusia.",
      "Cahayamu tinggal sejengkal. Jangan biarkan padam.",
    ],
    gaps: [[1408, 192], [2752, 192], [4288, 192]],
    platforms: [
      { x: 1500, y: LOW }, { x: 1780, y: MID },
      { x: 2860, y: LOW }, { x: 3160, y: MID },
      { x: 3700, y: LOW }, { x: 4400, y: LOW }, { x: 4700, y: MID },
    ],
    spikes: [{ x: 2150, count: 3 }, { x: 3980, count: 2 }],
    enemies: [
      { type: "wolf", x: 800 }, { type: "goblin", x: 1150 },
      { type: "wraith", x: 1900 }, { type: "wolf", x: 2400 },
      { type: "goblin", x: 3150 }, { type: "wraith", x: 3550 },
      { type: "wolf", x: 4000 }, { type: "wraith", x: 4700 },
      { type: "goblin", x: 5050 }, { type: "wolf", x: 5350 },
    ],
    crystals: [
      ...arc(1500, 244, 5), ...row(1720, 162, 3), ...arc(2860, 244, 5),
      ...row(3100, 162, 3), ...arc(4400, 244, 5), ...row(5150, 330, 4),
    ],
    checkpoints: [1150, 2600, 4150],
  },
  {
    key: "crystalcave",
    name: "Gua Kristal",
    theme: "cave",
    width: 6000,
    goalX: 5800,
    dark: 400,
    story: [
      "Di bawah akar-akar tua, ada reruntuhan yang lebih tua lagi.",
      "Relief di dindingnya: seekor naga, dan manusia yang mengingkarinya.",
      "Kristal-kristal itu berdenyut, seperti detak jantung yang marah.",
    ],
    gaps: [[1216, 192], [2176, 192], [3392, 192], [4608, 192]],
    platforms: [
      { x: 1310, y: LOW }, { x: 1600, y: MID }, { x: 1820, y: HIGH },
      { x: 2310, y: LOW }, { x: 2600, y: MID },
      { x: 3510, y: LOW }, { x: 3800, y: MID }, { x: 4020, y: HIGH },
      { x: 4710, y: LOW }, { x: 5000, y: MID },
      { x: 5300, y: LOW },
    ],
    spikes: [{ x: 1900, count: 3 }, { x: 3050, count: 3 }, { x: 5050, count: 2 }],
    enemies: [
      { type: "bat", x: 900 }, { type: "bat", x: 1500 },
      { type: "goblin", x: 1750 }, { type: "bat", x: 2350 },
      { type: "slime", x: 2800 }, { type: "bat", x: 3200 },
      { type: "wraith", x: 3700 }, { type: "bat", x: 4200 },
      { type: "goblin", x: 4400 }, { type: "bat", x: 4900 },
      { type: "wraith", x: 5350 },
    ],
    crystals: [
      ...arc(1310, 244, 5), ...row(1760, 96, 4), ...arc(2310, 244, 5),
      ...row(2540, 162, 3), ...arc(3510, 244, 5), ...row(3960, 96, 4),
      ...arc(4710, 244, 5), ...row(4940, 162, 4),
    ],
    checkpoints: [1000, 2750, 4350],
  },
  {
    key: "frozenpeak",
    name: "Puncak Beku",
    theme: "snow",
    width: 5800,
    goalX: 5600,
    ice: true, // slippery ground
    story: [
      "Jantung hutan membeku, dan ini bukan ulah musim dingin.",
      "Yang kau rasakan di udara bukan amarah. Itu luka.",
      "Di atas sana, ada sayap yang tak pernah benar-benar tidur.",
    ],
    gaps: [[1472, 192], [2880, 192], [4224, 192]],
    platforms: [
      { x: 1610, y: LOW }, { x: 1900, y: MID },
      { x: 3010, y: LOW }, { x: 3300, y: MID },
      { x: 4310, y: LOW }, { x: 4600, y: MID },
      { x: 5000, y: LOW },
    ],
    spikes: [{ x: 2350, count: 3 }, { x: 3800, count: 3 }],
    enemies: [
      { type: "icewolf", x: 850 }, { type: "slime", x: 1250 },
      { type: "icewolf", x: 2050 }, { type: "wraith", x: 2600 },
      { type: "icewolf", x: 3500 }, { type: "bat", x: 3900 },
      { type: "icewolf", x: 4600 }, { type: "wraith", x: 4950 },
      { type: "icewolf", x: 5300 },
    ],
    crystals: [
      ...arc(1610, 244, 5), ...row(2150, 330, 4), ...arc(3010, 244, 5),
      ...row(3240, 162, 3), ...arc(4310, 244, 5), ...row(4940, 330, 4),
    ],
    checkpoints: [1200, 2750, 4350],
  },
  {
    key: "lair",
    name: "Sarang Sang Naga",
    theme: "lair",
    width: 2100,
    goalX: null, // the gate only appears once the dragon falls
    boss: "dragon",
    story: [
      "Naga itu menatapmu, dan mengenali lambang di perisaimu.",
      '"Kalian berjanji menjaga," desisnya. "Kalian ingkar."',
      "Tidak ada lagi kata yang tersisa di antara kalian. Hanya api.",
    ],
    gaps: [],
    platforms: [{ x: 620, y: LOW }, { x: 1480, y: LOW }],
    spikes: [],
    enemies: [],
    crystals: [],
    checkpoints: [],
  },
];

const ENDING_LINES = [
  "Naga itu jatuh berlutut, lalu larut menjadi kabut keemasan.",
  "Dedaunan bersemi kembali — tapi hanya sejauh tempat kau berdiri.",
  "Jauh di bawah reruntuhan, sesuatu yang lain membuka matanya.",
  "Sang Penjaga menyarungkan pedang. Perjalanannya belum selesai.",
];
