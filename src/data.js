// Static content for the Marigold Line: rooms, passengers, regions, postcards, memories.

// ---------- rooms ----------
// cost is Charm per tile. 'base' rooms are available from the start; the others are
// brought aboard by passengers who carry the know-how for them.
export const ROOMS = {
  sleeper:    { name: 'Sleeper',      base: true,  cost: 5,  min: 2, max: 6, floor: 0x7a5a8a, floor2: 0x6e4f7e, blurb: 'Berths for sleepers. Every three tiles holds one passenger.' },
  dining:     { name: 'Dining Car',   base: true,  cost: 6,  min: 2, max: 6, floor: 0xb8794a, floor2: 0xa96b40, blurb: 'Long tables, warm lamps and something always on the stove.' },
  parlor:     { name: 'Parlor',       base: true,  cost: 6,  min: 2, max: 6, floor: 0x9a4a5a, floor2: 0x8c424f, blurb: 'Armchairs and a rug. The best place for nothing in particular.' },
  corridor:   { name: 'Corridor',     base: true,  cost: 2,  min: 2, max: 14, line: true, floor: 0xc9b48a, floor2: 0xbba67c, blurb: 'A one-tile passage. It links rooms and shortens the walk to dinner.' },
  garden:     { name: 'Garden Room',  base: false, cost: 8,  min: 2, max: 6, floor: 0x4f8a4a, floor2: 0x477f43, blurb: 'Soil, light and things growing where they should not fit.' },
  library:    { name: 'Library',      base: false, cost: 8,  min: 2, max: 6, floor: 0x6a4a34, floor2: 0x5f402d, blurb: 'Shelves to the ceiling, which here is a matter of opinion.' },
  workshop:   { name: 'Workshop',     base: false, cost: 8,  min: 2, max: 6, floor: 0x7a7a80, floor2: 0x6e6e74, blurb: 'A bench, a vice and a great many small drawers.' },
  observatory:{ name: 'Observatory',  base: false, cost: 9,  min: 3, max: 6, floor: 0x32406e, floor2: 0x2a3762, blurb: 'A brass dome and a telescope pointed at whatever is out there.' },
  bath:       { name: 'Bathhouse',    base: false, cost: 8,  min: 2, max: 6, floor: 0x4a9aa8, floor2: 0x428d9b, blurb: 'A deep warm pool. Steam, and not much conversation.' },
  music:      { name: 'Music Room',   base: false, cost: 8,  min: 3, max: 6, floor: 0xb8964a, floor2: 0xab8a42, blurb: 'A piano that is slightly bigger on the inside, like everything else.' },
  aquarium:   { name: 'Aquarium',     base: false, cost: 9,  min: 3, max: 6, floor: 0x2e6a8a, floor2: 0x276080, blurb: 'Glass tanks, slow fish, and a very calm hum.' },
};
// what each need sends passengers to
export const HOBBY_ROOM = { garden: 'garden', library: 'library', workshop: 'workshop', observatory: 'observatory', bath: 'bath', music: 'music', aquarium: 'aquarium', chat: 'parlor' };

