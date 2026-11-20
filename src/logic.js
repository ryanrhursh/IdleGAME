// Game rules and simulation. No rendering code lives here.
import { SEASONS, SEASON_MS, BUILD, FOLK, BARKS, WINTER_BARKS, ANECDOTES, LORE, BOONS, GENERATED, CHOICES, GEN_START, GEN_STEP } from './data.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function fmt(n) {
  if (!isFinite(n)) return '0';
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n));
  const sfx = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
  let i = 0; while (n >= 1000 && i < sfx.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + sfx[i];
}

export function seasonAt(ms) {
  const p = (ms / SEASON_MS) % 4, idx = Math.floor(p), f = p - idx;
  const a = SEASONS[idx], b = SEASONS[(idx + 1) % 4];
  const t = clamp((f - 0.7) / 0.3, 0, 1), k = t * t * (3 - 2 * t);
  return { cur: a, next: b, k, idx, col: a.col.map((c, i) => c + (b.col[i] - c) * k), msLeft: (1 - f) * SEASON_MS };
}

export const defaultMods = () => ({ value: 1, cap: 4, wspeed: 1, cog: 1, chime: 0.2, mood: 1, drip: 1, offline: 1, lamp: 0, speed: 1 });

function mkNode(id, p, x, y, z, bx = 0, by = 0, bz = 0) {
  return { id, p, x, y, z, bx, by, bz, b: null, born: 0, charge: 4, route: 0, alt: 0, note: 0, dead: false };
}

export function newState(now = Date.now()) {
  return {
    v: 1, created: now, last: now, sap: 30, cogs: 2, total: 0, drops: 0,
    nodes: [mkNode(0, -1, 0, 0, 0), mkNode(1, 0, 0, 1.3, 0, 0.05, 0.1, 0), mkNode(2, 1, 0.05, 2.5, 0.05, -0.08, 0.1, 0.04), mkNode(3, 2, 0.12, 3.6, 0.0, 0.06, 0.12, -0.05)],
    bridges: [], winders: [], choices: {}, journal: [], hint: 0, hollow: 0, palette: 'auto', sound: true, treeName: '', nextWinder: 0, giftsGiven: {},
  };
}

export function loadState(raw, now = Date.now()) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !Array.isArray(s.nodes) || s.nodes.length < 4) return null;
    const d = newState(now);
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    return s;
  } catch (e) { return null; }
}

export class Sim {
  constructor(state, hooks = {}) {
    this.s = state; this.h = hooks;
    this.marbles = []; this.rt = new Map(); this.t = { drip: 0, lore: 0, last: 0 };
    this.sea = seasonAt(Date.now());
    this.mods = this.computeMods();
    this.index(); this.syncWinders();
  }

