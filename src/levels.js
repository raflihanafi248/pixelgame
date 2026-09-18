// Level definitions and story text for The Last Knight.

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

// Crystals lost each time the knight falls.
const DEATH_PENALTY = 25;

// Dialogue helpers: `kn` is the knight answering; `say` builds anyone else.
const kn = (text) => ({ speaker: "Knight", portrait: "knight", text });
const say = (speaker, portrait) => (text) => ({ speaker, portrait, text });

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
    name: "The Autumn Wood",
    theme: "valley",
    width: 8800,
    goalX: 8600,
    story: [
      "The leaves are falling far too early this year.",
      "One by one the warden's lanterns go out. There is no wind.",
      "Something old is waking at the heart of the forest.",
    ],
    gaps: [[1408, 192], [2752, 192], [4288, 192], [5632, 192], [6976, 192]],
    platforms: [
      { x: 1735, y: LOW }, { x: 2200, y: MID },
      { x: 3072, y: LOW }, { x: 3400, y: MID }, { x: 3680, y: HIGH },
      { x: 4600, y: LOW }, { x: 4900, y: MID },
      { x: 5250, y: LOW },
      { x: 5960, y: LOW }, { x: 6260, y: MID },
      { x: 6620, y: LOW },
      { x: 7300, y: LOW }, { x: 7620, y: MID }, { x: 7900, y: HIGH },
      { x: 8280, y: LOW },
    ],
    spikes: [
      { x: 2600, count: 2 }, { x: 3900, count: 3 }, { x: 5300, count: 2 },
      { x: 6700, count: 3 }, { x: 8000, count: 2 },
    ],
    enemies: [
      // The wood gets steadily less friendly the further east you walk.
      { type: "slime", x: 780 }, { type: "goblin", x: 1150 },
      { type: "bat", x: 1850 }, { type: "slime", x: 2050 }, { type: "wolf", x: 2480 },
      { type: "goblin", x: 3150 }, { type: "bat", x: 3450 },
      { type: "slime", x: 3700 }, { type: "goblin", x: 4050 }, { type: "wraith", x: 4200 },
      { type: "wolf", x: 4700 }, { type: "bat", x: 5000 },
      { type: "goblin", x: 5150 }, { type: "slime", x: 5480 },
      { type: "wraith", x: 6050 }, { type: "wolf", x: 6350 },
      { type: "bat", x: 6600 }, { type: "goblin", x: 6850 },
      { type: "slime", x: 7400 }, { type: "wolf", x: 7700 }, { type: "bat", x: 7950 },
      { type: "wraith", x: 8200 }, { type: "goblin", x: 8450 },
    ],
    crystals: [
      ...row(600, 330, 4), ...arc(1735, 244, 5), ...row(2140, 162, 3),
      ...arc(3072, 244, 5), ...row(3340, 162, 3), ...row(3640, 96, 4),
      ...arc(4600, 244, 5), ...row(4840, 162, 4), ...row(5190, 244, 3),
      ...arc(5960, 244, 5), ...row(6200, 162, 4), ...row(6560, 244, 3),
      ...arc(7300, 244, 5), ...row(7560, 162, 3), ...row(7860, 96, 4),
      ...arc(8280, 244, 5), ...row(8420, 330, 3),
    ],
    checkpoints: [1250, 2650, 4150, 5500, 6900, 8100],
    npcs: [
      {
        id: "maren", x: 520, name: "Elder Maren",
        lines: [
          say("Elder Maren", "maren")("You came. I had started to think no one would."),
          kn("The lanterns are out, elder. Every one, from the ridge down to the river."),
          say("Elder Maren", "maren")("Not out. Refused. A warden's lantern only dies when the pact it was lit for is broken."),
          say("Elder Maren", "maren")("Walk east and find what is breaking it."),
          say("Elder Maren", "maren")("And knight - whatever speaks to you out there, listen before you swing."),
        ],
        after: [say("Elder Maren", "maren")("East, child. And keep your shield where it can be seen.")],
      },
      {
        id: "merchant", x: 2180, name: "Odrin the Pedlar", shop: true,
        lines: [
          say("Odrin", "merchant")("Careful, careful - that's my whole stall you nearly walked through."),
          kn("You set up shop here? With the wood like this?"),
          say("Odrin", "merchant")("Where else? Everyone's running east past me. Best road I've had in years."),
          say("Odrin", "merchant")("Crystals only. The old stones under this forest still hold a little of the fire."),
          say("Odrin", "merchant")("Drink it, sharpen with it, wear it. It won't last - but neither will you, at this rate."),
        ],
      },
      {
        id: "bram", x: 4750, name: "Bram",
        lines: [
          say("Bram", "bram")("You're the warden's man. Good. Then tell me why my axe won't bite."),
          say("Bram", "bram")("Cut into an oak this morning and it bled warm. Warm, like a throat."),
          kn("The wood is waking up."),
          say("Bram", "bram")("Then I'm done cutting. Take the east road if you must."),
          say("Bram", "bram")("Just don't take anything from it. Not a branch, not a stone."),
        ],
        after: [say("Bram", "bram")("Still going east? Gods keep you. I'm going the other way.")],
      },
      {
        // A second stall before the deep wood: last chance to spend a full purse.
        id: "merchant", x: 7520, name: "Odrin the Pedlar", shop: true,
      },
    ],
  },
  {
    key: "nightwood",
    name: "The Misted Nightwood",
    theme: "night",
    width: 5800,
    goalX: 5600,
    dark: 340, // radius of the lantern light; presence of this enables darkness
    story: [
      "Night falls sooner than it has any right to.",
      "The mist carries whispers, and none of them are human.",
      "Your light reaches barely an arm's length. Do not let it die.",
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
    npcs: [
      {
        id: "wisp", x: 2600, name: "The Wisp", float: true,
        lines: [
          say("The Wisp", "wisp")("Little light. Little light, in all this dark."),
          say("The Wisp", "wisp")("We were wardens too, once. We forgot our promise, and the forest kept us anyway."),
          kn("What promise?"),
          say("The Wisp", "wisp")("The one your order swore to the old one beneath the roots."),
          say("The Wisp", "wisp")("Ask the stone. Stone remembers better than men do."),
        ],
        after: [say("The Wisp", "wisp")("Down. Down and under the roots. The stone is waiting.")],
      },
    ],
  },
  {
    key: "crystalcave",
    name: "The Crystal Cave",
    theme: "cave",
    width: 6000,
    goalX: 5800,
    dark: 400,
    story: [
      "Beneath the old roots lie ruins older still.",
      "Carved on the walls: a dragon, and the men who broke their word.",
      "The crystals pulse like an angry heartbeat.",
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
    npcs: [
      {
        id: "gethin", x: 2600, name: "Gethin",
        lines: [
          say("Gethin", "gethin")("Don't touch the reliefs. They have waited nine hundred years to be read, not handled."),
          say("Gethin", "gethin")("There - a dragon giving up its fire so the valley could grow."),
          say("Gethin", "gethin")("And there, men promising to guard what that fire made."),
          kn("And the last panel?"),
          say("Gethin", "gethin")("Empty. Someone chiselled it away."),
          say("Gethin", "gethin")("Whatever we did, knight, we did not want it remembered."),
        ],
        after: [say("Gethin", "gethin")("Go on up. I'll keep reading. Someone should.")],
      },
    ],
  },
  {
    key: "frozenpeak",
    name: "The Frozen Peak",
    theme: "snow",
    width: 5800,
    goalX: 5600,
    ice: true, // slippery ground
    story: [
      "The heart of the forest is freezing, and winter is not to blame.",
      "What hangs in the air is not rage. It is a wound.",
      "Somewhere above, wings that have never truly slept.",
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
    checkpoints: [1200, 2750, 4150],
    npcs: [
      {
        id: "yvane", x: 1750, name: "Yvane",
        lines: [
          say("Yvane", "yvane")("Don't. Don't waste the warmth on me, I'm past it."),
          say("Yvane", "yvane")("I reached the lair. I saw it sleeping, and I thought: mercy. Strike now, while it cannot answer."),
          kn("Yvane."),
          say("Yvane", "yvane")("It woke. And it did not kill me. It asked me a question and let me walk away."),
          say("Yvane", "yvane")("That was worse."),
          kn("What did it ask?"),
          say("Yvane", "yvane")("Whether we ever meant it. When it asks you - answer honestly. It can tell."),
        ],
        after: [say("Yvane", "yvane")("Go. Before the cold finishes what it started.")],
      },
    ],
  },
  {
    key: "lair",
    name: "The Dragon's Lair",
    theme: "lair",
    width: 2100,
    goalX: null, // the gate only appears once the dragon falls
    boss: "dragon",
    story: [
      "The dragon looks at you, and knows the crest on your shield.",
      '"You swore to keep this place," it hisses. "You broke that oath."',
      "There is nothing left to say between you. Only fire.",
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
  "The dragon falls to its knees, then unravels into golden mist.",
  "Leaves bud again - but only as far as where you stand.",
  "Far beneath the ruins, something else opens its eyes.",
  "The knight sheathes his sword. The road is not finished.",
];