// ---------- authored passengers (met in this order) ----------
export const PASSENGERS = [
  { name: 'Rosalind Thorne', trait: 'Seedswoman with a coat full of pockets', hobby: 'garden', gift: 'garden',
    line: 'A woman in a coat with far too many pockets waves a watering can. "I am bound for the Salt Orchards. I have never been invited to dinner by a train."',
    keep: { name: 'A pocketful of seeds', line: 'Everywhere on the train, something small is quietly growing.' },
    tales: ['Rosalind keeps seeds from every place she has left. She says a pocket is a very small country.', 'Rosalind plants one seed at every stop and never returns. "Someone will. That is the point."', 'Rosalind admits the seeds are not for growing. They are for leaving things behind that look like hope.'] },
  { name: 'Ambrose Quill', trait: 'Retired postmaster who still sorts the mail', hobby: 'library', gift: 'library',
    line: 'A thin man with a ledger under his arm tips his hat. "Postmaster, retired. Bound for Lantern Wick, where my last letter has been waiting forty years."',
    keep: { name: 'A last letter, finally delivered', line: 'The train feels a little more like it is going somewhere.' },
    tales: ['Ambrose sorts the dining car\'s napkins by destination. They do not know where they are going. He does.', 'Ambrose says every letter is a small door someone left open on purpose.', 'The forty-year-old letter is addressed to him. He has not opened it. He says that is what makes it perfect.'] },
  { name: 'Tamsin Brass', trait: 'Clockmender who talks to broken things', hobby: 'workshop', gift: 'workshop',
    line: 'Someone is sitting on a trunk, fixing a pocket watch with their teeth and a hairpin. "Tamsin. Clocks. Is your engine whistling? That is a cry for help."',
    keep: { name: 'A tuned boiler gauge', line: 'The engine hums a little steadier, and a little more fondly.' },
    tales: ['Tamsin says nothing is truly broken. It is only waiting for someone to ask what is wrong.', 'Tamsin found a clock in the Lost & Found that runs backward. She has decided it is correct.', 'Tamsin opened the engine\'s oldest clock and found a note: "Do not hurry her. She is carrying more than you can see."'] },
  { name: 'Old Eben', trait: 'Stargazer who lost his telescope in a lake', hobby: 'observatory', gift: 'observatory',
    line: 'An old man in a long scarf stares up at the dusk. "I have misplaced a telescope and a great deal of sky. Are you going anywhere with a view?"',
    keep: { name: 'A map of the night sky', line: 'The windows show more stars after dark.' },
    tales: ['Eben says the stars are not far away, only patient.', 'Eben has named the star he can see from every region. He never says the names aloud, only points.', 'Eben notes that the stars look the same from the Marigold as they did from home, and says that is how he knows the train is real.'] },
  { name: 'Cressida Vale', trait: 'Opera singer on an unplanned holiday', hobby: 'music', gift: 'music',
    line: 'A woman in a green velvet coat balances three hatboxes on one finger. "I have stopped singing for a season. Do you have a piano? I will not touch it."',
    keep: { name: 'A tune left in the rafters', line: 'Sometimes, very faintly, the carriages hum in harmony.' },
    tales: ['Cressida touches the piano on the third day, mostly by accident.', 'Cressida sings to the engine at night. It is, she says, an excellent audience, and never asks for an encore.', 'Cressida finishes the song she never could. Nobody applauds. Everybody understands.'] },
  { name: 'Madame Oussou', trait: 'Keeper of a bathhouse that does not exist anymore', hobby: 'bath', gift: 'bath',
    line: 'A small, imposing woman in a robe the color of a sunset hands you a towel. "I keep a bathhouse. Kept. Have you got a room that is warm and slightly rude to rushing?"',
    keep: { name: 'A tin of bath salts', line: 'Everyone on the train smells faintly of lavender and has stopped arguing.' },
    tales: ['Madame Oussou says a good soak solves three things and ruins one. Nobody knows what the one is.', 'Madame Oussou reveals the old bathhouse was under a lake. "Hot water will find a way. It always does."', 'Madame Oussou admits she is not going anywhere. She is looking for a place that deserves her.'] },
  { name: 'Fenwick Moss', trait: 'Fisherman who has never caught anything on purpose', hobby: 'aquarium', gift: 'aquarium',
    line: 'A man in waders carries a bucket with a very calm fish. "This is Gerald. He is not for sale, but he does love a long train ride."',
    keep: { name: 'Gerald\'s tank, left behind', line: 'A small, steady gurgling comes from somewhere in the walls.' },
    tales: ['Fenwick says fish do not mind water. They mind the quiet.', 'Fenwick has been to the bottom of most of the lakes on the Line. He says they are all the same lake.', 'Fenwick lets Gerald out of the bucket. Gerald swims in a tight, happy circle and does not leave.'] },
  { name: 'Juniper Oakes', trait: 'A child traveling with a very serious goose', hobby: 'chat', gift: 'parlor',
    line: 'A child in oversized boots stands next to a goose. "This is Admiral. She is in charge. We are going to see the sea. Do you have a sea?"',
    keep: { name: 'Admiral\'s feather', line: 'There is a very small flag on the roof. It was not there before.' },
    tales: ['Juniper says Admiral does not approve of the dining car. She approves of the aisle, loudly.', 'Juniper draws a map of the train. It has far more rooms than the real one, and she insists they are all there.', 'Juniper sees the sea. Admiral is unimpressed. Juniper is not.'] },
  { name: 'Hob Marlowe', trait: 'A lamplighter who has run out of lamps', hobby: 'workshop', gift: 'workshop',
    line: 'A man with a pole and nothing to light leans against the station wall. "Lamplighter. All my lamps got tired. Is there anywhere that needs a little more light?"',
    keep: { name: 'A very patient lamp', line: 'Somewhere on the train, a lamp lights itself when someone is sad.' },
    tales: ['Hob says a lamp does not push the dark away. It just keeps it company.', 'Hob lights each room before the passengers wake. He has not told anyone, and everyone knows.', 'Hob has run out of lamps and has begun lighting them with other people\'s kind words.'] },
  { name: 'Delphine Aubrey', trait: 'Cartographer of places that keep moving', hobby: 'library', gift: 'library',
    line: 'A woman unrolls a map that is clearly wriggling. "Cartographer. I draw places that will not hold still. May I ride along until this one stops?"',
    keep: { name: 'A map that mostly behaves', line: 'The next fork feels a little clearer than it used to.' },
    tales: ['Delphine says the Line is not on any map, so she has begun drawing it.', 'Delphine has found three regions that are the same place at different hours.', 'Delphine\'s map of the Line ends in a blank. She says that is not an error. It is an invitation.'] },
  { name: 'Barnaby Finch', trait: 'Retired train driver who prefers to be a passenger', hobby: 'chat', gift: 'parlor',
    line: 'A broad man in a driver\'s cap looks at the engine with a mixture of pride and envy. "Don\'t ask me to drive. I am here to be driven. And to criticize the whistle."',
    keep: { name: 'A driver\'s thermos, still warm', line: 'The tea in the dining car never goes cold.' },
    tales: ['Barnaby says every engine has a moral character, and this one is a worrier.', 'Barnaby leans out the window every night. He says some roads are better listened to than looked at.', 'Barnaby says the Marigold has never been late in her life. She is just very, very early for something.'] },
  { name: 'The Lady Without a Name', trait: 'Arrives with one small suitcase and no explanation', hobby: 'observatory', gift: 'observatory',
    line: 'A woman in grey stands very still on the platform. "I would like to ride to wherever this line ends. Please do not ask my name. I am saving it."',
    keep: { name: 'A name, spoken once', line: 'The train goes quiet for a moment, then hums on.' },
    tales: ['She reads the same page of the same book at every stop and has stopped pretending it is for the story.', 'She asks what the track is made of. Nobody knows. She smiles as if that is an answer.', 'She tells you the name. You promise never to repeat it. The train, she says, already knew.'] },
];

