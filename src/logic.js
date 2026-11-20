// Game rules and simulation for the Marigold Line. No rendering code lives here.
import { ROOMS, HOBBY_ROOM, PASSENGERS, GEN_FIRST, GEN_LAST, GEN_TYPES, REGION_ADJ, REGION_NOUN, STOP_A, STOP_B, PALETTES, WEATHER, HINT_WORDS, LANDMARKS, POSTCARD_OPEN, LORE } from './data.js';

export const GW = 24, GH = 16;
export const BASE_SPEED = 0.12; // miles per second at idle pressure
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
export function stopName(seed, i) { const r = rng(hash(`stop:${seed}:${i}`)); return `${STOP_A[Math.floor(r() * STOP_A.length)]} ${STOP_B[Math.floor(r() * STOP_B.length)]}`; }

// ---------- passengers ----------
export function passengerAt(index, seed) {
  if (index < PASSENGERS.length) { const d = PASSENGERS[index]; return { kind: 'a', idx: index, name: d.name, trait: d.trait, hobby: d.hobby, gift: d.gift, line: d.line, tales: d.tales, keep: d.keep }; }
  const r = rng(hash(`pass:${seed}:${index}`));
  const gt = Math.floor(r() * GEN_TYPES.length), g = GEN_TYPES[gt];
  const first = GEN_FIRST[Math.floor(r() * GEN_FIRST.length)], last = GEN_LAST[Math.floor(r() * GEN_LAST.length)];
  const n = first;
  return {
    kind: 'g', idx: index, gt, name: `${first} ${last}`, trait: g.trait, hobby: g.hobby, gift: HOBBY_ROOM[g.hobby] === 'parlor' ? null : (HOBBY_ROOM[g.hobby] || null),
    line: `${first} ${last} steps onto the platform with a single bag and a look of quiet certainty. "${g.trait}. That is all you need to know. May I come aboard?"`,
    tales: g.tales.map((t) => t.replace(/\{n\}/g, n)), keep: { name: `${first}'s keepsake`, line: 'Something small is left behind, and it makes the room feel kinder.' },
  };
}
export function defOf(p) {
  if (p.kind === 'a') { const d = PASSENGERS[p.idx]; return { ...d, kind: 'a' }; }
  const g = GEN_TYPES[p.gt], n = p.name.split(' ')[0];
  return { trait: g.trait, hobby: g.hobby, tales: g.tales.map((t) => t.replace(/\{n\}/g, n)), keep: { name: `${n}'s keepsake`, line: 'Something small is left behind, and it makes the room feel kinder.' } };
}

