// Game rules and simulation for the Marigold Line. No rendering code lives here.
import { ROOMS, HOBBY_ROOM, PASSENGERS, GEN_FIRST, GEN_LAST, GEN_TYPES, REGION_ADJ, REGION_NOUN, STOP_A, STOP_B, PALETTES, WEATHER, HINT_WORDS, LANDMARKS, POSTCARD_OPEN, LORE, PLATE_LINES, TELLS, REPLIES, LETTERS, RETURN_LINES, FAREWELLS, CHAT_LINES, JOB_FLAVOR, MOMENTS, OCCUPATIONS, QUIRKS, SECRETS, REGION_FLAVOR, RELATIONS, FRIEND_LINES, SQUABBLE_LINES, WISH_LINES } from './data.js';

export const GW = 24, GH = 16;
export const BASE_SPEED = 0.12; // miles per second at idle pressure
// In first person the people (and the conductor) are drawn this much smaller, so the rooms, corridors and ceilings feel that much bigger.
export const JSCALE = 1.45;
export const KINDS = 6; // scenery prop kinds

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function fmt(n) {
  if (!isFinite(n)) return '0';
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n));
  const sfx = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let i = 0; while (n >= 1000 && i < sfx.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + sfx[i];
}

// ---------- regions (deterministic from an id like "M", "ML", "MLR") ----------
export function regionOf(id) {
  const r = rng(hash('region:' + id));
  const adj = REGION_ADJ[Math.floor(r() * REGION_ADJ.length)], noun = REGION_NOUN[Math.floor(r() * REGION_NOUN.length)];
  const w = []; for (let i = 0; i < KINDS; i++) w.push(Math.pow(r(), 2.2));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  return {
    id, name: `${adj} ${noun}`, pal: id === 'M' ? 2 : Math.floor(r() * PALETTES.length), len: 60 + Math.floor(r() * 31),
    weather: WEATHER[Math.floor(r() * WEATHER.length)], weights: w.map((x) => x / total), hint: HINT_WORDS[Math.floor(r() * HINT_WORDS.length)],
  };
}
export function landmarkFor(seed, mile) {
  const r = rng(hash(`lm:${seed}:${Math.floor(mile * 10)}`));
  return { open: POSTCARD_OPEN[Math.floor(r() * POSTCARD_OPEN.length)], idx: Math.floor(r() * LANDMARKS.length), next: 8 + r() * 7, side: r() < 0.8 ? 1 : -1 };
}
export function autoSide(seed, region) { return rng(hash(`f:${seed}:${region}`))() < 0.5 ? 'L' : 'R'; }
export function stopName(seed, i) { const r = rng(hash(`stop:${seed}:${i}`)); return `${STOP_A[Math.floor(r() * STOP_A.length)]} ${STOP_B[Math.floor(r() * STOP_B.length)]}`; }

// ---------- passengers ----------
export const firstOf = (name) => (name.startsWith('The Lady') ? 'The Lady' : name.replace(/^(Mr\.|Mrs\.|Madame|Old)\s+/, '').split(' ')[0]);
const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function genWish(hobby, r, name) {
  const room = HOBBY_ROOM[hobby] || 'parlor', rn = ROOMS[room].name, k = r();
  if (k < 0.3) return { kind: 'room', type: room, area: 6, text: `A ${rn} with room to breathe.` };
  if (k < 0.55) return { kind: 'furnish', type: room, level: 2, text: `A ${rn} loved well enough to glow.` };
  if (k < 0.8) { const n = 3 + Math.floor(r() * 3); return { kind: 'visit', n, text: `To see ${n} new places before ${name} gets off.` }; }
  return { kind: 'bond', n: 1, text: 'A friend aboard, someone to sit beside.' };
}
export function passengerAt(index, seed) {
  if (index < PASSENGERS.length) { const d = PASSENGERS[index]; return { kind: 'a', idx: index, name: d.name, trait: d.trait, hobby: d.hobby, gift: d.gift, line: d.line, tales: d.tales, keep: d.keep, beds: d.beds == null ? 1 : d.beds, mult: d.mult || 1, wish: d.wish || null }; }
  const r = rng(hash(`pass:${seed}:${index}`));
  const gt = Math.floor(r() * GEN_TYPES.length), g = GEN_TYPES[gt];
  const first = GEN_FIRST[Math.floor(r() * GEN_FIRST.length)], last = GEN_LAST[Math.floor(r() * GEN_LAST.length)];
  const occ = Math.floor(r() * OCCUPATIONS.length), qk = Math.floor(r() * QUIRKS.length), sc = Math.floor(r() * SECRETS.length);
  const wish = genWish(g.hobby, r, first);
  return { kind: 'g', idx: index, gt, occ, qk, sc, wish, ...genDef({ gt, occ, qk, sc, name: `${first} ${last}` }), name: `${first} ${last}`, beds: 1, mult: 1 };
}
// everything about a generated passenger comes from four small numbers, so it can be rebuilt anywhere
function genDef(p) {
  const g = GEN_TYPES[p.gt], n = firstOf(p.name), sub = (t) => t.replace(/\{n\}/g, n);
  const o = OCCUPATIONS[p.occ == null ? 0 : p.occ], q = QUIRKS[p.qk == null ? 0 : p.qk], sc = SECRETS[p.sc == null ? 0 : p.sc];
  const rich = p.occ != null;
  const trait = rich ? `${cap1(o.job)}, ${q}` : g.trait;
  const hobbyTxt = g.trait.charAt(0).toLowerCase() + g.trait.slice(1);
  return {
    trait, hobby: g.hobby, gift: HOBBY_ROOM[g.hobby] === 'parlor' ? null : (HOBBY_ROOM[g.hobby] || null),
    line: rich ? `${p.name} steps onto the platform with a single bag. A tag on it reads: "${cap1(o.job)}." "${cap1(hobbyTxt)}," ${n} adds, "if that is any use. May I come aboard?"` : `${p.name} steps onto the platform with a single bag and a look of quiet certainty. "${g.trait}. That is all you need to know. May I come aboard?"`,
    tales: rich ? [sub(o.tale), sub(g.tales[1]), sub(sc)] : g.tales.map(sub),
    keep: { name: `${n}'s keepsake`, line: rich ? `${n} leaves something small behind, tied with a ribbon. It is exactly the kind of thing ${o.job.replace(/^an? /, 'a ')} would give.` : 'Something small is left behind, and it makes the room feel kinder.' },
  };
}
export function defOf(p) {
  if (p.kind === 'a') { const d = PASSENGERS[p.idx]; return { ...d, kind: 'a', beds: d.beds == null ? 1 : d.beds, mult: d.mult || 1 }; }
  return { ...genDef(p), beds: 1, mult: 1 };
}
// who gets on with whom: authored pairs first, otherwise a stable hash of the two names
const RIVAL_ACTS = ['dispute the correct way to stir tea', 'argue, politely, about whose turn it is', 'disagree about the window seat', 'compare notes and find they have none in common'];
const FRIEND_ACTS = ['share a pot of tea and a long silence', 'swap stories without once interrupting', 'sit side by side and say nothing, happily', 'finish each other\'s sentences and apologise for it'];
export function relOf(na, nb) {
  for (const [a, b, kind, act] of RELATIONS) if ((a === na && b === nb) || (a === nb && b === na)) return { kind, act };
  const h = hash('rel:' + (na < nb ? na + '|' + nb : nb + '|' + na)) % 100;
  if (h < 14) return { kind: 'friends', act: FRIEND_ACTS[h % FRIEND_ACTS.length] };
  if (h < 22) return { kind: 'rivals', act: RIVAL_ACTS[h % RIVAL_ACTS.length] };
  return { kind: 'neutral', act: '' };
}
export const relKey = (na, nb) => (na < nb ? na + '|' + nb : nb + '|' + na);