// generated passengers for the endless part
export const GEN_FIRST = ['Ada', 'Bram', 'Cora', 'Dov', 'Elsie', 'Finn', 'Greta', 'Hector', 'Ione', 'Jasper', 'Kit', 'Lena', 'Milo', 'Nell', 'Orla', 'Percy', 'Quinn', 'Rue', 'Sunny', 'Tobias', 'Una', 'Vera', 'Wilf', 'Yara', 'Zeb'];
export const GEN_LAST = ['Applewhite', 'Bellwether', 'Cobb', 'Dunmore', 'Everly', 'Fairweather', 'Greaves', 'Hollis', 'Inkwell', 'Jessop', 'Kettle', 'Lark', 'Mossop', 'Nettles', 'Ogden', 'Pennywhistle', 'Rook', 'Sparrow', 'Thistle', 'Underhill', 'Voss', 'Wick'];
export const GEN_TYPES = [
  { trait: 'Collects the first light of every morning', hobby: 'observatory', tales: ['{n} keeps jars of dawn on the windowsill. They are empty, and {n} says that is the point.', '{n} reveals each morning is stored by color, not date.', '{n} opens every jar at once. The carriage fills with a very polite sunrise.'] },
  { trait: 'Teaches plants to sing', hobby: 'garden', tales: ['{n} says plants have been singing all along. We have only just got good at listening.', '{n} hums to a tomato until it blushes.', '{n} puts every plant in a circle. They are, apparently, a choir.'] },
  { trait: 'Writes the same letter in a hundred ways', hobby: 'library', tales: ['{n} says the letter has only one sentence and ninety-nine ways to say it.', '{n} asked every passenger to read it aloud once. Everyone cried, politely.', '{n} posts the letter at last. It was addressed to {n}.'] },
  { trait: 'Fixes things that are not broken yet', hobby: 'workshop', tales: ['{n} says maintenance is a love letter to the future.', '{n} oils a hinge that has never squeaked. It does not squeak any less.', '{n} announces that everything on the train is now fixed. The train hums with suspicion.'] },
  { trait: 'Hums just under the pitch of the engine', hobby: 'music', tales: ['{n} says the engine has a key, and it is slightly sad.', '{n} has found three passengers who hum in the same key and is trying not to cry.', '{n} organizes a hum. The whole train joins in. The engine, offended, blows a note.'] },
  { trait: 'Believes every fish remembers them', hobby: 'aquarium', tales: ['{n} nods hello to every fish. They nod back, or at least blink.', '{n} says fish keep memories in the shapes of their circles.', '{n} sits at the tank for an hour. The fish all face the same way, patiently.'] },
  { trait: 'Is always warm when everyone else is cold', hobby: 'bath', tales: ['{n} says the trick is a hot drink and a cold opinion.', '{n} runs a bath for the whole carriage. Nobody needed one. Everyone is glad.', '{n} admits the warmth is not a gift, only a habit of staying near people.'] },
  { trait: 'Gossips about the weather', hobby: 'chat', tales: ['{n} says a drizzle in the Fens is the Hills\' fault. Nobody argues.', '{n} predicts the weather by how the tea settles. It is wrong, but memorably so.', '{n} says tomorrow will be exactly like today, but happier. It is.'] },
];

