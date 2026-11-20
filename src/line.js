// The Line: the world outside the Marigold, scrolling past as she travels.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PALETTES } from './data.js';
import { regionOf, stopName, hash, rng, clamp, KINDS, landmarkFor, autoSide } from './logic.js';
import { toon, basic, glowSprite, glowTexture, mesh, G, box, cyl, sph, cone, makeFigure, signTexture, lerp } from './gfx.js';

export const U = 60; // world units per mile
const RANGE = 560, BACK = 90;
const COUNTS = [180, 140, 80, 110, 64, 64];

function colored(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo, c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
function at(geo, x, y, z, sx = 1, sy = 1, sz = 1) { geo.scale(sx, sy, sz); geo.translate(x, y, z); return geo; }
function propGeo(kind) {
  const P = [];
  const cyl = (r0, r1, h, x, y, z, hex) => P.push(colored(at(new THREE.CylinderGeometry(r0, r1, h, 7), x, y, z), hex));
  const cone = (r, h, x, y, z, hex) => P.push(colored(at(new THREE.ConeGeometry(r, h, 8), x, y, z), hex));
  const ball = (r, x, y, z, hex, sy = 1) => P.push(colored(at(new THREE.IcosahedronGeometry(r, 1), x, y, z, 1, sy, 1), hex));
  if (kind === 0) { cyl(0.16, 0.22, 1.4, 0, 0.7, 0, 0x4a3222); cone(1.2, 1.7, 0, 1.9, 0, 0xffffff); cone(0.9, 1.5, 0, 2.8, 0, 0xeeeeee); cone(0.6, 1.2, 0, 3.6, 0, 0xffffff); }
  else if (kind === 1) { cyl(0.18, 0.26, 1.6, 0, 0.8, 0, 0x4a3222); ball(1.2, 0, 2.5, 0, 0xffffff); ball(0.85, 0.5, 3.2, 0.2, 0xeeeeee); ball(0.7, -0.5, 2.9, -0.3, 0xf6f6f6); }
  else if (kind === 2) { ball(0.9, 0, 0.9, 0, 0xb8b8c6, 1.9); ball(0.5, 0.7, 0.4, 0.2, 0xa8a8b8, 1.0); }
  else if (kind === 3) { for (let i = 0; i < 7; i++) { const a = i * 0.9, h = 1.8 + (i % 3) * 0.4; P.push(colored(at(new THREE.CylinderGeometry(0.02, 0.05, h, 4), Math.cos(a) * 0.4, h / 2, Math.sin(a) * 0.4), 0xffffff)); } }
  else if (kind === 4) { cyl(0.05, 0.07, 2.6, 0, 1.3, 0, 0x2a2030); ball(0.28, 0, 2.7, 0, 0xfff0b0); }
  else { P.push(colored(at(new THREE.ConeGeometry(0.35, 2.2, 5), 0, 1.1, 0), 0xffffff)); P.push(colored(at(new THREE.ConeGeometry(0.25, 1.5, 5), 0.5, 0.75, 0.2), 0xdddddd)); P.push(colored(at(new THREE.ConeGeometry(0.22, 1.2, 5), -0.4, 0.6, -0.3), 0xeeeeee)); }
  return mergeGeometries(P);
}

function makeLandmark(idx) {
  const g = new THREE.Group(), W = 0xf2ead8;
  if (idx === 0) { // windmill whose sails turn the wrong way
    g.add(cone(0xb89a78, 0, 3.0, 0, 3.4, 6.0, 3.4)); g.add(box(0x6a4a3a, 0, 6.6, 0, 0.8, 0.8, 0.8));
    const hub = new THREE.Group(); hub.position.set(0, 6.4, -1.7); for (let i = 0; i < 4; i++) { const b = box(W, 0, 0, 0, 0.7, 4.6, 0.08); b.position.set(0, 0, 0); b.rotation.z = (i * Math.PI) / 2; b.geometry = b.geometry; const arm = new THREE.Group(); arm.rotation.z = (i * Math.PI) / 2; const bl = box(W, 0, 2.3, 0, 0.9, 4.2, 0.08); arm.add(bl); hub.add(arm); }
    g.add(hub); g.userData.spin = hub; g.userData.spinDir = -1;
  } else if (idx === 4) { // lighthouse nowhere near water
    for (let i = 0; i < 5; i++) g.add(cyl(i % 2 ? 0xd04a4a : 0xf4f0e0, 0, 1.3 + i * 2.6, 0, 3.2 - i * 0.25, 2.6, 3.2 - i * 0.25));
    g.add(cyl(0x2a2a34, 0, 13.6, 0, 3.0, 0.6, 3.0)); g.add(sph(0xfff0b0, 0, 14.6, 0, 1.8, 1.8, 1.8, { emissive: 0xfff0b0, emissiveIntensity: 1.8 })); const gl = glowSprite(0xffe6a0, 18, 0.9); gl.position.y = 14.6; g.add(gl);
  } else if (idx === 3) { // scarecrows all facing the train
    for (let i = 0; i < 6; i++) { const z = (i - 2.5) * 3.2, h = new THREE.Group(); h.position.set(0, 0, z); h.add(cyl(0x6a4a2a, 0, 1.6, 0, 0.14, 3.2, 0.14)); h.add(box(0x6a4a2a, 0, 2.5, 0, 0.1, 0.12, 2.2)); h.add(sph(0xe8c878, 0, 3.4, 0, 0.8, 0.8, 0.8)); h.add(cone(0xa04a3a, 0, 4.0, 0, 1.0, 0.9, 1.0)); h.rotation.y = 0.1 * i; g.add(h); }
  } else if (idx === 5) { // a woman waving a very large flag from a hilltop
    g.add(sph(0x5a7a4a, 0, 0, 0, 12, 7, 12)); g.add(cyl(0x4a3222, 0, 6.5, 0, 0.18, 7, 0.18)); g.add(box(0xf2b134, 1.8, 9, 0, 3.4, 2.2, 0.08)); const f = makeFigure(7); f.position.set(-0.8, 3.4, 0); f.scale.setScalar(1.6); g.add(f);
  } else if (idx === 6) { // a row of lanterns lit for nobody
    for (let i = 0; i < 8; i++) { const z = (i - 3.5) * 4; g.add(cyl(0x2a2030, 0, 1.4, z, 0.1, 2.8, 0.1)); g.add(sph(0xfff0b0, 0, 3.0, z, 0.6, 0.6, 0.6, { emissive: 0xfff0b0, emissiveIntensity: 1.6 })); const gl = glowSprite(0xffd890, 4, 0.8); gl.position.set(0, 3.0, z); g.add(gl); }
  } else if (idx === 7) { // a house with a door in the roof
    g.add(box(0xd8c4a0, 0, 2.0, 0, 5, 4, 4.4)); g.add(cone(0x8a3a3a, 0, 5.4, 0, 6.2, 3, 6.2)).rotation.y = Math.PI / 4; g.add(box(0x6a3a1a, 0, 6.6, 0, 1.2, 1.7, 0.2)); g.children.at(-1).rotation.x = -0.5; g.add(box(0xffd89a, 1.5, 2.4, 2.25, 1.1, 1.1, 0.08, { emissive: 0xffd89a, emissiveIntensity: 1 }));
  } else if (idx === 9) { // standing stone wearing a scarf
    g.add(sph(0xa8a8b8, 0, 3.6, 0, 3.2, 7.2, 2.6)); const sc = mesh(G.tor, toon(0xd04a6a), 0, 5.6, 0, 3.0, 3.0, 3.0); sc.rotation.x = Math.PI / 2; g.add(sc); g.add(box(0xd04a6a, 1.6, 4.6, 0, 0.5, 2.4, 0.3));
  } else if (idx === 13) { // a cloud tethered to a fence post
    g.add(cyl(0x6a4a2a, 0, 1.0, 0, 0.3, 2.0, 0.3)); for (const [x, y, z, r] of [[0, 8, 0, 3.4], [2.4, 7.6, 0.6, 2.6], [-2.4, 7.4, -0.4, 2.8], [0.6, 9.2, 0.4, 2.4]]) g.add(sph(0xffffff, x, y, z, r, r * 0.75, r, { emissive: 0x887788, emissiveIntensity: 0.5 }));
    g.add(cyl(0xd8c8a0, 0.2, 4.6, 0, 0.05, 6.4, 0.05));
  } else if (idx === 14) { // a ladder leaning on nothing, going up
    for (const x of [-0.6, 0.6]) g.add(box(0x8a5a3a, x, 8, 0, 0.14, 16, 0.14)); for (let i = 0; i < 12; i++) g.add(box(0x8a5a3a, 0, 1 + i * 1.3, 0, 1.2, 0.1, 0.1));
  } else return null;
  g.visible = false; return g;
}

export class LineView {
  constructor(world) {
    this.world = world; this.sim = world.sim;
    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x6a3f6a, 0.0052);
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 900);
    this.camTarget = new THREE.Vector3(0, 1.6, 1);
    this.camera.position.set(-10, 4.6, -15);
    // lights
    this.hemi = new THREE.HemisphereLight(0xaab0ff, 0x3a2a30, 1.7); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffc89a, 2.0); this.sun.position.set(-20, 30, 40); scene.add(this.sun);
    this.trainLight = new THREE.PointLight(0xffc27a, 14, 20, 1.8); this.trainLight.position.set(0, 2.6, 0); scene.add(this.trainLight);
    // sky
    this.skyCanvas = document.createElement('canvas'); this.skyCanvas.width = 4; this.skyCanvas.height = 256;
    this.skyTex = new THREE.CanvasTexture(this.skyCanvas); this.skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = this.skyTex;
    this.sunGlow = glowSprite(0xffc890, 260, 0.75); this.sunGlow.position.set(40, 40, 420); this.sunGlow.material.fog = false; scene.add(this.sunGlow);
    const sp = new Float32Array(180 * 3), R = rng(9);
    for (let i = 0; i < 180; i++) { const a = R() * 6.28, e = 0.25 + R() * 1.0; sp[i * 3] = Math.cos(a) * 380 * Math.cos(e * 0.6); sp[i * 3 + 1] = 90 + Math.sin(e) * 160; sp[i * 3 + 2] = Math.sin(a) * 380 * Math.cos(e * 0.6); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, color: 0xfff4dd, transparent: true, opacity: 0.6, depthWrite: false, fog: false })); scene.add(this.stars);
    // ground
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d'), rr = rng(4);
    gg.fillStyle = '#d8d8d8'; gg.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) { const v = 150 + Math.floor(rr() * 105); gg.fillStyle = `rgba(${v},${v},${v},${0.18 + rr() * 0.25})`; gg.beginPath(); gg.ellipse(rr() * 128, rr() * 128, 2 + rr() * 8, 1 + rr() * 4, rr() * 3, 0, 7); gg.fill(); }
    this.groundTex = new THREE.CanvasTexture(gc); this.groundTex.wrapS = this.groundTex.wrapT = THREE.RepeatWrapping; this.groundTex.repeat.set(24, 56); this.groundTex.colorSpace = THREE.SRGBColorSpace;
    this.ground = mesh(new THREE.PlaneGeometry(420, 700), new THREE.MeshToonMaterial({ color: 0x3f4a3a, map: this.groundTex, gradientMap: null }), 0, 0, 200); this.ground.rotation.x = -Math.PI / 2; scene.add(this.ground);
    // distant ridges
    this.ridges = [];
    for (const [z, h, seed] of [[430, 70, 1], [370, 45, 2]]) {
      const s = new THREE.Shape(), r = rng(seed * 77); s.moveTo(-700, -5);
      for (let x = -700; x <= 700; x += 38) s.lineTo(x, h * (0.35 + 0.65 * Math.abs(Math.sin(x * 0.012 + seed) * 0.6 + r() * 0.5)));
      s.lineTo(700, -5); const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: 0x4a2f56 })); m.position.set(0, 0, z); m.rotation.y = Math.PI; scene.add(m); this.ridges.push(m);
    }
    // track
    const ballast = box(0x4a4038, 0, 0.04, 150, 2.8, 0.08, 700); scene.add(ballast);
    for (const x of [-0.72, 0.72]) scene.add(box(0xc8b090, x, 0.16, 150, 0.09, 0.1, 700));
    this.nSleep = 520; this.sleep = new THREE.InstancedMesh(G.box, toon(0x5a4030), this.nSleep); this.sleep.frustumCulled = false; scene.add(this.sleep);
    // scenery
    this.props = [];
    const tintMats = [];
    for (let k = 0; k < KINDS; k++) {
      const geo = propGeo(k);
      const mat = k === 4 ? new THREE.MeshBasicMaterial({ vertexColors: true }) : k === 5 ? new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff }) : new THREE.MeshToonMaterial({ vertexColors: true, color: 0xffffff, gradientMap: null });
      const im = new THREE.InstancedMesh(geo, mat, COUNTS[k]); im.frustumCulled = false; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNTS[k] * 3), 3); scene.add(im);
      const slots = []; const R2 = rng(100 + k);
      for (let i = 0; i < COUNTS[k]; i++) slots.push({ z0: R2() * RANGE, lap: -999, x: 0, s: 1, rot: 0, act: false, b: 0.8 });
      this.props.push({ im, slots, mat }); tintMats.push(mat);
    }
    this.tintMats = tintMats;
    this.dummy = new THREE.Object3D(); this.col = new THREE.Color();
    // train, stations, fork gantry, smoke, weather
    this.buildTrain(); this.stations = [this.makeStation(), this.makeStation()]; this.stationFor = [-1, -1];
    this.buildFork(); this.buildSmoke(); this.buildWeather();
    this.lmCache = new Map(); this.lmSlots = [{ g: null, mile: 0, key: '' }, { g: null, mile: 0, key: '' }];
    this.gate = new THREE.Group(); for (const x of [-4.6, 4.6]) this.gate.add(box(0x3a3040, x, 3.2, 0, 0.5, 6.4, 0.5));
    this.gate.add(box(0x3a3040, 0, 6.5, 0, 9.8, 0.6, 0.6));
    this.gateSign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.4), new THREE.MeshBasicMaterial({ map: signTexture(['—']), side: THREE.DoubleSide })); this.gateSign.position.set(0, 7.9, 0); this.gate.add(this.gateSign);
    const gateGlow = glowSprite(0xffd890, 6, 0.8); gateGlow.position.set(0, 6.5, 0.4); this.gate.add(gateGlow); this.gate.visible = false; this.scene.add(this.gate); this.gateKey = '';
    // palette state
    this.pal = { skyTop: new THREE.Color(), skyBot: new THREE.Color(), fog: new THREE.Color(), ground: new THREE.Color(), tint: new THREE.Color(), ridge: new THREE.Color() };
    this.from = null; this.to = null; this.palT = 1; this.skyT = 0; this.weatherType = 'clear'; this.weights = new Array(KINDS).fill(1 / KINDS); this.nextWeights = this.weights;
    this.regionId = null; this.setRegion(this.sim.region(), true);
    // controls
    const c = this.controls = new OrbitControls(this.camera, world.canvas);
    c.target.copy(this.camTarget); c.enablePan = false; c.enableDamping = true; c.dampingFactor = 0.08; c.rotateSpeed = 0.5;
    c.minDistance = 14; c.maxDistance = 46; c.minAzimuthAngle = -2.35; c.maxAzimuthAngle = -0.75; c.minPolarAngle = 0.95; c.maxPolarAngle = 1.5; c.enabled = true;
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.wheelAng = 0; this.smokeT = 0;
  }

  // ---------- train ----------
  buildTrain() {
    const t = this.train = new THREE.Group(); this.wheels = []; this.cars = [];
    const teal = 0x2f7f86, gold = 0xf2b134, dark = 0x25384a, cream = 0xffe9b8;
    const wheel = (x, z, r) => { const w = new THREE.Group(); const rim = cyl(0x22262e, 0, 0, 0, r * 2, 0.12, r * 2); rim.rotation.z = Math.PI / 2; w.add(rim); const hub = cyl(gold, 0, 0, 0, r * 0.7, 0.16, r * 0.7); hub.rotation.z = Math.PI / 2; w.add(hub); const sp = box(gold, 0, 0, 0, 0.14, r * 1.7, 0.05); sp.position.x = 0; w.add(sp); w.position.set(x, r, z); t.add(w); this.wheels.push(w); };
    // engine
    const boiler = cyl(0x2a5560, 0, 1.45, 3.4, 1.5, 3.6, 1.5); boiler.rotation.x = Math.PI / 2; t.add(boiler);
    t.add(cyl(gold, 0, 1.45, 5.15, 1.55, 0.14, 1.55)).children.at(-1).rotation.x = Math.PI / 2;
    t.add(box(dark, 0, 0.8, 3.4, 1.3, 0.5, 4.2));
    t.add(cyl(0x20252e, 0, 2.5, 4.9, 0.4, 0.9, 0.4)); t.add(cyl(gold, 0, 3.0, 4.9, 0.62, 0.14, 0.62));
    t.add(sph(gold, 0, 2.2, 3.3, 0.55, 0.45, 0.55));
    t.add(box(teal, 0, 1.75, 1.2, 1.7, 1.9, 1.7)); t.add(box(dark, 0, 2.78, 1.2, 1.95, 0.16, 2.0));
    for (const sx of [-0.86, 0.86]) t.add(box(cream, sx, 2.0, 1.2, 0.04, 0.6, 0.7, { emissive: 0xffd89a, emissiveIntensity: 0.9 }));
    const cow = cone(dark, 0, 0.5, 6.4, 1.3, 1.4, 1.0); cow.rotation.x = Math.PI / 2; t.add(cow);
    this.lamp = sph(0xfff0b0, 0, 1.5, 5.3, 0.38, 0.38, 0.38, { emissive: 0xfff0b0, emissiveIntensity: 1.4 }); t.add(this.lamp);
    const lg = glowSprite(0xffe6a0, 3.2, 0.9); lg.position.set(0, 1.5, 5.6); t.add(lg);
    const beam = cone(0xffe3a0, 0, 1.4, 12, 3.4, 11, 3.4, {}); beam.material = new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 1.3, 11.5); t.add(beam);
    for (const sx of [-0.95, 0.95]) for (const z of [1.3, 2.9, 4.4]) wheel(sx, z, z === 1.3 ? 0.48 : 0.62);
    // tender
    t.add(box(dark, 0, 1.0, -1.3, 1.7, 1.2, 2.2)); t.add(sph(0x1a1a22, 0, 1.7, -1.3, 1.5, 0.7, 1.9));
    for (let i = 0; i < 5; i++) t.add(sph(0xff8a3a, (i - 2) * 0.28, 1.95, -1.3 + (i % 2) * 0.4, 0.2, 0.2, 0.2, { emissive: 0xff6a20, emissiveIntensity: 1.2 }));
    for (const sx of [-0.95, 0.95]) { wheel(sx, -0.6, 0.45); wheel(sx, -2.0, 0.45); }
    // carriages
    for (let i = 0; i < 3; i++) {
      const z = -4.7 - i * 3.5, g = new THREE.Group(); g.position.z = z;
      g.add(box(teal, 0, 1.55, 0, 1.95, 1.7, 3.1)); g.add(box(gold, 0, 0.78, 0, 2.0, 0.14, 3.15)); g.add(box(gold, 0, 2.43, 0, 2.0, 0.1, 3.15));
      const roof = cyl(dark, 0, 2.5, 0, 2.0, 3.15, 2.0); roof.rotation.x = Math.PI / 2; roof.scale.set(1.0, 3.15, 0.35); g.add(roof);
      for (const sx of [-0.99, 0.99]) for (const wz of [-0.95, 0, 0.95]) g.add(box(cream, sx, 1.65, wz, 0.04, 0.7, 0.55, { emissive: 0xffd89a, emissiveIntensity: 1.0 }));
      for (const sx of [-0.95, 0.95]) for (const wz of [-1.0, 1.0]) { const w = new THREE.Group(); const rim = cyl(0x22262e, 0, 0, 0, 0.7, 0.1, 0.7); rim.rotation.z = Math.PI / 2; w.add(rim); w.add(box(gold, 0, 0, 0, 0.12, 0.55, 0.05)); w.position.set(sx, 0.36, wz); g.add(w); this.wheels.push(w); }
      t.add(g); this.cars.push(g);
    }
    const flag = box(gold, 0, 3.0, -14.6, 0.04, 0.4, 0.6); flag.position.set(0, 3.1, -14.7); t.add(flag); t.add(cyl(0x20252e, 0, 2.8, -14.4, 0.05, 0.9, 0.05));
    // couplings
    this.train.position.set(0, 0, 0); this.scene.add(t);
    t.position.z = 2.5; // centre of the whole train near the origin
  }
  buildSmoke() {
    this.nSmoke = 26; this.smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshBasicMaterial({ color: 0xe8e0e8, transparent: true, opacity: 0.55, depthWrite: false }), this.nSmoke);
    this.smoke.frustumCulled = false; this.scene.add(this.smoke); this.smokeAge = Array.from({ length: this.nSmoke }, (_, i) => i / this.nSmoke);
  }
  buildWeather() {
    this.nW = 420; const pos = new Float32Array(this.nW * 3), R = rng(21);
    this.wSeed = []; for (let i = 0; i < this.nW; i++) this.wSeed.push([R(), R(), R(), R()]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.wx = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, color: 0xcfe6ff, map: glowTexture(), transparent: true, depthWrite: false, opacity: 0.8 })); this.wx.frustumCulled = false; this.scene.add(this.wx);
  }

  // ---------- stations and forks ----------
  makeStation() {
    const g = new THREE.Group(); g.visible = false;
    g.add(box(0x8a7a6a, -3.6, 0.2, 0, 3.0, 0.4, 16));
    g.add(box(0xe0cfa8, -3.6, 0.42, 0, 3.0, 0.04, 16));
    g.add(box(0xd8c4a0, -7.8, 1.4, 0, 3.2, 2.8, 5.4)); g.add(box(0x7a3a3a, -7.8, 3.15, 0, 3.8, 0.7, 6.0));
    for (const wz of [-1.5, 0, 1.5]) g.add(box(0xffd89a, -6.18, 1.7, wz, 0.04, 0.8, 0.6, { emissive: 0xffd89a, emissiveIntensity: 1.0 }));
    g.add(box(0x6a3a1a, -6.18, 0.9, 2.1, 0.04, 1.3, 0.7));
    for (const z of [-5.5, 5.5]) { g.add(cyl(0x2a2030, -3.0, 1.6, z, 0.12, 2.4, 0.12)); const b = sph(0xfff0b0, -3.0, 3.0, z, 0.4, 0.4, 0.4, { emissive: 0xfff0b0, emissiveIntensity: 1.5 }); g.add(b); const gl = glowSprite(0xffd890, 3.0, 0.8); gl.position.set(-3.0, 3.0, z); g.add(gl); }
    for (const z of [-3, 3]) { g.add(cyl(0x4a3222, -2.9, 0.9, z, 0.1, 1.0, 0.1)); }
    g.add(box(0x4a3222, -2.9, 1.5, -3, 0.12, 1.5, 0.12)); g.add(box(0x4a3222, -2.9, 1.5, 3, 0.12, 1.5, 0.12));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.0), new THREE.MeshBasicMaterial({ map: signTexture(['—']) })); sign.position.set(-2.8, 3.3, 0); sign.rotation.y = Math.PI / 2; g.add(sign); g.userData.sign = sign;
    g.add(box(0x4a3222, -2.9, 2.2, -2.6, 0.1, 2.4, 0.1)); g.add(box(0x4a3222, -2.9, 2.2, 2.6, 0.1, 2.4, 0.1));
    g.userData.fig = null; g.userData.mile = 0; g.userData.idx = -1;
    this.scene.add(g); return g;
  }
  setStation(slot, idx, mile, name, figSeed) {
    const g = this.stations[slot]; g.userData.mile = mile; g.userData.idx = idx; g.visible = true;
    const sign = g.userData.sign; sign.material.map.dispose(); sign.material.map = signTexture([name, 'Marigold Line']); sign.material.needsUpdate = true;
    if (g.userData.fig) { g.remove(g.userData.fig); g.userData.fig = null; }
    if (figSeed != null) { const f = makeFigure(figSeed); f.position.set(-2.6, 0.4, 1.4); f.scale.setScalar(1.35); f.rotation.y = Math.PI / 2; g.add(f); g.userData.fig = f; }
  }
  buildFork() {
    const g = this.fork = new THREE.Group(); g.visible = false;
    for (const x of [-4.2, 4.2]) g.add(box(0x3a3040, x, 3.0, 0, 0.3, 6.0, 0.3));
    g.add(box(0x3a3040, 0, 6.0, 0, 9.0, 0.35, 0.35));
    this.forkBoards = [];
    for (const side of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.6), new THREE.MeshBasicMaterial({ map: signTexture(['?']), side: THREE.DoubleSide })); b.position.set(side * 2.2, 4.6, 0); b.rotation.y = Math.PI; g.add(b);
      const lamp = glowSprite(0xff6a4a, 2.4, 0.9); lamp.position.set(side * 2.2, 5.7, 0); g.add(lamp);
      this.forkBoards.push({ board: b, lamp }); }
    this.scene.add(g);
  }
  setForkSigns(info) {
    [info.L, info.R].forEach((r, i) => { const b = this.forkBoards[i === 0 ? 0 : 1].board; b.material.map.dispose(); b.material.map = signTexture([r.name, r.hint], 256, 112); b.material.needsUpdate = true; });
  }

  // ---------- region / palette ----------
  setRegion(reg, instant) {
    this.regionId = reg.id; this.region = reg;
    const p = PALETTES[reg.pal];
    this.to = { skyTop: new THREE.Color(p.sky[0]), skyBot: new THREE.Color(p.sky[1]), fog: new THREE.Color(p.fog), ground: new THREE.Color(p.ground), tint: new THREE.Color(p.tint), ridge: new THREE.Color(p.ridge) };
    this.from = {}; for (const k in this.to) this.from[k] = this.pal[k].clone();
    this.palT = instant ? 1 : 0; this.fromW = this.weights.slice(); this.toW = reg.weights; this.setWeather(reg.weather);
    if (instant) { for (const k in this.to) this.pal[k].copy(this.to[k]); this.weights = reg.weights.slice(); this.applyPalette(true); }
  }
  setWeather(t) {
    this.weatherType = t; const m = this.wx.material;
    m.color.set(t === 'rain' ? 0xa8c8ff : t === 'snow' ? 0xffffff : t === 'glow' ? 0xffe8a0 : 0xffffff); m.size = t === 'rain' ? 0.11 : t === 'snow' ? 0.22 : 0.3; m.opacity = t === 'clear' ? 0 : t === 'glow' ? 0.9 : 0.75;
    m.blending = t === 'glow' ? THREE.AdditiveBlending : THREE.NormalBlending; m.needsUpdate = true;
  }
  applyPalette(force) {
    const p = this.pal;
    this.scene.fog.color.copy(p.fog).lerp(p.skyBot, 0.6); this.ground.material.color.copy(p.ground).lerp(p.tint, 0.16).multiplyScalar(1.5);
    this.ridges.forEach((r, i) => r.material.color.copy(p.ridge).multiplyScalar(1.25).lerp(p.skyBot, 0.18 + i * 0.22));
    this.tintMats.forEach((m, k) => { if (k !== 4) { m.color.copy(p.tint).lerp(new THREE.Color(0xffffff), k === 5 ? 0.3 : 0.1); if (k === 5) m.color.multiplyScalar(1.5); else if (k === 3) m.color.multiplyScalar(0.9); else m.color.multiplyScalar(0.75); } });
    this.hemi.color.copy(p.skyBot).lerp(new THREE.Color(0xffffff), 0.3); this.hemi.groundColor.copy(p.ground).multiplyScalar(0.8);
    this.sun.color.copy(p.skyBot).lerp(new THREE.Color(0xffd8b0), 0.5); this.sunGlow.material.color.copy(p.skyBot).lerp(new THREE.Color(0xffd8a0), 0.4);
    const g = this.skyCanvas.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#' + p.skyTop.getHexString()); grad.addColorStop(0.62, '#' + p.skyTop.clone().lerp(p.skyBot, 0.55).getHexString()); grad.addColorStop(0.86, '#' + p.skyBot.getHexString()); grad.addColorStop(1, '#' + p.fog.getHexString());
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256); this.skyTex.needsUpdate = true;
  }

  // ---------- frame ----------
  update(dt, time) {
    const sim = this.sim, s = sim.s, L = s.line, miles = s.miles, scroll = miles * U;
    if (L.region !== this.regionId) this.setRegion(sim.region(), false);
    if (this.palT < 1) {
      this.palT = Math.min(1, this.palT + dt / 7); const k = this.palT * this.palT * (3 - 2 * this.palT);
      for (const key in this.to) this.pal[key].copy(this.from[key]).lerp(this.to[key], k);
      this.weights = this.fromW.map((w, i) => lerp(w, this.toW[i], k));
      this.skyT += dt; if (this.skyT > 0.15 || this.palT >= 1) { this.skyT = 0; this.applyPalette(); }
    }
    // ground / sleepers
    this.groundTex.offset.y = -(scroll / 12.5) % 1;
    const d = this.dummy, sp = 0.95;
    for (let i = 0; i < this.nSleep; i++) { d.position.set(0, 0.1, i * sp - (scroll % sp) - 60); d.scale.set(2.3, 0.1, 0.3); d.rotation.set(0, 0, 0); d.updateMatrix(); this.sleep.setMatrixAt(i, d.matrix); }
    this.sleep.instanceMatrix.needsUpdate = true;
    // scenery
    for (let k = 0; k < KINDS; k++) {
      const { im, slots } = this.props[k], R = rng(1000 + k);
      for (let i = 0; i < slots.length; i++) {
        const sl = slots[i], t = sl.z0 - scroll, lap = Math.floor(t / RANGE);
        if (lap !== sl.lap) {
          sl.lap = lap; const r = rng(hash(`${k}:${i}:${lap}`));
          sl.x = (r() < 0.5 ? -1 : 1) * (5.5 + Math.pow(r(), 2.0) * 52); sl.s = 0.8 + r() * 0.9; sl.rot = r() * 6.28; sl.b = 0.65 + r() * 0.5;
          sl.act = r() < clamp(this.weights[k] * KINDS * 0.5, 0.04, 0.95); if (k === 4 && Math.abs(sl.x) > 14) sl.act = false;
          if (k === 4) sl.x = (sl.x < 0 ? -1 : 1) * (4.2 + r() * 2.5);
          this.col.setRGB(sl.b, sl.b, sl.b); im.setColorAt(i, this.col);
        }
        const z = (((t % RANGE) + RANGE) % RANGE) - BACK;
        d.position.set(sl.x, 0, z); d.rotation.set(0, sl.rot, 0); const sc = sl.act ? sl.s : 0.0001; d.scale.set(sc, sc, sc); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    // train
    const sU = sim.speed * U;
    this.wheelAng += (sU * dt) / 0.55; for (const w of this.wheels) w.rotation.x = this.wheelAng;
    const sway = Math.sin(time * 4.3) * 0.012 * clamp(sU / 8, 0.2, 1.4); this.train.rotation.z = sway; this.train.position.y = Math.abs(Math.sin(time * 9)) * 0.01 * clamp(sU / 8, 0.2, 1.4);
    this.trainLight.intensity = 12 + Math.sin(time * 3) * 1.5;
    // smoke
    for (let i = 0; i < this.nSmoke; i++) {
      this.smokeAge[i] = (this.smokeAge[i] + dt * 0.4) % 1; const a = this.smokeAge[i];
      d.position.set(Math.sin(i * 2.3) * 0.2 * a, 3.6 + a * 5.0, 7.4 - a * (3 + sU * 0.5) + Math.cos(i * 1.7) * 0.3); const sc = 0.4 + a * 2.1; d.scale.setScalar(sc * (a > 0.85 ? (1 - a) / 0.15 : 1)); d.rotation.set(0, 0, 0); d.updateMatrix(); this.smoke.setMatrixAt(i, d.matrix);
    }
    this.smoke.instanceMatrix.needsUpdate = true; this.smoke.material.opacity = 0.5;
    // stations
    const next = L.nextStop, idx = L.stopIndex;
    if (!this.stations.some((g) => g.userData.idx === idx)) {
      const slot = this.stations[0].userData.mile <= this.stations[1].userData.mile ? 0 : 1;
      const cand = L.pending ? L.pending.idx : s.metCount;
      this.setStation(slot, idx, next, stopName(L.seed, idx), cand * 5 + 3);
    }
    for (const g of this.stations) {
      if (!g.visible) continue; const z = (g.userData.mile - miles) * U;
      if (z < -140) { g.visible = false; g.userData.idx = -99; continue; } g.position.set(0, 0, z - 0.0);
      if (g.userData.fig) g.userData.fig.position.y = 0.4 + Math.abs(Math.sin(time * 2 + g.userData.idx)) * 0.04;
    }
    // fork gantry
    const info = sim.forkInfo(), fz = (info.end - 4 - miles) * U;
    const showFork = fz > -90 && fz < 260 && miles > info.at - 6;
    this.fork.visible = showFork;
    if (showFork) {
      this.fork.position.set(0, 0, fz);
      if (this.forkSignFor !== L.region) { this.forkSignFor = L.region; this.setForkSigns(info); }
      this.forkBoards.forEach((b, i) => { const side = i === 0 ? 'L' : 'R', chosen = L.forkChosen; b.lamp.material.color.setHex(chosen === side ? 0x6aff9a : chosen ? 0x553030 : 0xffb04a); b.lamp.material.opacity = chosen === side ? 1 : chosen ? 0.35 : 0.6 + 0.4 * Math.sin(time * 4 + i); });
    }
    // landmarks that the postcards describe
    const wantMile = L.nextLandmark, lmInfo = landmarkFor(L.seed, wantMile), wantKey = `${L.seed}:${Math.floor(wantMile * 10)}`;
    if (!this.lmSlots.some((sl) => sl.key === wantKey)) {
      const slot = this.lmSlots[0].mile <= this.lmSlots[1].mile ? this.lmSlots[0] : this.lmSlots[1];
      if (slot.g) slot.g.visible = false;
      if (!this.lmCache.has(lmInfo.idx)) { const g = makeLandmark(lmInfo.idx); if (g) this.scene.add(g); this.lmCache.set(lmInfo.idx, g); }
      slot.g = this.lmCache.get(lmInfo.idx); slot.mile = wantMile; slot.key = wantKey; slot.side = lmInfo.side;
    }
    for (const sl of this.lmSlots) {
      if (!sl.g) continue; const z = (sl.mile - miles) * U;
      if (z < -160 || z > 420) { sl.g.visible = false; continue; }
      sl.g.visible = true; sl.g.position.set(12.5, 0, z); sl.g.rotation.y = -Math.PI / 2;
      if (sl.g.userData.spin) sl.g.userData.spin.rotation.z += dt * 0.5 * sl.g.userData.spinDir;
    }
    // the gate where one region becomes the next
    const gz = (info.end - miles) * U;
    this.gate.visible = gz > -80 && gz < 330 && L.forkAnnounced;
    if (this.gate.visible) {
      this.gate.position.set(0, 0, gz);
      const side = L.forkChosen || autoSide(L.seed, L.region), nr = regionOf(L.region + side), gk = nr.id;
      if (gk !== this.gateKey) { this.gateKey = gk; this.gateSign.material.map.dispose(); this.gateSign.material.map = signTexture([nr.name, 'Now entering'], 320, 110); this.gateSign.material.needsUpdate = true; }
    }
    // weather around the train
    const wt = this.weatherType; if (wt !== 'clear') {
      const pos = this.wx.geometry.attributes.position;
      for (let i = 0; i < this.nW; i++) {
        const sd = this.wSeed[i]; let x = (sd[0] - 0.5) * 60, z = (sd[1]) * 80 - 25, y;
        if (wt === 'rain') { y = 20 - (((time * 18 + sd[2] * 20) % 20)); z -= (y * 0.1); }
        else if (wt === 'snow') { y = 18 - (((time * 1.6 + sd[2] * 18) % 18)); x += Math.sin(time * 0.8 + sd[3] * 6) * 1.2; }
        else { y = 1 + sd[2] * 6 + Math.sin(time * 0.5 + sd[3] * 6) * 0.7; x += Math.sin(time * 0.3 + sd[3] * 9) * 1.5; z += Math.cos(time * 0.4 + sd[2] * 9) * 1.5; }
        pos.setXYZ(i, x, y, z - ((scroll * (wt === 'glow' ? 0.0 : 0)) % 1));
      }
      pos.needsUpdate = true;
    }
    this.stars.material.opacity = clamp(1 - this.pal.skyTop.getHSL({}).l * 3.5, 0.05, 0.9);
    this.controls.update();
  }
  resize(aspect) {
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
  }
  recentre(aspect) {
    const dist = clamp(28 / Math.min(1, aspect * 1.25), 24, 44);
    const dir = new THREE.Vector3(-0.55, 0.28, -0.78).normalize();
    this.camera.position.copy(this.camTarget).addScaledVector(dir, dist); this.controls.update();
  }
}
