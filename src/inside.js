// The Inside: a cutaway diorama of the rooms the Marigold has unfolded.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ROOMS } from './data.js';
import { GW, GH, rng, hash, clamp } from './logic.js';
import { LOOK } from './look.js';
import { toon, basic, glowSprite, mesh, G, box, cyl, sph, cone, makeFigure, gearGeometry, toonGradient } from './gfx.js';

const FLOOR_H = 0.1;
const STYLES = [[1, 1, 1], [1.25, 1.0, 0.8], [0.8, 1.0, 1.3], [1.3, 0.8, 1.1]];

function stitchTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = LOOK.inside.plate; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(190,160,230,0.28)'; g.lineWidth = 2; g.setLineDash([6, 6]);
  g.strokeRect(6, 6, 116, 116); g.beginPath(); g.moveTo(64, 6); g.lineTo(64, 122); g.moveTo(6, 64); g.lineTo(122, 64); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((GW + 6) / 2, (GH + 6) / 2); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const WALLC = { sleeper: 0xd8c0e4, dining: 0xf2d0a4, parlor: 0xeab4b4, corridor: 0xf0e2c0, garden: 0xcde8b4, library: 0xc8aa8a, workshop: 0xc4cad4, observatory: 0xb0b8ea, bath: 0xb4e4ea, music: 0xf2dc9c, aquarium: 0xa4d2ee };
const FRAMEY = new Set(['sleeper', 'dining', 'parlor', 'corridor', 'music']);
function wallpaperTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = 'rgba(120,90,70,0.10)'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 8, 84);
  g.fillStyle = 'rgba(120,90,70,0.20)'; for (let y = 8; y < 80; y += 24) for (let x = 4; x < 64; x += 16) { g.beginPath(); g.arc(x, y, 2.6, 0, 6.3); g.fill(); }
  g.fillStyle = 'rgba(90,60,40,0.35)'; g.fillRect(0, 84, 64, 4); g.fillStyle = 'rgba(90,60,40,0.18)'; g.fillRect(0, 88, 64, 40);
  g.fillStyle = 'rgba(90,60,40,0.22)'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 88, 1.5, 40);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- furniture for each room type (local coords: tile (i,j) centre at i+.5, j+.5) ----------