// ---------- the world outside ----------
export const REGION_ADJ = ['Copper', 'Misty', 'Glass', 'Hollow', 'Saffron', 'Quiet', 'Drowned', 'Lantern', 'Moth', 'Salt', 'Cinder', 'Velvet', 'Amber', 'Thistle', 'Silver', 'Wandering', 'Hushed', 'Sorrel'];
export const REGION_NOUN = ['Hills', 'Fens', 'Orchards', 'Downs', 'Shallows', 'Reaches', 'Meadows', 'Cliffs', 'Marsh', 'Wold', 'Barrens', 'Gardens', 'Heath', 'Terraces', 'Vale'];
export const STOP_A = ['Hollin', 'Marrow', 'Wick', 'Thorn', 'Brindle', 'Quay', 'Fen', 'Ash', 'Linden', 'Cobble', 'Sorrel', 'Plum', 'Tarn', 'Larch'];
export const STOP_B = ['Halt', 'Cross', 'Junction', 'Quay', 'End', 'Green', 'Bridge', 'Lane', 'Gate', 'Wharf', 'Mill'];
// sky top, sky bottom, fog, ground, accent (leaf/tint), mood name
export const PALETTES = [
  { sky: [0x1b1346, 0xf0907a], fog: 0x6a3f6a, ground: 0x4f5e3a, tint: 0xe58a5a, ridge: 0x4a2f56 },
  { sky: [0x0b1f3a, 0x5aa8c0], fog: 0x2f5f78, ground: 0x3a5a52, tint: 0x8fd0d8, ridge: 0x234c62 },
  { sky: [0x2a1018, 0xe8a84a], fog: 0x7a4a2a, ground: 0x6a5a30, tint: 0xf0b050, ridge: 0x6a3a28 },
  { sky: [0x10162e, 0x9a8ad0], fog: 0x4a4a82, ground: 0x3e4a66, tint: 0xb8a8ff, ridge: 0x363a6e },
  { sky: [0x0e2a24, 0xa8d8a0], fog: 0x3a6a56, ground: 0x3a6a42, tint: 0x9ae088, ridge: 0x28583e },
  { sky: [0x241033, 0xe87a9a], fog: 0x70355a, ground: 0x5a3e5a, tint: 0xff9ac0, ridge: 0x5a2f56 },
  { sky: [0x07151f, 0x3a6a8a], fog: 0x23465a, ground: 0x2e4a52, tint: 0x7ac0e8, ridge: 0x1c3e52 },
];
export const WEATHER = ['clear', 'clear', 'rain', 'glow', 'snow'];
export const HINT_WORDS = ['mist and reeds', 'copper and wind', 'glass lakes', 'lantern trees', 'quiet orchards', 'old stone', 'moths at dusk', 'salt and cliffs', 'velvet hills', 'standing water'];

