// Static content: seasons, folk, memories, forks in the wood.

export const SEASON_MS = 40 * 60 * 1000; // each season lasts 40 real minutes
export const SEASONS = [
  { id: 'spring', name: 'Spring Thaw', note: 'Leaves refill faster', col: [0.55, 1.0, 0.62], chargeMul: 1.25, valueMul: 1, cogMul: 1, moodMul: 1 },
  { id: 'summer', name: 'Ember Summer', note: 'Sap is worth more', col: [1.0, 0.5, 0.16], chargeMul: 1, valueMul: 1.15, cogMul: 1, moodMul: 1 },
  { id: 'autumn', name: 'Gilded Autumn', note: 'Mills shed more cogs', col: [1.0, 0.76, 0.22], chargeMul: 1, valueMul: 1, cogMul: 2, moodMul: 1 },
  { id: 'winter', name: 'Hush of Winter', note: 'Folk linger and tell tales', col: [0.6, 0.86, 1.0], chargeMul: 1, valueMul: 1, cogMul: 1, moodMul: 2 },
];

export const PALETTES = {
  auto: { name: 'Follow the seasons', col: null },
  ember: { name: 'Ember', col: [1.0, 0.5, 0.16] },
  frost: { name: 'Frost', col: [0.6, 0.86, 1.0] },
  rose: { name: 'Rose', col: [1.0, 0.42, 0.68] },
  verdigris: { name: 'Verdigris', col: [0.3, 0.95, 0.72] },
};

export const BUILD = {
  lantern: { name: 'Lantern', sap: 25, cogs: 0, grow: 1.35, blurb: 'Leaves nearby refill 40% faster, and nearby folk grow fond of the light.' },
  hut: { name: 'Winder Hut', sap: 50, cogs: 2, grow: 1.5, cogGrow: 2, blurb: 'A home for one clockwork Winder, who shakes the leaves for you.' },
  mill: { name: 'Gear Mill', sap: 70, cogs: 0, grow: 1.4, blurb: 'Sap passing through is refined by +2, and sometimes sheds a cog.' },
  chime: { name: 'Chime', sap: 40, cogs: 0, grow: 1.35, blurb: 'Sap that rings a chime is worth 20% more. Higher chimes sing higher notes.' },
};

export const FOLK = [
  { name: 'Pell', trait: 'Hums one note, always flat', tales: [
    'Pell insists the note is not flat. The world is a little sharp.',
    'Pell once held that note all night so lost moths could find the way home.',
    'Pell admits it is the last tune the Giant whistled while he worked.'] },
  { name: 'Mira', trait: 'Keeps a ledger of sunsets', tales: [
    'Mira has logged four thousand sunsets. None are real; she watches the workshop lamp dim.',
    'Mira scores each dimming out of ten. She has never given a ten. She is saving it.',
    'Tonight Mira gave the lamp a ten, and did not explain.'] },
  { name: 'Odo', trait: 'Afraid of heights, lives in a tree', tales: [
    'Odo says the trick is to look at your feet. Your feet are very high up.',
    'Odo climbed to the top once. He says the view was terrible and he would like to go again.',
    'Odo has started naming the clouds on the ceiling. They answer, he says, slowly.'] },
  { name: 'Tansy', trait: 'Names every leaf', tales: [
    'Tansy knows the leaf by the old branch is called Gerald. Gerald knows it too.',
    'Tansy says leaves do not mind falling. They mind not being asked.',
    'Tansy ran out of names and began giving the leaves hers. Nobody minds.'] },
  { name: 'Brindle', trait: 'Collects acorn caps', tales: [
    'Brindle has four hundred acorn caps and no acorns. A mystery, she says, for later.',
    'Brindle says the caps are hats for the little ones, too small to see.',
    'Brindle found an acorn. She is keeping it very carefully, with its cap on.'] },
  { name: 'Quill', trait: 'Writes letters to the Giant', tales: [
    'Quill\'s letters begin "Dear Giant, we are well." She posts them through a crack in the bench.',
    'Quill has started getting replies. They are mostly sawdust, and they smell kind.',
    'The latest reply says only: "Keep growing."'] },
  { name: 'Fenwick', trait: 'Winds clocks that have no hands', tales: [
    'Fenwick says a clock with no hands is still a clock, only more honest.',
    'Fenwick listens to each one tick. They all keep the same very long time.',
    'Fenwick stopped winding one, and in the quiet heard a heartbeat above the ceiling.'] },
  { name: 'Marrow', trait: 'Tells jokes in the wrong order', tales: [
    'Marrow delivers the punchline first. People laugh anyway, out of kindness, then confusion.',
    'Marrow says a joke is a small bridge. Cross it in any direction you like.',
    'Marrow told one in the right order for once. It was about the Giant. It was not funny. It was true.'] },
  { name: 'Juniper', trait: 'Sleeps inside the chimes', tales: [
    'Juniper says the chimes hum when no one is touching them. Mostly lullabies.',
    'Juniper dreams in three notes. The tree sings the fourth.',
    'Juniper woke up and sang all four. The whole canopy leaned in.'] },
  { name: 'Wick', trait: 'Carries a lantern with nothing in it', tales: [
    'Wick says the lantern is not empty. It is full of the part of the dark that is shy.',
    'Wick let a moth inside. It left a little glow behind and refused to take credit.',
    'Wick\'s lantern is lit now. He says he did nothing. He is smiling.'] },
  { name: 'Thimble', trait: 'Smaller than the others, with opinions about it', tales: [
    'Thimble says being small just means more of the world is above you, which is a lot.',
    'Thimble found a door that only Thimble fits through. Thimble is not telling.',
    'Behind the door was another workshop. Thimble waved. Someone waved back.'] },
  { name: 'Sorrel', trait: 'Knows the way everywhere, never goes', tales: [
    'Sorrel can give you directions to the far end of the bench. She has never left the branch.',
    'Sorrel says knowing the road is its own kind of travelling.',
    'Sorrel took one step beyond the last rope today. She says the view is the same, but nicer.'] },
];

