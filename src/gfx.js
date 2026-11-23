// Shared graphics helpers for both views.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LOOK } from './look.js';

let _grad = null, _glow = null;
export function toonGradient() {
  if (_grad) return _grad;
  const d = new Uint8Array(LOOK.steps.flatMap((v) => [v, v, v, 255]));
  _grad = new THREE.DataTexture(d, LOOK.steps.length, 1, THREE.RGBAFormat); _grad.minFilter = _grad.magFilter = THREE.NearestFilter; _grad.needsUpdate = true; return _grad;
}
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c); _glow.colorSpace = THREE.SRGBColorSpace; return _glow;
}
const _mats = new Map();
export function toon(color, extra) {
  const k = color + (extra ? JSON.stringify(extra) : '');
  let m = _mats.get(k);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...(extra || {}) }); _mats.set(k, m); }
  return m;
}
export function basic(color, extra) {
  const k = 'b' + color + (extra ? JSON.stringify(extra) : '');
  let m = _mats.get(k);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, ...(extra || {}) }); _mats.set(k, m); }
  return m;
}
export function glowSprite(color, scale, opacity = 0.7) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(scale); return s;
}
export function gearGeometry(r = 0.3, teeth = 9, depth = 0.08) {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 4; i++) { const a = (i / (teeth * 4)) * Math.PI * 2, hi = Math.floor((i + 1) / 2) % 2 === 0, rr = hi ? r * 1.22 : r; s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  s.closePath(); const h = new THREE.Path(); h.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
}
export function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = LOOK.shadows; return m;
}
const G = { box: LOOK.rounded ? new RoundedBoxGeometry(1, 1, 1, 3, 0.16) : new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14), cone: new THREE.ConeGeometry(0.5, 1, 10), sph: new THREE.SphereGeometry(0.5, 12, 9), cap: new THREE.CapsuleGeometry(0.5, 1, 4, 10), tor: new THREE.TorusGeometry(0.5, 0.15, 6, 16) };
export { G };
export const box = (c, x, y, z, w, h, d, extra) => mesh(G.box, toon(c, extra), x, y, z, w, h, d);
export const cyl = (c, x, y, z, w, h, d, extra) => mesh(G.cyl, toon(c, extra), x, y, z, w, h, d);
export const sph = (c, x, y, z, w, h, d, extra) => mesh(G.sph, toon(c, extra), x, y, z, w, h == null ? w : h, d == null ? w : d);
export const cone = (c, x, y, z, w, h, d, extra) => mesh(G.cone, toon(c, extra), x, y, z, w, h, d);

// A small passenger. About 1 unit tall at scale 1.
export function makeFigure(seed) {
  const hue = (seed * 47 % 360) / 360, g = new THREE.Group();
  const body = mesh(G.cap, toon(new THREE.Color().setHSL(hue, 0.5, 0.52)), 0, 0.42, 0, 0.3, 0.3, 0.26); g.add(body);
  const head = sph(0xe0b98a, 0, 0.82, 0, 0.3, 0.3, 0.3); g.add(head);
  for (const x of [-0.07, 0.07]) g.add(sph(0x1c1208, x, 0.85, 0.13, 0.05, 0.05, 0.05));
  const hatType = seed % 4;
  const hatC = new THREE.Color().setHSL((hue + 0.5) % 1, 0.55, 0.45);
  if (hatType === 0) g.add(cone(hatC, 0, 1.04, 0, 0.3, 0.3, 0.3));
  else if (hatType === 1) { g.add(cyl(hatC, 0, 1.02, 0, 0.34, 0.08, 0.34)); g.add(cyl(hatC, 0, 1.1, 0, 0.2, 0.14, 0.2)); }
  else if (hatType === 2) g.add(sph(hatC, 0, 1.0, 0, 0.34, 0.2, 0.34));
  else g.add(cyl(hatC, 0, 1.0, 0, 0.3, 0.12, 0.3));
  const scarf = mesh(G.tor, toon(new THREE.Color().setHSL((hue + 0.15) % 1, 0.7, 0.55)), 0, 0.66, 0, 0.33, 0.33, 0.33); scarf.rotation.x = Math.PI / 2; g.add(scarf);
  g.userData = { body, head };
  return g;
}

export function signTexture(lines, w = 256, h = 96, bg = '#2a2036', fg = '#ffe2a8', sub = '#d9c6e8') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d9a840'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = fg; g.font = `700 ${lines.length > 1 ? 30 : 36}px Georgia, serif`; g.fillText(lines[0], w / 2, lines.length > 1 ? h * 0.36 : h / 2, w - 20);
  if (lines[1]) { g.fillStyle = sub; g.font = '500 20px system-ui, sans-serif'; g.fillText(lines[1], w / 2, h * 0.72, w - 20); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const lerp = (a, b, t) => a + (b - a) * t;
export function lerpColor(out, a, b, t) { out.setHex(a).lerp(new THREE.Color(b), t); return out; }