// ---------- state ----------
export function newState(now = Date.now()) {
  return {
    v: 2, created: now, last: now, charm: 70, miles: 0, pressure: 22, unfolds: 0, metCount: 0,
    grid: { x0: 6, y0: 4, x1: 15, y1: 9 },
    rooms: [{ id: 1, type: 'sleeper', x: 6, y: 4, w: 3, h: 3 }, { id: 2, type: 'dining', x: 9, y: 4, w: 4, h: 3 }, { id: 3, type: 'corridor', x: 6, y: 7, w: 10, h: 1 }],
    nextRoom: 4, unlocked: ['sleeper', 'dining', 'parlor', 'corridor'],
    passengers: [], nextPid: 1, keepsakes: [], postcards: [], tickets: [], journal: [],
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

export class Sim {
  constructor(state, hooks = {}) {
    this.s = state; this.h = hooks; this.rt = new Map(); this.quiet = null; this.t = { lore: 0 };
    this.speed = 0; this.version = 0;
    this.index();
  }
  ev(name, a, b) {
    if (this.quiet) { const q = this.quiet; if (name === 'postcard') q.postcards.push(a); else if (name === 'depart') q.departed.push(a); else if (name === 'region') q.regions.push(a); else if (name === 'board') q.boarded.push(a); else if (name === 'fork') { /* ignored offline */ } return; }
    const f = this.h[name]; if (f) f(a, b);
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
        this.walls.push({ x, y, side });
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

  // ---------- passengers ----------
  freeBeds() { return this.beds - this.s.passengers.length; }
  candidate() { return passengerAt(this.s.metCount, this.s.line.seed); }
  invite() {
    const L = this.s.line, st = L.pending; if (!st) return 'Nobody is waiting.';
    if (this.freeBeds() <= 0) return 'No berth free. Build more Sleeper space, or wait for someone to reach their stop.';
    const c = passengerAt(st.idx, L.seed), s = this.s;
    const sl = s.rooms.find((r) => r.type === 'sleeper');
    const p = { id: s.nextPid++, kind: c.kind, idx: c.idx, gt: c.gt, name: c.name, mood: 6, tales: 0, board: s.miles, dest: s.miles + 130 + Math.floor(rng(hash('d' + c.idx + L.seed))() * 200), x: sl.x + 0.5, y: sl.y + 0.5 };
    s.passengers.push(p); s.metCount = st.idx + 1; L.pending = null;
    if (c.gift && !s.unlocked.includes(c.gift)) { s.unlocked.push(c.gift); this.ev('unlock', c.gift, c); }
    this.syncRt(); this.ev('board', p, c); return null;
  }
  decline() { const L = this.s.line; if (!L.pending) return; this.s.metCount = L.pending.idx + 1; L.pending = null; }
  syncRt() { for (const p of this.s.passengers) if (!this.rt.has(p.id)) this.rt.set(p.id, { state: 'idle', path: [], i: 0, t: 1 + Math.random() * 2, room: null, use: 0, face: 0 }); }
  moodF(p) { return 0.6 + 0.8 * (p.mood / 100); }
  get charmMul() { return 1 + 0.04 * this.s.keepsakes.length; }
  addMood(p, v) {
    p.mood = clamp(p.mood + v, 0, 100);
    const d = defOf(p), th = [30, 60, 90];
    while (p.tales < 3 && p.mood >= th[p.tales]) { p.tales++; this.ev('tale', p, d.tales[p.tales - 1]); }
  }
  occupancy(rid) { let n = 0; for (const [, r] of this.rt) if (r.room === rid && (r.state === 'use' || r.state === 'walk')) n++; return n; }
  pickRoom(p) {
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
      if (dist > 0.001) rt.face = Math.atan2(dx, dy);
      if (dist <= step) { p.x = tx; p.y = ty; rt.i++; if (rt.i >= rt.path.length - 1) { rt.state = 'use'; } }
      else { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
    } else if (rt.state === 'use') {
      rt.use -= dt;
      const room = this.roomById.get(rt.room), d = defOf(p), fav = room && room.type === HOBBY_ROOM[d.hobby];
      const L = rt.len || 0, walkPenalty = L <= 6 ? 1.25 : L <= 12 ? 1 : L <= 18 ? 0.85 : 0.7;
      if (!rt.emoted) { rt.emoted = true; if (fav) this.ev('emote', { id: p.id, kind: 'heart' }); }
      this.s.charm += 0.45 * this.moodF(p) * (fav ? 2 : 1) * (1 + 0.2 * ((room && room.lv) || 0)) * this.charmMul * (this.s.line.pending ? 0.5 : 1) * walkPenalty * dt;
      this.addMood(p, (fav ? 0.5 : 0.15) * dt);
      if (rt.use <= 0) { rt.state = 'idle'; rt.t = 1 + Math.random() * 2.5; rt.room = rt.room; }
    }
  }
  charmRate() {
    let sum = 0;
    for (const p of this.s.passengers) sum += 0.45 * this.moodF(p) * 0.55 * 1.3;
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
      ev.sort((a, b) => a[0] - b[0]);
      const [m, type] = ev[0];
      const step = Math.min(left, Math.max(0, m - s.miles));
      s.miles += step; left -= step;
      if (s.miles < m - 1e-9) break;
      if (type === 'landmark') {
        const r = rng(hash(`lm:${L.seed}:${Math.floor(m * 10)}`));
        this.postcard(`${POSTCARD_OPEN[Math.floor(r() * POSTCARD_OPEN.length)]} ${LANDMARKS[Math.floor(r() * LANDMARKS.length)]} in the ${reg.name}.`, reg.name);
        L.nextLandmark = m + 8 + r() * 7;
      } else if (type === 'fork') {
        L.forkAnnounced = true; this.ev('fork', this.forkInfo());
      } else if (type === 'region') {
        const side = L.forkChosen || (rng(hash(`f:${L.seed}:${L.region}`))() < 0.5 ? 'L' : 'R');
        L.region = L.region + side; L.regionStart = m; L.forkChosen = null; L.forkAnnounced = false;
        const nr = regionOf(L.region);
        if (!s.tickets.includes(nr.name)) s.tickets.push(nr.name);
        this.postcard(`Crossed into the ${nr.name}. The air smells of ${nr.hint}.`, nr.name);
        this.ev('region', nr);
      } else if (type === 'depart') {
        this.depart(dep);
      } else if (type === 'stop') {
        const i = L.stopIndex++, r = rng(hash(`s:${L.seed}:${i}`));
        L.nextStop = m + 11 + r() * 6;
        const name = stopName(L.seed, i), isPass = i === 0 || r() > 0.3;
        if (isPass) { L.pending = { idx: s.metCount, name, mile: m }; this.ev('stop', L.pending); }
        else { const bonus = 8 + Math.round(r() * 10); s.charm += bonus; this.postcard(`A quick whistle-stop at ${name}. The stationmaster handed up a tin of buttons (+${bonus} Charm).`, name); this.ev('whistle', name, bonus); }
      }
    }
    return dm - left;
  }
  depart(p) {
    const s = this.s, d = defOf(p);
    s.passengers = s.passengers.filter((q) => q !== p); this.rt.delete(p.id);
    s.keepsakes.push({ who: p.name, name: d.keep.name, line: d.keep.line });
    this.postcard(`${p.name} stepped off at their stop and left behind ${d.keep.name.toLowerCase()}.`, 'platform');
    this.ev('depart', { p, keep: d.keep });
  }
  tick(dt) {
    const s = this.s, L = s.line;
    s.pressure = Math.max(22, s.pressure - 1.5 * dt);
    this.syncRt();
    const target = L.pending ? 0 : BASE_SPEED * this.speedMul();
    this.speed += (target - this.speed) * Math.min(1, dt * (L.pending ? 1.2 : 0.8));
    if (!L.pending) this.advance(this.speed * dt);
    for (const p of s.passengers) this.updateP(p, dt);
    this.t.lore += dt; if (this.t.lore > 2) { this.t.lore = 0; this.checkProgress(); }
  }
  checkProgress() {
    const s = this.s, ctx = { miles: s.miles, passengers: s.passengers, metCount: s.metCount, unfolds: s.unfolds, keepsakes: s.keepsakes, postcards: s.postcards };
    for (const e of LORE) if (!s.journal.includes(e.id) && e.test(ctx)) { s.journal.push(e.id); this.ev('lore', e); }
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
        if (s.auto && this.freeBeds() > 0) { if (this.invite() !== null) break; } else break;
      } else if (used <= 1e-9) break;
    }
    this.quiet = null;
    rep.charm = s.charm - c0; rep.miles = s.miles - m0; rep.waiting = s.line.pending;
    rep.postcards = rep.postcards.slice(-5);
    this.checkProgress();
    return rep;
  }
}