const BUILDERS = {
  sleeper(g, w, h, R) {
    const beds = Math.floor((w * h) / 3);
    for (let n = 0; n < beds; n++) {
      const t = n * 3, i = t % w, j = Math.floor(t / w), x = i + 0.5, z = Math.min(h - 0.75, j + 0.78), hue = new THREE.Color().setHSL(R(), 0.5, 0.5);
      g.add(box(0x7a5030, x, 0.18, z, 0.84, 0.22, 1.3)); g.add(box(0xf2e6d0, x, 0.34, z, 0.74, 0.14, 1.2)); g.add(box(hue, x, 0.43, z + 0.15, 0.76, 0.08, 0.85)); g.add(box(0xffffff, x, 0.46, z - 0.46, 0.5, 0.12, 0.26));
    }
    g.add(box(0x6a5a9a, w / 2, 0.012, h / 2, Math.max(1, w - 0.9), 0.02, Math.max(1, h - 0.9))); g.add(cyl(0x7a4a2a, 0.22, 0.14, h - 0.24, 0.26, 0.28, 0.26)); g.add(sph(0x4aa05a, 0.22, 0.42, h - 0.24, 0.4, 0.34, 0.4));
    g.add(box(0x6a4a30, w - 0.3, 0.2, 0.3, 0.3, 0.4, 0.3)); const gl = glowSprite(0xffcf80, 1.4, 0.8); gl.position.set(w - 0.3, 0.65, 0.3); g.add(gl); g.add(sph(0xfff0b0, w - 0.3, 0.55, 0.3, 0.15, 0.15, 0.15, { emissive: 0xfff0b0, emissiveIntensity: 1.5 }));
  },
  dining(g, w, h, R) {
    for (let j = 0; j + 1 < h + 1; j += 2) for (let i = 0; i + 1 < w + 1; i += 2) {
      const cx = Math.min(w - 0.5, i + 1), cz = Math.min(h - 0.5, j + 1); if (i + 1 > w || j + 1 > h) continue;
      g.add(cyl(0xb8503a, cx, 0.012, cz, 1.9, 0.02, 1.9)); g.add(cyl(0xe8c070, cx, 0.016, cz, 1.55, 0.02, 1.55)); g.add(cyl(0xb8503a, cx, 0.02, cz, 1.2, 0.02, 1.2));
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
    if (w * h >= 6) { g.add(cyl(0x6a4a2a, w / 2, 0.45, h / 2, 0.16, 0.9, 0.16)); g.add(sph(0x4aaa5a, w / 2, 1.0, h / 2, 1.0, 0.7, 1.0)); g.add(sph(0x5aba6a, w / 2 + 0.3, 1.18, h / 2 - 0.2, 0.62, 0.45, 0.62)); }
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
    for (let i = 0; i < w; i++) g.add(box(0x4a4a56, i + 0.5, 0.62, h - 0.15, 0.9, 1.0, 0.25));
    for (let k = 0; k < 3; k++) { const gl = glowSprite(0xffb050, 0.5, 0.9); gl.position.set(1 + R() * (w - 2 + 0.01), 0.8, 0.5); g.add(gl); }
  },
  observatory(g, w, h, R) {
    g.add(cyl(0x4a4a6a, w / 2, 0.15, h / 2, 0.8, 0.3, 0.8)); const t = cyl(0xd0a248, w / 2, 0.7, h / 2, 0.2, 1.05, 0.2, { emissive: 0x2a1604 }); t.rotation.z = 0.5; g.add(t);
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
    scene.background = new THREE.Color(LOOK.inside.bg); scene.fog = new THREE.FogExp2(LOOK.inside.bg, 0.012 * LOOK.fogMul);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 300);
    scene.add(new THREE.HemisphereLight(LOOK.inside.sky, LOOK.inside.ground, LOOK.inside.hemi)); const dl = new THREE.DirectionalLight(LOOK.inside.sun, LOOK.inside.sunI); dl.position.set(-4, 16, 22); dl.target.position.set(12, 0, 8); scene.add(dl); scene.add(dl.target);
    if (LOOK.shadows) { dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); const c = dl.shadow.camera; c.left = -20; c.right = 20; c.top = 18; c.bottom = -18; c.near = 2; c.far = 70; dl.shadow.bias = -0.0008; dl.shadow.normalBias = 0.04; dl.shadow.radius = 4; }
    // the folded cloth the pocket sits on
    const tex = stitchTexture();
    this.plate = mesh(G.box, new THREE.MeshToonMaterial({ map: tex, color: 0xffffff, gradientMap: null }), GW / 2, -0.45, GH / 2, GW + 6, 0.4, GH + 6); scene.add(this.plate);
    this.platform = mesh(G.box, toon(0xd9c9a8), GW / 2, -0.17, GH / 2, 1, 0.3, 1); scene.add(this.platform);
    this.pt = { x: 0, z: 0, w: 1, d: 1 }; this.ptTarget = { x: 0, z: 0, w: 1, d: 1 }; this.setPlatformTarget(true);
    this.floors = new THREE.InstancedMesh(G.box, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: null }), GW * GH); this.floors.frustumCulled = false; this.floors.receiveShadow = LOOK.shadows; this.floors.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(GW * GH * 3), 3); scene.add(this.floors);
    this.walls = new THREE.InstancedMesh(G.box, new THREE.MeshToonMaterial({ color: 0xffffff, map: wallpaperTexture(), gradientMap: toonGradient() }), 700); this.walls.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(700 * 3), 3); this.walls.frustumCulled = false; this.walls.castShadow = this.walls.receiveShadow = LOOK.shadows; scene.add(this.walls);
    this.doors = new THREE.InstancedMesh(G.box, toon(0xd0a248, { emissive: 0x3a2a08 }), 200); this.doors.frustumCulled = false; scene.add(this.doors);
    this.posts = new THREE.InstancedMesh(G.box, toon(0xa87a3c), 420); this.posts.frustumCulled = false; this.posts.castShadow = LOOK.shadows; scene.add(this.posts);
    this.lintels = new THREE.InstancedMesh(G.box, toon(0x9a6e34), 200); this.lintels.frustumCulled = false; scene.add(this.lintels);
    this.frames = new THREE.InstancedMesh(G.box, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient() }), 400); this.frames.frustumCulled = false; this.frames.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(400 * 3), 3); scene.add(this.frames);
    this.pics = new THREE.InstancedMesh(G.box, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toonGradient() }), 400); this.pics.frustumCulled = false; this.pics.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(400 * 3), 3); scene.add(this.pics);
    this.gridLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xb8a888, transparent: true, opacity: 0.55 })); scene.add(this.gridLines);
    this.propGroups = new Map(); this.figures = new Map();
    this.ghost = mesh(G.box, new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.45, depthWrite: false }), 0, 0.2, 0, 1, 0.3, 1); this.ghost.visible = false; this.ghost.renderOrder = 5; scene.add(this.ghost);
    this.sel = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 1), new THREE.Vector3(0, 0, 1)]), new THREE.LineBasicMaterial({ color: 0xffd36a })); this.sel.visible = false; this.sel.position.y = 0.16; scene.add(this.sel);
    this.selRoom = null;
    // dust motes
    const n = 90, pos = new Float32Array(n * 3), R = rng(5); this.dust = []; for (let i = 0; i < n; i++) this.dust.push([R() * GW, R() * 5 + 1, R() * GH, R() * 6.28]);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.dustPts = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.12, color: 0xffe0b0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, map: null })); this.dustPts.frustumCulled = false; scene.add(this.dustPts); if (LOOK.grade && LOOK.grade.edge > 0) this.dustPts.visible = false;
    // sparkle burst for unfolding
    this.sparks = []; this.sparkGroup = new THREE.Group(); scene.add(this.sparkGroup);
    // controls
    const c = this.controls = new OrbitControls(this.camera, world.canvas);
    c.enablePan = true; c.screenSpacePanning = false; c.enableDamping = true; c.dampingFactor = 0.1; c.minDistance = 6; c.maxDistance = 60; c.minPolarAngle = 0.45; c.maxPolarAngle = 1.2; c.minAzimuthAngle = -0.8; c.maxAzimuthAngle = 0.8; c.rotateSpeed = 0.5; c.panSpeed = 0.9;
    c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }; c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }; c.enabled = false;
    // first-person (journey) camera, ceiling, lamps and in-person props
    this.jcam = new THREE.PerspectiveCamera(74, 1, 0.03, 120); this.journey = false; scene.add(this.jcam);
    this.winTexA = null; this.winTexB = null; this.windowViews = new Set(); this.reachT = 0; this.handsMoving = false; this.bobPhase = 0;
    this.buildHands();
    this.ceiling = mesh(G.box, new THREE.MeshToonMaterial({ color: 0x6a4a38, gradientMap: null, side: THREE.DoubleSide }), 0, FLOOR_H + 1.32, 0, 1, 0.06, 1); this.ceiling.castShadow = false; this.ceiling.visible = false; scene.add(this.ceiling);
    this.lamps = new THREE.Group(); this.lamps.visible = false; scene.add(this.lamps);
    this.jprops = new THREE.Group(); this.jprops.visible = false; scene.add(this.jprops);
    this.markerSprites = [];
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
    const WH = this.journey ? 1.25 : 0.56;
    for (const w of sim.walls) {
      let x = w.x + 0.5, z = w.y + 0.5, sx = 1.08, sz = 0.1;
      if (w.side === 'n') z = w.y; else if (w.side === 's') z = w.y + 1; else { x = w.side === 'w' ? w.x : w.x + 1; sx = 0.1; sz = 1.08; }
      d.position.set(x, FLOOR_H + WH / 2, z); d.scale.set(sx, WH, sz); d.rotation.set(0, 0, 0); d.updateMatrix(); this.walls.setMatrixAt(i, d.matrix);
      const rm = sim.roomAt(w.x, w.y); this.col.setHex(WALLC[rm ? rm.type : 'corridor'] || 0xe9dcc4); const st = STYLES[(rm && rm.style) || 0]; this.col.r = Math.min(1, this.col.r * st[0]); this.col.g = Math.min(1, this.col.g * st[1]); this.col.b = Math.min(1, this.col.b * st[2]); this.walls.setColorAt(i, this.col); i++;
    }
    this.walls.count = i; this.walls.instanceMatrix.needsUpdate = true; this.walls.instanceColor.needsUpdate = true;
    // framed pictures on a few interior walls (first person only), never over a window
    { let fi = 0; const wins = new Set(sim.windows().map((q) => `${q.x}|${q.z}|${q.side}`));
      if (this.journey) for (const w of sim.walls) {
        const rm = sim.roomAt(w.x, w.y); if (!rm || !FRAMEY.has(rm.type) || hash(`fr:${w.x}:${w.y}:${w.side}`) % 100 > 38) continue;
        const wx = w.side === 'e' ? w.x + 1 : w.side === 'w' ? w.x : w.x + 0.5, wz = w.side === 's' ? w.y + 1 : w.side === 'n' ? w.y : w.y + 0.5; if (wins.has(`${wx}|${wz}|${w.side}`) || fi >= 400) continue;
        const inx = w.side === 'w' ? 1 : w.side === 'e' ? -1 : 0, inz = w.side === 'n' ? 1 : w.side === 's' ? -1 : 0, rr = rng(hash(`pic:${w.x}:${w.y}:${w.side}`));
        const fw = 0.3 + rr() * 0.18, fh = 0.24 + rr() * 0.16, py = FLOOR_H + 0.78 + rr() * 0.2;
        d.position.set(wx + inx * 0.075, py, wz + inz * 0.075); d.scale.set(inx ? 0.035 : fw, fh, inx ? fw : 0.035); d.rotation.set(0, 0, 0); d.updateMatrix(); this.frames.setMatrixAt(fi, d.matrix); this.col.setHex(rr() < 0.5 ? 0xb8864a : 0x7a5230); this.frames.setColorAt(fi, this.col);
        d.position.set(wx + inx * 0.095, py, wz + inz * 0.095); d.scale.set(inx ? 0.02 : fw - 0.08, fh - 0.08, inx ? fw - 0.08 : 0.02); d.updateMatrix(); this.pics.setMatrixAt(fi, d.matrix); this.col.setHSL(rr(), 0.45, 0.6 + rr() * 0.15); this.pics.setColorAt(fi, this.col); fi++;
      }
      this.frames.count = this.pics.count = fi; this.frames.instanceMatrix.needsUpdate = this.pics.instanceMatrix.needsUpdate = true; this.frames.instanceColor.needsUpdate = this.pics.instanceColor.needsUpdate = true; }
    // doors
    i = 0;
    for (const dr of sim.doorList) {
      const horiz = dr.ox !== dr.x; const x = horiz ? dr.ox : dr.x + 0.5, z = horiz ? dr.y + 0.5 : dr.oy;
      d.position.set(x, FLOOR_H + 0.02, z); d.scale.set(horiz ? 0.16 : 0.8, 0.03, horiz ? 0.8 : 0.16); d.updateMatrix(); this.doors.setMatrixAt(i++, d.matrix);
    }
    this.doors.count = i; this.doors.instanceMatrix.needsUpdate = true;
    { let pi = 0, li = 0;
      for (const dr of sim.doorList) {
        const horiz = dr.ox !== dr.x, x = horiz ? dr.ox : dr.x + 0.5, z = horiz ? dr.y + 0.5 : dr.oy, ph = WH + 0.06;
        for (const sgn of [-1, 1]) { d.position.set(horiz ? x : x + sgn * 0.46, FLOOR_H + ph / 2, horiz ? z + sgn * 0.46 : z); d.scale.set(horiz ? 0.13 : 0.12, ph, horiz ? 0.12 : 0.13); d.rotation.set(0, 0, 0); d.updateMatrix(); this.posts.setMatrixAt(pi++, d.matrix); }
        if (this.journey) { d.position.set(x, FLOOR_H + WH + 0.04, z); d.scale.set(horiz ? 0.14 : 1.08, 0.12, horiz ? 1.08 : 0.14); d.updateMatrix(); this.lintels.setMatrixAt(li++, d.matrix); }
      }
      this.posts.count = pi; this.posts.instanceMatrix.needsUpdate = true; this.lintels.count = li; this.lintels.instanceMatrix.needsUpdate = true; }
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
    while (this.lamps.children.length) this.lamps.remove(this.lamps.children[0]);
    for (const r of s.rooms) { const gl = glowSprite(0xffd890, 2.4, 0.75); gl.position.set(r.x + r.w / 2, FLOOR_H + 1.12, r.y + r.h / 2); this.lamps.add(gl); this.lamps.add(sph(0xfff0b0, r.x + r.w / 2, FLOOR_H + 1.18, r.y + r.h / 2, 0.1, 0.1, 0.1, { emissive: 0xffe0a0, emissiveIntensity: 1.6 })); }
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
  setWindowTextures(a, b) { this.winTexA = a; this.winTexB = b; }
  // Your own hands, drawn over everything, so nothing in the world can clip through them.
  buildHands() {
    const M = (c) => { const m = new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient() }); m.depthTest = false; m.depthWrite = false; return m; };
    const sleeve = M(0x2f7f86), skin = M(0xe0b98a), gold = M(0xf2b134), H = new THREE.Group(); H.visible = false;
    const arm = (x, rot) => { const g = new THREE.Group(); g.position.set(x, -0.2, -0.3); g.rotation.set(-0.55, rot, 0);
      const a = new THREE.Mesh(G.cyl, sleeve); a.scale.set(0.07, 0.3, 0.07); a.rotation.x = Math.PI / 2; a.position.z = 0.0; g.add(a);
      const c = new THREE.Mesh(G.tor, gold); c.scale.set(0.085, 0.085, 0.085); c.position.z = -0.15; g.add(c);
      const h = new THREE.Mesh(G.sph, skin); h.scale.set(0.085, 0.07, 0.09); h.position.z = -0.2; g.add(h);
      g.traverse((o) => { o.renderOrder = 100; }); return g; };
    this.handR = arm(0.2, -0.22); this.handL = arm(-0.2, 0.22); H.add(this.handR, this.handL);
    this.held = new THREE.Group(); this.held.position.set(0.2, -0.17, -0.5); H.add(this.held);
    this.handsGroup = H; this.jcam.add(H); this.heldKind = null;
  }
  setHeld(carry) {
    const key = carry ? (carry.kind === 'item' ? 'item:' + carry.item : carry.kind) : null; if (key === this.heldKind) return; this.heldKind = key;
    while (this.held.children.length) this.held.remove(this.held.children[0]);
    if (!carry) return;
    const M = (c, o = {}) => { const m = new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient(), ...o }); m.depthTest = false; m.depthWrite = false; return m; };
    const add = (geo, mat, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.renderOrder = 101; this.held.add(m); return m; };
    if (carry.kind === 'tea') { add(G.cyl, M(0xfff4e0), 0, 0, 0, 0.09, 0.075, 0.09); add(G.cyl, M(0x6a3a1a), 0, 0.032, 0, 0.075, 0.01, 0.075); add(G.tor, M(0xfff4e0), 0.055, 0, 0, 0.06, 0.06, 0.04); add(G.cyl, M(0xe8dcc8), 0, -0.042, 0, 0.13, 0.012, 0.13); const st = glowSprite(0xffffff, 0.12, 0.6); st.position.set(0, 0.08, 0); st.material.depthTest = false; st.renderOrder = 102; this.held.add(st); }
    else if (carry.kind === 'post') { add(G.sph, M(0xc8a070), 0, 0, 0, 0.13, 0.11, 0.1); add(G.box, M(0xf7ecd4), 0.02, 0.07, 0.02, 0.07, 0.01, 0.05); add(G.cyl, M(0x8a5a3a), 0, 0.055, 0, 0.03, 0.02, 0.03); }
    else { const w = carry.item, col = /book/.test(w) ? 0xb84a1c : /flower/.test(w) ? 0xff8aa6 : /wrench/.test(w) ? 0x9aa0a8 : /chart/.test(w) ? 0xd8b888 : /towel/.test(w) ? 0x4aa8b8 : /music/.test(w) ? 0xf7ecd4 : /fish/.test(w) ? 0xe8883a : 0xd8a868;
      if (/book|music/.test(w)) add(G.box, M(col), 0, 0, 0, 0.12, 0.03, 0.09); else if (/chart/.test(w)) { const r = add(G.cyl, M(col), 0, 0, 0, 0.04, 0.14, 0.04); r.rotation.z = Math.PI / 2; } else if (/flower/.test(w)) { for (let k = 0; k < 4; k++) add(G.sph, M(col), (k - 1.5) * 0.03, 0.03 * (k % 2), 0, 0.05, 0.05, 0.05); add(G.cyl, M(0x3a8a3a), 0, -0.04, 0, 0.012, 0.09, 0.012); } else add(G.box, M(col), 0, 0, 0, 0.1, 0.06, 0.07); }
  }
  reach() { this.reachT = 0.32; }
  setJourney(on) {
    this.journey = on; this.handsGroup.visible = on; if (!on) this.setHeld(null); this.built = -1; this.ceiling.visible = on; this.lamps.visible = on; this.jprops.visible = on;
    this.gridLines.visible = !on; if (on) { this.sel.visible = false; this.ghost.visible = false; }
  }
  // Things you can use in person: the conductor's post, the tea urns, and anything left lying about.
  setJourneyProps(d) {
    while (this.jprops.children.length) this.jprops.remove(this.jprops.children[0]);
    const brass = 0xd0a248;
    const c = d.post; const con = new THREE.Group(); con.position.set(c.x, FLOOR_H, c.z);
    con.add(box(0x4a3020, 0, 0.22, 0, 0.5, 0.44, 0.4)); con.add(box(0x6a4a30, 0, 0.46, 0, 0.56, 0.04, 0.46)); const dial = cyl(brass, 0, 0.62, 0, 0.2, 0.05, 0.2, { emissive: 0x2a1a04 }); dial.rotation.x = Math.PI / 2 - 0.5; con.add(dial); con.add(sph(0xff6a3a, 0.16, 0.54, 0.12, 0.07, 0.07, 0.07, { emissive: 0xff4a1a, emissiveIntensity: 1.2 }));
    con.add(sph(0xc8a070, -0.2, 0.52, 0.1, 0.18, 0.16, 0.14)); con.add(box(0xe8d8b8, -0.2, 0.62, 0.1, 0.1, 0.02, 0.06)); // the post bag
    const gl = glowSprite(0xffc070, 1.6, 0.8); gl.position.set(0, 0.7, 0); con.add(gl); this.jprops.add(con);
    for (const u of d.urns) { const g = new THREE.Group(); g.position.set(u.x, FLOOR_H, u.z); g.add(cyl(brass, 0, 0.2, 0, 0.22, 0.4, 0.22, { emissive: 0x2a1a04 })); g.add(sph(brass, 0, 0.42, 0, 0.2, 0.14, 0.2, { emissive: 0x2a1a04 })); g.add(cyl(brass, 0.14, 0.26, 0, 0.05, 0.05, 0.05)); const st = glowSprite(0xfff4e0, 0.7, 0.6); st.position.set(0, 0.62, 0); g.add(st); this.jprops.add(g); }
    for (const m of d.spots) {
      const g = new THREE.Group(); g.position.set(m.x, FLOOR_H, m.z);
      if (m.kind === 'water') { if (m.done) continue; g.add(cyl(0xb8603a, 0, 0.07, 0, 0.14, 0.14, 0.14)); g.add(sph(0x7a8a4a, 0.02, 0.2, 0, 0.17, 0.12, 0.17)); g.add(sph(0x6a7a3a, -0.07, 0.15, 0.03, 0.09, 0.07, 0.09)); const dp = glowSprite(0x8ad0ff, 0.2, 0.7); dp.position.set(0, 0.38, 0); g.add(dp); }
      else if (m.kind === 'lamps') { g.position.y = FLOOR_H + 0.55; g.add(box(0x3a2a20, 0, 0, 0, 0.12, 0.2, 0.1)); g.add(sph(m.done ? 0xfff0b0 : 0x4a4a52, 0, 0.12, 0, 0.12, 0.12, 0.12, m.done ? { emissive: 0xffe0a0, emissiveIntensity: 1.6 } : undefined)); if (m.done) { const gl = glowSprite(0xffd890, 0.9, 0.9); gl.position.set(0, 0.12, 0); g.add(gl); } }
      else { if (m.done) continue; g.add(sph(0xf4ecd8, 0, 0.05, 0, 0.12, 0.08, 0.12)); g.add(cyl(0xe8d8b8, 0.09, 0.03, 0.05, 0.08, 0.06, 0.08)); }
      this.jprops.add(g);
    }
    for (const u of d.pickups || []) { const g = new THREE.Group(); g.position.set(u.x, FLOOR_H, u.z); g.add(box(0x6a4a30, 0, 0.12, 0, 0.3, 0.24, 0.26)); g.add(box(0x8a5a38, 0, 0.25, 0, 0.34, 0.03, 0.3)); g.add(box(/book|music/.test(u.item) ? 0xb84a1c : 0xd8a868, 0, 0.29, 0, 0.14, 0.05, 0.1)); const gl = glowSprite(0xffe0a0, 0.7, 0.7); gl.position.set(0, 0.4, 0); g.add(gl); this.jprops.add(g); }
    this.windowViews = new Set();
    for (const w of d.windows || []) {
      this.windowViews.add(w.view); const tex = w.view === 'A' ? this.winTexA : this.winTexB;
      const g = new THREE.Group(), nrm = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] }[w.side];
      g.position.set(w.x + nrm[0] * 0.075, FLOOR_H + 0.74, w.z + nrm[1] * 0.075); g.rotation.y = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 }[w.side];
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.5), new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? 0xffffff : 0x445566 })); pane.position.z = 0.004; g.add(pane);
      const fr = 0xd0a248; g.add(box(fr, 0, 0.27, 0.02, 0.86, 0.045, 0.05, { emissive: 0x2a1a04 })); g.add(box(fr, 0, -0.27, 0.02, 0.86, 0.06, 0.07, { emissive: 0x2a1a04 })); g.add(box(fr, -0.41, 0, 0.02, 0.045, 0.54, 0.05, { emissive: 0x2a1a04 })); g.add(box(fr, 0.41, 0, 0.02, 0.045, 0.54, 0.05, { emissive: 0x2a1a04 })); g.add(box(fr, 0, 0, 0.015, 0.02, 0.5, 0.02, { emissive: 0x2a1a04 })); g.add(box(fr, 0, 0, 0.015, 0.78, 0.02, 0.02, { emissive: 0x2a1a04 }));
      g.add(box(0xb8483a, -0.36, 0.02, 0.04, 0.1, 0.46, 0.04)); g.add(box(0xb8483a, 0.36, 0.02, 0.04, 0.1, 0.46, 0.04));
      this.jprops.add(g);
    }
    this.markerSprites = d.markers.map((m) => { const sp = glowSprite(0xffe08a, 0.34, 0.95); sp.position.set(m.x, FLOOR_H + (m.y || 0.9), m.z); sp.userData.base = sp.position.y; this.jprops.add(sp); return sp; });
  }
  emote(pid, kind) {
    const f = this.figures.get(pid); if (!f) return;
    const sp = glowSprite(kind === 'heart' ? 0xff7aa8 : kind === 'spark' ? 0xff8a4a : 0xffe08a, 0.55, 1); sp.position.set(f.position.x, 1.1, f.position.z); sp.userData = { vy: 0.7, life: 1.4 }; this.sparkGroup.add(sp); this.sparks.push(sp);
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
    this.setPlatformTarget(false);
    const t = this.ptTarget, tan = Math.tan((40 * Math.PI) / 360);
    const dist = clamp(Math.max((t.d + 1.5) * 0.55 / tan, (t.w + 1.8) * 0.5 / (tan * aspect)), 8, 55);
    this.controls.target.set(t.x, 0, t.z + 0.4);
    const pol = 0.95; this.camera.position.set(t.x, Math.cos(pol) * dist, t.z + 0.4 + Math.sin(pol) * dist); this.controls.update();
  }
  resize(aspect) {
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); this.jcam.aspect = aspect; this.jcam.fov = aspect < 1 ? 92 : 80; this.jcam.updateProjectionMatrix();   // a little wider than before, and wider still on tall phone screens
    // keep the hands on screen: a tall phone screen has very little width at arm's length
    const halfW = 0.34 * Math.tan((this.jcam.fov * Math.PI) / 360) * aspect, x = clamp(halfW * 0.7, 0.065, 0.2);
    this.handR.position.x = x; this.handL.position.x = -x; this.held.position.x = x;
  }

  // ---------- frame ----------
  update(dt, time) {
    const sim = this.sim;
    if (this.built !== sim.version) this.rebuild();
    // platform grows toward the unfolded plot
    const p = this.pt, t = this.ptTarget, k = 1 - Math.exp(-dt * 4.5);
    p.x += (t.x - p.x) * k; p.z += (t.z - p.z) * k; p.w += (t.w - p.w) * k; p.d += (t.d - p.d) * k;
    this.platform.position.set(p.x, -0.17, p.z); this.platform.scale.set(p.w, 0.3, p.d);
    if (this.journey) {
      this.reachT = Math.max(0, this.reachT - dt); const rr = this.reachT / 0.32, push = rr > 0 ? Math.sin((1 - rr) * Math.PI) * 0.09 : 0, bob = this.handsMoving ? Math.sin(this.bobPhase) * 0.006 : Math.sin(time * 1.4) * 0.002;
      this.handsGroup.position.set(0, bob, -push); this.held.position.z = -0.5 - push * 0.4;
    }
    if (this.journey) { this.ceiling.position.x = p.x; this.ceiling.position.z = p.z; this.ceiling.scale.set(p.w, 0.06, p.d); for (const m of this.markerSprites) m.position.y = m.userData.base + Math.sin(time * 3 + m.position.x) * 0.05; }
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
