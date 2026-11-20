// Three.js scene: the workbench, the tree, the folk, the sap.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { rng, clamp } from './logic.js';
import { PALETTES } from './data.js';

const V = THREE.Vector3;
const GROW_MS = 1100;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function plankTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), r = rng(5);
  g.fillStyle = '#5a3a22'; g.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 8; p++) {
    const y = p * 64, tone = 0.85 + r() * 0.3;
    g.fillStyle = `rgb(${Math.floor(92 * tone)},${Math.floor(60 * tone)},${Math.floor(36 * tone)})`; g.fillRect(0, y, 512, 62);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(40,22,10,${0.1 + r() * 0.18})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); const yy = y + r() * 62; g.moveTo(0, yy); g.bezierCurveTo(150, yy + (r() - 0.5) * 8, 350, yy + (r() - 0.5) * 8, 512, yy + (r() - 0.5) * 4); g.stroke(); }
    g.fillStyle = 'rgba(20,10,4,0.55)'; g.fillRect(0, y + 62, 512, 2);
    g.fillStyle = 'rgba(255,220,170,0.08)'; g.fillRect(0, y, 512, 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function toonGradient() {
  const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function gearGeometry(r = 0.3, teeth = 9, depth = 0.08) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2, hi = Math.floor((i + 1) / 2) % 2 === 0;
    const rr = hi ? r * 1.22 : r; s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  const h = new THREE.Path(); h.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
}

export class World {
  constructor(canvas, sim) {
    this.sim = sim; this.canvas = canvas;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600;
    this.mobile = mobile;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    this.pr = Math.min(devicePixelRatio || 1, mobile ? 2 : 2); r.setPixelRatio(this.pr);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0a18); scene.fog = new THREE.FogExp2(0x0d0b1c, 0.012);
    const cam = this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500); cam.position.set(7, 5, 9);

    this.glowTex = glowTexture(); this.toon = toonGradient();
    this.tmat = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: this.toon, ...extra });

    // lights
    scene.add(new THREE.HemisphereLight(0x8a94ff, 0x4a2a14, 1.5));
    const moon = new THREE.DirectionalLight(0xaab8ff, 0.9); moon.position.set(-6, 14, 8); scene.add(moon);
    this.baseLight = new THREE.PointLight(0xffa860, 10, 14, 2); this.baseLight.position.set(0, 1.4, 0); scene.add(this.baseLight);
    this.crownLight = new THREE.PointLight(0xff8a3a, 8, 12, 2); scene.add(this.crownLight);

    this.buildBench();
    this.buildFireflies();
    this.buildTreeObjects();
    this.buildHollow();

    // controls
    const c = this.controls = new OrbitControls(cam, canvas);
    c.enablePan = false; c.enableDamping = true; c.dampingFactor = 0.08; c.minDistance = 3.5; c.maxDistance = 260;
    c.maxPolarAngle = 1.5; c.rotateSpeed = 0.7; c.zoomSpeed = 0.8; c.target.set(0, 2.2, 0);
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.userBusy = false; this.lastUser = 0;
    c.addEventListener('start', () => { this.userBusy = true; });
    c.addEventListener('end', () => { this.userBusy = false; this.lastUser = performance.now(); });
    this.fitDist = 12; this.fitting = true; this.fitTarget = new V(0, 2.2, 0);
    this.fit(true);

    // post
    this.useBloom = true;
    const comp = this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 }));
    comp.addPass(new RenderPass(scene, cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.62);
    comp.addPass(this.bloom); comp.addPass(new OutputPass());
    this.resize();
    addEventListener('resize', () => { this.resize(); this.fit(true); });

    this.mode = 'tend'; this.selected = -1; this.bridgeFrom = -1; this.bridgeOK = new Set();
    this.growFrom = -1; this.ghost = null;
    this.wobble = new Map(); this.pulse = 0; this.frameT = []; this.quality = 'high';
    this.treeDirty = true; this.leafColorT = 0;
    this.tmpM = new THREE.Matrix4(); this.tmpQ = new THREE.Quaternion(); this.tmpV = new V(); this.tmpS = new V(); this.tmpC = new THREE.Color();
    this.clock = 0;
    this.fit(true);
    const dir = new V(0.55, 0.38, 0.75).normalize(); this.camera.position.copy(this.controls.target).addScaledVector(dir, this.fitDist);
  }

  // ---------- static scenery ----------
  buildBench() {
    const scene = this.scene;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.95, metalness: 0, emissive: 0x3a2010, emissiveMap: null, emissiveIntensity: 0.55 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const R = rng(11), props = new THREE.Group(); scene.add(props);
    const brass = this.tmat(0xc89a4a), red = this.tmat(0xb24a3c), cloth = this.tmat(0x3a6f8a), steel = this.tmat(0x8a93a0), pale = this.tmat(0xe8d8b4);
    // giant spool
    const spool = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 5, 24), cloth); spool.add(core);
    for (const y of [-2.7, 2.7]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.5, 24), pale); f.position.y = y; spool.add(f); }
    spool.position.set(-26, 2.7, -14); spool.rotation.z = Math.PI / 2; spool.rotation.y = 0.5; props.add(spool);
    // thimble
    const thimble = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 4.6, 20, 1, true), steel); thimble.position.set(22, 2.3, -20); props.add(thimble);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), steel); cap.position.set(22, 4.6, -20); props.add(cap);
    // screw
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 10, 12), brass); screw.rotation.z = Math.PI / 2; screw.position.set(8, 1.5, 17); screw.rotation.y = 0.7; props.add(screw);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1, 16), brass); head.rotation.z = Math.PI / 2; head.position.set(8 - 5.2 * Math.cos(0.7), 1.5, 17 + 5.2 * Math.sin(0.7)); head.rotation.y = 0.7; props.add(head);
    // pencil
    const pencil = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 18, 6), this.tmat(0xe0a838)); pencil.add(body);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3, 6), pale); tip.position.y = 10.5; pencil.add(tip);
    pencil.position.set(-12, 1.1, 16); pencil.rotation.z = Math.PI / 2; pencil.rotation.y = -0.4; props.add(pencil);
    // half-buried cog
    const cog = new THREE.Mesh(gearGeometry(4, 14, 1.2), brass); cog.position.set(20, 0.3, 6); cog.rotation.x = -Math.PI / 2 + 0.18; props.add(cog);
    this.bigCog = cog;
    // scattered tacks
    for (let i = 0; i < 18; i++) { const a = R() * 6.28, d = 10 + R() * 25; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.1, 0.6, 8), R() > 0.5 ? brass : red); t.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d); t.rotation.z = (R() - 0.5) * 0.8; props.add(t); }
    // distant workshop lamps
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28 + R(), d = 46 + R() * 14;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffb870, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.scale.setScalar(9 + R() * 8); s.position.set(Math.cos(a) * d, 7 + R() * 12, Math.sin(a) * d); scene.add(s);
    }
  }
  buildFireflies() {
    const n = this.mobile ? 70 : 140, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), R = rng(3);
    this.ffSeed = [];
    for (let i = 0; i < n; i++) { this.ffSeed.push([R() * 6.28, R() * 6.28, 3 + R() * 16, R() * 14, 0.2 + R() * 0.4]); col[i * 3] = 1; col[i * 3 + 1] = 0.8 + R() * 0.2; col[i * 3 + 2] = 0.4 + R() * 0.3; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.ff = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.28, map: this.glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.ff.frustumCulled = false; this.scene.add(this.ff);
  }
  buildHollow() {
    // a pool of sap at the roots and cottages that appear as the Hollow grows
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.04; this.scene.add(pool); this.pool = pool;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.12, 8, 32), this.tmat(0x6c4a30)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.08; this.scene.add(ring);
    this.cottages = []; this.cottageGroup = new THREE.Group(); this.scene.add(this.cottageGroup);
  }
  addCottage(i) {
    const R = rng(i * 91 + 7), a = (i / 14) * Math.PI * 2 + 0.4, d = 3.6 + (i % 3) * 1.1 + R() * 0.5;
    const g = new THREE.Group();
    const wall = this.tmat([0xd8c4a0, 0xc9a07a, 0xa8b8b0, 0xd0a8a0][i % 4]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.9), wall); body.position.y = 0.35; g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 4), this.tmat([0xa8453a, 0x3f6e8a, 0x7a4a8a][i % 3])); roof.position.y = 1.0; roof.rotation.y = Math.PI / 4; g.add(roof);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.26), new THREE.MeshBasicMaterial({ color: 0xffc870 })); win.position.set(0, 0.4, 0.46); g.add(win);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.34), new THREE.MeshBasicMaterial({ color: 0x6a3a1a })); door.position.set(-0.3, 0.17, 0.46); g.add(door);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffb860, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(1.3); gl.position.set(0, 0.45, 0.6); g.add(gl);
    g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.rotation.y = -a + Math.PI / 2 + (R() - 0.5) * 0.4; g.scale.setScalar(0.01); g.userData.t = 0;
    this.cottageGroup.add(g); this.cottages.push(g);
  }
  syncHollow() { while (this.cottages.length < this.sim.s.hollow) this.addCottage(this.cottages.length); }

  // ---------- tree ----------
  buildTreeObjects() {
    const scene = this.scene;
    this.barkMat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: this.toon, emissive: 0x4a1a08, emissiveIntensity: 1.1 });
    this.treeMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.barkMat); this.treeMesh.frustumCulled = false; scene.add(this.treeMesh);
    this.ropeMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshToonMaterial({ color: 0xd8b878, gradientMap: this.toon, emissive: 0x201004 })); this.ropeMesh.frustumCulled = false; scene.add(this.ropeMesh);
    // leaves on tips (interactive)
    this.maxLeaves = 400;
    this.leafCore = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), this.maxLeaves);
    this.leafHalo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }), this.maxLeaves);
    for (const m of [this.leafCore, this.leafHalo]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    this.leafCore.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxLeaves * 3), 3); this.leafHalo.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxLeaves * 3), 3);
    // decorative foliage along branches
    this.maxFoliage = 2600;
    this.foliage = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.19, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), this.maxFoliage);
    this.foliage.frustumCulled = false; this.foliage.count = 0; this.foliage.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxFoliage * 3), 3); scene.add(this.foliage);
    this.foliageSeeds = [];
    // sap drops
    this.maxDrops = 320;
    this.dropCore = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), this.maxDrops);
    this.dropHalo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), this.maxDrops);
    for (const m of [this.dropCore, this.dropHalo]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxDrops * 3), 3); scene.add(m); }
    // node markers (shape mode)
    this.maxMarkers = 560;
    this.markers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }), this.maxMarkers);
    this.markers.frustumCulled = false; this.markers.count = 0; this.markers.renderOrder = 10; this.markers.visible = false;
    this.markers.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.maxMarkers * 3), 3); scene.add(this.markers);
    // ghost branch
    this.ghostMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.55, depthTest: false })); this.ghostMesh.visible = false; this.ghostMesh.renderOrder = 11; this.ghostMesh.frustumCulled = false; scene.add(this.ghostMesh);
    this.ghostBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0x7dffb0, depthTest: false })); this.ghostBall.visible = false; this.ghostBall.renderOrder = 12; scene.add(this.ghostBall);
    // buildings and winders
    this.buildings = new Map(); this.winderObjs = new Map();
  }

  barkColor(y, out) {
    const h = clamp(y / Math.max(6, this.sim.maxY), 0, 1);
    out.setRGB(0.34 + 0.5 * h, 0.17 + 0.26 * h, 0.1 + 0.12 * h); return out;
  }
  seasonColor() {
    const p = this.sim.s.palette, pal = PALETTES[p];
    return pal && pal.col ? pal.col : this.sim.sea.col;
  }

  pushTube(buf, p0, c, p1, r0, r1, g, ring, col) {
    const K = Math.max(3, Math.round(4 + 6 * g)), R = ring, tan = new V(), N = new V(), B = new V(), pt = new V(), ref = new V();
    const base = buf.pos.length / 3, color = new THREE.Color();
    for (let k = 0; k <= K; k++) {
      const t = (k / K) * g, u = 1 - t;
      pt.set(u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y, u * u * p0.z + 2 * u * t * c.z + t * t * p1.z);
      tan.set(2 * u * (c.x - p0.x) + 2 * t * (p1.x - c.x), 2 * u * (c.y - p0.y) + 2 * t * (p1.y - c.y), 2 * u * (c.z - p0.z) + 2 * t * (p1.z - c.z)).normalize();
      ref.set(Math.abs(tan.y) > 0.95 ? 1 : 0, Math.abs(tan.y) > 0.95 ? 0 : 1, 0);
      N.crossVectors(tan, ref).normalize(); B.crossVectors(tan, N).normalize();
      const rr = r0 + (r1 - r0) * (k / K) * g;
      col(pt.y, color);
      for (let j = 0; j < R; j++) {
        const a = (j / R) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const nx = N.x * ca + B.x * sa, ny = N.y * ca + B.y * sa, nz = N.z * ca + B.z * sa;
        buf.pos.push(pt.x + nx * rr, pt.y + ny * rr, pt.z + nz * rr); buf.nor.push(nx, ny, nz); buf.col.push(color.r, color.g, color.b);
      }
    }
    for (let k = 0; k < K; k++) for (let j = 0; j < R; j++) {
      const a = base + k * R + j, b = base + k * R + (j + 1) % R, c2 = base + (k + 1) * R + j, d = base + (k + 1) * R + (j + 1) % R;
      buf.idx.push(a, c2, b, b, c2, d);
    }
  }
  toGeo(buf, geo) {
    geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
    geo.setIndex(buf.idx); geo.computeBoundingSphere();
  }
  growth(n, now) { return n.born ? clamp((now - n.born) / GROW_MS, 0, 1) : 1; }
  radiusOf(id) { return 0.075 + 0.055 * Math.sqrt(this.sim.leafCount[id] || 1) * (id === 0 ? 1.1 : 1); }

  rebuildTree(now) {
    const sim = this.sim, nodes = sim.s.nodes, buf = { pos: [], nor: [], col: [], idx: [] };
    let animating = false;
    const col = (y, out) => this.barkColor(y, out);
    for (const n of nodes) {
      if (n.dead || n.id === 0) continue;
      const P = nodes[n.p], g0 = this.growth(n, now), g = 1 - Math.pow(1 - g0, 3);
      if (g0 < 1) animating = true;
      if (g <= 0.02) continue;
      const c = sim.edgeCtrl(n.p, n.id);
      const rc = this.radiusOf(n.id), rp = this.radiusOf(n.p);
      this.pushTube(buf, P, { x: c[0], y: c[1], z: c[2] }, n, rc + (rp - rc) * 0.55, rc * 0.85, g, 7, col);
    }
    this.toGeo(buf, this.treeMesh.geometry = new THREE.BufferGeometry());
    // ropes
    const rb = { pos: [], nor: [], col: [], idx: [] }, ropeCol = (y, o) => o.setRGB(0.85, 0.7, 0.45);
    for (const b of sim.s.bridges) {
      const g0 = b.born ? clamp((now - b.born) / GROW_MS, 0, 1) : 1; if (g0 < 1) animating = true;
      const c = sim.edgeCtrl(b.a, b.b);
      this.pushTube(rb, nodes[b.a], { x: c[0], y: c[1], z: c[2] }, nodes[b.b], 0.03, 0.03, g0 || 0.02, 5, ropeCol);
    }
    this.ropeMesh.geometry = new THREE.BufferGeometry(); this.toGeo(rb, this.ropeMesh.geometry);
    this.treeAnimating = animating;
    // foliage
    this.foliageSeeds = [];
    let i = 0;
    const tmp = {};
    for (const n of nodes) {
      if (n.dead || n.id === 0) continue;
      const r = rng(n.id * 977 + 3), cnt = 2 + Math.floor(sim.len(n.p, n.id) * 1.2);
      for (let k = 0; k < cnt && i < this.maxFoliage; k++, i++) {
        const t = 0.25 + r() * 0.75; sim.edgePoint(n.p, n.id, t, tmp);
        const rad = this.radiusOf(n.id) + 0.05, a = r() * 6.28, d = rad + r() * 0.22;
        this.foliageSeeds.push({ id: n.id, t, x: tmp.x + Math.cos(a) * d, y: tmp.y + r() * 0.12, z: tmp.z + Math.sin(a) * d, s: 0.6 + r() * 0.9, b: 0.55 + r() * 0.6, rot: r() * 6.28 });
      }
    }
    this.foliage.count = this.foliageSeeds.length;
    this.recolorFoliage(); this.updateMarkers();
    // fit camera to tree
    this.fit(false);
    this.treeDirty = false;
  }
  recolorFoliage() {
    const col = this.seasonColor(), c = this.tmpC, now = performance.now();
    for (let i = 0; i < this.foliageSeeds.length; i++) {
      const f = this.foliageSeeds[i]; c.setRGB(col[0] * f.b, col[1] * f.b, col[2] * f.b); this.foliage.setColorAt(i, c);
    }
    if (this.foliage.instanceColor) this.foliage.instanceColor.needsUpdate = true;
  }
  updateFoliageMatrices(now, time) {
    const nodes = this.sim.s.nodes, m = this.tmpM, q = this.tmpQ, p = this.tmpV, sc = this.tmpS;
    for (let i = 0; i < this.foliageSeeds.length; i++) {
      const f = this.foliageSeeds[i], n = nodes[f.id], g = n.born ? clamp((now - n.born - 300) / 800, 0, 1) : 1;
      const sw = Math.sin(time * 1.3 + f.rot * 3) * 0.02;
      p.set(f.x + sw, f.y, f.z + sw * 0.7); q.setFromEuler(new THREE.Euler(f.rot, f.rot * 2, f.rot * 0.5)); sc.setScalar(f.s * g * 1.0);
      m.compose(p, q, sc); this.foliage.setMatrixAt(i, m);
    }
    this.foliage.instanceMatrix.needsUpdate = true;
  }

  // ---------- markers / selection ----------
  updateMarkers() {
    const nodes = this.sim.s.nodes, m = this.tmpM, c = this.tmpC;
    let i = 0;
    const scale = this.markerScale();
    for (const n of nodes) {
      if (n.dead) continue;
      const sel = n.id === this.selected, ok = this.bridgeOK.has(n.id), from = n.id === this.bridgeFrom;
      let s = scale * (sel || from ? 1.7 : ok ? 1.35 : 1);
      if (this.bridgeFrom >= 0 && !ok && !from) s *= 0.55;
      m.makeScale(s, s, s); m.setPosition(n.x, n.y, n.z); this.markers.setMatrixAt(i, m);
      if (sel || from) c.setRGB(1, 0.85, 0.35); else if (ok) c.setRGB(0.45, 1, 0.7); else if (n.b) c.setRGB(0.55, 0.7, 1); else if (n.id === 0) c.setRGB(0.7, 0.5, 0.3); else c.setRGB(1, 0.62, 0.3);
      this.markers.setColorAt(i, c); i++;
    }
    this.markers.count = i; this.markers.instanceMatrix.needsUpdate = true; this.markers.instanceColor.needsUpdate = true;
  }
  markerScale() { const d = this.camera.position.distanceTo(this.controls.target); return clamp(d * 0.06, 0.9, 6); }
  setMode(m) { this.mode = m; this.markers.visible = m === 'shape'; this.updateMarkers(); }
  select(id) { this.selected = id; this.updateMarkers(); }
  beginBridge(from) { this.bridgeFrom = from; this.bridgeOK = new Set(this.sim.bridgeTargets(from)); this.updateMarkers(); }
  endBridge() { this.bridgeFrom = -1; this.bridgeOK = new Set(); this.updateMarkers(); }

  // ---------- grow ghost ----------
  ghostPoint(clientX, clientY, parentId) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const P = this.sim.s.nodes[parentId], normal = new V(); this.camera.getWorldDirection(normal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new V(P.x, P.y, P.z));
    const hit = new V(); if (!ray.ray.intersectPlane(plane, hit)) return null;
    return hit;
  }
  showGhost(parentId, hit) {
    const sim = this.sim, pv = sim.previewGrow(parentId, hit.x, hit.y, hit.z), P = sim.s.nodes[parentId];
    const ok = !pv.err, colr = ok ? 0x7dffb0 : 0xff6a6a;
    this.ghostMesh.material.color.setHex(colr); this.ghostBall.material.color.setHex(colr);
    const buf = { pos: [], nor: [], col: [], idx: [] }, mid = { x: (P.x + pv.x) / 2, y: (P.y + pv.y) / 2 + 0.16 * pv.len, z: (P.z + pv.z) / 2 };
    this.pushTube(buf, P, mid, pv, 0.07, 0.04, 1, 6, (y, o) => o.setRGB(1, 1, 1));
    this.ghostMesh.geometry.dispose(); this.ghostMesh.geometry = new THREE.BufferGeometry(); this.toGeo(buf, this.ghostMesh.geometry);
    this.ghostMesh.visible = true; this.ghostBall.visible = true; this.ghostBall.position.set(pv.x, pv.y, pv.z);
    const s = this.markerScale() * 1.2; this.ghostBall.scale.setScalar(s);
    return pv;
  }
  hideGhost() { this.ghostMesh.visible = false; this.ghostBall.visible = false; }

  // ---------- buildings ----------
  makeBuilding(n) {
    const g = new THREE.Group(), t = n.b;
    const out = new V(n.x, 0, n.z); if (out.lengthSq() < 0.01) out.set(1, 0, 0); out.normalize();
    if (t === 'lantern') {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), this.tmat(0x2a1a10)); cord.position.y = 0.2; g.add(cord);
      const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 8), new THREE.MeshBasicMaterial({ color: 0xffdca0 })); cage.position.y = -0.1; g.add(cage);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 8), this.tmat(0x4a3020)); top.position.y = 0.07; g.add(top);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffc070, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(1.7); gl.position.y = -0.1; g.add(gl);
      g.position.set(n.x + out.x * 0.25, n.y - 0.1, n.z + out.z * 0.25); g.userData.kind = 'lantern'; g.userData.gl = gl;
    } else if (t === 'hut') {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.44), this.tmat(0xc8a070)); wall.position.y = 0.18; g.add(wall);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.34, 4), this.tmat(0x8a3a30)); roof.position.y = 0.53; roof.rotation.y = Math.PI / 4; g.add(roof);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0xffc870 })); door.position.set(0, 0.11, 0.225); g.add(door);
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.07), this.tmat(0x6a5a50)); chim.position.set(0.14, 0.6, 0); g.add(chim);
      g.position.set(n.x + out.x * 0.32, n.y + 0.12, n.z + out.z * 0.32); g.rotation.y = Math.atan2(out.x, out.z); g.userData.kind = 'hut';
    } else if (t === 'mill') {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), this.tmat(0x4a3020)); post.position.y = 0.2; g.add(post);
      const gear = new THREE.Mesh(gearGeometry(0.26, 9, 0.07), this.tmat(0xd0a248, { emissive: 0x2a1604 })); gear.position.y = 0.38; g.add(gear);
      const gear2 = new THREE.Mesh(gearGeometry(0.15, 7, 0.07), this.tmat(0xb8783a, { emissive: 0x2a1004 })); gear2.position.set(0.36, 0.38, 0); g.add(gear2);
      g.position.set(n.x + out.x * 0.18, n.y + 0.04, n.z + out.z * 0.18); g.rotation.y = Math.atan2(-out.z, out.x) + Math.PI / 2; g.userData.kind = 'mill'; g.userData.gear = gear; g.userData.gear2 = gear2; g.userData.spin = 0.6;
    } else if (t === 'chime') {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), this.tmat(0x4a3020)); bar.rotation.z = Math.PI / 2; g.add(bar);
      const tubes = [];
      for (let i = 0; i < 3; i++) {
        const L = 0.34 - i * 0.07 + (n.note % 3) * 0.02, tb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.1 + i * 0.02, 0.7, 0.62) }));
        tb.position.set(-0.17 + i * 0.17, -L / 2 - 0.02, 0); g.add(tb); tubes.push(tb);
      }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffd890, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(1.3); gl.position.y = -0.2; g.add(gl);
      g.position.set(n.x + out.x * 0.1, n.y - 0.05, n.z + out.z * 0.1); g.rotation.y = Math.atan2(-out.z, out.x) + Math.PI / 2; g.userData.kind = 'chime'; g.userData.tubes = tubes; g.userData.gl = gl; g.userData.ring = 0;
    }
    g.userData.type = t; g.userData.born = performance.now(); g.scale.setScalar(0.01);
    this.scene.add(g); return g;
  }
  syncBuildings() {
    const nodes = this.sim.s.nodes;
    for (const [id, g] of this.buildings) { const n = nodes[id]; if (!n || n.dead || n.b !== g.userData.type) { this.scene.remove(g); this.buildings.delete(id); } }
    for (const n of nodes) if (!n.dead && n.b && !this.buildings.has(n.id)) this.buildings.set(n.id, this.makeBuilding(n));
    // keep building anchored on moved/grown nodes (positions are fixed, so nothing else needed)
  }
  ringChime(id, strength = 1) { const g = this.buildings.get(id); if (g) g.userData.ring = strength; }
  spinMill(id) { const g = this.buildings.get(id); if (g) g.userData.spin = 6; }

  // ---------- winders ----------
  makeWinder(w) {
    const g = new THREE.Group(), hue = w.hue / 360;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.14, 4, 10), this.tmat(new THREE.Color().setHSL(0.09, 0.45, 0.55))); body.position.y = 0.17; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), this.tmat(0xd8b070)); head.position.y = 0.38; g.add(head);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x1c1208 });
    for (const x of [-0.035, 0.035]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), eyeM); e.position.set(x, 0.4, 0.075); g.add(e); }
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 6, 14), this.tmat(new THREE.Color().setHSL(hue, 0.7, 0.55))); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.3; g.add(scarf);
    const key = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5), this.tmat(0xc8a048)); stem.rotation.x = Math.PI / 2; key.add(stem);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.012), this.tmat(0xd8b058, { emissive: 0x2a1804 })); wing.position.z = -0.07; key.add(wing);
    key.position.set(0, 0.2, -0.1); g.add(key);
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffd080, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); lampGlow.scale.setScalar(0.5); lampGlow.position.y = 0.2; g.add(lampGlow);
    g.userData = { key, body, glow: lampGlow, phase: Math.random() * 6 };
    this.scene.add(g); return g;
  }
  syncWinders() {
    for (const w of this.sim.s.winders) if (!this.winderObjs.has(w.id)) this.winderObjs.set(w.id, this.makeWinder(w));
  }
  winderScale() { return clamp(this.camera.position.distanceTo(this.controls.target) * 0.06, 0.9, 6); }

  // ---------- leaves & drops ----------
  updateLeaves(now, time) {
    const sim = this.sim, nodes = sim.s.nodes, cap = sim.mods.cap, m = this.tmpM, q = this.tmpQ, p = this.tmpV, sc = this.tmpS, c = this.tmpC;
    const col = this.seasonColor();
    let i = 0;
    for (const t of sim.tips) {
      if (i >= this.maxLeaves) break;
      const n = nodes[t], g = this.growth(n, now), ready = n.charge >= 1;
      const wb = this.wobble.get(t) || 0; if (wb > 0) this.wobble.set(t, Math.max(0, wb - 0.016));
      const pulse = ready ? 1 + 0.08 * Math.sin(time * 3 + t) : 1;
      const scale = (0.55 + 0.7 * (n.charge / cap)) * clamp((g - 0.6) / 0.4, 0, 1) * pulse;
      p.set(n.x + Math.sin(time * 30) * wb * 0.5, n.y + 0.3, n.z); q.identity(); sc.setScalar(Math.max(0.001, scale));
      m.compose(p, q, sc); this.leafCore.setMatrixAt(i, m);
      const hs = Math.max(0.001, scale * (ready ? 1.25 : 0.8)); sc.setScalar(hs); m.compose(p, q, sc); this.leafHalo.setMatrixAt(i, m);
      const br = 0.3 + 0.95 * (n.charge / cap); c.setRGB(Math.min(1.6, col[0] * br * 1.3), Math.min(1.6, col[1] * br * 1.3), Math.min(1.6, col[2] * br * 1.3));
      this.leafCore.setColorAt(i, c); this.leafHalo.setColorAt(i, c); i++;
    }
    this.leafCore.count = this.leafHalo.count = i;
    this.leafCore.instanceMatrix.needsUpdate = this.leafHalo.instanceMatrix.needsUpdate = true;
    this.leafCore.instanceColor.needsUpdate = this.leafHalo.instanceColor.needsUpdate = true;
  }
  updateDrops() {
    const sim = this.sim, ms = sim.marbles, m = this.tmpM, q = this.tmpQ, p = this.tmpV, sc = this.tmpS, c = this.tmpC, tmp = {};
    q.identity(); let i = 0;
    const base = sim.baseDrop();
    for (const d of ms) {
      if (i >= this.maxDrops) break;
      sim.edgePoint(d.n, d.to, clamp(d.s, 0, 1), tmp);
      p.set(tmp.x, tmp.y, tmp.z);
      const k = clamp(Math.log2(Math.max(1, d.val / base)) * 0.35, 0, 1);
      sc.setScalar(1 + k * 1.2); m.compose(p, q, sc); this.dropCore.setMatrixAt(i, m);
      sc.setScalar(1 + k * 1.6); m.compose(p, q, sc); this.dropHalo.setMatrixAt(i, m);
      c.setRGB(1.2, 0.85 + 0.15 * k, 0.45 + 0.9 * k); this.dropCore.setColorAt(i, c); c.setRGB(1, 0.6 + 0.2 * k, 0.2 + 0.7 * k); this.dropHalo.setColorAt(i, c); i++;
    }
    this.dropCore.count = this.dropHalo.count = i;
    this.dropCore.instanceMatrix.needsUpdate = this.dropHalo.instanceMatrix.needsUpdate = true;
    this.dropCore.instanceColor.needsUpdate = this.dropHalo.instanceColor.needsUpdate = true;
  }

  // ---------- camera ----------
  desiredDist() { const s = this.sim, asp = this.camera.aspect || 1, v = s.maxY * 1.3 + 3, h = s.radius * 2.3 + 2.5; return clamp(Math.max(v / 0.85, h / (0.85 * asp)) + 2, 9, 240); }
  fit(force) {
    const d = this.desiredDist();
    if (force || d > this.fitDist * 1.06) { this.fitDist = d; this.fitting = true; }
    this.fitTarget.set(0, this.sim.maxY * 0.42 + 0.6, 0);
  }
  project(x, y, z, out = {}) {
    const v = this.tmpV.set(x, y, z).project(this.camera), r = this.canvas.getBoundingClientRect();
    out.x = (v.x * 0.5 + 0.5) * r.width + r.left; out.y = (-v.y * 0.5 + 0.5) * r.height + r.top; out.z = v.z; out.ok = v.z < 1 && v.z > -1; return out;
  }

  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.renderer.setPixelRatio(this.pr); this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pr); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.bloom.resolution.set(w / 2, h / 2);
  }
  degrade() {
    if (this.quality === 'low') return;
    this.quality = 'low'; this.useBloom = false; this.pr = Math.min(this.pr, 1.25); this.resize();
  }

  // ---------- frame ----------
  frame(dt, time) {
    const now = Date.now(), sim = this.sim; this.clock = time;
    if (this.treeDirty || this.treeAnimating) this.rebuildTree(now);
    this.syncBuildings(); this.syncWinders(); this.syncHollow();
    this.updateLeaves(now, time); this.updateDrops(); this.updateFoliageMatrices(now, time);
    // seasons recolor occasionally
    this.leafColorT += dt; if (this.leafColorT > 1.5) { this.leafColorT = 0; this.recolorFoliage(); }
    // winders
    const ws = this.winderScale();
    for (const w of sim.s.winders) {
      const o = this.winderObjs.get(w.id), r = sim.rt.get(w.id); if (!o || !r) continue;
      o.position.set(r.x, r.y + 0.04 * ws, r.z); o.scale.setScalar(ws);
      const walking = r.mode === 'walk', ud = o.userData;
      ud.phase += dt * (walking ? 9 : 2);
      o.position.y += (walking ? Math.abs(Math.sin(ud.phase)) * 0.03 : Math.sin(ud.phase) * 0.004) * ws;
      const target = r.face; let d = ((target - o.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; o.rotation.y += d * Math.min(1, dt * 8);
      ud.key.rotation.z += dt * (walking ? 5 : r.mode === 'work' ? 9 : 0.6) * (r.boost > 0 ? 2 : 1);
      ud.glow.material.opacity = r.boost > 0 ? 0.95 : 0.5;
      if (r.mode === 'work') ud.body.rotation.z = Math.sin(time * 14) * 0.18; else ud.body.rotation.z *= 0.8;
    }
    // buildings
    for (const [id, g] of this.buildings) {
      const ud = g.userData, age = (performance.now() - ud.born) / 600, k = age >= 1 ? 1 : 1 - Math.pow(1 - age, 3);
      g.scale.setScalar(Math.max(0.01, k));
      if (ud.kind === 'mill') { ud.spin = Math.max(0.6, ud.spin * 0.97); ud.gear.rotation.z += dt * ud.spin; ud.gear2.rotation.z -= dt * ud.spin * 1.7; }
      if (ud.kind === 'chime') { ud.ring *= 0.94; ud.tubes.forEach((t, i) => { t.rotation.z = Math.sin(time * 14 + i * 1.7) * 0.25 * ud.ring + Math.sin(time * 1.2 + i + id) * 0.03; }); ud.gl.material.opacity = ud.ring * 0.9; }
      if (ud.kind === 'lantern') { ud.gl.material.opacity = 0.7 + Math.sin(time * 5 + id) * 0.1; g.rotation.z = Math.sin(time * 1.1 + id) * 0.05; }
    }
    // fireflies drift
    const pos = this.ff.geometry.attributes.position;
    const cy = sim.maxY * 0.4;
    for (let i = 0; i < this.ffSeed.length; i++) {
      const s = this.ffSeed[i], a = s[0] + time * 0.05 * s[4], rad = s[2] + sim.radius * 0.6 + Math.sin(time * 0.3 + s[3]) * 1.2;
      pos.setXYZ(i, Math.cos(a) * rad, 0.5 + (s[3] % 1) * (sim.maxY + 6) + Math.sin(time * 0.6 * s[4] + s[1]) * 1.2, Math.sin(a) * rad);
    }
    pos.needsUpdate = true; this.ff.material.size = 0.22 * clamp(this.camera.position.distanceTo(this.controls.target) / 22, 1, 3.5);
    // lights follow the tree
    this.crownLight.position.set(0, sim.maxY * 0.8, 0); this.crownLight.intensity = 6 + Math.min(40, sim.maxY * 1.5); this.crownLight.distance = 10 + sim.maxY * 0.9;
    this.baseLight.intensity = 8 + this.pulse * 30; this.pulse *= 0.93;
    this.pool.material.opacity = 0.22 + this.pulse * 0.35 + Math.sin(time * 1.5) * 0.03;
    this.pool.scale.setScalar(1 + this.pulse * 0.12);
    // cottages pop in
    for (const c of this.cottages) { c.userData.t = Math.min(1, c.userData.t + dt * 1.4); const k = c.userData.t; c.scale.setScalar(k < 1 ? 1 - Math.pow(1 - k, 3) + 0.001 : 1); }
    if (this.bigCog) this.bigCog.rotation.z += dt * 0.01;
    // markers scale with distance
    if (this.markers.visible && (Math.floor(time * 4) !== this.lastMark)) { this.lastMark = Math.floor(time * 4); this.updateMarkers(); }
    // camera
    const ctl = this.controls;
    if (!this.userBusy) {
      const old = ctl.target.clone(); ctl.target.lerp(this.fitTarget, 1 - Math.exp(-dt * 1.6)); this.camera.position.add(ctl.target.clone().sub(old));
      if (this.fitting && performance.now() - this.lastUser > 3000) {
        const off = this.camera.position.clone().sub(ctl.target), cur = off.length(), nd = cur + (this.fitDist - cur) * (1 - Math.exp(-dt * 1.4));
        this.camera.position.copy(ctl.target).add(off.setLength(nd)); if (Math.abs(nd - this.fitDist) < 0.1) this.fitting = false;
      }
    }
    ctl.update();
    // render
    if (this.useBloom) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    // auto quality
    this.frameT.push(dt); if (this.frameT.length > 150) { const avg = this.frameT.reduce((a, b) => a + b, 0) / this.frameT.length; this.frameT.length = 0; if (avg > 0.034) this.degrade(); }
  }
}
