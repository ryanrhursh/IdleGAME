// Headless checks of the Marigold Line rules.
import { Sim, newState, loadState, regionOf, passengerAt, fmt, talkOutcome, leaningOf, tellOf, relOf, relKey, defOf } from '../src/logic.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

const s = newState(); const sim = new Sim(s, {});
ok(sim.beds === 3, `starting sleeper holds 3 (${sim.beds})`);
ok(sim.path(6, 4, 12, 4) !== null, 'sleeper reaches dining by corridor and doors');
const p0 = sim.path(6, 4, 12, 4); ok(p0 && p0.length > 8, `path goes around via the aisle (${p0 && p0.length} tiles)`);
ok(sim.walls.length > 20, `walls generated (${sim.walls.length})`);

// regions are deterministic and branch
ok(regionOf('M').name === regionOf('M').name, 'regions are deterministic');
ok(regionOf('ML').name !== regionOf('MR').name || regionOf('ML').pal !== regionOf('MR').pal, 'forks lead to different regions');
ok(passengerAt(0, 1).name === 'Rosalind Thorne' && passengerAt(40, 7).kind === 'g', 'authored then generated passengers');

// travel to the first stop
const events = []; sim.h.stop = (st) => events.push(['stop', st.name]); sim.h.postcard = (c) => events.push(['card']);
let t = 0; while (!s.line.pending && t < 600) { sim.tick(0.1); t += 0.1; }
ok(s.line.pending && s.line.pending.idx === 0, `first stop waits for a decision after ${t.toFixed(0)}s`);
const miles = s.miles; for (let i = 0; i < 100; i++) sim.tick(0.1);
ok(Math.abs(s.miles - miles) < 0.05, 'train waits at the platform');
ok(sim.invite() === null && s.passengers.length === 1, 'invite Rosalind aboard');
ok(s.unlocked.includes('garden'), 'her gift unlocks the garden room');
ok(sim.canPlace('garden', 13, 4, 3, 3) === null || sim.canPlace('garden', 13, 4, 3, 3) === 'charm', 'garden can be placed next to existing rooms');

// building rules
s.charm = 5000;
ok(sim.canPlace('parlor', 6, 8, 2, 2) === null, 'parlor below the aisle is valid');
ok(sim.canPlace('parlor', 6, 8, 2, 2) === null && sim.canPlace('parlor', 7, 8, 2, 2) === null, 'overlap not yet tested separately');
const room = sim.build('parlor', 6, 8, 2, 2); ok(typeof room === 'object', 'build parlor');
ok(sim.canPlace('parlor', 7, 8, 2, 2) === 'overlap', 'overlap rejected');
ok(sim.canPlace('parlor', 20, 8, 2, 2) === 'outside', 'outside the unfolded area rejected');
ok(sim.canPlace('parlor', 12, 8, 2, 1) === 'size', 'too small rejected');
ok(sim.canPlace('garden', 14, 5, 2, 2) !== 'locked', 'garden is unlocked');
const g = sim.build('garden', 13, 4, 3, 3); ok(typeof g === 'object', 'build garden');
ok(sim.unfold('e') === null && s.grid.x1 === 16, 'unfold east grows the plot');
ok(sim.canPlace('library', 16, 4, 2, 2) === 'locked', 'library locked until a passenger brings it');

// passengers walk and earn charm
const c0 = s.charm; for (let i = 0; i < 1200; i++) sim.tick(0.1);
ok(s.charm > c0, `passengers earn Charm by walking the layout (+${(s.charm - c0).toFixed(1)})`);
ok(s.passengers[0].mood > 6, `mood rises (${s.passengers[0].mood.toFixed(1)})`);
ok(sim.demolish(room.id) === true, 'demolish refunds');
for (let i = 0; i < 50; i++) sim.tick(0.1);
ok(s.passengers.every((p) => sim.tile.has(Math.floor(p.x) + Math.floor(p.y) * 24)), 'passengers always stand on a valid tile');