export const LANDMARKS = [
  'a windmill whose sails turn the wrong way', 'a heron standing on one very patient leg', 'a bridge with a toll booth and no road',
  'a field of scarecrows all facing the train', 'a lighthouse nowhere near water', 'a woman waving from a hilltop with a very large flag',
  'a row of lanterns lit for nobody in particular', 'a house with a door in the roof', 'a flock of paper birds migrating north',
  'a standing stone wearing a scarf', 'a dog on a hill that watched the whole train go by', 'a lake the exact shape of a hand',
  'a market stall selling single socks', 'a cloud tethered to a fence post', 'a ladder leaning on nothing, going up',
];
export const POSTCARD_OPEN = ['Passed', 'Saw', 'Rolled by', 'Slowed for'];

// ---------- the storybook: chapters that write themselves as you travel ----------
// need: what the story is waiting for. Keys: miles, aboard, met, unfolds, rooms, keepsakes, postcards, tickets, tales, levels.
export const VOLUMES = ['The Marigold', 'The Folk', 'The Line'];
export const NEED_TEXT = {
  miles: (n) => `Travel ${n} miles`, aboard: (n) => `Have ${n} ${n === 1 ? 'traveller' : 'travellers'} aboard`, met: (n) => `Meet ${n} ${n === 1 ? 'stranger' : 'strangers'} at stations`,
  unfolds: (n) => `Unfold the train ${n} ${n === 1 ? 'time' : 'times'}`, rooms: (n) => `Build ${n} rooms`, keepsakes: (n) => `See ${n} ${n === 1 ? 'traveller' : 'travellers'} off at their stop`,
  returns: (n) => `Welcome back ${n} ${n === 1 ? 'old friend' : 'old friends'}`, letters: (n) => `Receive ${n} ${n === 1 ? 'letter' : 'letters'} from people who have left`, postcards: (n) => `Collect ${n} postcards`, tickets: (n) => `Cross into ${n} regions`, tales: (n) => `Hear ${n} tales from your passengers`, levels: (n) => `Furnish rooms to ${n} levels in all`,
};
export const LORE = [
  { id: 'start', vol: 0, scene: 'once', title: 'Once Upon a Rail', need: {}, text: 'There was once a small train called the Marigold, and she was far larger inside than out. Nobody remembers who stitched the charm into her seams. Everybody agrees it was done kindly.' },
  { id: 'cap', vol: 0, scene: 'cap', title: 'The Conductor\'s Cap', need: { miles: 4 }, text: 'On a hook in the cab hung a cap exactly your size. It smelled of coal smoke and oranges. Nobody had told you whose it was, so you wore it, and the engine seemed to settle, as if relieved.' },
  { id: 'track', vol: 0, scene: 'track', title: 'A Little Way Ahead', need: { miles: 15 }, text: 'The track was only ever laid a short way ahead of the wheels, and was gone a short way behind. The Marigold had never once been lost. She had also never once looked back.' },
  { id: 'guest', vol: 0, scene: 'guest', title: 'The First Guest', need: { aboard: 1 }, text: 'The first passenger did not ask where the train was going. They asked whether there was tea. That, the Marigold understood at last, was what she was for.' },
  { id: 'room', vol: 0, scene: 'unfold', title: 'More Room', need: { unfolds: 2 }, text: 'The charm was never a trick of space. It was a kindness. The train unfolds exactly as far as the people aboard can use, and always a little farther, in case someone else is coming.' },
  { id: 'initials', vol: 0, scene: 'initials', title: 'Two Letters', need: { miles: 70 }, text: 'Every sleeper on the Line has two letters pressed into its end, always the same size and the same depth: M. L. They are not a maker\'s mark. They are more like a signature on a letter someone hoped you would answer.' },
  { id: 'seat', vol: 0, scene: 'seat', title: 'The Warm Seat', need: { aboard: 3 }, text: 'In the cab there is a worn seat that nobody has been brave enough to sit in. Whenever the train is happiest, the seat is warm, as though someone has only just stood up.' },
  { id: 'village', vol: 0, scene: 'village', title: 'More Village Than Train', need: { rooms: 8 }, text: 'By now the Marigold was less a train than a village that happened to travel. There were chimneys. There was a garden. There was a clock on the wall that told the right time, but only in the evenings.' },
  { id: 'keep', vol: 1, scene: 'keep', title: 'What Is Left Behind', need: { keepsakes: 1 }, text: 'When someone steps off at their stop, they leave a small thing: a button, a tune, a way of folding napkins. The train keeps every one. She does not call it clutter. She calls it company.' },
  { id: 'mail', vol: 1, scene: 'letters', title: 'The Post Car', need: { letters: 1 }, text: 'Nobody can say how it reaches the Marigold, since she has no address, but a letter arrived from someone who had stepped off at a station long ago. It began, "Dear conductor, I hope the train is well." It ended, "I am."' },
  { id: 'return', vol: 1, scene: 'guest', title: 'A Familiar Face', need: { returns: 1 }, text: 'The platform was crowded, but you knew the one in the middle at once, because they were waving with the whole of their arm. They had changed, a little, the way people do when something has gone well. The Marigold slowed, and did not mind being late.' },
  { id: 'dinner', vol: 1, scene: 'dinner', title: 'Stories at Dinner', need: { tales: 3 }, text: 'Somewhere between the soup and the second pot of tea, people began to tell the truth. Nobody planned it. The Marigold only dimmed the lamps a little and kept the kettle warm.' },
  { id: 'glow', vol: 1, scene: 'glow', title: 'The Well-Loved Rooms', need: { levels: 4 }, text: 'A room loved enough begins to glow at the edges. It is not a spell. Rooms simply do this, when enough people have been happy in them, and have said so.' },
  { id: 'table', vol: 1, scene: 'dinner', title: 'The Long Table', need: { aboard: 6 }, text: 'Six chairs, then eight, then more than the table was long. Nobody ever stood. The Marigold, who has never turned anyone away, rearranged her walls so that no one would have to.' },
  { id: 'letters', vol: 1, scene: 'letters', title: 'Letters in the Drawer', need: { postcards: 12 }, text: 'In the drawer of the dining car were postcards from places you did not remember visiting. They were all in the same handwriting. It was your own, a little younger, a little braver.' },
  { id: 'name', vol: 1, scene: 'name', title: 'A Name, Spoken Once', need: { keepsakes: 4 }, text: 'A guest once asked to be called nothing at all, and was. When they left, they said the name aloud, once, to the engine. The Marigold hums it still, very softly, when no one is listening.' },
  { id: 'regions', vol: 2, scene: 'regions', title: 'Fens and Hills', need: { tickets: 3 }, text: 'The Line was never one place. It was a great many, stitched edge to edge like a quilt, and each had its own weather and its own way of saying hello. The Marigold learned them the way you learn the moods of a friend.' },
  { id: 'ghost', vol: 2, scene: 'ghost', title: 'The Other Train', need: { miles: 160 }, text: 'At dusk, a train very like yours passed going the other way. The carriages were dark. Every window held a face, and every face looked at you as if it knew you were coming, and was glad.' },
  { id: 'ladder', vol: 2, scene: 'ladder', title: 'A Ladder to Nowhere', need: { miles: 260 }, text: 'Some things on the Line are simply there: a ladder leaning on nothing, a house with a door in the roof, a cloud tied to a fence. They are not mysteries. They are happier unexplained.' },
  { id: 'gate', vol: 2, scene: 'gate', title: 'The Gates', need: { tickets: 6 }, text: 'At the edge of every country there is a gate, and every gate has a sign that says Now Entering. In all her years the Marigold had never once been turned back. She had begun to suspect that the gates were put up for her.' },
  { id: 'ends', vol: 2, scene: 'road', title: 'Where It Ends', need: { miles: 500 }, text: 'Everyone asks where the Line ends. The ones who ask longest stop asking, and start to wonder instead where it begins, and who was standing at the very first sleeper with a hammer and a great deal of hope.' },
  { id: 'ml', vol: 2, scene: 'initials', title: 'M. L. B.', need: { miles: 1000 }, text: 'On one sleeper, just one, there are three letters instead of two: M. L. B. Beneath it, a note, in your handwriting: "Welcome back. You laid this one yourself."' },
  { id: 'last', vol: 2, scene: 'last', title: 'There Is No Last Page', need: { miles: 1600, tickets: 10 }, text: 'There is no last page. There is only the next one, still blank, and a pencil left on the windowsill for you. The Marigold waits at the platform with her engine humming. She is in no hurry. She has never been in a hurry.' },
];
// Endless: every new region you cross adds a plate to the book. These lines caption them.
export const PLATE_LINES = ['where the light came in sideways', 'where the kettle was always just about to boil', 'where the road forgot to turn', 'where the hills leaned in to listen', 'where something was quietly growing', 'where the birds were all facing the same way', 'where the fog made everything polite', 'where the stationmaster waved with his whole arm'];