  // ---------- derived data ----------
  computeMods() {
    const m = defaultMods();
    for (const [key, opt] of Object.entries(this.s.choices)) { const b = BOONS[opt]; if (b) b.apply(m); }
    return m;
  }
  len(a, b) { const A = this.s.nodes[a], B = this.s.nodes[b]; return Math.max(0.2, Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) * 1.08); }
  index() {
    const nodes = this.s.nodes, N = nodes.length;
    const ch = this.ch = Array.from({ length: N }, () => []);
    const adj = this.adj = Array.from({ length: N }, () => []);
    this.alive = 0;
    for (const n of nodes) {
      if (n.dead) continue;
      this.alive++;
      if (n.p >= 0) { ch[n.p].push(n.id); const l = this.len(n.p, n.id); adj[n.p].push({ to: n.id, len: l }); adj[n.id].push({ to: n.p, len: l }); }
    }
    for (const b of this.s.bridges) { const l = this.len(b.a, b.b) * 1.05; adj[b.a].push({ to: b.b, len: l }); adj[b.b].push({ to: b.a, len: l }); }
    this.tips = nodes.filter((n) => !n.dead && n.id > 0 && ch[n.id].length === 0).map((n) => n.id);
    const lc = this.leafCount = new Array(N).fill(0);
    for (let i = N - 1; i >= 1; i--) { if (nodes[i].dead) continue; if (ch[i].length === 0) lc[i] = 1; if (nodes[i].p >= 0) lc[nodes[i].p] += lc[i]; }
    this.lamps = nodes.filter((n) => !n.dead && n.b === 'lantern');
    this.lampMul = new Map();
    for (const t of this.tips) {
      const T = nodes[t]; let c = 0;
      for (const l of this.lamps) if (Math.hypot(l.x - T.x, l.y - T.y, l.z - T.z) < 3.6) c++;
      this.lampMul.set(t, 1 + (0.4 + this.mods.lamp) * Math.min(c, 3));
    }
    this.maxY = Math.max(...nodes.filter((n) => !n.dead).map((n) => n.y));
    this.radius = Math.max(1, ...nodes.filter((n) => !n.dead).map((n) => Math.hypot(n.x, n.z)));
    this.dirty = true;
    if (this.h.structure) this.h.structure();
  }
  get grown() { return this.alive - 4; }
  count(type) { return this.s.nodes.filter((n) => !n.dead && n.b === type).length; }
  baseDrop() { return 2 * this.mods.value * this.sea.cur.valueMul; }
  nodeAt(id) { return this.s.nodes[id]; }

  edgeCtrl(a, b) {
    const A = this.s.nodes[a], B = this.s.nodes[b];
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, mz = (A.z + B.z) / 2;
    if (B.p === a) return [mx + B.bx, my + B.by, mz + B.bz];
    if (A.p === b) return [mx + A.bx, my + A.by, mz + A.bz];
    return [mx, my - (0.12 * this.len(a, b) + 0.2), mz]; // bridge sags
  }
  edgePoint(a, b, t, out = {}) {
    const A = this.s.nodes[a], B = this.s.nodes[b], c = this.edgeCtrl(a, b), u = 1 - t;
    out.x = u * u * A.x + 2 * u * t * c[0] + t * t * B.x;
    out.y = u * u * A.y + 2 * u * t * c[1] + t * t * B.y;
    out.z = u * u * A.z + 2 * u * t * c[2] + t * t * B.z;
    return out;
  }
  options(id) {
    const n = this.s.nodes[id], o = [];
    if (n.p >= 0) o.push(n.p);
    for (const b of this.s.bridges) if (b.a === id) o.push(b.b);
    return o;
  }
  next(id) {
    const n = this.s.nodes[id], o = this.options(id);
    if (o.length <= 1) return o[0];
    if (n.route === 1) return o[0];
    if (n.route === 2) return o[1];
    n.alt = (n.alt + 1) % o.length; return o[n.alt];
  }

  // ---------- economy ----------
  growCost(len) { return Math.round(7 * Math.pow(1.085, Math.max(0, this.grown)) * (0.5 + 0.55 * len)); }
  bridgeCost(a, b) { return Math.round(12 * Math.pow(1.08, Math.max(0, this.grown)) * (0.6 + 0.35 * this.len(a, b))); }
  buildCost(type) {
    const d = BUILD[type], n = this.count(type);
    return { sap: Math.round(d.sap * Math.pow(d.grow, n)), cogs: d.cogs ? Math.round(d.cogs + (d.cogGrow || 0) * n) : 0 };
  }
  afford(c) { return this.s.sap >= (c.sap || 0) && this.s.cogs >= (c.cogs || 0); }
  pay(c) { this.s.sap -= c.sap || 0; this.s.cogs -= c.cogs || 0; }

  grow(parentId, tx, ty, tz) {
    const P = this.s.nodes[parentId];
    if (!P || P.dead) return 'No such branch.';
    if (this.ch[parentId].length >= 3) return 'That branch is full.';
    if (this.alive >= 520) return 'The tree is as big as this bench can hold for now.';
    let dx = tx - P.x, dy = ty - P.y, dz = tz - P.z;
    dy = Math.max(dy, 0.2);
    let l = Math.hypot(dx, dy, dz);
    if (l < 0.7) return 'Too short to grow.';
    if (l > 3.4) { const k = 3.4 / l; dx *= k; dy *= k; dz *= k; l = 3.4; }
    const x = P.x + dx, y = P.y + dy, z = P.z + dz;
    for (const n of this.s.nodes) if (!n.dead && n.id !== parentId && Math.hypot(n.x - x, n.y - y, n.z - z) < 0.55) return 'Too close to another branch.';
    const cost = this.growCost(l);
    if (!this.afford({ sap: cost })) return 'Not enough sap.';
    this.pay({ sap: cost });
    const r = rng(this.s.nodes.length * 2654435761);
    const id = this.s.nodes.length;
    const n = mkNode(id, parentId, x, y, z, (r() - 0.5) * 0.5 * l, 0.16 * l, (r() - 0.5) * 0.5 * l);
    n.born = Date.now(); n.charge = 0;
    this.s.nodes.push(n);
    this.index();
    return n;
  }
  previewGrow(parentId, tx, ty, tz) {
    const P = this.s.nodes[parentId];
    let dx = tx - P.x, dy = Math.max(ty - P.y, 0.2), dz = tz - P.z;
    let l = Math.hypot(dx, dy, dz);
    if (l > 3.4) { const k = 3.4 / l; dx *= k; dy *= k; dz *= k; l = 3.4; }
    const x = P.x + dx, y = P.y + dy, z = P.z + dz;
    let err = null;
    if (l < 0.7) err = 'short';
    else if (this.ch[parentId].length >= 3) err = 'full';
    else for (const n of this.s.nodes) if (!n.dead && n.id !== parentId && Math.hypot(n.x - x, n.y - y, n.z - z) < 0.55) { err = 'close'; break; }
    const cost = this.growCost(l);
    if (!err && !this.afford({ sap: cost })) err = 'sap';
    return { x, y, z, len: l, cost, err };
  }
  build(id, type) {
    const n = this.s.nodes[id];
    if (!n || n.dead || n.id === 0) return 'Cannot build there.';
    if (n.b) return 'Something is already built here.';
    const c = this.buildCost(type);
    if (!this.afford(c)) return 'Not enough sap or cogs.';
    this.pay(c);
    n.b = type; n.built = Date.now();
    if (type === 'chime') n.note = clamp(Math.floor(n.y * 0.9), 0, 14);
    if (type === 'hut') this.addWinder(id);
    this.index();
    return null;
  }
  demolish(id) {
    const n = this.s.nodes[id];
    if (!n || !n.b) return;
    const type = n.b; n.b = null;
    // refund 60% of what the next copy would have cost minus one step
    const base = BUILD[type], count = this.count(type);
    const refund = { sap: Math.round(base.sap * Math.pow(base.grow, count) * 0.6), cogs: type === 'hut' ? Math.floor((base.cogs + (base.cogGrow || 0) * count) * 0.6) : 0 };
    this.s.sap += refund.sap; this.s.cogs += refund.cogs;
    if (type === 'hut') for (const w of this.s.winders) if (w.hut === id) w.hut = 0;
    this.index();
  }
  canPrune(id) { const n = this.s.nodes[id]; return n && !n.dead && id > 3 && this.ch[id].length === 0; }
  prune(id) {
    if (!this.canPrune(id)) return false;
    const n = this.s.nodes[id];
    if (n.b) this.demolish(id);
    const refund = Math.round(this.growCost(this.len(n.p, id) / 1.08) * 0.5);
    this.s.sap += refund;
    n.dead = true;
    this.s.bridges = this.s.bridges.filter((b) => b.a !== id && b.b !== id);
    for (const w of this.s.winders) { const r = this.rt.get(w.id); if (r) { r.path = []; r.mode = 'idle'; r.node = r.node === id ? n.p : r.node; r.target = -1; } }
    this.marbles = this.marbles.filter((m) => m.n !== id && m.to !== id);
    this.index();
    return true;
  }
  bridgeTargets(a) {
    const A = this.s.nodes[a], out = [];
    for (const n of this.s.nodes) {
      if (n.dead || n.id === a || n.id === 0) continue;
      if (A.y - n.y < 0.3) continue;
      if (n.id === A.p) continue;
      if (Math.hypot(A.x - n.x, A.y - n.y, A.z - n.z) > 7.5) continue;
      if (this.s.bridges.some((b) => b.a === a && b.b === n.id)) continue;
      out.push(n.id);
    }
    return out;
  }
  addBridge(a, b) {
    if (!this.bridgeTargets(a).includes(b)) return 'A rope cannot go there.';
    if (this.s.bridges.filter((x) => x.a === a).length >= 2) return 'That branch already has two ropes.';
    const c = this.bridgeCost(a, b);
    if (!this.afford({ sap: c })) return 'Not enough sap.';
    this.pay({ sap: c });
    this.s.bridges.push({ a, b, born: Date.now() });
    this.index();
    return null;
  }
  removeBridge(a, b) {
    const i = this.s.bridges.findIndex((x) => x.a === a && x.b === b);
    if (i < 0) return;
    this.s.sap += Math.round(this.bridgeCost(a, b) * 0.5);
    this.s.bridges.splice(i, 1);
    this.s.nodes[a].route = 0;
    this.marbles = this.marbles.filter((m) => !(m.n === a && m.to === b));
    for (const w of this.s.winders) { const r = this.rt.get(w.id); if (r) { r.path = []; r.mode = 'idle'; r.target = -1; if (!this.s.nodes[r.node] || this.s.nodes[r.node].dead) r.node = 0; } }
    this.index();
  }
  cycleRoute(id) {
    const n = this.s.nodes[id];
    if (this.options(id).length < 2) return;
    n.route = (n.route + 1) % 3;
  }

  // ---------- leaves, sap ----------
  shake(tipId) {
    const n = this.s.nodes[tipId];
    if (!n || n.dead || n.charge < 1 || this.marbles.length > 300) return false;
    n.charge -= 1;
    const to = this.next(tipId);
    if (to === undefined) return false;
    this.marbles.push({ n: tipId, to, s: 0, v: 0.9, val: this.baseDrop(), id: Math.random() });
    if (this.h.shake) this.h.shake(tipId);
    return true;
  }
  cap() { return this.mods.cap; }

  // ---------- folk ----------
  addWinder(hutNode) {
    const s = this.s, idx = s.nextWinder++;
    const f = FOLK[idx % FOLK.length];
    const w = {
      id: idx, name: idx < FOLK.length ? f.name : `${f.name} ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(8, Math.floor(idx / FOLK.length) - 1)]}`,
      f: idx % FOLK.length, hut: hutNode, mood: 0, tales: 0, hue: (idx * 47 + 18) % 360, windCd: 0,
    };
    s.winders.push(w);
    this.syncWinders();
    return w;
  }
  folkOf(w) { return FOLK[w.f]; }
  syncWinders() {
    for (const w of this.s.winders) {
      if (!this.rt.has(w.id)) {
        const home = this.s.nodes[w.hut] && !this.s.nodes[w.hut].dead ? w.hut : 0;
        const p = this.nodePos(home);
        this.rt.set(w.id, { node: home, path: [], i: 0, s: 0, mode: 'idle', t: 1 + Math.random() * 2, target: -1, x: p.x, y: p.y, z: p.z, boost: 0, bark: 20 + Math.random() * 40, face: 0 });
      }
    }
  }
  nodePos(id) { const n = this.s.nodes[id]; return { x: n.x, y: n.y, z: n.z }; }
  windKey(wid) {
    const w = this.s.winders.find((x) => x.id === wid), r = this.rt.get(wid);
    if (!w || w.windCd > 0) return false;
    w.windCd = 45; r.boost = 30; this.addMood(w, 6);
    return true;
  }
  addMood(w, v) {
    const before = w.mood;
    w.mood = clamp(w.mood + v * this.mods.mood * this.sea.cur.moodMul, 0, 100);
    const th = [30, 60, 90];
    while (w.tales < 3 && w.mood >= th[w.tales]) {
      w.tales++;
      if (this.h.tale) this.h.tale(w, this.folkOf(w).tales[w.tales - 1]);
    }
    return w.mood - before;
  }
  path(a, b) {
    if (a === b) return [a];
    const nodes = this.s.nodes, N = nodes.length, adj = this.adj;
    const g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const T = nodes[b], hh = (n) => Math.hypot(nodes[n].x - T.x, nodes[n].y - T.y, nodes[n].z - T.z);
    g[a] = 0; const open = [a];
    while (open.length) {
      let bi = 0, bf = Infinity;
      for (let i = 0; i < open.length; i++) { const f = g[open[i]] + hh(open[i]); if (f < bf) { bf = f; bi = i; } }
      const cur = open.splice(bi, 1)[0];
      if (cur === b) break;
      done[cur] = 1;
      for (const e of adj[cur]) {
        if (done[e.to]) continue;
        const ng = g[cur] + e.len;
        if (ng < g[e.to]) { g[e.to] = ng; prev[e.to] = cur; if (!open.includes(e.to)) open.push(e.to); }
      }
    }
    if (prev[b] < 0) return null;
    const out = [b]; let c = b; while (c !== a) { c = prev[c]; out.push(c); }
    return out.reverse();
  }
  moodFactor(w) { return 0.8 + 0.4 * (w.mood / 100); }
  nearLamp(id) { const n = this.s.nodes[id]; for (const l of this.lamps) if (Math.hypot(l.x - n.x, l.y - n.y, l.z - n.z) < 3.6) return true; return false; }

  updateWinder(w, dt) {
    const r = this.rt.get(w.id), nodes = this.s.nodes;
    if (!nodes[r.node] || nodes[r.node].dead) { r.node = 0; r.path = []; r.mode = 'idle'; }
    if (w.windCd > 0) w.windCd = Math.max(0, w.windCd - dt);
    if (r.boost > 0) r.boost -= dt;
    const speedMul = this.mods.wspeed * this.moodFactor(w) * (r.boost > 0 ? 1.6 : 1);
    this.addMood(w, dt * (this.nearLamp(w.hut) ? 0.09 : 0.035));
    r.bark -= dt;
    if (r.bark <= 0) {
      r.bark = 45 + Math.random() * 70;
      const pool = this.sea.cur.id === 'winter' && Math.random() < 0.5 ? WINTER_BARKS : BARKS;
      if (this.h.bark) this.h.bark(w, pool[Math.floor(Math.random() * pool.length)]);
    }
    if (r.mode === 'idle') {
      r.t -= dt;
      if (r.t > 0) return;
      // choose the fullest unattended leaf
      let best = -1, bc = 0.99;
      for (const t of this.tips) {
        if (nodes[t].charge > bc) {
          let taken = false;
          for (const [, o] of this.rt) if (o !== r && o.target === t) { taken = true; break; }
          if (!taken) { best = t; bc = nodes[t].charge; }
        }
      }
      if (best >= 0) {
        const p = this.path(r.node, best);
        if (p) { r.path = p; r.i = 0; r.s = 0; r.mode = 'walk'; r.target = best; return; }
      }
      // wander near home
      const home = nodes[w.hut] && !nodes[w.hut].dead ? w.hut : 0;
      if (r.node !== home && Math.random() < 0.6) { const p = this.path(r.node, home); if (p) { r.path = p; r.i = 0; r.s = 0; r.mode = 'walk'; r.target = -1; return; } }
      const H = nodes[home]; const near = nodes.filter((n) => !n.dead && Math.hypot(n.x - H.x, n.y - H.y, n.z - H.z) < 4.5 && n.id !== r.node);
      if (near.length) { const pick = near[Math.floor(Math.random() * near.length)]; const p = this.path(r.node, pick.id); if (p) { r.path = p; r.i = 0; r.s = 0; r.mode = 'walk'; r.target = -1; return; } }
      r.t = 2 + Math.random() * 3;
    } else if (r.mode === 'walk') {
      if (r.path.length < 2) { r.mode = 'idle'; r.t = 1; return; }
      const a = r.path[r.i], b = r.path[r.i + 1];
      if (!nodes[a] || nodes[a].dead || !nodes[b] || nodes[b].dead) { r.mode = 'idle'; r.path = []; r.t = 0.5; return; }
      const L = this.len(a, b);
      r.s += (0.95 * speedMul * dt) / L;
      if (r.s >= 1) {
        r.s = 0; r.i++; r.node = b;
        if (r.i >= r.path.length - 1) {
          r.path = [];
          if (r.target >= 0 && this.tips.includes(r.target)) { r.mode = 'work'; r.t = 1.3 / speedMul; }
          else { r.mode = 'idle'; r.t = 2 + Math.random() * 4; r.target = -1; }
        }
      }
      const pt = this.edgePoint(a, b, clamp(r.s, 0, 1)); r.x = pt.x; r.y = pt.y; r.z = pt.z;
      r.face = Math.atan2(nodes[b].x - nodes[a].x, nodes[b].z - nodes[a].z);
    } else if (r.mode === 'work') {
      const p = this.nodePos(r.node); r.x = p.x; r.y = p.y; r.z = p.z;
      r.t -= dt;
      if (r.t <= 0) {
        if (this.shake(r.target)) this.addMood(w, 0.25);
        r.mode = 'idle'; r.t = 0.4; r.target = -1;
      }
    }
    if (r.mode === 'idle') { const p = this.nodePos(r.node); r.x = p.x; r.y = p.y; r.z = p.z; }
  }

  // ---------- tick ----------
  tick(dt) {
    const s = this.s, nodes = s.nodes;
    this.sea = seasonAt(Date.now());
    const cap = this.mods.cap, chargeBase = 0.33 * this.sea.cur.chargeMul;
    for (const t of this.tips) {
      const n = nodes[t];
      n.charge = Math.min(cap, n.charge + chargeBase * (this.lampMul.get(t) || 1) * dt);
    }
    // the tree drips on its own, even with no one tending it
    this.t.drip += dt;
    if (this.t.drip >= 10 * this.mods.drip) {
      this.t.drip = 0;
      let best = -1, bc = 0.99;
      for (const t of this.tips) if (nodes[t].charge > bc) { bc = nodes[t].charge; best = t; }
      if (best >= 0) this.shake(best);
    }
    for (const w of s.winders) this.updateWinder(w, dt);
    // marbles
    const keep = [];
    for (const m of this.marbles) {
      const A = nodes[m.n], B = nodes[m.to];
      if (!A || !B || A.dead || B.dead) continue;
      const L = this.len(m.n, m.to), drop = (A.y - B.y) / L;
      m.v = Math.min(5.5 * this.mods.speed, m.v + 6 * Math.max(0.12, drop) * dt);
      m.s += (m.v * dt) / L;
      let gone = false;
      while (m.s >= 1 && !gone) {
        const node = nodes[m.to];
        if (node.b === 'chime') { m.val *= 1 + this.mods.chime; if (this.h.chime) this.h.chime(node, m); }
        else if (node.b === 'mill') {
          m.val += 2 * this.mods.value * this.sea.cur.valueMul;
          if (Math.random() < 0.06 * this.mods.cog * this.sea.cur.cogMul) { s.cogs += 1; if (this.h.cog) this.h.cog(node); }
          if (this.h.mill) this.h.mill(node, m);
        }
        if (node.id === 0) { s.sap += m.val; s.total += m.val; s.drops++; if (this.h.deposit) this.h.deposit(m.val); gone = true; }
        else { m.n = node.id; m.to = this.next(node.id); m.s -= 1; if (m.to === undefined) gone = true; }
      }
      if (!gone) keep.push(m);
    }
    this.marbles = keep;
    this.t.lore += dt;
    if (this.t.lore > 2) { this.t.lore = 0; this.checkProgress(); }
  }

  // ---------- progress ----------
  hollowLevel() { let l = 0, t = 150; while (this.s.total >= t && l < 14) { l++; t *= 2.4; } return l; }
  checkProgress() {
    const s = this.s;
    const hl = this.hollowLevel();
    if (hl > s.hollow) { s.hollow = hl; if (this.h.hollow) this.h.hollow(hl); }
    for (const e of LORE) if (!s.journal.includes(e.id) && e.test(s, this)) { s.journal.push(e.id); if (this.h.lore) this.h.lore(e); }
    this.pending = this.pendingChoice();
    if (this.pending && !this.announced) { this.announced = this.pending.key; if (this.h.choice) this.h.choice(this.pending); }
  }
  genChoice(k) {
    const r = rng(k * 7919 + 13), pool = GENERATED.slice(), a = pool.splice(Math.floor(r() * pool.length), 1)[0], b = pool.splice(Math.floor(r() * pool.length), 1)[0];
    return { key: 'g' + k, at: GEN_START + GEN_STEP * k, title: 'The tree asks for a gift', body: 'Another ring forms in the trunk. It holds a small wish.', options: [a, b], generated: true };
  }
  pendingChoice() {
    for (const c of CHOICES) { if (!(c.key in this.s.choices)) return this.grown >= c.at ? c : null; }
    let k = 0; while ('g' + k in this.s.choices) k++;
    const c = this.genChoice(k);
    return this.grown >= c.at ? c : null;
  }
  choose(key, optionId) {
    const c = this.pending && this.pending.key === key ? this.pending : null;
    if (!c || !c.options.includes(optionId)) return false;
    this.s.choices[key] = optionId;
    this.mods = this.computeMods();
    const b = BOONS[optionId];
    if (b.gift === 'winder') {
      const w = this.addWinder(1); w.mood = 20;
    }
    this.pending = null; this.announced = null;
    this.index();
    return true;
  }

  // ---------- expected value per drop (for HUD and offline) ----------
  expected() {
    const nodes = this.s.nodes, order = nodes.filter((n) => !n.dead).sort((a, b) => a.y - b.y);
    const A = new Map(), B = new Map(), C = new Map();
    const base = this.baseDrop(), m = this.mods;
    for (const n of order) {
      if (n.id === 0) { A.set(0, 1); B.set(0, 0); C.set(0, 0); continue; }
      let mul = 1, add = 0, cg = 0;
      if (n.b === 'chime') mul = 1 + m.chime;
      if (n.b === 'mill') { add = 2 * m.value * this.sea.cur.valueMul; cg = 0.06 * m.cog * this.sea.cur.cogMul; }
      const opts = this.options(n.id).filter((o) => A.has(o));
      let sa = 0, sb = 0, sc = 0;
      for (const o of opts) { sa += A.get(o); sb += B.get(o); sc += C.get(o); }
      const k = Math.max(1, opts.length);
      const aa = sa / k, bb = sb / k, cc = sc / k;
      A.set(n.id, aa * mul); B.set(n.id, aa * add + bb); C.set(n.id, cc + cg);
    }
    let v = 0, c = 0, cnt = 0;
    for (const t of this.tips) {
      const opts = this.options(t).filter((o) => A.has(o));
      if (!opts.length) continue;
      let sv = 0, sc = 0;
      for (const o of opts) { sv += A.get(o) * base + B.get(o); sc += C.get(o); }
      v += sv / opts.length; c += sc / opts.length; cnt++;
    }
    return cnt ? { value: v / cnt, cogs: c / cnt } : { value: base, cogs: 0 };
  }
  idleDropsPerSec() { return 1 / (10 * this.mods.drip) + this.s.winders.length * (1 / (6.5 / (this.mods.wspeed))); }
  idlePerMinute() { return this.idleDropsPerSec() * this.expected().value * 60; }

  // ---------- offline ----------
  offline(seconds) {
    const s = this.s;
    const eff = Math.min((seconds <= 7200 ? seconds : 7200 + (seconds - 7200) * 0.4), 28800) * this.mods.offline;
    const supply = this.tips.length * (this.mods.cap + eff * 0.33 * 0.5);
    const drops = Math.floor(Math.min(eff * this.idleDropsPerSec(), supply));
    const ex = this.expected();
    const sap = drops * ex.value, cogs = Math.floor(drops * ex.cogs + Math.random());
    s.sap += sap; s.total += sap; s.drops += drops; s.cogs += cogs;
    for (const t of this.tips) this.s.nodes[t].charge = this.mods.cap;
    const talesBefore = s.winders.map((w) => w.tales);
    for (const w of s.winders) this.addMood(w, Math.min(eff, 14400) * 0.03);
    const lines = [];
    const pool = s.winders.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    for (const w of pool) {
      const tpl = ANECDOTES[Math.floor(Math.random() * ANECDOTES.length)];
      lines.push(tpl.replace('{name}', w.name).replace('{n}', String(3 + Math.floor(Math.random() * 40))));
    }
    if (!s.winders.length) lines.push('The tree dripped quietly to itself, one slow drop at a time.');
    const tales = [];
    s.winders.forEach((w, i) => { if (w.tales > talesBefore[i]) tales.push(w.name); });
    this.checkProgress();
    return { seconds, sap, cogs, drops, lines, tales };
  }
}