export const BARKS = [
  'Mm. Warm today.', 'Did that leaf just wink?', 'One more shake and then a rest. (Never.)',
  'The bench creaks when it is happy.', 'Look at the moths!', 'My key feels tight today.',
  'I counted the stars on the ceiling. Eleven.', 'Careful on the ropes, friends.',
  'Is it me, or is the tree humming?', 'Nice drip.', 'The lamp is a little lower tonight.',
];
export const WINTER_BARKS = ['Cold on the cogs. Tell me a tale?', 'Sit with me a moment.', 'Hush. Listen to the tree.'];

export const ANECDOTES = [
  '{name} counted {n} moths and gave each one a small name.',
  '{name} polished the chimes until they argued about who was shinier.',
  '{name} climbed higher than ever, looked down, and climbed back very quickly.',
  '{name} fell asleep on a branch. The tree let them.',
  '{name} told the same joke {n} times. It improved.',
  '{name} wrote a letter to the Giant and has not yet posted it.',
  '{name} followed a drop of sap all the way down, just to see where it went.',
  '{name} hummed to the leaves. {n} of them hummed back.',
];

export const LORE = [
  { id: 'bench', title: 'The Bench', text: 'You woke in the dark between a spool and a screw. The ground is wood, the sky is a ceiling, and far above something very large is breathing slowly.', test: () => true },
  { id: 'hand', title: 'A Warm Hand', text: 'The tree remembers a hand: huge, careful, pressing a seed into a crack in the bench. Then a long time of nothing.', test: (s, g) => g.grown >= 1 },
  { id: 'rope', title: 'Agreed Branches', text: 'A rope is only a branch that two places agreed on.', test: (s) => s.bridges.length >= 1 },
  { id: 'folk', title: 'The Winders', text: 'The Winders were here before you. The Giant made them a few at a time, and stopped when his hands got tired.', test: (s) => s.winders.length >= 1 },
  { id: 'song', title: 'The Song', text: 'Every chime hangs at its own height and its own note. When enough of them ring together the leaves lean in to listen.', test: (s, g) => g.count('chime') >= 2 },
  { id: 'rings', title: 'Rings', text: 'Cut the trunk and the rings do not count years. They count hours. The Giant spent each of them here.', test: (s) => s.total >= 600 },
  { id: 'hollow', title: 'The Hollow', text: 'The cottages at the roots were built for people who never came. Now there are lights in the windows.', test: (s) => s.hollow >= 3 },
  { id: 'letters', title: 'The Drawer', text: 'In a drawer of the bench: letters in handwriting too large to read. The Winders take turns spelling them out.', test: (s) => s.total >= 4000 },
  { id: 'reason', title: 'Why He Left', text: 'He did not leave. He made himself small enough to fit into the work. Look closely at the one who hums.', test: (s) => s.winders.length >= 4 && s.total >= 9000 },
  { id: 'toward', title: 'Toward', text: 'The tree is not growing toward the light. The light is the tree, reaching out to find him.', test: (s, g) => g.grown >= 80 },
];