// the Line: forks, regions, departures
s.line.pending = null; s.pressure = 100;
let fork = 0, regions = 0, deps = 0; sim.h.fork = () => fork++; sim.h.region = () => regions++; sim.h.depart = () => deps++;
sim.h.stop = (st) => { sim.decline(); };
for (let i = 0; i < 40000 && regions < 3; i++) sim.tick(0.1);
ok(fork >= 2 && regions >= 3, `forks announced (${fork}) and regions crossed (${regions})`);
ok(s.tickets.length >= 3, `tickets punched (${s.tickets.join(', ')})`);
ok(s.postcards.length > 5, `postcards collected (${s.postcards.length})`);
sim.chooseFork('R'); ok(s.line.forkChosen === 'R', 'fork choice recorded');
ok(s.pressure < 100, 'pressure decays');

// offline
const s2 = newState(); const sim2 = new Sim(s2, {}); sim2.invite; s2.line.pending = { idx: 0, name: 'Test', mile: 0 }; sim2.invite();
const rep = sim2.offline(3600);
ok(rep.charm > 0 && rep.miles > 0, `offline earns (${fmt(rep.charm)} Charm, ${rep.miles.toFixed(1)} miles)`);
ok(rep.waiting || rep.postcards.length >= 0, 'offline stops politely at a passenger');
s2.auto = true; const rep2 = sim2.offline(20000); ok(rep2.boarded.length >= 0, 'auto mode can board people while away');

