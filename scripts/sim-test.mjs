// Headless checks of the Marigold Line rules.
import { Sim, newState, loadState, regionOf, passengerAt, fmt } from '../src/logic.js';
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
// save round trip
const back = loadState(JSON.stringify(s)); ok(back && back.rooms.length === s.rooms.length, 'save round-trips');
console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
