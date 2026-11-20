// The Inside: a cutaway diorama of the rooms the Marigold has unfolded.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ROOMS } from './data.js';
import { GW, GH, rng, hash, clamp } from './logic.js';
import { toon, basic, glowSprite, mesh, G, box, cyl, sph, cone, makeFigure, gearGeometry } from './gfx.js';

const FLOOR_H = 0.1;
const STYLES = [[1, 1, 1], [1.25, 1.0, 0.8], [0.8, 1.0, 1.3], [1.3, 0.8, 1.1]];

function stitchTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#241a3c'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(190,160,230,0.28)'; g.lineWidth = 2; g.setLineDash([6, 6]);
  g.strokeRect(6, 6, 116, 116); g.beginPath(); g.moveTo(64, 6); g.lineTo(64, 122); g.moveTo(6, 64); g.lineTo(122, 64); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((GW + 6) / 2, (GH + 6) / 2); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- furniture for each room type (local coords: tile (i,j) centre at i+.5, j+.5) ----------
const BUILDERS = {
  sleeper(g, w, h, R) {
    const beds = Math.floor((w * h) / 3);
    for (let n = 0; n < beds; n++) {
      const t = n * 3, i = t % w, j = Math.floor(t / w), x = i + 0.5, z = Math.min(h - 0.75, j + 0.78), hue = new THREE.Color().setHSL(R(), 0.5, 0.5);
      g.add(box(0x7a5030, x, 0.18, z, 0.84, 0.22, 1.3)); g.add(box(0xf2e6d0, x, 0.34, z, 0.74, 0.14, 1.2)); g.add(box(hue, x, 0.43, z + 0.15, 0.76, 0.08, 0.85)); g.add(box(0xffffff, x, 0.46, z - 0.46, 0.5, 0.12, 0.26));
    }
    g.add(box(0x6a4a30, w - 0.3, 0.2, 0.3, 0.3, 0.4, 0.3)); const gl = glowSprite(0xffcf80, 1.4, 0.8); gl.position.set(w - 0.3, 0.65, 0.3); g.add(gl); g.add(sph(0xfff0b0, w - 0.3, 0.55, 0.3, 0.15, 0.15, 0.15, { emissive: 0xfff0b0, emissiveIntensity: 1.5 }));
  },
  dining(g, w, h, R) {
    for (let j = 0; j + 1 < h + 1; j += 2) for (let i = 0; i + 1 < w + 1; i += 2) {
      const cx = Math.min(w - 0.5, i + 1), cz = Math.min(h - 0.5, j + 1); if (i + 1 > w || j + 1 > h) continue;
      g.add(cyl(0xa86a3a, cx, 0.38, cz, 0.8, 0.07, 0.8)); g.add(cyl(0x5a3a22, cx, 0.2, cz, 0.12, 0.4, 0.12));
      g.add(sph(0xfff0b0, cx, 0.5, cz, 0.08, 0.08, 0.08, { emissive: 0xffe0a0, emissiveIntensity: 1.6 }));
      for (const [dx, dz] of [[-0.55, 0], [0.55, 0], [0, -0.55], [0, 0.55]]) g.add(box(0x7a4a2a, cx + dx, 0.2, cz + dz, 0.28, 0.3, 0.28));
    }
  },
  parlor(g, w, h, R) {
    g.add(box(0xc06a5a, w / 2, 0.02, h / 2, Math.max(1, w - 0.8), 0.03, Math.max(1, h - 0.8))); g.add(cyl(0x8a5a3a, w / 2, 0.22, h / 2, 0.6, 0.06, 0.6)); g.add(cyl(0x5a3a22, w / 2, 0.1, h / 2, 0.1, 0.2, 0.1));
    for (const [x, z, r] of [[0.7, 0.7, 0.8], [w - 0.7, 0.7, -0.8], [0.7, h - 0.7, 2.3], [w - 0.7, h - 0.7, -2.3]]) { const c = new THREE.Group(); c.add(box(0x8a3a4a, 0, 0.18, 0, 0.62, 0.3, 0.6)); c.add(box(0x7a3040, 0, 0.45, -0.25, 0.62, 0.45, 0.14)); c.position.set(x, 0, z); c.rotation.y = r; g.add(c); }
    g.add(cyl(0x7a4a2a, w - 0.3, 0.12, h / 2, 0.22, 0.24, 0.22)); g.add(sph(0x4a9a4a, w - 0.3, 0.38, h / 2, 0.4, 0.4, 0.4));
  },
  corridor(g, w, h) {
    g.add(box(0xb04a4a, w / 2, 0.02, h / 2, w - 0.1, 0.03, h - 0.1)); g.add(box(0xf0d890, w / 2, 0.025, h / 2, w - 0.35, 0.03, h - 0.35));
    const n = Math.max(1, Math.floor(Math.max(w, h) / 4)); for (let k = 0; k < n; k++) { const fx = w > h, p = (k + 0.5) * Math.max(w, h) / n; const x = fx ? p : 0.12, z = fx ? 0.12 : p; g.add(sph(0xfff0b0, x, 0.5, z, 0.12, 0.12, 0.12, { emissive: 0xffe0a0, emissiveIntensity: 1.5 })); const gl = glowSprite(0xffd890, 1.0, 0.6); gl.position.set(x, 0.5, z); g.add(gl); }
  },
  garden(g, w, h, R) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if ((i + j) % 2 === 0) g.add(box(0x5a3a22, i + 0.5, 0.06, j + 0.5, 0.86, 0.12, 0.86));
      if (R() < 0.8) { const hue = new THREE.Color().setHSL(R(), 0.7, 0.6); g.add(cyl(0x3a8a3a, i + 0.5, 0.25, j + 0.5, 0.04, 0.35, 0.04)); g.add(sph(hue, i + 0.5, 0.46, j + 0.5, 0.2, 0.2, 0.2, { emissive: hue, emissiveIntensity: 0.35 })); }
    }
    if (w * h >= 6) { g.add(cyl(0x6a4a2a, w / 2, 0.6, h / 2, 0.16, 1.2, 0.16)); g.add(sph(0x4aaa5a, w / 2, 1.5, h / 2, 1.1, 0.9, 1.1)); g.add(sph(0x5aba6a, w / 2 + 0.3, 1.8, h / 2 - 0.2, 0.7, 0.6, 0.7)); }
    for (let k = 0; k < 3; k++) { const gl = glowSprite(0xd8ff9a, 0.6, 0.9); gl.position.set(R() * w, 0.6 + R() * 0.8, R() * h); g.add(gl); }
  },
  library(g, w, h, R) {
    for (let i = 0; i < w; i++) { g.add(box(0x5a3a22, i + 0.5, 0.55, 0.2, 0.98, 1.1, 0.3)); for (let b = 0; b < 4; b++) g.add(box(new THREE.Color().setHSL(R(), 0.55, 0.55), i + 0.2 + b * 0.2, 0.55 + (b % 2) * 0.3, 0.4, 0.14, 0.34, 0.05)); }
    g.add(box(0x8a4a3a, w / 2, 0.2, h / 2 + 0.2, 0.7, 0.3, 0.7)); g.add(box(0x7a3a2a, w / 2, 0.5, h / 2 - 0.1, 0.7, 0.4, 0.14));
    g.add(cyl(0x4a3222, 0.4, 0.4, h - 0.4, 0.05, 0.8, 0.05)); const gl = glowSprite(0xffcf80, 1.3, 0.8); gl.position.set(0.4, 0.85, h - 0.4); g.add(gl); g.add(sph(0xfff0b0, 0.4, 0.82, h - 0.4, 0.16, 0.16, 0.16, { emissive: 0xffe0a0, emissiveIntensity: 1.5 }));
  },
  workshop(g, w, h, R) {
    g.add(box(0x6a5a4a, w / 2, 0.3, 0.4, Math.max(1, w - 0.4), 0.5, 0.6)); g.add(box(0x3a3a44, 0.7, 0.65, 0.4, 0.3, 0.2, 0.3));
    const gear = new THREE.Mesh(gearGeometry(0.28, 9, 0.08), toon(0xd0a248, { emissive: 0x2a1604 })); gear.position.set(w - 0.8, 0.75, 0.42); gear.rotation.x = Math.PI / 2; g.add(gear); g.userData.spin = gear;
    for (let i = 0; i < w; i++) g.add(box(0x4a4a56, i + 0.5, 0.9, h - 0.15, 0.9, 1.4, 0.25));
    for (let k = 0; k < 3; k++) { const gl = glowSprite(0xffb050, 0.5, 0.9); gl.position.set(1 + R() * (w - 2 + 0.01), 0.8, 0.5); g.add(gl); }
  },
  observatory(g, w, h, R) {
    g.add(cyl(0x4a4a6a, w / 2, 0.15, h / 2, 0.8, 0.3, 0.8)); const t = cyl(0xd0a248, w / 2, 0.85, h / 2, 0.22, 1.5, 0.22, { emissive: 0x2a1604 }); t.rotation.z = 0.5; g.add(t);
    for (const a of [0, 2.1, 4.2]) { const l = cyl(0x6a4a2a, w / 2 + Math.cos(a) * 0.3, 0.4, h / 2 + Math.sin(a) * 0.3, 0.05, 0.9, 0.05); g.add(l); }
    for (let k = 0; k < 9; k++) { const s = sph(0xfff4c0, 0.3 + R() * (w - 0.6), 0.8 + R() * 1.4, 0.3 + R() * (h - 0.6), 0.09, 0.09, 0.09, { emissive: 0xfff4c0, emissiveIntensity: 2 }); g.add(s); }
    const ring = mesh(G.tor, toon(0xd0a248, { emissive: 0x2a1604 }), w / 2, 0.1, h / 2, Math.min(w, h) * 0.9, Math.min(w, h) * 0.9, 1); ring.rotation.x = Math.PI / 2; g.add(ring);
  },
  bath(g, w, h, R) {
    g.add(box(0xe0d8c8, w / 2, 0.12, h / 2, Math.max(1, w - 0.4), 0.22, Math.max(1, h - 0.4))); g.add(box(0x48c8d8, w / 2, 0.24, h / 2, Math.max(0.8, w - 0.8), 0.04, Math.max(0.8, h - 0.8), { emissive: 0x2a8a9a, emissiveIntensity: 0.9 }));
    for (let k = 0; k < 4; k++) { const s = sph(0xffffff, 0.5 + R() * (w - 1), 0.6 + k * 0.25, 0.5 + R() * (h - 1), 0.4, 0.3, 0.4, { transparent: true, opacity: 0.25 }); g.add(s); }
    g.add(box(0xd04a5a, w - 0.2, 0.55, 0.3, 0.08, 0.8, 0.5));
  },
  music(g, w, h, R) {
    g.add(box(0x1a1a22, w / 2, 0.45, h / 2 - 0.2, 1.5, 0.12, 0.8)); g.add(box(0x1a1a22, w / 2 - 0.65, 0.22, h / 2 - 0.2, 0.1, 0.45, 0.1)); g.add(box(0x1a1a22, w / 2 + 0.65, 0.22, h / 2 - 0.2, 0.1, 0.45, 0.1));
    g.add(box(0xf4f4f0, w / 2, 0.53, h / 2 + 0.1, 1.3, 0.04, 0.22)); g.add(box(0x7a4a2a, w / 2, 0.2, h / 2 + 0.7, 0.4, 0.4, 0.4));
    for (let k = 0; k < 5; k++) { const gl = glowSprite(0xffe08a, 0.5, 0.9); gl.position.set(0.5 + R() * (w - 1), 0.9 + R() * 1.1, 0.5 + R() * (h - 1)); g.add(gl); }
  },
  aquarium(g, w, h, R) {
    for (let i = 0; i < w; i++) {
      g.add(box(0x2a4a6a, i + 0.5, 0.3, 0.35, 0.96, 0.5, 0.6)); g.add(box(0x6ad0f0, i + 0.5, 0.82, 0.35, 0.9, 0.7, 0.55, { transparent: true, opacity: 0.38, emissive: 0x2a8ac0, emissiveIntensity: 0.8 }));
      g.add(sph(0xff9a3a, i + 0.4 + R() * 0.2, 0.8 + R() * 0.3, 0.35, 0.14, 0.1, 0.1, { emissive: 0xff7a1a, emissiveIntensity: 0.7 })); g.add(cone(0xff7a1a, i + 0.28, 0.82, 0.35, 0.08, 0.1, 0.06));
    }
    for (let k = 0; k < 3; k++) { const gl = glowSprite(0x9adcff, 0.6, 0.8); gl.position.set(0.5 + R() * (w - 1), 0.4 + R() * 0.8, 1.2 + R() * (h - 1.6 + 0.01)); g.add(gl); }
  },
};

