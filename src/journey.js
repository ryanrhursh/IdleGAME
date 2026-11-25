// Journey mode: walk the Marigold as the conductor, in first person.
import * as THREE from 'three';
import { clamp, SPOT_JOBS, firstOf, JSCALE } from './logic.js';

const EYE = 0.6 / JSCALE, SPEED = 1.2, REACH = 1.25;

export class Journey {
  constructor(world, sim, ui) {
    this.world = world; this.sim = sim; this.ui = ui; this.active = false;
    this.x = 0; this.z = 0; this.yaw = 0; this.pitch = 0; this.bob = 0;
    this.keys = new Set(); this.stick = { x: 0, y: 0, id: null }; this.look = null; this.path = []; this.goal = null;
    this.prompt = null; this.nearConsole = false; this.propsKey = '';
    // mouse look: pointer lock when the browser allows it, otherwise steer by where the cursor sits
    this.sens = 1; this.locked = false; this.hover = false; this.mouse = { x: 0, y: 0, over: false };
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === this.world.canvas; this.ui.lock(this.locked); });
    document.addEventListener('pointerlockerror', () => { this.hover = true; this.ui.lock(false); });
    document.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.over = e.target === this.world.canvas; if (this.active && this.locked) this.turn(e.movementX, e.movementY, 0.3); }, { passive: true });
    document.addEventListener('mouseleave', () => { this.mouse.over = false; });
    addEventListener('keydown', (e) => { if (!this.active || /^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName)) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { this.keys.add(k); this.path = []; this.goal = null; e.preventDefault(); } if ((k === 'e' || k === ' ' || k === 'enter') && !e.repeat) { this.interact(); e.preventDefault(); } });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
    // on-screen joystick
    const st = document.getElementById('stick'), knob = document.getElementById('knob');
    if (st) {
      const move = (e) => { const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } const m = Math.hypot(dx, dy), dz = 0.14, k = m < dz ? 0 : (m - dz) / (1 - dz) / (m || 1); this.stick.x = dx * k; this.stick.y = dy * k; knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`; };
      st.addEventListener('pointerdown', (e) => { this.stick.id = e.pointerId; st.setPointerCapture(e.pointerId); this.path = []; this.goal = null; move(e); e.preventDefault(); });
      st.addEventListener('pointermove', (e) => { if (e.pointerId === this.stick.id) move(e); });
      const end = (e) => { if (e.pointerId !== this.stick.id) return; this.stick.id = null; this.stick.x = this.stick.y = 0; knob.style.transform = ''; };
      st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    }
    const ab = document.getElementById('actBtn'); if (ab) ab.addEventListener('pointerdown', (e) => { e.preventDefault(); this.interact(); });
  }

  enter() {
    const sp = this.sim.spawn(); this.x = sp.x; this.z = sp.z; this.pitch = 0; this.path = []; this.goal = null;
    const p = this.sim.post(); this.yaw = Math.atan2(-(p.x - sp.x), -(p.z - sp.z)) + Math.PI; // face away from the post, down the corridor
    this.ui.audio.journeyOn(true); this.active = true; this.propsKey = ''; this.sim.setJourney(true); this.syncProps(true);
  }
  requestLock() {
    const c = this.world.canvas;
    try { const r = c.requestPointerLock && c.requestPointerLock(); if (r && r.catch) r.catch(() => { this.hover = true; this.ui.lock(false); }); else if (!c.requestPointerLock) this.hover = true; } catch (e) { this.hover = true; }
  }
  releaseLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ } }
  tapCenter() { const r = this.world.canvas.getBoundingClientRect(); this.tap(r.left + r.width / 2, r.top + r.height / 2); }
  exit() { this.ui.audio.journeyOn(false); this.releaseLock(); this.hover = false; this.active = false; this.sim.conductor = null; this.sim.setJourney(false); this.keys.clear(); this.stick.x = this.stick.y = 0; this.prompt = null; }

  // ----- what is here to use -----
  items() {
    const sim = this.sim, s = sim.s, out = [];
    for (const p of s.passengers) out.push({ kind: 'pax', id: p.id, x: p.x, z: p.y, y: 0.62 / JSCALE, name: p.name });
    const post = sim.post(); out.push({ kind: 'post', x: post.x, z: post.z, y: 0.6 });
    for (const u of sim.urns()) out.push({ kind: 'urn', x: u.x, z: u.z, y: 0.5 });
    for (const j of s.jobs.list) if (SPOT_JOBS[j.kind]) j.data.spots.forEach((m, i) => { if (!m.done) out.push({ kind: 'spot', jobKind: j.kind, i, x: m.x, z: m.z, y: j.kind === 'lamps' ? 0.68 : 0.14 }); });
    for (const w of sim.windows()) out.push({ kind: 'window', x: w.x, z: w.z, y: 0.84 });
    for (const m of sim.momentSpots()) out.push({ kind: 'moment', rid: m.rid, mtype: m.type, label: m.label, x: m.x, z: m.z, y: 0.45 });
    const fj = s.jobs.list.find((j) => j.kind === 'fetch'); if (fj && !sim.carry) { const u = sim.pickups().find((q) => q.rid === fj.data.rid); if (u) out.push({ kind: 'pick', rid: u.rid, item: u.item, x: u.x, z: u.z, y: 0.4 }); }
    return out;
  }
  describe(it) {
    const sim = this.sim, J = sim.s.jobs.list, carry = sim.carry;
    if (it.kind === 'pax') {
      const first = firstOf(it.name);
      if (carry && carry.kind === 'tea' && J.find((j) => j.kind === 'tea' && !j.data.served.includes(it.id))) return { label: `Serve tea to ${first}`, act: 'serve' };
      if (carry && carry.kind === 'post' && carry.to === it.id) return { label: `Give ${first} the post`, act: 'deliver' };
      if (carry && carry.kind === 'item' && carry.to === it.id) return { label: `Give ${first} ${carry.item}`, act: 'deliver' };
      const lk = J.find((j) => j.kind === 'lookout'); if (lk && lk.data.seen) return { label: `Tell ${first} what you saw`, act: 'tell' };
      return { label: `Talk to ${first}`, act: 'talk' };
    }
    if (it.kind === 'post') return J.find((j) => j.kind === 'post') && !carry ? { label: 'Take the post bag', act: 'bag' } : null;
    if (it.kind === 'urn') return J.find((j) => j.kind === 'tea') && !carry ? { label: 'Pour a cup of tea', act: 'pour' } : null;
    if (it.kind === 'spot') return { label: SPOT_JOBS[it.jobKind], act: 'spot' };
    if (it.kind === 'pick') return { label: `Take ${it.item}`, act: 'take' };
    if (it.kind === 'window') return { label: 'Look out of the window', act: 'look' };
    if (it.kind === 'moment') return sim.momentReady(it.rid) ? { label: it.label, act: 'moment' } : null;
    return null;
  }
  nearest() {
    let best = null, bd = REACH;
    for (const it of this.items()) { const d = Math.hypot(it.x - this.x, it.z - this.z); if (d < bd) { const desc = this.describe(it); if (desc) { bd = d; best = { it, ...desc }; } } }
    return best;
  }
  interact(target) {
    const n = target || this.nearest(); if (!n) return false;
    const sim = this.sim, it = n.it, inside = this.world.inside; let msg = null;
    inside.reach();
    if (n.act === 'talk') { const c = sim.chatWith(it.id); if (c) { sim.jobEvent('talk', { pid: it.id }); this.ui.speech(it.name, c.text, c.tale); } return true; }
    if (n.act === 'tell') { const r = sim.jobEvent('tell', { pid: it.id }); this.ui.speech(it.name, r || 'Thank you.', false); this.ui.audio.pop(); this.syncProps(true); return true; }
    if (n.act === 'look') { const text = sim.outsideText(); sim.jobEvent('look', { text }); this.ui.speech('Out of the window', text, 'look'); this.ui.audio.pop(); this.syncProps(true); return true; }
    if (n.act === 'moment') { const r = sim.doMoment(it.rid); if (r) { this.ui.audio.moment(r.type); this.ui.speech(r.type === 'music' ? 'The piano' : r.type.charAt(0).toUpperCase() + r.type.slice(1), r.text, 'moment'); } return true; }
    if (n.act === 'serve') msg = sim.jobEvent('serve', { pid: it.id });
    else if (n.act === 'deliver') msg = sim.jobEvent('deliver', { pid: it.id });
    else if (n.act === 'bag') msg = sim.jobEvent('bag');
    else if (n.act === 'pour') msg = sim.jobEvent('pour');
    else if (n.act === 'take') msg = sim.jobEvent('take', { rid: it.rid });
    else if (n.act === 'spot') msg = sim.jobEvent('spot', { kind: it.jobKind, i: it.i });
    if (msg) this.ui.note(msg);
    this.ui.audio.pop(); this.syncProps(true); return true;
  }
  // gold markers over whatever the current duties point at
  markers() {
    const sim = this.sim, s = sim.s, carry = sim.carry, out = [], post = sim.post(), pax = (p, y = 1.05 / JSCALE + 0.1) => out.push({ x: p.x, z: p.y, y });
    for (const j of s.jobs.list) {
      if (j.kind === 'tea') { if (!carry) sim.urns().forEach((u) => out.push({ x: u.x, z: u.z, y: 0.85 })); else s.passengers.filter((p) => !j.data.served.includes(p.id)).forEach((p) => pax(p)); }
      else if (j.kind === 'post') { if (!carry) out.push({ x: post.x, z: post.z, y: 0.95 }); else { const p = s.passengers.find((q) => q.id === j.data.to); if (p) pax(p); } }
      else if (j.kind === 'checkin') s.passengers.filter((p) => !j.data.met.includes(p.id)).slice(0, 4).forEach((p) => pax(p));
      else if (SPOT_JOBS[j.kind]) j.data.spots.forEach((m) => { if (!m.done) out.push({ x: m.x, z: m.z, y: j.kind === 'lamps' ? 0.95 : 0.5 }); });
      else if (j.kind === 'stoke') out.push({ x: post.x, z: post.z, y: 0.95 });
      else if (j.kind === 'lookout') { if (!j.data.seen) sim.windows().forEach((w) => out.push({ x: w.x, z: w.z, y: 1.2 })); else s.passengers.forEach((p) => pax(p)); }
      else if (j.kind === 'fetch') { if (!carry) { const u = sim.pickups().find((q) => q.rid === j.data.rid); if (u) out.push({ x: u.x, z: u.z, y: 0.75 }); } else { const p = s.passengers.find((q) => q.id === j.data.to); if (p) pax(p); } }
    }
    return out;
  }
  syncProps(force) {
    const sim = this.sim, s = sim.s;
    const key = [sim.version, s.jobs.list.map((j) => j.id + ':' + j.prog + ':' + (j.data && j.data.seen ? 's' : '')).join(','), sim.carry ? sim.carry.kind + (sim.carry.item || '') : '-', s.passengers.length].join('|');
    this.world.inside.setHeld(sim.carry);
    if (!force && key === this.propsKey) return; this.propsKey = key;
    const spots = []; for (const j of s.jobs.list) if (SPOT_JOBS[j.kind]) j.data.spots.forEach((m) => spots.push({ ...m, kind: j.kind }));
    const fj = s.jobs.list.find((j) => j.kind === 'fetch'), pickups = fj && !sim.carry ? sim.pickups().filter((u) => u.rid === fj.data.rid) : [];
    this.world.inside.setJourneyProps({ post: sim.post(), urns: sim.urns(), spots, pickups, windows: sim.windows(), markers: this.markers() });
  }

  // ----- moving -----
  walkTo(tx, tz, then, quiet) {
    const sim = this.sim, p = sim.path(Math.floor(this.x), Math.floor(this.z), tx, tz);
    if (!p) return false;
    const pts = p.slice(1).map((k) => ({ x: (k % 24) + 0.5, z: Math.floor(k / 24) + 0.5 }));
    // pull the string tight: skip any waypoint we can already walk straight past, so the route is a few smooth legs instead of tile-to-tile zigzags
    const clear = (ax, az, bx, bz) => { const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.1)); for (let i = 1; i <= n; i++) if (!sim.canStand(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n, 0.14)) return false; return true; };
    const out = []; let cx = this.x, cz = this.z, i = 0;
    while (i < pts.length) { let j = pts.length - 1; while (j > i && !clear(cx, cz, pts[j].x, pts[j].z)) j--; out.push(pts[j]); cx = pts[j].x; cz = pts[j].z; i = j + 1; }
    this.path = out; this.goal = then || null; this.dest = { x: tx, z: tz, then: then || null }; if (!quiet) this.repaths = 0; return true;
  }
  tap(cx, cy) {
    // an object or person on screen?
    let best = null, bd = 52;
    for (const it of this.items()) { const desc = this.describe(it); if (!desc) continue; const q = this.world.project(it.x, it.y, it.z); if (!q.ok) continue; const d = Math.hypot(q.x - cx, q.y - cy); if (d < bd) { bd = d; best = { it, ...desc }; } }
    if (best) {
      if (Math.hypot(best.it.x - this.x, best.it.z - this.z) < REACH) { this.interact(best); return; }
      if (this.walkTo(Math.floor(best.it.x), Math.floor(best.it.z), best)) return;
    }
    const t = this.floorTile(cx, cy); if (t) this.walkTo(t.x, t.z);
  }
  floorTile(cx, cy) {
    const cam = this.world.inside.jcam, rect = this.world.canvas.getBoundingClientRect(), v = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, cam); const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1), hit)) return null;
    return { x: Math.floor(hit.x), z: Math.floor(hit.z) };
  }
  // dragging with a finger is smoothed: the drag sets where you want to look, and the view glides there instead of following every jitter
  turn(dx, dy, k = 1, smooth = false) {
    const f = k * this.sens, ay = -dx * 0.0042 * f, ap = -dy * 0.0034 * f;
    if (smooth) { this.pendYaw = (this.pendYaw || 0) + ay; this.pendPitch = (this.pendPitch || 0) + ap; return; }
    this.yaw += ay * 1.3; this.pitch = clamp(this.pitch + ap * 1.3, -1.1, 1.1);
  }

  update(dt, time) {
    if (!this.active) return;
    const sim = this.sim; let mx = 0, mz = 0;
    const k = this.keys, fwd = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0), side = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let f = fwd - this.stick.y, sd = side + this.stick.x;
    if (f || sd) {
      const l = Math.hypot(f, sd) || 1; f /= Math.max(1, l); sd /= Math.max(1, l);
      mx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * sd) * SPEED * dt; mz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * sd) * SPEED * dt;
    } else if (this.path.length && this.goal && Math.hypot(this.goal.it.x - this.x, this.goal.it.z - this.z) < 0.8) {   // close enough to the person or thing you walked to
      const g = this.goal; this.goal = null; this.path = []; this.interact(g);
    } else if (this.path.length) {
      const t = this.path[0], dx = t.x - this.x, dz = t.z - this.z, d = Math.hypot(dx, dz);
      if (d < 0.12) { this.path.shift(); if (!this.path.length && this.goal) { const g = this.goal; this.goal = null; if (Math.hypot(g.it.x - this.x, g.it.z - this.z) < REACH + 0.3) this.interact(g); } }
      else { const want = Math.atan2(-dx, -dz); let dy = ((want - this.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        this.yaw += clamp(dy * Math.min(1, dt * 5), -2.4 * dt, 2.4 * dt);            // ease round toward where you are going, gently, then walk
        const st = Math.min(SPEED * dt, d) * clamp(1.15 - Math.abs(dy) / 0.9, 0.15, 1); mx = (dx / d) * st; mz = (dz / d) * st; }
    }
    let moved = false;
    if (mx || mz) {
      let [nx, nz] = sim.tryMove(this.x, this.z, mx, mz);
      for (const q of sim.s.passengers) {                              // people are solid: slide around them
        const dx = nx - q.x, dz = nz - q.y, d = Math.hypot(dx, dz), min = 0.36 / JSCALE;
        if (d < min && d > 1e-4) { const px = nx + (dx / d) * (min - d), pz = nz + (dz / d) * (min - d); if (sim.canStand(px, pz)) { nx = px; nz = pz; } else { nx = this.x; nz = this.z; } }
      }
      if (nx === this.x && nz === this.z && this.path.length && !(f || sd)) {   // something is in the way: wait a beat, then find another way round
        this.block = (this.block || 0) + dt;
        if (this.block > 0.4) { this.block = 0; const d = this.dest; this.path = []; if (d && (this.repaths || 0) < 16) { this.repaths = (this.repaths || 0) + 1; this.walkTo(d.x, d.z, d.then, true); } }
      } else if (nx === this.x && nz === this.z) this.path = []; else this.block = 0;
      moved = Math.hypot(nx - this.x, nz - this.z) > 1e-4; this.x = nx; this.z = nz;
      if (moved) { const b0 = Math.floor(this.bob / Math.PI); this.bob += dt * 9; if (Math.floor(this.bob / Math.PI) !== b0) { const rm = sim.roomAt(Math.floor(this.x), Math.floor(this.z)); this.ui.audio.step(!rm || rm.type === 'corridor' || rm.type === 'parlor' || rm.type === 'sleeper'); } }
    }
    sim.conductor = { x: this.x, z: this.z }; { const rm = sim.roomAt(Math.floor(this.x), Math.floor(this.z)); this.ui.audio.ambience(rm ? rm.type : 'corridor', dt, sim.speedMul()); }
    this.world.inside.handsMoving = moved; this.world.inside.bobPhase = this.bob;
    // no pointer lock available: turn by where the cursor sits (dead zone in the middle, faster toward the edges)
    if (this.hover && !this.locked && this.mouse.over) {
      const r = this.world.canvas.getBoundingClientRect(), nx = (this.mouse.x - r.left - r.width / 2) / (r.width / 2), ny = (this.mouse.y - r.top - r.height / 2) / (r.height / 2);
      if (Math.abs(nx) > 0.25) this.yaw -= Math.sign(nx) * ((Math.abs(nx) - 0.25) / 0.75) * 1.9 * 0.7 * this.sens * dt;
      this.pitch += (clamp(-ny * 0.75, -1, 1) - this.pitch) * Math.min(1, dt * 4);
    }
    // glide the dragged look toward its target
    if (this.pendYaw || this.pendPitch) {
      const a = 1 - Math.exp(-dt * 11), dyw = (this.pendYaw || 0) * a, dp = (this.pendPitch || 0) * a;
      this.yaw += dyw; this.pitch = clamp(this.pitch + dp, -1.1, 1.1); this.pendYaw -= dyw; this.pendPitch -= dp; if (Math.abs(this.pendYaw) < 1e-4) this.pendYaw = 0; if (Math.abs(this.pendPitch) < 1e-4) this.pendPitch = 0;
    }
    // the camera
    const cam = this.world.inside.jcam;
    cam.position.set(this.x, 0.1 + EYE + Math.sin(this.bob) * 0.012, this.z); cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    // what is within reach
    const n = this.nearest(), label = n ? n.label : null;
    if (label !== (this.prompt && this.prompt.label)) { this.prompt = n; this.ui.prompt(n); }
    else this.prompt = n;
    const post = sim.post(); const nc = Math.hypot(post.x - this.x, post.z - this.z) < 2.2; if (nc !== this.nearConsole) { this.nearConsole = nc; this.ui.console(nc); }
    this.t = (this.t || 0) + dt; if (this.t > 0.4) { this.t = 0; this.syncProps(false); this.syncMarkersOnly(); }
  }
  syncMarkersOnly() {
    const ms = this.markers(), sp = this.world.inside.markerSprites; if (!sp.length) return;
    for (let i = 0; i < Math.min(ms.length, sp.length); i++) { sp[i].position.x = ms[i].x; sp[i].position.z = ms[i].z; sp[i].userData.base = 0.1 + (ms[i].y || 0.9); }
  }
}
