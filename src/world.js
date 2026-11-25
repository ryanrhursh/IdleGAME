// Owns the renderer and switches between the Line (outside) and the Inside.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineView } from './line.js';
import { InsideView } from './inside.js';
import { clamp } from './logic.js';
import { LOOK } from './look.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, sat: { value: 1 }, contrast: { value: 1 }, tint: { value: new THREE.Vector3(1, 1, 1) }, vig: { value: 0 }, grain: { value: 0 }, tilt: { value: 0 }, edge: { value: 0 }, paper: { value: 0 }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float sat, contrast, vig, grain, tilt, edge, paper, time; uniform vec3 tint; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1.,0.)), f.x), mix(h(i+vec2(0.,1.)), h(i+vec2(1.,1.)), f.x), f.y); }
  float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main(){
    vec2 uv = vUv; vec2 px = 1.0 / res; vec3 c;
    if (tilt > 0.0) { float d = abs(uv.y - 0.5); float b = smoothstep(0.1, 0.55, d) * tilt * 5.0; vec3 acc = vec3(0.0); float ws = 0.0;
      for (int i = -4; i <= 4; i++) { for (int j = -2; j <= 2; j++) { vec2 o = vec2(float(i), float(j) * 1.5) * px * b * 0.55; float w = 1.0 - length(vec2(float(i) / 4.0, float(j) / 2.0)) * 0.45; acc += texture2D(tDiffuse, uv + o).rgb * w; ws += w; } }
      c = acc / ws; } else { c = texture2D(tDiffuse, uv).rgb; }
    if (edge > 0.0) { vec2 e = px * 1.3;
      float a = lum(texture2D(tDiffuse, uv + vec2(-e.x, -e.y)).rgb), b2 = lum(texture2D(tDiffuse, uv + vec2(0., -e.y)).rgb), c2 = lum(texture2D(tDiffuse, uv + vec2(e.x, -e.y)).rgb);
      float d2 = lum(texture2D(tDiffuse, uv + vec2(-e.x, 0.)).rgb), f = lum(texture2D(tDiffuse, uv + vec2(e.x, 0.)).rgb);
      float g = lum(texture2D(tDiffuse, uv + vec2(-e.x, e.y)).rgb), h2 = lum(texture2D(tDiffuse, uv + vec2(0., e.y)).rgb), i2 = lum(texture2D(tDiffuse, uv + vec2(e.x, e.y)).rgb);
      float gx = (c2 + 2.0*f + i2) - (a + 2.0*d2 + g), gy = (g + 2.0*h2 + i2) - (a + 2.0*b2 + c2);
      float m = smoothstep(0.12, 0.45, length(vec2(gx, gy))); c = mix(c, c * vec3(0.32, 0.22, 0.26), m * edge); }
    if (c.r != c.r || c.g != c.g || c.b != c.b) c = vec3(0.0);   // never let a stray bad pixel through
    c = clamp(c, 0.0, 8.0);
    float l = lum(c); c = mix(vec3(l), c, sat); c = (c - 0.5) * contrast + 0.5; c *= tint;
    float v = 1.0 - smoothstep(0.2, 0.95, distance(uv, vec2(0.5))); c *= mix(1.0, v, vig);
    c += (h(uv * res + time) - 0.5) * grain;
    if (paper > 0.0) { float n = vn(uv * res * 0.32) * 0.55 + vn(uv * res * 1.3) * 0.45; c *= 1.0 - paper * 0.28 * (0.5 - n) * -2.0 * 0.5; c = mix(c, c * vec3(1.04, 0.99, 0.91), paper * 0.5); }
    gl_FragColor = vec4(c, 1.0);
  }`,
};

export class World {
  constructor(canvas, sim) {
    this.sim = sim; this.canvas = canvas;
    const mobile = this.mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    this.pr = Math.min(devicePixelRatio || 1, 2); r.setPixelRatio(this.pr);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = LOOK.exposure;
    if (LOOK.shadows) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
    this.line = new LineView(this); this.inside = new InsideView(this);
    this.view = 'line'; this.tmp = new THREE.Vector3();
    // windows: a small live picture of the Line for each side of the train
    this.winRT = [0, 1].map(() => new THREE.WebGLRenderTarget(256, 160)); this.winCam = [0, 1].map(() => new THREE.PerspectiveCamera(60, 1.6, 0.5, 700));
    this.winCam[0].position.set(0, 1.4, -1); this.winCam[0].lookAt(26, 0.9, 12); this.winCam[1].position.set(0, 1.4, -1); this.winCam[1].lookAt(-26, 0.9, 12);
    this.inside.setWindowTextures(this.winRT[0].texture, this.winRT[1].texture); this.winTick = 0;
    this.useBloom = true; this.quality = 'high'; this.frameT = [];
    const comp = this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: mobile ? 0 : 4 }));
    this.pass = new RenderPass(this.line.scene, this.line.camera); comp.addPass(this.pass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), LOOK.bloom[0], LOOK.bloom[1], LOOK.bloom[2]); comp.addPass(this.bloom); comp.addPass(new OutputPass());
    this.grade = null;
    if (LOOK.grade) { const g = LOOK.grade; this.grade = new ShaderPass(GradeShader); const u = this.grade.uniforms; u.sat.value = g.sat; u.contrast.value = g.contrast; u.tint.value.set(...g.tint); u.vig.value = g.vig; u.grain.value = g.grain; u.tilt.value = g.tilt; u.edge.value = g.edge; u.paper.value = g.paper; comp.addPass(this.grade); }
    this.resize(); this.line.recentre(this.aspect); this.inside.fit(this.aspect);
    addEventListener('resize', () => { this.resize(); });
    this.setView('line');
  }
  get cam() { return this.view === 'line' ? this.line.camera : this.view === 'journey' ? this.inside.jcam : this.inside.camera; }
  setView(v) {
    this.view = v;
    const lv = v === 'line', jv = v === 'journey';
    this.line.controls.enabled = lv; this.inside.controls.enabled = v === 'inside';
    this.inside.setJourney(jv);
    this.pass.scene = lv ? this.line.scene : this.inside.scene; this.pass.camera = lv ? this.line.camera : jv ? this.inside.jcam : this.inside.camera;
    this.bloom.strength = LOOK.bloom[0] * (v === 'inside' ? 0.9 : 1);
    if (this.grade) this.grade.uniforms.tilt.value = v === 'inside' ? (LOOK.grade.tilt || 0) : 0;
    if (v === 'inside') this.inside.fit(this.aspect);
  }
  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight; this.aspect = w / h;
    this.renderer.setPixelRatio(this.pr); this.renderer.setSize(w, h, false); this.composer.setPixelRatio(this.pr); this.composer.setSize(w, h);
    this.line.resize(this.aspect); this.inside.resize(this.aspect); this.bloom.resolution.set(w / 2, h / 2);
    if (this.grade) this.grade.uniforms.res.value.set(w * this.pr, h * this.pr);
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
    if (this.grade) this.grade.uniforms.time.value = time % 10;
    if (this.view === 'line') this.line.update(dt, time); else this.inside.update(dt, time);
    if (this.view === 'journey') {
      this.line.update(dt, time);                      // keep the scenery moving past the windows
      const every = this.mobile ? 3 : 2; this.winTick = (this.winTick + 1) % (every * 2);
      if (this.winTick % every === 0) {
        const k = this.winTick / every, views = this.inside.windowViews;
        if (views.has(k === 0 ? 'A' : 'B')) {
          const r = this.renderer; this.line.train.visible = false; r.setRenderTarget(this.winRT[k]); r.render(this.line.scene, this.winCam[k]); r.setRenderTarget(null); this.line.train.visible = true;
        }
      }
    }
    if (this.useBloom) this.composer.render(); else this.renderer.render(this.pass.scene, this.pass.camera);
    this.frameT.push(dt); if (this.frameT.length > 150) { const a = this.frameT.reduce((x, y) => x + y, 0) / this.frameT.length; this.frameT.length = 0; if (a > 0.036) this.degrade(); }
  }
}