export const HINTS = [
  'Tap <b>Stoke</b> in time with the needle to build steam. The Line speeds up when she is hot.',
  'A stop is coming. Passengers will bring their own gifts and their own stories.',
  'Open <b>Inside</b>. The train is bigger in there than it looks. Build rooms by dragging on the floor.',
  'Passengers walk your layout. The closer their favorite rooms, the happier they are, and the more Charm they bring.',
];

// ---------- meeting people: the optional conversation at a stop ----------
export const TALK = {
  warm: { label: 'Offer tea and a seat', sub: 'A cup, a warm corner' },
  curious: { label: 'Ask where they are headed, and why', sub: 'Listen properly' },
  space: { label: 'Show them somewhere quiet', sub: 'No questions yet' },
};
// What a person quietly gives away, so an attentive conductor can read them.
export const TELLS = {
  warm: ['{name} keeps glancing toward the kettle on your cab stove.', '{name} is holding a coat that is clearly a size too thin for the weather.'],
  curious: ['{name} is reading every sign on the platform, twice.', '{name} has asked the stationmaster three questions before the train finished stopping.'],
  space: ['{name} stands a little apart from the crowd, as if listening to something far off.', '{name} holds the strap of a bag very tightly, and says very little.'],
};
// REPLIES[how well you read them][what you did]
export const REPLIES = {
  delighted: {
    warm: '{name} laughs, and the tension goes out of their shoulders. "Tea. Of course. How did you know?"',
    curious: '{name} brightens like a lamp. "No one ever asks why. Sit, and I will tell you all of it."',
    space: '{name} lets out a breath they seem to have held since the last station. "Yes. That is exactly what I needed."',
  },
  warm: {
    warm: '{name} accepts the cup with both hands. "That is kind. Thank you."',
    curious: '{name} considers it. "Somewhere ahead. For reasons. But thank you for asking."',
    space: '{name} nods slowly. "A quiet corner would be welcome."',
  },
  polite: {
    warm: '{name} takes the tea, and sets it down very politely. "Thank you. Perhaps later."',
    curious: '{name} gives a small, careful smile. "It is a long story. Perhaps after supper."',
    space: '{name} glances around the corridor. "Lovely. Although, I think I would like company, actually."',
  },
};
export const RAPPORT_TEXT = { delighted: 'You read them well.', warm: 'A kind start.', polite: 'A gentle start.', quick: 'A quick welcome.' };