// ---------- meeting people ----------
const LEANS = ['warm', 'curious', 'space'];
export function leaningOf(c) { return LEANS[hash('lean:' + c.name) % 3]; }
export function tellOf(c) { const a = TELLS[leaningOf(c)]; return a[hash('tell:' + c.name) % a.length].replace(/\{name\}/g, firstOf(c.name)); }
// How the conversation at a stop goes. Everyone is welcome either way; reading them well starts things warmer.
export function talkOutcome(c, choice) {
  const d = (LEANS.indexOf(choice) - LEANS.indexOf(leaningOf(c)) + 3) % 3, level = d === 0 ? 'delighted' : d === 1 ? 'warm' : 'polite';
  return { choice, level, mood: { delighted: 34, warm: 16, polite: 9 }[level], reply: REPLIES[level][choice].replace(/\{name\}/g, firstOf(c.name)) };
}

// ---------- state ----------
export function newState(now = Date.now()) {
  return {
    v: 2, created: now, last: now, charm: 70, miles: 0, pressure: 22, unfolds: 0, metCount: 0,
    grid: { x0: 6, y0: 4, x1: 15, y1: 9 },
    rooms: [{ id: 1, type: 'sleeper', x: 6, y: 4, w: 3, h: 3 }, { id: 2, type: 'dining', x: 9, y: 4, w: 4, h: 3 }, { id: 3, type: 'corridor', x: 6, y: 7, w: 10, h: 1 }],
    nextRoom: 4, unlocked: ['sleeper', 'dining', 'parlor', 'corridor'],
    passengers: [], nextPid: 1, keepsakes: [], postcards: [], tickets: [], plates: [], talesHeard: 0, departed: [], mail: [], returns: 0, lettersGot: 0, wishes: 0, peace: 0, moments: 0, momentAt: {}, dinners: 0, bellAt: 0, rel: {}, mode: 'afk', controls: 'tap', sens: 1, jobs: { list: [], done: 0, nextAt: 0, id: 1 }, lastInput: now, journal: [],
    line: { seed: Math.floor(Math.random() * 1e9), region: 'M', regionStart: 0, nextStop: 2.5, stopIndex: 0, nextLandmark: 7, forkChosen: null, forkAnnounced: false, pending: null },
    hint: 0, auto: false, sound: true, name: '', paintSeen: false,
  };
}
export function loadState(raw, now = Date.now()) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.v !== 2 || !Array.isArray(s.rooms)) return null;
    const d = newState(now);
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    for (const k of Object.keys(d.line)) if (s.line[k] === undefined) s.line[k] = d.line[k];
    return s;
  } catch (e) { return null; }
}

const key = (x, y) => y * GW + x;
const kx = (k) => k % GW, ky = (k) => Math.floor(k / GW);
const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const ITEMS = { library: 'a book', garden: 'a handful of flowers', workshop: 'a small brass wrench', observatory: 'a rolled star chart', bath: 'a warm towel', music: 'a sheet of music', aquarium: 'a pinch of fish food', parlor: 'a plate of biscuits' };
export const SPOT_JOBS = { tidy: 'Tidy up', water: 'Water the plants', lamps: 'Light the lamp' };
export class Sim {
  constructor(state, hooks = {}) {
    this.s = state; this.h = hooks; this.rt = new Map(); this.quiet = null; this.t = { lore: 0 };
    this.speed = 0; this.version = 0; this.journey = false; this.carry = null; this.conductor = null;
    this.index();
  }
  ev(name, a, b, c) {
    if (this.quiet) { const q = this.quiet; if (name === 'postcard') q.postcards.push(a); else if (name === 'depart') q.departed.push(a); else if (name === 'region') q.regions.push(a); else if (name === 'board') q.boarded.push(a); else if (name === 'letter') q.postcards.push(a); else if (name === 'fork') { /* ignored offline */ } return; }
    const f = this.h[name]; if (f) f(a, b, c);
  }