// Forks in the wood: permanent choices that shape the run.
export const BOONS = {
  deep: { name: 'Deep roots', desc: 'Sap is worth 25% more.', apply: (m) => { m.value *= 1.25; } },
  wide: { name: 'Wide roots', desc: 'Leaves hold 3 more charges.', apply: (m) => { m.cap += 3; } },
  moth: { name: 'Befriend the moth', desc: 'A new Winder joins you, with a home of their own on the lowest branch.', apply: () => {}, gift: 'winder' },
  keep: { name: 'Keep its lantern', desc: 'Lanterns refill leaves 15% more.', apply: (m) => { m.lamp += 0.15; } },
  hearth: { name: 'Hearth', desc: 'Winders move and work 25% faster.', apply: (m) => { m.wspeed *= 1.25; } },
  harvest: { name: 'Harvest', desc: 'Mills find twice as many cogs.', apply: (m) => { m.cog *= 2; } },
  sing: { name: 'Sing', desc: 'Chimes add 15% more to sap.', apply: (m) => { m.chime += 0.15; } },
  silence: { name: 'Keep the silence', desc: 'Sap rolls faster and the tree drips more often.', apply: (m) => { m.speed *= 1.3; m.drip *= 0.8; } },
  // generated, repeatable boons for the endless part
  g_value: { name: 'Sweeter sap', desc: 'Sap is worth 10% more.', apply: (m) => { m.value *= 1.1; } },
  g_cap: { name: 'Roomier leaves', desc: 'Leaves hold 1 more charge.', apply: (m) => { m.cap += 1; } },
  g_feet: { name: 'Quicker feet', desc: 'Winders move 10% faster.', apply: (m) => { m.wspeed *= 1.1; } },
  g_cog: { name: 'Cog luck', desc: 'Mills find 25% more cogs.', apply: (m) => { m.cog *= 1.25; } },
  g_chime: { name: 'Louder chimes', desc: 'Chimes add 4% more.', apply: (m) => { m.chime += 0.04; } },
  g_mood: { name: 'Warmer hearth', desc: 'Folk grow fond 20% faster.', apply: (m) => { m.mood *= 1.2; } },
  g_drip: { name: 'Steady drip', desc: 'The tree drips 10% more often.', apply: (m) => { m.drip *= 0.9; } },
  g_sleep: { name: 'Long sleeps', desc: 'You earn 10% more while away.', apply: (m) => { m.offline *= 1.1; } },
};
export const GENERATED = ['g_value', 'g_cap', 'g_feet', 'g_cog', 'g_chime', 'g_mood', 'g_drip', 'g_sleep'];

export const CHOICES = [
  { key: 'roots', at: 8, title: 'Where should the roots reach?', body: 'The tree leans toward you, waiting. Its roots can go down or out, not both.', options: ['deep', 'wide'] },
  { key: 'moth', at: 20, title: 'A pilgrim moth arrives', body: 'It carries a tiny lantern and has flown a very long way. It will not say from where.', options: ['moth', 'keep'] },
  { key: 'season', at: 40, title: 'Hearth or Harvest?', body: 'The folk are tired, but the mills are full. There is only so much warmth to go around.', options: ['hearth', 'harvest'] },
  { key: 'song', at: 70, title: 'Sing, or keep the silence?', body: 'The branches have started to hum. The tree wants to know whether to join in.', options: ['sing', 'silence'] },
];
export const GEN_START = 100;
export const GEN_STEP = 30;