// ---------- what happens after they leave ----------
export const FAREWELLS = {
  garden: '{name} presses a seed into your palm. "Plant it where it is least expected."',
  library: '{name} slides a bookmark between two pages of the Journal. "For when you lose your place."',
  workshop: '{name} taps the boiler gauge twice, fondly. "She will be fine. She was always going to be fine."',
  observatory: '{name} points at the ceiling, which is somehow also the sky. "That one. Look for it tonight."',
  bath: '{name} leaves a small, warm towel on the rail. "In case anyone is cold. Someone always is."',
  music: '{name} hums three notes at the door, and the engine hums the fourth. "There. Now it is finished."',
  aquarium: '{name} taps the tank glass once, gently. "Look after one another."',
  chat: '{name} shakes your hand a moment longer than people usually do. "Good company is rarer than it looks."',
};
export const LETTERS = {
  garden: ['Dear conductor, I planted the first seed by the {place} gate. Something is already coming up. It looks like hope, which is what I hoped it would look like.', 'Dear conductor, the orchard at {place} is in leaf. A child asked me what the tallest tree was called. I said it had not decided.'],
  library: ['Dear conductor, I found a small library at {place}, and told them what I know about putting books in order. They put the books in a circle. It works better.', 'Dear conductor, I have been reading the same chapter aloud to the {place} ferrymen. They do not agree on the ending. I am delighted.'],
  workshop: ['Dear conductor, I mended the clock at {place} station. It chimed for the first time in thirty years. Nobody knew what time it was, but everyone was glad.', 'Dear conductor, there is a hinge at {place} that squeaks in tune. I left it alone.'],
  observatory: ['Dear conductor, from {place} the sky looks very much like the one from your windows. I take that to mean we are all under the same one.', 'Dear conductor, I found a very small star at {place} that I think is shy. I have not told anyone.'],
  bath: ['Dear conductor, there is a hot spring at {place}. I have asked it to be patient and it has agreed to stay warm until you come.', 'Dear conductor, I opened a bathhouse at {place}. The first customer stayed three days and has written a poem.'],
  music: ['Dear conductor, I sang in the square at {place}. A dog joined in. It was the best duet of my career.', 'Dear conductor, the station at {place} has an echo that answers a half-beat late. I am teaching it a song.'],
  aquarium: ['Dear conductor, I dropped a line in the lake at {place}. Nothing bit. I count it a very good morning.', 'Dear conductor, the pond at {place} has a fish that waves. Gerald would have approved.'],
  chat: ['Dear conductor, I told the whole of {place} about the Marigold. Half of them did not believe me. The other half are waiting at the platform.', 'Dear conductor, I have found a bench at {place} that seats exactly the number of people I wanted to talk to. It is a good bench.'],
};
export const RETURN_LINES = {
  garden: 'Their orchard has come into bloom, and they have brought a cutting for the garden room.',
  library: 'They have started a small lending library, and they are back with the first overdue book.',
  workshop: 'They are back with a new wrench, and a plan for a better hinge on the aisle door.',
  observatory: 'They found the star they were looking for. It was a lot smaller than expected, and exactly right.',
  bath: 'Their bathhouse is full every night now. They are back for a week of doing nothing at all.',
  music: 'They have finished the song. They are back to sing it to the one who first asked for it.',
  aquarium: 'They have a new fish, and a very good story about it.',
  chat: 'They are back with news from six towns and a gift for each of you.',
};