  // ---------- interior index ----------
  index() {
    const s = this.s; this.tile = new Map(); this.roomById = new Map();
    for (const r of s.rooms) { this.roomById.set(r.id, r); for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) this.tile.set(key(x, y), r.id); }
    // doors: pick the middle of shared boundaries (two for very long ones)
    const pairs = new Map();
    for (const [k, rid] of this.tile) {
      const x = kx(k), y = ky(k);
      for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
        if (nx >= GW || ny >= GH) continue;
        const nk = key(nx, ny), q = this.tile.get(nk);
        if (q === undefined || q === rid) continue;
        const pk = rid < q ? `${rid}-${q}` : `${q}-${rid}`;
        if (!pairs.has(pk)) pairs.set(pk, []);
        pairs.get(pk).push({ a: k, b: nk, x, y, ox: nx, oy: ny });
      }
    }
    this.doors = new Set(); this.doorList = [];
    for (const list of pairs.values()) {
      list.sort((p, q) => (p.y - q.y) || (p.x - q.x));
      const picks = list.length <= 4 ? [Math.floor(list.length / 2)] : [Math.floor(list.length * 0.25), Math.floor(list.length * 0.75)];
      for (const i of picks) { const d = list[i]; this.doors.add(edgeKey(d.a, d.b)); this.doorList.push(d); }
    }
    // walls: every room edge that is not a door; shared edges emitted once
    this.walls = [];
    const dirs = [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']];
    for (const [k, rid] of this.tile) {
      const x = kx(k), y = ky(k);
      for (const [dx, dy, side] of dirs) {
        const nx = x + dx, ny = y + dy, nk = nx >= 0 && ny >= 0 && nx < GW && ny < GH ? key(nx, ny) : -1, q = nk >= 0 ? this.tile.get(nk) : undefined;
        if (q === rid) continue;
        if (q !== undefined) { if (this.doors.has(edgeKey(k, nk))) continue; if (q < rid) continue; }
        this.walls.push({ x, y, side, outer: q === undefined });
      }
    }
    this.beds = s.rooms.filter((r) => r.type === 'sleeper').reduce((a, r) => a + Math.floor((r.w * r.h) / 3), 0);
    this.version++;
    for (const p of s.passengers) this.snap(p);
    if (this.h.layout) this.h.layout();
  }
  snap(p) {
    const k = key(Math.floor(p.x), Math.floor(p.y));
    if (this.tile.has(k)) return;
    const sl = this.s.rooms.find((r) => r.type === 'sleeper') || this.s.rooms[0];
    if (sl) { p.x = sl.x + 0.5; p.y = sl.y + 0.5; }
    const r = this.rt.get(p.id); if (r) { r.state = 'idle'; r.path = []; r.t = 0.5; }
  }
  roomAt(x, y) { const id = this.tile.get(key(x, y)); return id === undefined ? null : this.roomById.get(id); }
  neighbors(k) {
    const x = kx(k), y = ky(k), rid = this.tile.get(k), out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const nk = key(nx, ny), q = this.tile.get(nk); if (q === undefined) continue;
      if (q === rid || this.doors.has(edgeKey(k, nk))) out.push(nk);
    }
    return out;
  }
  path(ax, ay, bx, by) {
    const a = key(ax, ay), b = key(bx, by);
    if (!this.tile.has(a) || !this.tile.has(b)) return null;
    if (a === b) return [a];
    const g = new Map([[a, 0]]), prev = new Map(), open = [a], done = new Set();
    const h = (k) => Math.abs(kx(k) - bx) + Math.abs(ky(k) - by);
    while (open.length) {
      let bi = 0, bf = Infinity;
      for (let i = 0; i < open.length; i++) { const f = g.get(open[i]) + h(open[i]); if (f < bf) { bf = f; bi = i; } }
      const cur = open.splice(bi, 1)[0];
      if (cur === b) break;
      done.add(cur);
      for (const n of this.neighbors(cur)) {
        if (done.has(n)) continue;
        const ng = g.get(cur) + 1;
        if (!g.has(n) || ng < g.get(n)) { g.set(n, ng); prev.set(n, cur); if (!open.includes(n)) open.push(n); }
      }
    }
    if (!prev.has(b)) return null;
    const out = [b]; let c = b; while (c !== a) { c = prev.get(c); out.push(c); }
    return out.reverse();
  }

  // ---------- building ----------
  get used() { return this.s.passengers.length; }
  roomCost(type, w, h) { return Math.round(ROOMS[type].cost * w * h * Math.pow(1.05, Math.max(0, this.s.rooms.length - 3))); }
  canPlace(type, x, y, w, h) {
    const d = ROOMS[type], g = this.s.grid;
    if (!d || !this.s.unlocked.includes(type)) return 'locked';
    if (d.line) { if (Math.min(w, h) !== 1 || Math.max(w, h) < d.min || Math.max(w, h) > d.max) return 'size'; }
    else if (w < d.min || h < d.min || w > d.max || h > d.max) return 'size';
    if (x < g.x0 || y < g.y0 || x + w - 1 > g.x1 || y + h - 1 > g.y1) return 'outside';
    let touches = false;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (this.tile.has(key(i, j))) return 'overlap';
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (this.tile.has(key(i + dx, j + dy))) touches = true;
    }
    if (!touches) return 'apart';
    if (this.roomCost(type, w, h) > this.s.charm) return 'charm';
    return null;
  }
  build(type, x, y, w, h) {
    const err = this.canPlace(type, x, y, w, h);
    if (err) return err;
    this.s.charm -= this.roomCost(type, w, h);
    const r = { id: this.s.nextRoom++, type, x, y, w, h, born: Date.now() };
    this.s.rooms.push(r); this.index(); return r;
  }
  demolish(id) {
    const r = this.roomById.get(id); if (!r) return false;
    if (this.s.rooms.length <= 2) return false;
    this.s.charm += Math.round(this.roomCost(r.type, r.w, r.h) * 0.6);
    this.s.rooms = this.s.rooms.filter((q) => q.id !== id);
    this.index(); return true;
  }
  upgradeCost(r) { return Math.round(this.roomCost(r.type, r.w, r.h) * 0.7 * Math.pow(1.7, r.lv || 0)); }
  upgrade(id) {
    const r = this.roomById.get(id); if (!r) return 'No such room.';
    const c = this.upgradeCost(r); if (c > this.s.charm) return 'Not enough Charm.';
    this.s.charm -= c; r.lv = (r.lv || 0) + 1; this.version++; if (this.h.layout) this.h.layout(); return null;
  }
  restyle(id) { const r = this.roomById.get(id); if (!r) return; r.style = ((r.style || 0) + 1) % 4; this.version++; if (this.h.layout) this.h.layout(); }
  unfoldCost(dir) {
    const g = this.s.grid, cells = dir === 'n' || dir === 's' ? g.x1 - g.x0 + 1 : g.y1 - g.y0 + 1;
    return Math.round(10 * cells * Math.pow(1.1, this.s.unfolds));
  }
  canUnfold(dir) {
    const g = this.s.grid;
    return { n: g.y0 > 0, s: g.y1 < GH - 1, w: g.x0 > 0, e: g.x1 < GW - 1 }[dir];
  }
  unfold(dir) {
    if (!this.canUnfold(dir)) return 'That edge has nothing more to unfold.';
    const c = this.unfoldCost(dir); if (c > this.s.charm) return 'Not enough Charm.';
    this.s.charm -= c; this.s.unfolds++;
    const g = this.s.grid; if (dir === 'n') g.y0--; if (dir === 's') g.y1++; if (dir === 'w') g.x0--; if (dir === 'e') g.x1++;
    this.lastUnfold = { dir, t: Date.now() }; this.version++; if (this.h.layout) this.h.layout();
    return null;
  }

  // ---------- journey mode: walking the train as the conductor ----------
  canStand(x, z, r = this.journey ? 0.17 / JSCALE : 0.17) {
    const cx = Math.floor(x), cz = Math.floor(z), ck = key(cx, cz);
    if (!this.tile.has(ck)) return false;
    const rid = this.tile.get(ck), nb = this.neighbors(ck);
    for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const sk = key(Math.floor(x + dx), Math.floor(z + dz));
      if (sk === ck) continue;
      if (!this.tile.has(sk)) return false;
      if (this.tile.get(sk) === rid) continue;
      if (!nb.includes(sk)) return false;
    }
    return true;
  }
  tryMove(x, z, dx, dz) {
    let nx = x + dx; if (!this.canStand(nx, z)) nx = x;
    let nz = z + dz; if (!this.canStand(nx, nz)) nz = z;
    return [nx, nz];
  }
  // ---- the dinner bell: ring it and everyone comes to the table ----
  bells() { return this.s.rooms.filter((r) => r.type === 'dining').map((r) => ({ rid: r.id, x: r.x + Math.max(0.5, r.w - 0.45), z: r.y + 0.45 })); }
  bellReady() { return !this.dinner && this.s.passengers.length > 0 && Date.now() - (this.s.bellAt || 0) > 240000; }
  ringBell(rid) {
    if (!this.bellReady() || !this.roomById.get(rid)) return null;
    this.s.bellAt = Date.now(); this.dinner = { rid, left: 26, n0: 0 };
    for (const p of this.s.passengers) { const rt = this.rt.get(p.id); if (rt) { rt.state = 'idle'; rt.t = Math.random() * 1.2; } }
    this.ev('bell', rid); return 'The bell rings through the whole train. Footsteps start up in every corridor.';
  }
  finishDinner() {
    const s = this.s, d = this.dinner; this.dinner = null; if (!d) return;
    const room = this.roomById.get(d.rid); let n = 0;
    for (const p of s.passengers) { if (room && this.roomAt(Math.floor(p.x), Math.floor(p.y)) === room) { n++; this.addMood(p, 10); } else this.addMood(p, 3); }
    const gain = Math.round((12 * n + 10) * this.charmMul); s.charm += gain; s.dinners = (s.dinners || 0) + 1;
    this.postcard(n ? `Dinner was shared by ${n} ${n === 1 ? 'traveller' : 'travellers'}. The soup was passed twice, and nobody counted.` : 'Dinner was laid, and cooled, and eaten later by whoever wandered past.', 'platform');
    this.ev('dinner', { n, gain }); this.checkProgress();
  }
  // ---- moments: stand in a special room and do the small thing it invites ----
  momentSpots() {
    const out = [];
    for (const r of this.s.rooms) {
      const m = MOMENTS[r.type]; if (!m) continue;
      const at = { aquarium: [r.w / 2, 0.55], library: [r.w / 2, 0.55], music: [r.w / 2, r.h / 2 + 0.25], observatory: [r.w / 2 + 0.35, r.h / 2], bath: [r.w - 0.5, 0.5], workshop: [Math.max(0.8, r.w - 0.8), 0.7], garden: [r.w / 2, r.h / 2 + 0.7] }[r.type];
      out.push({ rid: r.id, type: r.type, label: m.label, x: r.x + Math.min(r.w - 0.3, Math.max(0.3, at[0])), z: r.y + Math.min(r.h - 0.3, Math.max(0.3, at[1])) });
    }
    return out;
  }
  momentReady(rid) { return Date.now() - ((this.s.momentAt || {})[rid] || 0) > 150000; }
  doMoment(rid) {
    const r = this.roomById.get(rid), m = r && MOMENTS[r.type]; if (!m || !this.momentReady(rid)) return null;
    const s = this.s; if (!s.momentAt) s.momentAt = {}; s.momentAt[rid] = Date.now(); s.moments = (s.moments || 0) + 1;
    const gain = Math.round((8 + 4 * (r.lv || 0)) * Math.max(1, this.charmRate() / 40) * this.charmMul); s.charm += gain;
    let liked = 0;
    for (const p of s.passengers) { const here = this.roomAt(Math.floor(p.x), Math.floor(p.y)) === r; if (!here) continue; const fav = r.type === HOBBY_ROOM[defOf(p).hobby]; this.addMood(p, fav ? 12 : 5); if (fav) { liked++; this.ev('emote', { id: p.id, kind: 'heart' }); } }
    const lines = m.lines, text = lines[Math.floor(Math.random() * lines.length)];
    this.checkProgress();
    return { type: r.type, text: `${text} (+${gain} Charm${liked ? ', and someone is delighted' : ''})`, gain };
  }
  post() { const r = this.s.rooms.find((q) => q.type === 'corridor') || this.s.rooms[0]; return { x: r.x + 0.5, z: r.y + 0.5, vertical: r.h > r.w }; }
  spawn() { const p = this.post(); return p.vertical ? { x: p.x, z: p.z + 1 } : { x: p.x + 1, z: p.z }; }
  urns() { return this.s.rooms.filter((r) => r.type === 'dining').map((r) => ({ rid: r.id, x: r.x + 0.4, z: r.y + 0.4 })); }
  setJourney(on) { this.journey = !!on; if (!on) this.carry = null; }

  // ---------- windows onto the Line, and things worth fetching ----------
  windows() {
    if (this._winV === this.version) return this._win;
    const out = [];
    for (const r of this.s.rooms) {
      const segs = this.walls.filter((w) => w.outer && this.tile.get(key(w.x, w.y)) === r.id), by = {};
      for (const w of segs) (by[w.side] = by[w.side] || []).push(w);
      const tall = { library: 'n', workshop: 's', aquarium: 'n' }[r.type];      // furniture stands against that wall
      const lists = Object.entries(by).filter(([side]) => side !== tall).map(([, l]) => l).sort((a, b) => b.length - a.length); if (!lists.length) continue;
      const list = lists[0].sort((a, b) => (a.x - b.x) || (a.y - b.y));
      const picks = r.type === 'corridor' && list.length >= 6 ? [Math.floor(list.length * 0.25), Math.floor(list.length * 0.75)] : [Math.floor(list.length / 2)];
      for (const i of picks) {
        if (out.length >= 10) break; const w = list[i];
        out.push({ x: w.side === 'e' ? w.x + 1 : w.side === 'w' ? w.x : w.x + 0.5, z: w.side === 's' ? w.y + 1 : w.side === 'n' ? w.y : w.y + 0.5, side: w.side, view: w.side === 'n' || w.side === 'w' ? 'A' : 'B', rid: r.id });
      }
    }
    this._win = out; this._winV = this.version; return out;
  }
  outsideText() {
    const s = this.s, L = s.line, reg = this.region(), cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    if (L.pending) return `The Marigold is standing at ${L.pending.name}. Someone is waiting on the platform.`;
    const lm = landmarkFor(L.seed, L.nextLandmark);
    if (L.nextLandmark - s.miles < 4) return `${cap(LANDMARKS[lm.idx])} is coming up, out in the ${reg.name}.`;
    if (L.nextStop - s.miles < 3) return `A station is coming up. The sign says ${stopName(L.seed, L.stopIndex)}.`;
    return `The ${reg.name} going by, all ${reg.hint}.`;
  }
  pickups() { return this.s.rooms.filter((r) => ITEMS[r.type]).map((r) => ({ rid: r.id, type: r.type, item: ITEMS[r.type], x: r.x + r.w - 0.4, z: r.y + 0.4 })); }

  // ---------- duties: small jobs only the conductor can do in person ----------
  jobKinds() {
    const s = this.s, ks = ['stoke'];
    if (s.passengers.length) { ks.push('checkin', 'post'); if (s.rooms.some((r) => r.type === 'dining')) ks.push('tea'); }
    if (s.rooms.some((r) => r.type !== 'corridor' && r.type !== 'sleeper')) ks.push('tidy');
    if (s.rooms.some((r) => r.type === 'garden')) ks.push('water');
    if (s.rooms.some((r) => r.w * r.h >= 4 && r.type !== 'corridor')) ks.push('lamps');
    if (s.passengers.length && this.windows().length) ks.push('lookout');
    if (s.passengers.some((p) => this.fetchFor(p))) ks.push('fetch');
    return ks;
  }
  fetchFor(p) { const hr = HOBBY_ROOM[defOf(p).hobby] || 'parlor', room = this.s.rooms.find((r) => r.type === hr); return room && ITEMS[hr] ? { room, item: ITEMS[hr] } : null; }
  newJob(kind) {
    const s = this.s, J = s.jobs, pick = (a) => a[Math.floor(Math.random() * a.length)], ps = s.passengers;
    const job = { id: J.id++, kind, prog: 0, goal: 1, data: {}, flavor: pick(JOB_FLAVOR[kind]) };
    if (kind === 'tea') { job.goal = Math.min(3, Math.max(1, ps.length)); job.title = 'Tea service'; job.desc = `Pour tea at the urn in a dining car, and serve ${job.goal} ${job.goal === 1 ? 'passenger' : 'passengers'}.`; job.data = { served: [] }; }
    else if (kind === 'checkin') { job.goal = Math.min(3, ps.length); job.title = 'Say hello'; job.desc = `Stop and talk with ${job.goal} ${job.goal === 1 ? 'passenger' : 'different passengers'}.`; job.data = { met: [] }; }
    else if (kind === 'post') { const t = pick(ps); job.title = 'The post bag'; job.desc = `Take the post bag from the conductor's post to ${t.name}.`; job.data = { to: t.id, name: t.name }; }
    else if (kind === 'lookout') { job.title = 'Keep a lookout'; job.desc = 'Look out of a window, then tell a passenger what you saw.'; job.data = { seen: null }; }
    else if (kind === 'fetch') {
      const opts = ps.map((p) => ({ p, f: this.fetchFor(p) })).filter((o) => o.f), o = pick(opts);
      job.title = 'An errand'; job.desc = `Bring ${firstOf(o.p.name)} ${o.f.item} from the ${ROOMS[o.f.room.type].name}.`; job.data = { to: o.p.id, name: o.p.name, rid: o.f.room.id, item: o.f.item };
    } else if (kind === 'water' || kind === 'lamps') {
      const rooms = kind === 'water' ? s.rooms.filter((r) => r.type === 'garden') : s.rooms.filter((r) => r.w * r.h >= 4 && r.type !== 'corridor'), r = pick(rooms), spots = [];
      const cand = [(i) => ({ x: r.x + 0.5 + Math.random() * (r.w - 1), z: r.y + 0.22 }), () => ({ x: r.x + 0.5 + Math.random() * (r.w - 1), z: r.y + r.h - 0.22 }), () => ({ x: r.x + 0.22, z: r.y + 0.5 + Math.random() * (r.h - 1) }), () => ({ x: r.x + r.w - 0.22, z: r.y + 0.5 + Math.random() * (r.h - 1) })].sort(() => Math.random() - 0.5);
      for (let k = 0; k < 3; k++) spots.push({ ...(kind === 'water' ? { x: r.x + 0.3 + Math.random() * (r.w - 0.6), z: r.y + 0.3 + Math.random() * (r.h - 0.6) } : cand[k]()), done: false });
      job.goal = 3; job.title = kind === 'water' ? 'Water the plants' : 'Light the lamps'; job.desc = kind === 'water' ? 'The plants in the Garden Room are looking thirsty.' : `Light three lamps in the ${ROOMS[r.type].name}.`; job.data = { rid: r.id, spots };
    }
    else if (kind === 'tidy') {
      const rooms = s.rooms.filter((r) => r.type !== 'corridor' && r.type !== 'sleeper'), r = pick(rooms), spots = [];
      for (let k = 0; k < 3; k++) spots.push({ x: r.x + 0.3 + Math.random() * (r.w - 0.6), z: r.y + 0.3 + Math.random() * (r.h - 0.6), done: false });
      job.goal = 3; job.title = 'Tidy up'; job.desc = `Pick up the things left about in the ${ROOMS[r.type].name}.`; job.data = { rid: r.id, spots };
    } else { const target = [55, 70, 85][Math.min(2, Math.floor(J.done / 4))]; job.title = 'Raise steam'; job.desc = `Bring the boiler up to ${target} pressure at the conductor's post.`; job.data = { target }; job.goal = 1; }
    job.reward = Math.max(30, Math.round(this.charmRate() * 60 * 0.8));
    return job;
  }
  jobValid(job) {
    const s = this.s;
    if (job.kind === 'post') return s.passengers.some((p) => p.id === job.data.to);
    if (job.kind === 'tea' || job.kind === 'checkin') return s.passengers.length > 0 && (job.kind === 'checkin' || s.rooms.some((r) => r.type === 'dining'));
    if (job.kind === 'tidy' || job.kind === 'water' || job.kind === 'lamps') return this.roomById.has(job.data.rid);
    if (job.kind === 'lookout') return s.passengers.length > 0 && this.windows().length > 0;
    if (job.kind === 'fetch') return s.passengers.some((p) => p.id === job.data.to) && this.roomById.has(job.data.rid);
    return true;
  }
  ensureJobs() {
    const J = this.s.jobs, before = J.list.length;
    J.list = J.list.filter((j) => this.jobValid(j));
    if (J.list.length !== before) this.carry = null;
    if (J.list.length < 3 && Date.now() >= J.nextAt) {
      const have = new Set(J.list.map((j) => j.kind)), ks = this.jobKinds().filter((k) => !have.has(k));
      if (ks.length) { J.list.push(this.newJob(ks[Math.floor(Math.random() * ks.length)])); this.ev('jobs'); }
    }
  }
  completeJob(job) {
    const J = this.s.jobs; J.list = J.list.filter((j) => j !== job); J.done++; J.nextAt = Date.now() + 10000; this.carry = null;
    this.s.charm += job.reward; this.ev('jobdone', job); this.checkProgress();
  }
  // In-person actions. Returns a short message for the screen, or null if nothing happened.
  jobEvent(type, data = {}) {
    const J = this.s.jobs, find = (k) => J.list.find((j) => j.kind === k);
    if (type === 'pour') { if (find('tea') && !this.carry) { this.carry = { kind: 'tea' }; return 'You fill a cup from the urn.'; } return this.carry ? 'Your hands are full.' : 'Nobody has asked for tea.'; }
    if (type === 'serve') {
      const job = find('tea'); if (!job || !this.carry || this.carry.kind !== 'tea' || job.data.served.includes(data.pid)) return null;
      job.data.served.push(data.pid); job.prog++; this.carry = null; const p = this.s.passengers.find((q) => q.id === data.pid); if (p) this.addMood(p, 4);
      if (job.prog >= job.goal) this.completeJob(job); else this.ev('jobs'); return 'Served. Back to the urn for another.';
    }
    if (type === 'talk') {
      const job = find('checkin'); if (!job || job.data.met.includes(data.pid)) return null;
      job.data.met.push(data.pid); job.prog++; if (job.prog >= job.goal) this.completeJob(job); else this.ev('jobs'); return null;
    }
    if (type === 'spot' || type === 'tidy') {
      const job = find(data.kind || 'tidy'); if (!job) return null; const sp = job.data.spots[data.i]; if (!sp || sp.done) return null;
      sp.done = true; job.prog++; if (job.prog >= job.goal) this.completeJob(job); else this.ev('jobs'); return { tidy: 'Tidied.', water: 'The plant perks up.', lamps: 'The lamp glows.' }[job.kind];
    }
    if (type === 'take') { const job = find('fetch'); if (job && !this.carry && data.rid === job.data.rid) { this.carry = { kind: 'item', item: job.data.item, to: job.data.to }; return `You take ${job.data.item}.`; } return this.carry ? 'Your hands are full.' : null; }
    if (type === 'look') {
      this.s.looks = (this.s.looks || 0) + 1; this.checkProgress(); const job = find('lookout');
      if (job && !job.data.seen) { job.data.seen = data.text || 'something'; this.ev('jobs'); return 'You take it in. Someone ought to hear about this.'; } return null;
    }
    if (type === 'tell') {
      const job = find('lookout'); if (!job || !job.data.seen) return null; const p = this.s.passengers.find((q) => q.id === data.pid); if (!p) return null;
      this.addMood(p, 4); this.completeJob(job); return `${firstOf(p.name)} leans toward the glass too. "So it is. Thank you for telling me."`;
    }
    if (type === 'stoke') { const job = find('stoke'); if (job && this.s.pressure >= job.data.target) { this.completeJob(job); } return null; }
    if (type === 'bag') { const job = find('post'); if (job && !this.carry) { this.carry = { kind: 'post', to: job.data.to }; return `You take the post bag. It is addressed to ${job.data.name}.`; } return this.carry ? 'Your hands are full.' : 'There is no post today.'; }
    if (type === 'deliver') {
      const c = this.carry; if (!c || c.to !== data.pid) return null;
      const job = find(c.kind === 'item' ? 'fetch' : 'post'); if (!job) return null;
      const p = this.s.passengers.find((q) => q.id === data.pid); if (p) this.addMood(p, 6);
      this.completeJob(job); return 'Delivered.';
    }
    return null;
  }
  // Talking in person: unheard tales come first, then ordinary chat.
  chatWith(pid) {
    const p = this.s.passengers.find((q) => q.id === pid); if (!p) return null;
    const d = defOf(p), first = firstOf(p.name);
    p.told = p.told || 0; this.addMood(p, 2); this.s.charm += 2 * this.charmMul;
    const peace = this.makePeace(p); if (peace) return { text: peace, tale: false, peace: true };
    if (p.told < p.tales) { const t = d.tales[p.told++]; return { text: t, tale: true }; }
    const r = rng(hash(`chat:${p.id}:${p.told}:${Math.floor(Date.now() / 60000)}`)); return { text: CHAT_LINES[Math.floor(r() * CHAT_LINES.length)].replace(/\{name\}/g, first), tale: false };
  }

  // ---------- passengers ----------
  bedsUsed() { return this.s.passengers.reduce((a, p) => a + defOf(p).beds, 0); }
  freeBeds() { return this.beds - this.bedsUsed(); }
  stopFits() { const sp = this.stopPerson(); return !!sp && this.fits(sp.c); }
  fits(c) { return !c.beds || this.freeBeds() >= c.beds; }
  candidate() { return passengerAt(this.s.metCount, this.s.line.seed); }
  stopPerson() {
    const L = this.s.line, st = L.pending; if (!st) return null;
    if (st.returning !== undefined) { const rec = this.s.departed[st.returning]; return { returning: true, rec, c: { ...passengerAt(rec.idx, L.seed), name: rec.name } }; }
    const c = passengerAt(st.idx, L.seed), rg = this.region(), n = firstOf(c.name);
    const fl = REGION_FLAVOR[hash('fl:' + c.name) % REGION_FLAVOR.length].replace('{hint}', rg.hint).replace(/\{n\}/g, n);
    return { returning: false, c: { ...c, line: c.line + ' ' + fl } };
  }
  invite(opts = {}) {
    const L = this.s.line, st = L.pending; if (!st) return 'Nobody is waiting.';
    const s = this.s, sl = s.rooms.find((r) => r.type === 'sleeper');
    const need = (st.returning !== undefined ? passengerAt(s.departed[st.returning].idx, L.seed) : passengerAt(st.idx, L.seed));
    if (!this.fits(need)) return need.beds > 1 ? `${firstOf(need.name)} needs ${need.beds} free berths. Build more Sleeper space, or wait for someone to reach their stop.` : 'No berth free. Build more Sleeper space, or wait for someone to reach their stop.';
    if (st.returning !== undefined) {
      const rec = s.departed[st.returning], c = passengerAt(rec.idx, L.seed), hobby = c.hobby || 'chat';
      const tales = Math.min(3, rec.tales || 0);
      const p = { id: s.nextPid++, kind: c.kind, idx: c.idx, gt: c.gt, name: rec.name, mood: Math.max(55, [0, 30, 60, 90][tales]), tales, board: s.miles, dest: s.miles + 130 + Math.floor(Math.random() * 200), x: sl.x + 0.5, y: sl.y + 0.5, visits: (rec.visits || 0) + 1, since: RETURN_LINES[hobby] || RETURN_LINES.chat, first: { level: 'returned' } };
      p.occ = c.occ; p.qk = c.qk; p.sc = c.sc; p.v0 = s.tickets.length; p.wish = rec.wishState === 'granted' ? null : (c.wish || null); p.wishState = p.wish ? 'open' : null; p.wishSeen = !!rec.wishSeen; p.rel0 = 0;
      rec.back = true; s.returns = (s.returns || 0) + 1; s.charm += 40; s.passengers.push(p); L.pending = null;
      this.syncRt(); this.postcard(`${p.name} is back aboard. ${p.since}`, 'platform'); this.ev('board', p, c); return null;
    }
    const c = passengerAt(st.idx, L.seed);
    const p = { id: s.nextPid++, kind: c.kind, idx: c.idx, gt: c.gt, name: c.name, mood: opts.mood != null ? opts.mood : 6, tales: 0, board: s.miles, dest: s.miles + 130 + Math.floor(rng(hash('d' + c.idx + L.seed))() * 200), x: sl.x + 0.5, y: sl.y + 0.5, first: { level: opts.level || 'quick', choice: opts.choice || null }, occ: c.occ, qk: c.qk, sc: c.sc, v0: s.tickets.length, wish: c.wish || null, wishState: c.wish ? 'open' : null, wishSeen: false };
    s.passengers.push(p); s.metCount = st.idx + 1; L.pending = null;
    if (c.gift && !s.unlocked.includes(c.gift)) { s.unlocked.push(c.gift); this.ev('unlock', c.gift, c); }
    this.syncRt(); this.ev('board', p, c); this.addMood(p, 0); return null;
  }
  decline() { const L = this.s.line; if (!L.pending) return; if (L.pending.returning === undefined) this.s.metCount = L.pending.idx + 1; L.pending = null; }
  syncRt() { for (const p of this.s.passengers) if (!this.rt.has(p.id)) this.rt.set(p.id, { state: 'idle', path: [], i: 0, t: 1 + Math.random() * 2, room: null, use: 0, face: 0 }); }
  moodF(p) { return 0.6 + 0.8 * (p.mood / 100); }
  get charmMul() { return 1 + 0.04 * this.s.keepsakes.length; }
  addMood(p, v) {
    p.mood = clamp(p.mood + v, 0, 100);
    const d = defOf(p), th = [30, 60, 90];
    while (p.tales < 3 && p.mood >= th[p.tales]) { p.tales++; this.s.talesHeard = (this.s.talesHeard || 0) + 1; this.ev('tale', p, d.tales[p.tales - 1]); }
  }
  occupancy(rid) { let n = 0; for (const [, r] of this.rt) if (r.room === rid && (r.state === 'use' || r.state === 'walk')) n++; return n; }
  pickRoom(p) {
    if (this.dinner) { const dr = this.roomById.get(this.dinner.rid); if (dr) return dr; }
    const d = defOf(p), rooms = this.s.rooms, r = Math.random();
    const want = r < 0.4 ? HOBBY_ROOM[d.hobby] : r < 0.6 ? 'dining' : r < 0.8 ? 'parlor' : 'sleeper';
    const order = [want, HOBBY_ROOM[d.hobby], 'dining', 'parlor', 'sleeper'];
    for (const t of order) {
      const c = rooms.filter((q) => q.type === t && this.occupancy(q.id) < Math.max(1, Math.floor((q.w * q.h) / 2)));
      if (c.length) return c[Math.floor(Math.random() * c.length)];
    }
    return null;
  }
  updateP(p, dt) {
    const rt = this.rt.get(p.id); if (!rt) return;
    if (!this.tile.has(key(Math.floor(p.x), Math.floor(p.y)))) this.snap(p);
    if (rt.state === 'idle') {
      rt.t -= dt; if (rt.t > 0) return;
      const room = this.pickRoom(p);
      if (!room) { rt.t = 3; return; }
      const tx = room.x + Math.floor(Math.random() * room.w), ty = room.y + Math.floor(Math.random() * room.h);
      const path = this.path(Math.floor(p.x), Math.floor(p.y), tx, ty);
      if (!path) { rt.t = 3; return; }
      rt.path = path; rt.i = 0; rt.room = room.id; rt.state = path.length > 1 ? 'walk' : 'use'; rt.use = 6 + Math.random() * 8; rt.len = path.length; rt.emoted = false;
      if (rt.room !== undefined) p.trip = p.trip ? p.trip * 0.75 + path.length * 0.25 : path.length;
    } else if (rt.state === 'walk') {
      const nk = rt.path[rt.i + 1];
      if (nk === undefined) { rt.state = 'use'; return; }
      const tx = kx(nk) + 0.5, ty = ky(nk) + 0.5, dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy), step = 1.7 * dt;
      const cd = this.conductor;
      if (cd && dist > 1e-4) {
        const mv = Math.min(step, dist), ax = p.x + (dx / dist) * mv, ay = p.y + (dy / dist) * mv, dn = Math.hypot(ax - cd.x, ay - cd.z);
        if (dn < 0.42 && dn < Math.hypot(p.x - cd.x, p.y - cd.z)) { rt.hold = (rt.hold || 0) + dt; if (rt.hold < 3) return; } else rt.hold = 0;
      }
      if (dist > 0.001) rt.face = Math.atan2(dx, dy);
      if (dist <= step) { p.x = tx; p.y = ty; rt.i++; if (rt.i >= rt.path.length - 1) { rt.state = 'use'; } }
      else { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
    } else if (rt.state === 'use') {
      rt.use -= dt;
      const room = this.roomById.get(rt.room), d = defOf(p), fav = room && room.type === HOBBY_ROOM[d.hobby];
      const L = rt.len || 0, walkPenalty = L <= 6 ? 1.25 : L <= 12 ? 1 : L <= 18 ? 0.85 : 0.7;
      if (!rt.emoted) { rt.emoted = true; if (fav) this.ev('emote', { id: p.id, kind: 'heart' }); }
      this.s.charm += 0.45 * (this.journey ? 1.25 : 1) * this.moodF(p) * (defOf(p).mult) * (rt.buddy ? 1.2 : 1) * (fav ? 2 : 1) * (1 + 0.2 * ((room && room.lv) || 0)) * this.charmMul * (this.s.line.pending ? 0.5 : 1) * walkPenalty * dt;
      this.addMood(p, (fav ? 0.5 : 0.15) * dt);
      if (rt.use <= 0) { rt.state = 'idle'; rt.t = 1 + Math.random() * 2.5; rt.room = rt.room; }
    }
  }
  charmRate() {
    let sum = 0;
    for (const p of this.s.passengers) sum += 0.45 * this.moodF(p) * defOf(p).mult * 0.55 * 1.3;
    const rooms = this.s.rooms.filter((r) => r.type !== 'corridor' && r.type !== 'sleeper'), lv = rooms.length ? rooms.reduce((x, r) => x + (r.lv || 0), 0) / rooms.length : 0;
    return sum * (1 + 0.2 * lv * 0.6) * this.charmMul * (this.s.line.pending ? 0.5 : 1);
  }

  // ---------- the Line ----------
  speedMul() { return 1 + ((this.s.pressure - 22) / 100) * 2.0; }
  region() { return regionOf(this.s.line.region); }
  forkInfo() { const id = this.s.line.region, rg = regionOf(id); return { L: regionOf(id + 'L'), R: regionOf(id + 'R'), at: this.s.line.regionStart + rg.len - 14, end: this.s.line.regionStart + rg.len }; }
  chooseFork(side) { this.s.line.forkChosen = side; }
  stoke(q) {
    const perfect = Math.abs(q - 0.5) < 0.12;
    this.s.pressure = Math.min(100, this.s.pressure + (perfect ? 16 : 6));
    this.s.charm += (perfect ? 1.4 : 0.4) * this.charmMul;
    return perfect ? 'perfect' : 'ok';
  }
  postcard(text, region) {
    const c = { id: this.s.postcards.length, text, region, mile: Math.round(this.s.miles) };
    this.s.postcards.push(c); if (this.s.postcards.length > 80) this.s.postcards.shift();
    this.ev('postcard', c);
  }
  advance(dm) {
    const L = this.s.line, s = this.s;
    let left = dm;
    let guard = 0;
    while (left > 1e-9 && !L.pending && guard++ < 400) {
      const reg = regionOf(L.region), end = L.regionStart + reg.len, forkAt = end - 14;
      const ev = [[L.nextStop, 'stop'], [L.nextLandmark, 'landmark'], [end, 'region']];
      if (!L.forkAnnounced) ev.push([forkAt, 'fork']);
      let dep = null; for (const p of s.passengers) if (!dep || p.dest < dep.dest) dep = p;
      if (dep) ev.push([dep.dest, 'depart']);
      if (s.mail && s.mail.length) ev.push([Math.min(...s.mail.map((x) => x.due)), 'mail']);
      ev.sort((a, b) => a[0] - b[0]);
      const [m, type] = ev[0];
      const step = Math.min(left, Math.max(0, m - s.miles));
      s.miles += step; left -= step;
      if (s.miles < m - 1e-9) break;
      if (type === 'landmark') {
        const lm = landmarkFor(L.seed, m);
        this.postcard(`${lm.open} ${LANDMARKS[lm.idx]} in the ${reg.name}.`, reg.name);
        L.nextLandmark = m + lm.next;
      } else if (type === 'fork') {
        L.forkAnnounced = true; this.ev('fork', this.forkInfo());
      } else if (type === 'region') {
        const side = L.forkChosen || autoSide(L.seed, L.region);
        L.region = L.region + side; L.regionStart = m; L.forkChosen = null; L.forkAnnounced = false;
        const nr = regionOf(L.region);
        if (!s.tickets.includes(nr.name)) s.tickets.push(nr.name);
        this.addPlate(nr);
        this.postcard(`Crossed into the ${nr.name}. The air smells of ${nr.hint}.`, nr.name);
        this.ev('region', nr);
      } else if (type === 'depart') {
        this.depart(dep);
      } else if (type === 'mail') {
        this.deliverMail();
      } else if (type === 'stop') {
        const i = L.stopIndex++, r = rng(hash(`s:${L.seed}:${i}`));
        L.nextStop = m + 11 + r() * 6;
        const name = stopName(L.seed, i), isPass = i === 0 || r() > 0.3;
        if (isPass) {
          const rr = rng(hash(`ret:${L.seed}:${i}`)), pool = (s.departed || []).map((d, k) => [d, k]).filter(([d]) => !d.back && s.miles - d.at >= 80);
          if (pool.length && rr() < 0.22) L.pending = { idx: -1, returning: pool[Math.floor(rr() * pool.length)][1], name, mile: m };
          else L.pending = { idx: s.metCount, name, mile: m };
          this.ev('stop', L.pending);
        }
        else { const bonus = 8 + Math.round(r() * 10); s.charm += bonus; this.postcard(`A quick whistle-stop at ${name}. The stationmaster handed up a tin of buttons (+${bonus} Charm).`, name); this.ev('whistle', name, bonus); }
      }
    }
    return dm - left;
  }
  depart(p) {
    const s = this.s, d = defOf(p), hobby = d.hobby || 'chat', first = firstOf(p.name);
    s.passengers = s.passengers.filter((q) => q !== p); this.rt.delete(p.id);
    s.keepsakes.push({ who: p.name, name: d.keep.name, line: d.keep.line });
    if (!s.departed) s.departed = []; if (!s.mail) s.mail = [];
    s.departed.push({ idx: p.idx, kind: p.kind, gt: p.gt, name: p.name, mood: p.mood, tales: p.tales, at: s.miles, back: false, visits: p.visits || 0, wishState: p.wishState || null, wishSeen: !!p.wishSeen });
    if (s.departed.length > 40) s.departed.shift();
    const r = rng(hash(`mail:${s.line.seed}:${p.id}`));
    s.mail.push({ who: p.name, hobby, due: s.miles + 30 + r() * 80, place: stopName(s.line.seed, 200 + p.id), v: Math.floor(r() * 2) });
    this.postcard(`${p.name} stepped off at their stop and left behind ${d.keep.name.toLowerCase()}.`, 'platform');
    let farewell = (FAREWELLS[hobby] || FAREWELLS.chat).replace(/\{name\}/g, first);
    if (p.wish && p.wishState === 'granted') farewell += ' ' + WISH_LINES.granted[0].replace(/\{n\}/g, first);
    else if (p.wish && p.wishSeen) farewell += ' ' + WISH_LINES.missed[0].replace(/\{n\}/g, first).replace('{wish}', p.wish.text.charAt(0).toLowerCase() + p.wish.text.slice(1));
    this.ev('depart', { p, keep: d.keep, farewell, wish: p.wish ? p.wishState : null });
  }
  deliverMail() {
    const s = this.s; if (!s.mail || !s.mail.length) return;
    let k = 0; s.mail.forEach((x, i) => { if (x.due < s.mail[k].due) k = i; });
    const m = s.mail.splice(k, 1)[0], set = LETTERS[m.hobby] || LETTERS.chat;
    const card = { id: s.postcards.length, text: set[m.v % set.length].replace(/\{place\}/g, m.place), region: 'a letter', mile: Math.round(s.miles), from: m.who };
    s.postcards.push(card); if (s.postcards.length > 80) s.postcards.shift();
    s.lettersGot = (s.lettersGot || 0) + 1; this.ev('letter', card);
  }
  tick(dt) {
    const s = this.s, L = s.line;
    s.pressure = Math.max(22, s.pressure - 1.5 * dt);
    this.syncRt();
    const target = L.pending ? 0 : BASE_SPEED * this.speedMul();
    this.speed += (target - this.speed) * Math.min(1, dt * (L.pending ? 1.2 : 0.8));
    if (!L.pending) this.advance(this.speed * dt);
    for (const p of s.passengers) this.updateP(p, dt);
    this.t.jobs = (this.t.jobs || 0) + dt; if (this.t.jobs > 2) { this.t.jobs = 0; this.ensureJobs(); }
    this.t.lore += dt; if (this.t.lore > 2) { this.t.lore = 0; this.checkProgress(); this.checkWishes(); }
    if (this.dinner) { this.dinner.left -= dt; if (this.dinner.left <= 0) this.finishDinner(); }
    this.t.rel = (this.t.rel || 0) + dt; if (this.t.rel > 1) { const k = this.t.rel; this.t.rel = 0; this.relTick(k); }
  }
  // ---- wishes: each person hopes for one thing. Meeting it is a joy; missing it is only a little sad. ----
  wishProgress(p) {
    const w = p.wish, s = this.s; if (!w) return 0;
    if (w.kind === 'room') return Math.min(1, Math.max(0, ...s.rooms.filter((r) => r.type === w.type).map((r) => (r.w * r.h) / w.area), 0));
    if (w.kind === 'furnish') return Math.min(1, Math.max(0, ...s.rooms.filter((r) => (w.type === 'any' ? r.type !== 'corridor' : r.type === w.type)).map((r) => (r.lv || 0) / w.level), 0));
    if (w.kind === 'visit') return Math.min(1, (s.tickets.length - (p.v0 || 0)) / w.n);
    if (w.kind === 'bond') return Math.min(1, this.bondsOf(p) / w.n);
    return 0;
  }
  bondsOf(p) { let n = 0; for (const q of this.s.passengers) if (q !== p) { const x = this.s.rel[relKey(p.name, q.name)]; if (x && x.bond >= 30) n++; } return n; }
  checkWishes() {
    for (const p of this.s.passengers) {
      if (!p.wish || p.wishState !== 'open') continue;
      if (!p.wishSeen && p.mood >= 30) { p.wishSeen = true; this.ev('wishseen', p, p.wish); }
      if (this.wishProgress(p) >= 1) {
        p.wishState = 'granted'; p.wishSeen = true; this.s.wishes = (this.s.wishes || 0) + 1; this.s.charm += 120 * this.charmMul; this.addMood(p, 25);
        this.postcard(`${p.name}'s wish came true. ${p.wish.text}`, 'platform'); this.ev('wish', p, p.wish); this.ev('emote', { id: p.id, kind: 'heart' });
      }
    }
  }
  // ---- friends and rivals: people sharing a room become something to each other ----
  relTick(dt) {
    const s = this.s, by = new Map();
    for (const p of s.passengers) { const rt = this.rt.get(p.id); if (rt) rt.buddy = false; if (rt && rt.room != null && (rt.state === 'use' || rt.state === 'walk')) { if (!by.has(rt.room)) by.set(rt.room, []); by.get(rt.room).push(p); } }
    for (const [, g] of by) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = g[i], b = g[j], rel = relOf(a.name, b.name); if (rel.kind === 'neutral') continue;
      const k = relKey(a.name, b.name), x = s.rel[k] || (s.rel[k] = { bond: 0, tension: 0, feud: false });
      if (rel.kind === 'friends') {
        const was = x.bond; x.bond = Math.min(100, x.bond + (this.dinner ? 3.2 : 0.8) * dt); this.addMood(a, 0.25 * dt); this.addMood(b, 0.25 * dt); this.rt.get(a.id).buddy = this.rt.get(b.id).buddy = true;
        if (was < 30 && x.bond >= 30) { const t = FRIEND_LINES[0].replace('{a}', firstOf(a.name)).replace('{b}', firstOf(b.name)).replace('{act}', rel.act); this.postcard(t, 'platform'); this.ev('bond', a, b, t); this.ev('emote', { id: a.id, kind: 'heart' }); this.ev('emote', { id: b.id, kind: 'heart' }); }
      } else {
        x.tension += dt;
        if (!x.feud && x.tension >= 28) {
          x.feud = true; x.since = s.miles; this.addMood(a, -6); this.addMood(b, -6);
          const t = SQUABBLE_LINES[0].replace('{a}', firstOf(a.name)).replace('{b}', firstOf(b.name)).replace('{act}', rel.act); this.ev('squabble', a, b, t); this.ev('emote', { id: a.id, kind: 'spark' }); this.ev('emote', { id: b.id, kind: 'spark' });
        }
        if (x.feud) { this.addMood(a, -0.15 * dt); this.addMood(b, -0.15 * dt); if (s.miles - (x.since || 0) > 6) { x.feud = false; x.tension = -20; } }
      }
    }
  }
  // who is currently quarrelling with this person
  feudWith(p) { for (const q of this.s.passengers) if (q !== p) { const x = this.s.rel[relKey(p.name, q.name)]; if (x && x.feud) return { q, x }; } return null; }
  makePeace(p) {
    const f = this.feudWith(p); if (!f) return null;
    f.x.feud = false; f.x.tension = -40; f.x.bond = Math.max(f.x.bond, 10) + 8; this.s.peace = (this.s.peace || 0) + 1; this.s.charm += 40 * this.charmMul;
    this.addMood(p, 8); this.addMood(f.q, 8);
    return `You sit between ${firstOf(p.name)} and ${firstOf(f.q.name)} and say very little, and somehow that is enough. They are laughing within a minute. (+${Math.round(40 * this.charmMul)} Charm)`;
  }
  addPlate(reg) {
    const s = this.s; if (!s.plates) s.plates = [];
    if (s.plates.some((p) => p.id === reg.id)) return;
    const r = rng(hash('plate:' + reg.id));
    s.plates.push({ id: reg.id, name: reg.name, pal: reg.pal, weather: reg.weather, line: PLATE_LINES[Math.floor(r() * PLATE_LINES.length)], mile: Math.round(s.miles) });
  }
  loreCtx() {
    const s = this.s;
    return { miles: s.miles, aboard: s.passengers.length, met: s.metCount, unfolds: s.unfolds, rooms: s.rooms.length, keepsakes: s.keepsakes.length, postcards: s.postcards.length, tickets: s.tickets.length, tales: s.talesHeard || 0, returns: s.returns || 0, letters: s.lettersGot || 0, wishes: s.wishes || 0, moments: s.moments || 0, dinners: s.dinners || 0, bonds: Object.values(s.rel || {}).filter((x) => x.bond >= 30).length, peace: s.peace || 0, jobs: (s.jobs && s.jobs.done) || 0, looks: s.looks || 0, levels: s.rooms.reduce((a, r) => a + (r.lv || 0), 0) };
  }
  loreProgress(e) {
    const ks = Object.keys(e.need); if (!ks.length) return 1;
    const c = this.loreCtx(); return ks.reduce((a, k) => a + Math.min(1, c[k] / e.need[k]), 0) / ks.length;
  }
  checkProgress() {
    const s = this.s;
    if (!s.plates) s.plates = [];
    if (!s.tickets.includes(this.region().name)) s.tickets.push(this.region().name);
    this.addPlate(this.region());
    for (const e of LORE) if (!s.journal.includes(e.id) && this.loreProgress(e) >= 1) { s.journal.push(e.id); this.ev('lore', e); }
  }

  // ---------- away ----------
  offline(seconds) {
    const s = this.s;
    const eff = Math.min(seconds <= 7200 ? seconds : 7200 + (seconds - 7200) * 0.35, 28800);
    const rep = { secs: seconds, charm: 0, miles: 0, postcards: [], departed: [], regions: [], boarded: [], waiting: null };
    const c0 = s.charm, m0 = s.miles;
    this.syncRt();
    s.charm += this.charmRate() * eff;
    for (const p of s.passengers) this.addMood(p, Math.min(eff, 7200) * 0.03);
    let travel = BASE_SPEED * 1.05 * Math.min(eff, 6 * 3600);
    this.quiet = rep;
    let guard = 0;
    while (travel > 1e-6 && guard++ < 50) {
      const used = this.advance(travel); travel -= used;
      if (s.line.pending) {
        if (s.auto && this.stopFits()) { if (this.invite() !== null) break; } else break;
      } else if (used <= 1e-9) break;
    }
    this.quiet = null;
    rep.charm = s.charm - c0; rep.miles = s.miles - m0; rep.waiting = s.line.pending;
    rep.postcards = rep.postcards.slice(-5);
    this.checkProgress(); this.checkWishes();
    return rep;
  }
}
