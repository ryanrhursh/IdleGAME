// Owns the renderer and switches between the Line (outside) and the Inside.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineView } from './line.js';
import { InsideView } from './inside.js';
import { clamp } from './logic.js';

export class World {
  constructor(canvas, sim) {
    this.sim = sim; this.canvas = canvas;
    const mobile = this.mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    this.pr = Math.min(devicePixelRatio || 1, 2); r.setPixelRatio(this.pr);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.line = new LineView(this); this.inside = new InsideView(this);
    this.view = 'line'; this.tmp = new THREE.Vector3();
    this.useBloom = true; this.quality = 'high'; this.frameT = [];
    const comp = this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 }));
    this.pass = new RenderPass(this.line.scene, this.line.camera); comp.addPass(this.pass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.55, 0.7); comp.addPass(this.bloom); comp.addPass(new OutputPass());
    this.resize(); this.line.recentre(this.aspect); this.inside.fit(this.aspect);
    addEventListener('resize', () => { this.resize(); });
    this.setView('line');
  }
  get cam() { return this.view === 'line' ? this.line.camera : this.inside.camera; }
  setView(v) {
    this.view = v;
    const lv = v === 'line';
    this.line.controls.enabled = lv; this.inside.controls.enabled = !lv;
    this.pass.scene = lv ? this.line.scene : this.inside.scene; this.pass.camera = lv ? this.line.camera : this.inside.camera;
    this.bloom.strength = lv ? 0.45 : 0.4;
    if (!lv) this.inside.fit(this.aspect);
  }
  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight; this.aspect = w / h;
    this.renderer.setPixelRatio(this.pr); this.renderer.setSize(w, h, false); this.composer.setPixelRatio(this.pr); this.composer.setSize(w, h);
    this.line.resize(this.aspect); this.inside.resize(this.aspect); this.bloom.resolution.set(w / 2, h / 2);
    this.line.recentre(this.aspect); if (this.view === 'inside') this.inside.fit(this.aspect);
  }
  project(x, y, z, out = {}) {
    const v = this.tmp.set(x, y, z).project(this.cam), r = this.canvas.getBoundingClientRect();
    out.x = (v.x * 0.5 + 0.5) * r.width + r.left; out.y = (-v.y * 0.5 + 0.5) * r.height + r.top; out.ok = v.z < 1 && v.z > -1; return out;
  }
  setGfx(mode) {
    this.gfxMode = mode;
    if (mode === 'low') { this.quality = 'low'; this.useBloom = false; this.pr = Math.min(devicePixelRatio || 1, 1.25); this.resize(); }
    else { this.quality = 'high'; this.useBloom = true; this.pr = Math.min(devicePixelRatio || 1, 2); this.frameT.length = 0; this.resize(); }
  }
  degrade() {
    if (this.gfxMode === 'high' || this.quality === 'low') return; this.quality = 'low'; this.useBloom = false; this.pr = Math.min(this.pr, 1.25); this.resize(); }
  frame(dt, time) {
    if (this.view === 'line') this.line.update(dt, time); else this.inside.update(dt, time);
    if (this.useBloom) this.composer.render(); else this.renderer.render(this.pass.scene, this.pass.camera);
    this.frameT.push(dt); if (this.frameT.length > 150) { const a = this.frameT.reduce((x, y) => x + y, 0) / this.frameT.length; this.frameT.length = 0; if (a > 0.036) this.degrade(); }
  }
}