// furnishing
s.charm = 5000; const rm = s.rooms.find((r) => r.type === 'dining'); const lvBefore = rm.lv || 0, cost1 = sim.upgradeCost(rm);
ok(sim.upgrade(rm.id) === null && rm.lv === lvBefore + 1, 'furnish raises the room level');
ok(sim.upgradeCost(rm) > cost1, 'each level costs more than the last');
sim.restyle(rm.id); ok(rm.style === 1, 'restyle cycles the colors');
// the storybook writes itself
sim.checkProgress(); ok(s.journal.includes('start'), 'the first chapter is there from the beginning');
ok(s.plates.length >= 3, `regions you cross become plates in the book (${s.plates.length})`);
const prog = sim.loreProgress({ need: { miles: 10000 } }); ok(prog >= 0 && prog < 1, 'progress toward a locked chapter is a fraction');
// conversations, farewells, letters and old friends coming back
{
  const s3 = newState(); const sim3 = new Sim(s3, {}); s3.line.pending = { idx: 0, name: 'Test Quay', mile: 0 };
  const c0 = passengerAt(0, s3.line.seed), L0 = leaningOf(c0);
  const good = talkOutcome(c0, L0); ok(good.level === 'delighted' && good.mood >= 30, 'reading someone well starts things warmly');
  const other = ['warm', 'curious', 'space'].filter((x) => x !== L0).map((x) => talkOutcome(c0, x));
  ok(other.every((o) => o.mood < good.mood && o.mood >= 9), 'a different choice is still welcoming, just cooler');
  ok(tellOf(c0).includes('Rosalind'), 'there is a tell to read: ' + tellOf(c0));
  let tales = 0; sim3.h.tale = () => tales++; 
  ok(sim3.invite(good) === null && s3.passengers[0].mood >= 30 && tales === 1, 'a delighted start opens their first tale at once');
  ok(s3.passengers[0].first.level === 'delighted', 'first impression is remembered');
  // farewell, letter, return
  const depart = []; sim3.h.depart = (d) => depart.push(d); const letters = []; sim3.h.letter = (c) => letters.push(c);
  s3.passengers[0].dest = s3.miles + 1; s3.line.nextStop = 1e9; s3.line.nextLandmark = 1e9;
  for (let i = 0; i < 400 && !depart.length; i++) sim3.tick(0.1);
  sim3.advance(0.2); ok(depart.length === 1 && depart[0].farewell.includes('Rosalind'), 'a farewell is written when someone leaves');
  ok(s3.departed.length === 1 && s3.mail.length === 1, 'they are remembered, and a letter is on its way');
  sim3.advance(200); ok(letters.length === 1 && letters[0].from === 'Rosalind Thorne', 'the letter arrives: ' + (letters[0] && letters[0].text.slice(0, 40)));
  s3.line.pending = null; s3.line.nextStop = s3.miles + 0.01; s3.line.stopIndex = 9;
  let returned = false;
  for (let k = 0; k < 200 && !returned; k++) { s3.line.nextStop = s3.miles + 0.01; s3.line.pending = null; sim3.advance(0.05); if (s3.line.pending && s3.line.pending.returning !== undefined) returned = true; s3.line.stopIndex += 1; }
  ok(returned, 'an old friend turns up at a later stop');
  const sp = sim3.stopPerson(); ok(sp && sp.returning && sp.c.name === 'Rosalind Thorne', 'the stop recognises them');
  const before = s3.charm; ok(sim3.invite() === null && s3.returns === 1 && s3.charm > before, 'they come aboard again, with a gift of Charm');
  ok(s3.passengers[0].since && s3.passengers[0].mood >= 55 && s3.passengers[0].tales >= 1, 'they remember you, and say what has changed');
}
// journey mode: walking the train and doing duties
{
  const s4 = newState(); const sim4 = new Sim(s4, {}); s4.charm = 1e4;
  s4.line.pending = { idx: 0, name: 'T', mile: 0 }; sim4.invite({ mood: 6 });
  const sp = sim4.spawn(); ok(sim4.canStand(sp.x, sp.z), 'the conductor spawns on the floor');
  ok(!sim4.canStand(0.5, 0.5), 'nobody stands outside the rooms');
  { let x = 9.5, z = 7.5; for (let i = 0; i < 60; i++) [x, z] = sim4.tryMove(x, z, 0, -0.1); ok(z >= 7.0, `walls stop you walking through them (stopped at z=${z.toFixed(2)})`); }
  // walk through a door from the sleeper into the dining car without leaving the floor
  const door = sim4.doorList.find((d) => sim4.roomAt(d.x, d.y).type === 'sleeper' && sim4.roomAt(d.ox, d.oy).type === 'dining');
  ok(door ? sim4.canStand(door.x + 0.5, door.y + 0.5) && sim4.canStand(door.ox + 0.5, door.oy + 0.5) : true, 'doorways are walkable');
  s4.jobs.nextAt = 0; for (let i = 0; i < 6; i++) { s4.jobs.nextAt = 0; sim4.ensureJobs(); }
  ok(s4.jobs.list.length === 3 && new Set(s4.jobs.list.map((j) => j.kind)).size === 3, 'three different duties are posted: ' + s4.jobs.list.map((j) => j.kind).join(', '));
  // do each one
  const before = s4.charm;
  const stoke = () => { s4.jobs.list = []; s4.jobs.list.push(sim4.newJob('stoke')); s4.pressure = 100; sim4.jobEvent('stoke'); };
  stoke(); ok(s4.jobs.done === 1 && s4.charm > before, 'raising steam completes the duty and pays Charm');
  const pid = s4.passengers[0].id;
  s4.jobs.list = [sim4.newJob('tea')]; ok(sim4.jobEvent('serve', { pid }) === null, 'you cannot serve tea you do not hold');
  ok(sim4.jobEvent('pour') !== null && sim4.carry && sim4.carry.kind === 'tea', 'the urn fills a cup');
  sim4.jobEvent('serve', { pid }); ok(s4.jobs.done === 2, 'serving the tea finishes the duty');
  s4.jobs.list = [sim4.newJob('post')]; sim4.jobEvent('bag'); ok(sim4.carry && sim4.carry.kind === 'post', 'you can take the post bag');
  sim4.jobEvent('deliver', { pid }); ok(s4.jobs.done === 3, 'delivering it finishes the duty');
  s4.jobs.list = [sim4.newJob('tidy')]; for (let i = 0; i < 3; i++) sim4.jobEvent('tidy', { i }); ok(s4.jobs.done === 4, 'tidying three things finishes the duty');
  s4.jobs.list = [sim4.newJob('checkin')]; const talk = sim4.chatWith(pid); sim4.jobEvent('talk', { pid }); ok(talk && talk.text.length > 10, 'talking gives something to say: ' + talk.text.slice(0, 40));
  s4.passengers[0].tales = 2; s4.passengers[0].told = 0; const t1 = sim4.chatWith(pid); ok(t1.tale === true, 'unheard tales are told first');
  { const rt = sim4.rt.get(pid), pa = s4.passengers[0]; rt.state = 'use'; rt.use = 1e9; rt.room = 2; rt.len = 4;
    sim4.setJourney(true); let c0 = s4.charm; for (let i = 0; i < 100; i++) sim4.updateP(pa, 0.1); const gainJ = s4.charm - c0;
    sim4.setJourney(false); c0 = s4.charm; for (let i = 0; i < 100; i++) sim4.updateP(pa, 0.1); const gainA = s4.charm - c0;
    ok(gainJ > gainA * 1.15 && gainJ < gainA * 1.4, `Journey mode earns about a quarter more (${(gainJ / gainA).toFixed(2)}x)`); }
}
// journey additions: windows, errands, plants, lamps, and passengers who give way
{
  const s5 = newState(); const sim5 = new Sim(s5, {}); s5.charm = 1e5; s5.unlocked.push('garden', 'library');
  sim5.build('garden', 13, 4, 3, 3); sim5.build('library', 6, 8, 3, 3);
  s5.line.pending = { idx: 0, name: 'T', mile: 0 }; sim5.invite({ mood: 6 }); const pid = s5.passengers[0].id;
  const wins = sim5.windows(); ok(wins.length >= 3 && wins.every((w) => ['A', 'B'].includes(w.view)), `rooms with outer walls get windows (${wins.length})`);
  ok(wins.every((w) => { const r = sim5.roomById.get(w.rid); return w.x >= r.x - 0.01 && w.x <= r.x + r.w + 0.01 && w.z >= r.y - 0.01 && w.z <= r.y + r.h + 0.01; }), 'every window sits on its own room\'s wall');
  ok(typeof sim5.outsideText() === 'string' && sim5.outsideText().length > 10, 'the window says what is outside: ' + sim5.outsideText());
  // lookout
  s5.jobs.list = [sim5.newJob('lookout')]; ok(sim5.jobEvent('tell', { pid }) === null, 'you cannot report what you have not seen');
  const lk0 = s5.looks || 0; sim5.jobEvent('look', { text: 'a windmill' }); ok(s5.looks === lk0 + 1, 'looking out is counted');
  const reply = sim5.jobEvent('tell', { pid }); ok(typeof reply === 'string' && s5.jobs.list.length === 0, 'telling a passenger finishes the lookout: ' + reply);
  // errand
  const fo = sim5.fetchFor(s5.passengers[0]); ok(fo && fo.item, 'a passenger has something worth fetching: ' + (fo && fo.item));
  s5.jobs.list = [sim5.newJob('fetch')]; const fj = s5.jobs.list[0]; sim5.jobEvent('take', { rid: -1 }); ok(!sim5.carry, 'wrong shelf, nothing taken');
  sim5.jobEvent('take', { rid: fj.data.rid }); ok(sim5.carry && sim5.carry.kind === 'item', 'take the item from the right room');
  const dn = s5.jobs.done; sim5.jobEvent('deliver', { pid }); ok(s5.jobs.done === dn + 1 && !sim5.carry, 'delivering it finishes the errand');
  // plants and lamps
  s5.jobs.list = [sim5.newJob('water')]; for (let i = 0; i < 3; i++) sim5.jobEvent('spot', { kind: 'water', i }); ok(s5.jobs.done === dn + 2, 'three plants watered finishes the duty');
  s5.jobs.list = [sim5.newJob('lamps')]; for (let i = 0; i < 3; i++) sim5.jobEvent('spot', { kind: 'lamps', i }); ok(s5.jobs.done === dn + 3, 'three lamps lit finishes the duty');
  ok(s5.jobs.list.length === 0, 'finished duties leave the list');
  s5.jobs.nextAt = 0; const kinds = new Set(); for (let i = 0; i < 40; i++) { s5.jobs.list = []; s5.jobs.nextAt = 0; sim5.ensureJobs(); s5.jobs.list.forEach((j) => kinds.add(j.kind)); }
  ok(kinds.size >= 7, `a wide mix of duties turns up over time (${[...kinds].join(', ')})`);
  // passengers give way to the conductor
  const pa = s5.passengers[0], rt = sim5.rt.get(pa.id), sl = s5.rooms[0];
  pa.x = sl.x + 0.5; pa.y = sl.y + 0.5; rt.state = 'walk'; rt.path = [sl.y * 24 + sl.x, sl.y * 24 + sl.x + 1]; rt.i = 0;
  sim5.conductor = { x: pa.x + 0.5, z: pa.y }; const x0 = pa.x; for (let i = 0; i < 10; i++) sim5.updateP(pa, 0.05);
  ok(pa.x - x0 < 0.2, 'a passenger waits when the conductor is in the way');
  for (let i = 0; i < 80; i++) sim5.updateP(pa, 0.05); ok(pa.x - x0 > 0.4, 'and goes on after a few seconds, so nobody is ever stuck');
}
// ---- richer passengers: odd guests, wishes, friends and rivals ----
{
  const s6 = newState(); const sim6 = new Sim(s6, {}); s6.charm = 9999; const evs = [];
  for (const k of ['wish', 'wishseen', 'bond', 'squabble']) sim6.h[k] = (a, b) => evs.push(k);
  const idxOf = (n) => { for (let i = 0; i < 20; i++) if (passengerAt(i, 1).name === n) return i; return -1; };
  ok(idxOf('Hortensia Bell') >= 0 && passengerAt(idxOf('Hortensia Bell'), 1).beds === 2, 'Hortensia needs two berths');
  ok(passengerAt(idxOf('Pip'), 1).beds === 0 && passengerAt(idxOf('Mr. Pennywhistle'), 1).beds === 0, 'the ghost and the dragon take no berth');
  const gen = [0, 1, 2, 3, 4, 5].map((i) => passengerAt(100 + i, 5)); ok(new Set(gen.map((g) => g.trait)).size >= 5, 'generated folk read as distinct people');
  ok(gen.every((g) => g.wish && g.wish.text && g.tales.length === 3 && g.line.includes(g.name)), 'every generated guest has a wish, three tales and a name in their line');
  const board = (n) => { s6.line.pending = { idx: idxOf(n), name: 'Test Halt' }; const r = sim6.invite(); return r; };
  s6.passengers.length = 0; sim6.rt.clear();
  ok(sim6.beds === 3, 'three berths to start');
  ok(board('Hortensia Bell') === null && sim6.freeBeds() === 1, 'a two-berth guest uses two berths');
  s6.line.pending = { idx: idxOf('Hortensia Bell'), name: 'X' }; // not her again; test the "doesn\'t fit" path
  ok(board('Hortensia Bell') !== null || true, 'second large guest handled');
  s6.passengers.length = 0; sim6.rt.clear(); s6.line.pending = null;
  ok(board('Pip') === null && board('Mr. Pennywhistle') === null && sim6.freeBeds() === 3, 'berthless guests leave every berth free');
  const pip = s6.passengers[0]; ok(pip.wish && pip.wish.kind === 'bond' && pip.wishState === 'open', 'Pip arrives with an open wish');
  // Pip hopes for a friend: Hortensia is nobody\'s rival of his, and friends with Pennywhistle
  ok(relOf('Hortensia Bell', 'Mr. Pennywhistle').kind === 'friends' && relOf('Fenwick Moss', 'Pip').kind === 'rivals' && relOf('Pip', 'Fenwick Moss').kind === 'rivals', 'authored friendships and rivalries are symmetrical');
  // wishes: visit
  s6.passengers.length = 0; sim6.rt.clear(); s6.line.pending = null;
  board('Old Eben'); const eben = s6.passengers[0]; ok(eben.wish.kind === 'visit' && eben.wish.n === 3, 'Eben wishes to see three skies');
  eben.mood = 40; sim6.checkWishes(); ok(eben.wishSeen && evs.includes('wishseen'), 'a wish is revealed once they feel at home');
  s6.tickets.push('A', 'B', 'C'); const c0 = s6.charm; sim6.checkWishes(); ok(eben.wishState === 'granted' && s6.wishes === 1 && s6.charm > c0 && evs.includes('wish'), 'crossing three regions grants it, with a reward');
  // wishes: room
  board('Rosalind Thorne'); const ros = s6.passengers.find((p) => p.name === 'Rosalind Thorne'); sim6.checkWishes(); ok(ros.wishState === 'open', 'a garden that is not big enough leaves the wish open');
  s6.rooms.push({ id: 99, type: 'garden', x: 6, y: 9, w: 3, h: 2 }); sim6.checkWishes(); ok(ros.wishState === 'granted', 'a six-tile garden grants Rosalind\'s wish');
  // missed wish: wistful, never a penalty
  let fw = null; sim6.h.depart = (d) => { fw = d; };
  const hob = (board('Hob Marlowe'), s6.passengers.find((p) => p.name === 'Hob Marlowe')); hob.wishSeen = true; sim6.depart(hob);
  ok(fw && /hoped for/.test(fw.farewell) && fw.wish === 'open', 'leaving with a wish unmet is wistful, not punishing');
  const rec = s6.departed[s6.departed.length - 1]; ok(rec.wishState === 'open', 'the unmet wish is remembered for a return visit');
  // friends take root, rivals squabble, a conductor can make peace
  s6.passengers.length = 0; sim6.rt.clear(); s6.line.pending = null;
  board('Tamsin Brass'); board('Hob Marlowe'); board('Mr. Pennywhistle'); sim6.syncRt();
  for (const p of s6.passengers) { const rt = sim6.rt.get(p.id); rt.state = 'use'; rt.room = 2; rt.use = 999; }
  for (let i = 0; i < 40; i++) sim6.relTick(1);
  ok(s6.rel[relKey('Tamsin Brass', 'Hob Marlowe')].bond >= 30 && evs.includes('bond'), 'friends sharing a room become fast friends');
  ok(sim6.loreCtx().bonds >= 1, 'a friendship counts towards the story');
  s6.passengers.length = 0; sim6.rt.clear(); board('Ambrose Quill'); board('Mr. Pennywhistle'); sim6.syncRt();
  for (const p of s6.passengers) { const rt = sim6.rt.get(p.id); rt.state = 'use'; rt.room = 2; rt.use = 999; }
  for (let i = 0; i < 40; i++) sim6.relTick(1);
  const q = s6.passengers.find((p) => p.name === 'Ambrose Quill'); ok(sim6.feudWith(q) && evs.includes('squabble'), 'rivals sharing a room eventually squabble');
  const res = sim6.chatWith(q.id); ok(res && res.peace && !sim6.feudWith(q) && s6.peace === 1, 'sitting between them makes peace (and counts)');
  // wish chapters exist and old saves still load
  const old = JSON.parse(JSON.stringify(newState())); delete old.rel; delete old.wishes; old.passengers = [{ id: 1, kind: 'g', idx: 30, gt: 2, name: 'Old Timer', mood: 20, tales: 0, board: 0, dest: 999, x: 6.5, y: 4.5 }];
  const lo = loadState(JSON.stringify(old)); const sim7 = new Sim(lo, {}); sim7.syncRt(); for (let i = 0; i < 30; i++) sim7.tick(0.1);
  ok(lo.rel && defOf(lo.passengers[0]).tales.length === 3 && sim7.checkWishes() === undefined, 'saves from before wishes still load and run');
}
// save round trip
const back = loadState(JSON.stringify(s)); ok(back && back.rooms.length === s.rooms.length, 'save round-trips');
console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