export class InsideView {
  constructor(world) {
    this.world = world; this.sim = world.sim;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x120c22); scene.fog = new THREE.FogExp2(0x120c22, 0.012);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 300);
    scene.add(new THREE.HemisphereLight(0xffe8d8, 0x4a3a6a, 1.5)); const dl = new THREE.DirectionalLight(0xfff0d8, 1.3); dl.position.set(-6, 14, 8); scene.add(dl);
    // the folded cloth the pocket sits on
    const tex = stitchTexture();
    this.plate = mesh(G.box, new THREE.MeshToonMaterial({ map: tex, color: 0xffffff, gradientMap: null }), GW / 2, -0.45, GH / 2, GW + 6, 0.4, GH + 6); scene.add(this.plate);
    this.platform = mesh(G.box, toon(0xd9c9a8), GW / 2, -0.17, GH / 2, 1, 0.3, 1); scene.add(this.platform);
    this.pt = { x: 0, z: 0, w: 1, d: 1 }; this.ptTarget = { x: 0, z: 0, w: 1, d: 1 }; this.setPlatformTarget(true);
    this.floors = new THREE.InstancedMesh(G.box, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: null }), GW * GH); this.floors.frustumCulled = false; this.floors.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GW * GH * 3), 3); scene.add(this.floors);
    this.walls = new THREE.InstancedMesh(G.box, toon(0xe9dcc4), 700); this.walls.frustumCulled = false; scene.add(this.walls);
    this.doors = new THREE.InstancedMesh(G.box, toon(0xd0a248, { emissive: 0x3a2a08 }), 200); this.doors.frustumCulled = false; scene.add(this.doors);
    this.gridLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xb8a888, transparent: true, opacity: 0.55 })); scene.add(this.gridLines);
    this.propGroups = new Map(); this.figures = new Map();
    this.ghost = mesh(G.box, new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.45, depthWrite: false }), 0, 0.2, 0, 1, 0.3, 1); this.ghost.visible = false; this.ghost.renderOrder = 5; scene.add(this.ghost);
    this.sel = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 1), new THREE.Vector3(0, 0, 1)]), new THREE.LineBasicMaterial({ color: 0xffd36a })); this.sel.visible = false; this.sel.position.y = 0.16; scene.add(this.sel);
    this.selRoom = null;
    // dust motes
    const n = 90, pos = new Float32Array(n * 3), R = rng(5); this.dust = []; for (let i = 0; i < n; i++) this.dust.push([R() * GW, R() * 5 + 1, R() * GH, R() * 6.28]);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.dustPts = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.12, color: 0xffe0b0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, map: null })); this.dustPts.frustumCulled = false; scene.add(this.dustPts);
    // sparkle burst for unfolding
    this.sparks = []; this.sparkGroup = new THREE.Group(); scene.add(this.sparkGroup);
    // controls
    const c = this.controls = new OrbitControls(this.camera, world.canvas);
    c.enablePan = true; c.screenSpacePanning = false; c.enableDamping = true; c.dampingFactor = 0.1; c.minDistance = 6; c.maxDistance = 60; c.minPolarAngle = 0.45; c.maxPolarAngle = 1.2; c.minAzimuthAngle = -0.8; c.maxAzimuthAngle = 0.8; c.rotateSpeed = 0.5; c.panSpeed = 0.9;
    c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }; c.enabled = false;
    this.built = -1; this.lastUnfold = 0; this.dummy = new THREE.Object3D(); this.col = new THREE.Color();
  }
  setPlatformTarget(instant) {
    const g = this.sim.s.grid, w = g.x1 - g.x0 + 1, d = g.y1 - g.y0 + 1;
    this.ptTarget = { x: g.x0 + w / 2, z: g.y0 + d / 2, w, d };
    if (instant) this.pt = { ...this.ptTarget };
  }

  // ---------- rebuild on layout change ----------
  rebuild() {
    const sim = this.sim, s = sim.s, d = this.dummy;
    this.built = sim.version; this.setPlatformTarget(false);
    // floors
    let i = 0;
    for (const r of s.rooms) {
      const def = ROOMS[r.type], rr = rng(r.id);
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        d.position.set(x + 0.5, FLOOR_H / 2, y + 0.5); d.scale.set(1, FLOOR_H, 1); d.rotation.set(0, 0, 0); d.updateMatrix(); this.floors.setMatrixAt(i, d.matrix);
        this.col.setHex((x + y) % 2 ? def.floor : def.floor2); const st = STYLES[r.style || 0]; this.col.r = Math.min(1, this.col.r * st[0]); this.col.g = Math.min(1, this.col.g * st[1]); this.col.b = Math.min(1, this.col.b * st[2]); this.floors.setColorAt(i, this.col); i++;
      }
    }
    this.floors.count = i; this.floors.instanceMatrix.needsUpdate = true; this.floors.instanceColor.needsUpdate = true;
    // walls
    i = 0;
    for (const w of sim.walls) {
      let x = w.x + 0.5, z = w.y + 0.5, sx = 1.08, sz = 0.1;
      if (w.side === 'n') z = w.y; else if (w.side === 's') z = w.y + 1; else { x = w.side === 'w' ? w.x : w.x + 1; sx = 0.1; sz = 1.08; }
      d.position.set(x, FLOOR_H + 0.28, z); d.scale.set(sx, 0.56, sz); d.rotation.set(0, 0, 0); d.updateMatrix(); this.walls.setMatrixAt(i++, d.matrix);
    }
    this.walls.count = i; this.walls.instanceMatrix.needsUpdate = true;
    // doors
    i = 0;
    for (const dr of sim.doorList) {
      const horiz = dr.ox !== dr.x; const x = horiz ? dr.ox : dr.x + 0.5, z = horiz ? dr.y + 0.5 : dr.oy;
      d.position.set(x, FLOOR_H + 0.02, z); d.scale.set(horiz ? 0.16 : 0.8, 0.03, horiz ? 0.8 : 0.16); d.updateMatrix(); this.doors.setMatrixAt(i++, d.matrix);
    }
    this.doors.count = i; this.doors.instanceMatrix.needsUpdate = true;
    // grid lines over the unfolded plot
    const g = s.grid, pts = [];
    for (let x = g.x0; x <= g.x1 + 1; x++) pts.push(x, 0.015, g.y0, x, 0.015, g.y1 + 1);
    for (let y = g.y0; y <= g.y1 + 1; y++) pts.push(g.x0, 0.015, y, g.x1 + 1, 0.015, y);
    this.gridLines.geometry.dispose(); this.gridLines.geometry = new THREE.BufferGeometry(); this.gridLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    // furniture
    const alive = new Set();
    for (const r of s.rooms) {
      const key = `${r.id}:${r.type}:${r.w}x${r.h}:${r.lv || 0}`; alive.add(r.id);
      const old = this.propGroups.get(r.id);
      if (old && old.userData.key === key) continue;
      if (old) { this.scene.remove(old); this.propGroups.delete(r.id); }
      const grp = new THREE.Group(); grp.userData.key = key; grp.position.set(r.x, FLOOR_H, r.y);
      const R = rng(hash(key)); BUILDERS[r.type](grp, r.w, r.h, R);
      const lv = Math.min(r.lv || 0, 8);
      for (let k = 0; k < lv * 2; k++) { const gl = glowSprite(k % 2 ? 0xffd890 : 0xff9ac0, 0.5, 0.9); gl.position.set(((k + 0.5) / (lv * 2)) * r.w, 0.62 + (k % 2) * 0.05, 0.06); grp.add(gl); grp.add(sph(0xfff0b0, ((k + 0.5) / (lv * 2)) * r.w, 0.6 + (k % 2) * 0.05, 0.06, 0.07, 0.07, 0.07, { emissive: 0xffe0a0, emissiveIntensity: 1.6 })); }
      if (r.born && Date.now() - r.born < 3000) grp.userData.born = performance.now();
      this.scene.add(grp); this.propGroups.set(r.id, grp);
    }
    for (const [id, grp] of this.propGroups) if (!alive.has(id)) { this.scene.remove(grp); this.propGroups.delete(id); }
    this.updateSel();
    if (sim.lastUnfold && sim.lastUnfold.t !== this.lastUnfold) { this.lastUnfold = sim.lastUnfold.t; this.burst(sim.lastUnfold.dir); }
  }
  burst(dir) {
    const g = this.sim.s.grid, R = Math.random;
    for (let k = 0; k < 26; k++) {
      let x, z;
      if (dir === 'n') { x = g.x0 + R() * (g.x1 - g.x0 + 1); z = g.y0 + R(); } else if (dir === 's') { x = g.x0 + R() * (g.x1 - g.x0 + 1); z = g.y1 + R(); } else if (dir === 'w') { x = g.x0 + R(); z = g.y0 + R() * (g.y1 - g.y0 + 1); } else { x = g.x1 + R(); z = g.y0 + R() * (g.y1 - g.y0 + 1); }
      const sp = glowSprite(0xffe2a0, 0.5 + R() * 0.6, 1); sp.position.set(x, 0.3, z); sp.userData = { vy: 0.8 + R() * 1.6, life: 1.2 + R() }; this.sparkGroup.add(sp); this.sparks.push(sp);
    }
  }
  emote(pid, kind) {
    const f = this.figures.get(pid); if (!f) return;
    const sp = glowSprite(kind === 'heart' ? 0xff7aa8 : 0xffe08a, 0.55, 1); sp.position.set(f.position.x, 1.1, f.position.z); sp.userData = { vy: 0.7, life: 1.4 }; this.sparkGroup.add(sp); this.sparks.push(sp);
  }
  setSelected(room) { this.selRoom = room; this.updateSel(); }
  updateSel() {
    const r = this.selRoom && this.sim.roomById.get(this.selRoom.id);
    if (!r) { this.sel.visible = false; return; }
    this.sel.visible = true; this.sel.position.set(r.x, 0.16, r.y); this.sel.scale.set(r.w, 1, r.h);
  }
  setGhost(type, x, y, w, h, valid) {
    if (type == null) { this.ghost.visible = false; return; }
    this.ghost.visible = true; this.ghost.position.set(x + w / 2, 0.22, y + h / 2); this.ghost.scale.set(w, 0.24, h); this.ghost.material.color.setHex(valid ? 0x7dffb0 : 0xff6a6a);
  }

  // ---------- picking and camera ----------
  tileAt(cx, cy) {
    const rect = this.world.canvas.getBoundingClientRect(), v = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, this.camera); const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_H), hit)) return null;
    return { x: Math.floor(hit.x), y: Math.floor(hit.z) };
  }
  fit(aspect, snap) {
    const t = this.ptTarget, tan = Math.tan((40 * Math.PI) / 360);
    const dist = clamp(Math.max((t.d + 1.5) * 0.55 / tan, (t.w + 0.6) * 0.5 / (tan * aspect)), 8, 55);
    this.controls.target.set(t.x, 0, t.z + 0.4);
    const pol = 0.95; this.camera.position.set(t.x, Math.cos(pol) * dist, t.z + 0.4 + Math.sin(pol) * dist); this.controls.update();
  }
  resize(aspect) { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }

  // ---------- frame ----------
  update(dt, time) {
    const sim = this.sim;
    if (this.built !== sim.version) this.rebuild();
    // platform grows toward the unfolded plot
    const p = this.pt, t = this.ptTarget, k = 1 - Math.exp(-dt * 4.5);
    p.x += (t.x - p.x) * k; p.z += (t.z - p.z) * k; p.w += (t.w - p.w) * k; p.d += (t.d - p.d) * k;
    this.platform.position.set(p.x, -0.17, p.z); this.platform.scale.set(p.w, 0.3, p.d);
    // passengers
    const seen = new Set();
    for (const pa of sim.s.passengers) {
      seen.add(pa.id);
      let f = this.figures.get(pa.id); if (!f) { f = makeFigure(pa.id * 7 + (pa.idx || 0) * 3); f.scale.setScalar(0.72); this.scene.add(f); this.figures.set(pa.id, f); f.userData.ph = Math.random() * 6; }
      const rt = sim.rt.get(pa.id), walking = rt && rt.state === 'walk';
      f.userData.ph += dt * (walking ? 11 : 2.2);
      f.position.set(pa.x, FLOOR_H + (walking ? Math.abs(Math.sin(f.userData.ph)) * 0.05 : Math.sin(f.userData.ph) * 0.012), pa.y);
      if (rt) { const d = ((rt.face - f.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; f.rotation.y += d * Math.min(1, dt * 9); }
      f.userData.body.rotation.z = walking ? Math.sin(f.userData.ph * 0.5) * 0.12 : rt && rt.state === 'use' ? Math.sin(time * 2 + pa.id) * 0.06 : 0;
    }
    for (const [id, f] of this.figures) if (!seen.has(id)) { this.scene.remove(f); this.figures.delete(id); }
    // props: pop-in and spin
    for (const [, g] of this.propGroups) {
      if (g.userData.born) { const a = clamp((performance.now() - g.userData.born) / 500, 0, 1); g.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - a, 3))); if (a >= 1) { g.userData.born = 0; g.scale.setScalar(1); } }
      if (g.userData.spin) g.userData.spin.rotation.z += dt * 0.6;
    }
    // sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]; s.userData.life -= dt; s.position.y += s.userData.vy * dt; s.material.opacity = clamp(s.userData.life, 0, 1);
      if (s.userData.life <= 0) { this.sparkGroup.remove(s); this.sparks.splice(i, 1); }
    }
    // dust
    const pos = this.dustPts.geometry.attributes.position;
    for (let i = 0; i < this.dust.length; i++) { const d = this.dust[i]; pos.setXYZ(i, d[0] + Math.sin(time * 0.2 + d[3]) * 0.8, d[1] + Math.sin(time * 0.3 + d[3] * 2) * 0.4, d[2] + Math.cos(time * 0.17 + d[3]) * 0.8); }
    pos.needsUpdate = true;
    if (this.sel.visible) this.sel.material.opacity = 0.7 + 0.3 * Math.sin(time * 5);
    // keep the camera over the plot
    const c = this.controls, g = sim.s.grid; if (c.enabled) {
      const nx = clamp(c.target.x, g.x0 - 1, g.x1 + 2), nz = clamp(c.target.z, g.y0 - 1, g.y1 + 2);
      this.camera.position.x += nx - c.target.x; this.camera.position.z += nz - c.target.z; c.target.x = nx; c.target.z = nz;
      c.update();
    }
  }
}
