// A simple bot plays the game headlessly so pacing can be judged from numbers.
// Usage: node scripts/balance.mjs [minutes] [stokeEverySeconds]
import { Sim, newState, GW, GH, fmt } from '../src/logic.js';
import { ROOMS, HOBBY_ROOM } from '../src/data.js';

const minutes = +process.argv[2] || 30, stokeEvery = process.argv[3] === undefined ? 6 : +process.argv[3];
const s = newState(1e12); s.line.seed = 12345;
const sim = new Sim(s, {});
sim.h.stop = () => {};
let log = [], built = 0, stopsSeen = 0, declined = 0;
function findSpot(type, w, h) {
  const g = s.grid;
  for (let y = g.y0; y <= g.y1; y++) for (let x = g.x0; x <= g.x1; x++) { const e = sim.canPlace(type, x, y, w, h); if (e === null || e === 'charm') return { x, y, w, h }; }
  return null;
}
function wantBuild() {
  // keep a spare berth, then give each passenger's favorite, then dining/parlor, else unfold
  const need = [];
  if (sim.freeBeds() < 1) need.push(['sleeper', 2, 3]);
  const have = (t) => s.rooms.some((r) => r.type === t);
  for (const p of s.passengers) {
    const d = sim.constructor === Sim ? null : null;
  }
  const hobbies = new Set(); for (const p of s.passengers) { const idx = p.kind === 'a' ? p.idx : -1; }
  return need;
}
let t = 0, nextStoke = 0;
const dt = 0.1;
const marks = [2, 5, 10, 15, 20, 30, 45, 60].filter((m) => m <= minutes);
const wantedTypes = ['parlor', 'garden', 'library', 'workshop', 'observatory', 'music', 'bath', 'aquarium'];
while (t < minutes * 60) {
  t += dt;
  if (stokeEvery > 0 && t >= nextStoke) { sim.stoke(Math.random() < 0.6 ? 0.5 : Math.random()); nextStoke = t + stokeEvery; }
  if (s.line.pending) {
    stopsSeen++;
    if (sim.invite() !== null) { sim.decline(); declined++; }
  }
  sim.tick(dt);
  if (Math.floor(t * 10) % 20 === 0) {
    // spend: berths first, then new rooms, then unfold
    const tryBuild = (type, w, h) => { const sp = findSpot(type, w, h); if (sp && sim.roomCost(type, w, h) <= s.charm) { if (typeof sim.build(type, sp.x, sp.y, sp.w, sp.h) === 'object') { built++; return true; } } return false; };
    if (sim.freeBeds() < 1) { if (!tryBuild('sleeper', 2, 3)) { const spot = findSpot('sleeper', 2, 3); if (!spot) for (const d of ['e', 's', 'w', 'n']) if (sim.canUnfold(d) && sim.unfoldCost(d) <= s.charm) { sim.unfold(d); break; } } }
    else {
      for (const ty of wantedTypes) if (s.unlocked.includes(ty) && !s.rooms.some((r) => r.type === ty)) { if (tryBuild(ty, 3, 3)) break; if (!findSpot(ty, 3, 3)) { for (const d of ['e', 's', 'w', 'n']) if (sim.canUnfold(d) && sim.unfoldCost(d) <= s.charm) { sim.unfold(d); break; } } break; }
    }
  }
  if (marks.length && t >= marks[0] * 60) {
    const m = marks.shift();
    log.push(`${String(m).padStart(3)}m  charm ${fmt(s.charm).padStart(6)}  rate ${fmt(sim.charmRate() * 60).padStart(5)}/min  rooms ${String(s.rooms.length).padStart(2)}  unfolds ${s.unfolds}  pass ${s.passengers.length}/${sim.beds}  met ${s.metCount}  miles ${s.miles.toFixed(0).padStart(4)}  regions ${s.tickets.length}  keeps ${s.keepsakes.length}`);
  }
}
console.log(`bot: ${minutes} min, stoke every ${stokeEvery || 'never'}s`);
console.log(log.join('\n'));
console.log(`stops handled ${stopsSeen}, declined for no berth ${declined}, rooms built ${built}`);

if (process.argv[4]) {
  const fs = await import('node:fs');
  s.last = Date.now(); s.hint = 4; s.line.pending = null;
  fs.writeFileSync(process.argv[4], JSON.stringify(s));
  console.log('saved', process.argv[4], `${s.rooms.length} rooms, ${s.passengers.length} passengers`);
}
