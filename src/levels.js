// Level definitions and story text for The Last Knight.

const GAME_W = 960;
const GAME_H = 540;
const GROUND_TILE = 64;
const GROUND_ROWS = 2;
const GROUND_Y = GAME_H - GROUND_TILE * GROUND_ROWS; // top surface of the ground
const LIGHT_SIZE = 448; // must match light.png in tools/generate_assets.py

// The rift the boss opens in the lair floor. The art is 48x96 with the crack
// on its bottom edge, so it is hung off the ground line rather than centred.
const RIFT_H = 96;
const RIFT_SCALE = 2.0;

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

// The six with a `voice` are the ones the lair is listening for: each holds
// a piece of what the order did, and it can tell whether you heard them.
//
// Helper: someone who lives here. They have no lines - they walk their patch,
// watch you go by, and run when something with teeth turns up.
const folk = (id, x, spread = 90) =>
  ({ id, x, home: [x - spread, x + spread] });

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
    // Places, not decoration: each one is somewhere people are camped, and the
    // scenery generator leaves room around them.
    camps: [
      { x: 700, kind: "camp", span: 540 },
      { x: 2180, kind: "market", span: 460 },
      { x: 4830, kind: "camp", span: 540 },
      { x: 7520, kind: "market", span: 460 },
    ],
    torches: [1500, 3500, 5700, 8400],
    // Deep in the middle of the long chapter, under a bush on open ground.
    // It was behind the spawn point at first, which sounded clever until the
    // chime gave it away in the first second of the game, before the player
    // had done anything to earn it.
    shard: { x: 6500, y: GROUND_Y - 20, cover: "prop_bush_autumn_0" },
    npcs: [
      {
        id: "maren", voice: "maren", x: 520, name: "Elder Maren",
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
        id: "bram", voice: "bram", x: 4900, name: "Bram",
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
      folk("villager_woman", 620, 110), folk("villager_child", 760, 130),
      folk("villager_hand", 860, 80), folk("villager_man", 2060, 70),
      folk("villager_old", 2300, 50), folk("villager_child", 4700, 120),
      folk("villager_woman", 4980, 90), folk("villager_man", 7420, 80),
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
    camps: [
      { x: 1084, kind: "graves", span: 460 },
      { x: 3400, kind: "market", span: 460 },
      { x: 5100, kind: "camp", span: 540 },
    ],
    torches: [820, 2400, 4500, 5500],
    // On the high ledge of the first climb, resting on the surface - a
    // platform is drawn from its centre, so the surface is 28px above the y
    // in this table and anything placed at that y is buried inside the slab.
    // In this chapter the darkness is the cover: your lantern has to reach it.
    shard: { x: 1780, y: MID - 40 },
    npcs: [
      {
        id: "wisp", voice: "wisp", x: 2600, name: "The Wisp", float: true,
        lines: [
          say("The Wisp", "wisp")("Little light. Little light, in all this dark."),
          say("The Wisp", "wisp")("We were wardens too, once. We forgot our promise, and the forest kept us anyway."),
          kn("What promise?"),
          say("The Wisp", "wisp")("The one your order swore to the old one beneath the roots."),
          say("The Wisp", "wisp")("Ask the stone. Stone remembers better than men do."),
        ],
        after: [say("The Wisp", "wisp")("Down. Down and under the roots. The stone is waiting.")],
      },
      {
        id: "merchant", x: 3400, name: "Odrin the Pedlar", shop: true,
        lines: [
          say("Odrin", "merchant")("Don't look so surprised. Where the road is worst is where the trade is."),
          kn("You followed me in here?"),
          say("Odrin", "merchant")("I followed the custom. You are the custom."),
          say("Odrin", "merchant")("Stock's the same, prices are the same. I'm not a thief, whatever the elder says."),
        ],
      },
      {
        id: "villager_hand", voice: "gravedigger", x: 1084, name: "The Gravedigger",
        lines: [
          say("The Gravedigger", "villager_hand")("Mind the fresh ones. The soil hasn't settled."),
          kn("How many this month?"),
          say("The Gravedigger", "villager_hand")("Nine. And not one of them from an animal, before you ask."),
          say("The Gravedigger", "villager_hand")("They walk in from the west and they lie down. That's all. They just lie down."),
        ],
        after: [say("The Gravedigger", "villager_hand")("Keep your lantern lit and keep walking.")],
      },
      folk("villager_old", 5060, 70), folk("villager_woman", 5180, 80),
      folk("villager_man", 3320, 60),
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
    camps: [
      { x: 900, kind: "mine", span: 460 },
      { x: 3900, kind: "market", span: 460 },
      { x: 4288, kind: "mine", span: 460 },
    ],
    torches: [700, 1200, 2400, 3100, 4600, 5700],
    // The topmost ledge in the cave, which the route never needs.
    shard: { x: 1820, y: HIGH - 40 },
    npcs: [
      {
        id: "gethin", voice: "gethin", x: 2600, name: "Gethin",
        lines: [
          say("Gethin", "gethin")("Don't touch the reliefs. They have waited nine hundred years to be read, not handled."),
          say("Gethin", "gethin")("There - a dragon giving up its fire so the valley could grow."),
          say("Gethin", "gethin")("And there, men promising to guard what that fire made."),
          kn("And the last panel?"),
          say("Gethin", "gethin")("Empty. Someone chiselled it away."),
          say("Gethin", "gethin")("Whatever we did, knight, we did not want it remembered."),
        ],
        after: [say("Gethin", "gethin")("Go on up. I'll keep reading. Someone should.")],
        // He only says this once he can see what you are carrying.
        onShard: [
          say("Gethin", "gethin")("Wait. Show me that. Where did you - no, don't tell me."),
          say("Gethin", "gethin")("That is the last panel. Someone broke it up and scattered the pieces."),
          say("Gethin", "gethin")("Not smashed, knight. Scattered. Whoever did it wanted it findable."),
          say("Gethin", "gethin")("Find the rest. Four, if the mortar lines are anything to go by."),
        ],
      },
      {
        id: "merchant", x: 3900, name: "Odrin the Pedlar", shop: true,
        lines: [
          say("Odrin", "merchant")("Careful where you put your feet. Half this floor is older than the other half."),
          say("Odrin", "merchant")("The diggers pay in raw stone. I'll take yours cut, if you have it."),
        ],
      },
      folk("villager_hand", 860, 70), folk("villager_man", 940, 60),
      folk("villager_old", 4240, 60), folk("villager_hand", 4340, 70),
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
    camps: [
      { x: 1110, kind: "camp", span: 540 },
      { x: 3488, kind: "market", span: 460 },
      { x: 5150, kind: "camp", span: 540 },
    ],
    torches: [900, 2500, 4400, 5500],
    // Mid-chapter, on open snow under a bush. It was on the last stretch
    // before the gate at first, which put it right on the line everybody
    // sprints along - and too close to the camp to hide in.
    shard: { x: 2050, y: GROUND_Y - 20, cover: "prop_bush_snow_0" },
    npcs: [
      {
        id: "yvane", voice: "yvane", x: 1750, name: "Yvane",
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
      {
        id: "merchant", x: 3488, name: "Odrin the Pedlar", shop: true,
        lines: [
          say("Odrin", "merchant")("Gods, there you are. I was starting to think I'd freeze out here for nothing."),
          kn("You should turn back, Odrin."),
          say("Odrin", "merchant")("And carry all this down again? No. Buy something, then we're both better off."),
        ],
      },
      folk("villager_woman", 1060, 70), folk("villager_child", 1160, 60),
      folk("villager_old", 5100, 60),
    ],
  },
  {
    key: "lair",
    name: "The Dragon's Lair",
    theme: "lair",
    width: 2100,
    // Lit by two torches, an abandoned stall and whatever is standing at the
    // far end. You hear it, and then you see the glow, and then you see it.
    dark: true,
    gloom: 0.95,        // darker than the nightwood or the cave
    lightScale: 0.52,   // the knight's own torch does not reach far in here
    torchLight: 0.7,
    swordPower: 2,      // every sword hit counts double in the lair
    goalX: null, // there is no gate here - the chapter ends at a question
    boss: "cthulhu",
    story: [
      "The road ends at a door in the hillside, and the door is standing open.",
      "Every telling of this story ends with a dragon. The carvings say a dragon.",
      "Whatever is waiting at the end of the hall is not a dragon.",
      "It looks up, and it knows the crest on your shield.",
    ],
    gaps: [],
    platforms: [{ x: 620, y: LOW }, { x: 1480, y: LOW }],
    spikes: [],
    enemies: [],
    crystals: [],
    checkpoints: [],
    // His stall is still standing at the mouth of it. He is not behind it.
    // He said he would not go in, and it turns out he did not wait either.
    camps: [{ x: 444, kind: "market", span: 460 }],
    torches: [640, 1480],
  },
];

// --- the last exchange -----------------------------------------------------
// It stops fighting at zero and asks the only thing it still wants to know.
// Yvane warned you it would, and that it can tell.
//
// Until the knight can put a name to it, it does not get one: the dialogue
// box says nothing about who is speaking, which is the whole point of the
// third answer.
const dr = say("???", "cthulhu");
const sev = say("Severus", "cthulhu");

const LAST_QUESTION = [
  dr("Enough."),
  dr("You fight the way they taught you. Straight ahead, and without asking."),
  dr("None of you has ever once stopped to look at what you were swinging at."),
  kn("Get up."),
  dr("No. I have carried this for nine hundred years and I am putting it down."),
  dr("One question first. I have asked it before and been lied to."),
  dr("When your order swore to keep this place - did you ever mean it?"),
  {
    speaker: "Knight", portrait: "knight",
    options: [
      { text: "We meant every word of it.", value: "lie" },
      { text: "No. We never did.", value: "truth" },
      // Only offered to a knight who heard all six of them and put the
      // chiselled-out panel back together.
      { text: "You meant it. You are Severus.", value: "name", secret: true },
    ],
  },
];

const LAST_REPLY = {
  lie: [
    dr("...No."),
    dr("Yvane stood where you are standing and told me the truth, and I let her walk out."),
    dr("You looked me in the eye and said it anyway."),
    dr("Then there is nothing here worth sparing. Not the wood. Not you."),
  ],
  truth: [
    dr("No."),
    dr("Say it again. Slowly. I have waited a long time to hear somebody say it."),
    kn("We never meant it. Not one of us. We took what the fire made and we called it ours."),
    dr("Thank you."),
    dr("Keep the wood, knight. Not because you swore to. Because somebody has to."),
  ],
  name: [
    dr("..."),
    dr("Say that again."),
    kn("Severus. First of the wardens. You are the only one who kept the promise."),
    sev("Nobody has used that name since there was anyone left who knew it."),
    sev("They put a dragon on the wall because a dragon is a thing you can kill."),
    sev("They chiselled me off the wall so no one would find out what keeping it costs."),
    kn("I found the pieces. All four. It is back together."),
    sev("Then put it somewhere they cannot reach it, and let me go home."),
  ],
};

// --- the three endings -----------------------------------------------------
// Which one you get is the answer you gave, and the answer you were able to
// give is what you took the trouble to learn.
const ENDINGS = {
  bad: {
    title: "THE LAST LIE",
    heading: "NOBODY EVER KNEW WHO HE WAS",
    music: "ending_bad",
    tint: 0x2a0f12,
    lines: [
      "The green takes you where you stand, and the wood does not mourn it.",
      "It settles back onto the stone and waits for the next one.",
      "It will ask them the same question. They will lie too.",
      "The last panel stays blank, and the name on it stays gone.",
    ],
  },
  good: {
    title: "THE TRUTH, LATE",
    heading: "THE FOREST DRAWS BREATH AGAIN",
    music: "ending_good",
    tint: 0x14200f,
    lines: [
      "It lets go, and nine hundred years go with it.",
      "The green runs back down into the floor, and the floor closes over it.",
      "Lanterns relight along the ridge, one after another, all the way down.",
      "You never learned its name. The wardens kept that much from you.",
    ],
  },
  secret: {
    title: "SEVERUS",
    heading: "THE FIRST WARDEN GOES HOME",
    music: "ending_secret",
    tint: 0x101828,
    lines: [
      "The wings go first, then the tendrils, then the long years of it.",
      "What is left on the stone is an old man in a warden's coat, and he is smiling.",
      "You set the four pieces back into the wall. The panel is whole.",
      "It shows a man walking into the dark on purpose, so that nobody else has to.",
      "Someone will read it. That was all he ever wanted.",
    ],
  },
};
