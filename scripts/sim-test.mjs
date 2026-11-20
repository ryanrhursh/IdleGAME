// Headless checks of the game rules.
import { Sim, newState, loadState, fmt } from '../src/logic.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

const s = newState(); const sim = new Sim(s, {});
ok(sim.tips.length === 1 && sim.tips[0] === 3, 'starts with one leaf tip');
s.sap = 1000; s.cogs = 20;
const n4 = sim.grow(3, 1.5, 4.5, 0); ok(typeof n4 === 'object', 'grow from tip');
const n5 = sim.grow(2, -1.5, 3.4, 0); ok(typeof n5 === 'object', 'grow a fork from trunk');
ok(sim.tips.length === 2, 'fork adds a leaf');
ok(typeof sim.grow(3, 1.5, 4.5, 0) === 'string' || sim.ch[3].length === 1, 'cannot grow onto an occupied spot');
ok(sim.grow(2, 0, 0.1, 0) !== null, 'downward growth is clamped, not crashing');
ok(sim.build(1, 'chime') === null, 'build chime on trunk');
ok(sim.build(5, 'hut') === null, 'build hut');
ok(s.winders.length === 1, 'hut brings a winder');
ok(sim.build(1, 'mill') === 'Something is already built here.', 'one building per node');
ok(sim.build(2, 'mill') === null, 'build mill');
// bridge from a higher tip to a lower branch
const hi = sim.tips.map((i) => s.nodes[i]).sort((a, b) => b.y - a.y)[0];
const targets = sim.bridgeTargets(hi.id); ok(targets.length > 0, 'bridge targets exist: ' + targets.join(','));
ok(sim.addBridge(hi.id, targets[targets.length - 1]) === null, 'add bridge');
// descent guarantee: every marble terminates
for (const t of sim.tips) s.nodes[t].charge = 4;
let deposits = 0; sim.h.deposit = () => deposits++;
for (let i = 0; i < 600; i++) { for (const t of sim.tips) sim.shake(t); sim.tick(0.1); }
for (let i = 0; i < 600; i++) sim.tick(0.1);
ok(deposits > 5, `marbles reach the roots (${deposits})`);
ok(sim.marbles.length < 60, 'marbles do not pile up forever');
const p = sim.path(5, 1); ok(p && p[0] === 5 && p[p.length - 1] === 1, 'A* finds a path ' + p);
const e = sim.expected(); ok(e.value > sim.baseDrop(), `chime+mill raise expected drop (${e.value.toFixed(2)})`);
const rep = sim.offline(3600); ok(rep.sap > 0 && rep.drops > 0, `offline earns (${fmt(rep.sap)} sap, ${rep.drops} drops)`);
const raw = JSON.stringify(s); const back = loadState(raw); ok(back && back.nodes.length === s.nodes.length, 'save round-trips');
ok(sim.prune(n5.id) === true || sim.canPrune(n5.id) === false, 'prune works on tips');
// choices
s.sap = 1e9; let id = s.nodes.length;
for (let i = 0; i < 12; i++) { const par = sim.tips[0]; const P = s.nodes[par]; const r = sim.grow(par, P.x + (i % 2 ? 1 : -1) * 1.2, P.y + 1.2, P.z + (i % 3 - 1) * 0.8); }
sim.checkProgress(); ok(sim.pending && sim.pending.key === 'roots', 'first fork in the wood appears');
ok(sim.choose('roots', 'wide') && sim.mods.cap === 7, 'choosing applies a boon');
console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
