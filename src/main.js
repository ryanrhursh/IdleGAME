import { Sim, newState, loadState, fmt, clamp, seasonAt } from './logic.js';
import { World } from './world.js';
import { Audio } from './audio.js';
import { BUILD, FOLK, LORE, BOONS, PALETTES, SEASONS } from './data.js';

const SAVE_KEY = 'emberwood.save.v1';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// ---------- load ----------
let state = null, fresh = false;
try { state = loadState(localStorage.getItem(SAVE_KEY)); } catch (e) { state = null; }
if (!state) { state = newState(); fresh = true; }
const audio = new Audio(); audio.enabled = state.sound !== false;

const hooks = {};
const sim = new Sim(state, hooks);
const world = new World($('gl'), sim);
window.__game = { sim, world, state };
hooks.structure = () => { world.treeDirty = true; world.fit(false); if (ui) ui.sheetDirty = true; };
world.treeDirty = true;

function save() { try { state.last = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage may be unavailable */ } }
addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);
setInterval(save, 10000);

// ---------- floating text and bubbles ----------
const labels = $('labels');
let floats = 0;
function floatText(text, x, y, cls = '') {
  if (floats > 14) return; floats++;
  const el = document.createElement('div'); el.className = 'float ' + cls; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px';
  el.addEventListener('animationend', () => { el.remove(); floats--; }); labels.appendChild(el);
}
function floatAt(x, y, z, text, cls) { const p = world.project(x, y, z); if (p.ok) floatText(text, p.x + (Math.random() - 0.5) * 16, p.y, cls); }
const bubbles = [];
function say(w, text) {
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].w === w) { bubbles[i].el.remove(); bubbles.splice(i, 1); }
  const el = document.createElement('div'); el.className = 'bubble'; el.innerHTML = `<b>${esc(w.name)}</b>${esc(text)}`; labels.appendChild(el);
  bubbles.push({ w, el, until: performance.now() + 5200 });
}
function toast(html) {
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; $('toast').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ---------- sim hooks ----------
let lastPlip = 0;
hooks.shake = (tip) => { world.wobble.set(tip, 0.4); audio.shake(); };
hooks.deposit = (val) => {
  world.pulse = Math.min(1, world.pulse + 0.5);
  const now = performance.now(); if (now - lastPlip > 90) { lastPlip = now; audio.plip(val); }
  floatAt(0, 0.5, 0, '+' + fmt(val));
  if (state.hint === 0) setHint(1);
};
hooks.chime = (node, m) => { audio.note(node.note, 0.5); world.ringChime(node.id, 1); floatAt(node.x, node.y - 0.3, node.z, '♪ x' + (1 + sim.mods.chime).toFixed(2), 'chime'); };
hooks.mill = (node) => world.spinMill(node.id);
hooks.cog = (node) => { floatAt(node.x, node.y + 0.2, node.z, '+1 cog', 'cog'); audio.pop(); };
hooks.bark = (w, text) => say(w, text);
hooks.tale = (w, text) => { toast(`<b>${esc(w.name)}</b> opened up. A new tale in the Folk list.`); badge('bFolk', true); audio.chord(); };
hooks.lore = (e) => { if (e.id !== 'bench') { toast(`A memory stirs: <b>${esc(e.title)}</b>`); badge('bBook', true); audio.chord(); } };
hooks.hollow = () => { toast('A cottage lights up in the Hollow.'); audio.chord(); };
hooks.choice = (c) => { badge('bBook', true); queueModal(() => choiceModal(c)); };

function badge(which, on) { if (which === 'bBook') $('bookBadge').hidden = !on; else { const b = $('bFolk'); let i = b.querySelector('.badge'); if (!i) { i = document.createElement('i'); i.className = 'badge'; b.appendChild(i); } i.hidden = !on; } }

// ---------- hints ----------
const HINTS = [
  'Tap the glowing leaf to shake out sap. Drag to look around.',
  'Sap rolls down to the roots. Open <b>Shape</b>, tap a glowing bud, and grow a branch.',
  'Branches that fork bear more leaves. Try building a <b>Winder Hut</b> so someone tends them for you.',
  'Your Winders walk the branches on their own. Close the game any time; the tree keeps dripping.',
];
let hintTimer = 0;
function setHint(n) {
  if (n <= state.hint && n !== 0) return; state.hint = n; showHint();
}
function showHint() {
  const el = $('hint'); if (modeHint) return;
  if (state.hint >= 4) { el.hidden = true; return; }
  el.innerHTML = HINTS[state.hint]; el.hidden = false; el.classList.remove('action');
  clearTimeout(hintTimer); if (state.hint === 3) hintTimer = setTimeout(() => { state.hint = 4; showHint(); }, 12000);
}
let modeHint = false;
function setModeHint(html, cancel) {
  const el = $('hint'); modeHint = !!html;
  if (!html) { showHint(); return; }
  el.innerHTML = html + (cancel ? ' <button id="hintCancel">Cancel</button>' : ''); el.hidden = false; el.classList.add('action');
  if (cancel) $('hintCancel').onclick = cancel;
}

// ---------- modes and selection ----------
let mode = 'tend', selected = -1, growFrom = -1, growing = false, ui = null;
function setMode(m) {
  mode = m; world.setMode(m); $('bTend').setAttribute('aria-pressed', m === 'tend'); $('bShape').setAttribute('aria-pressed', m === 'shape');
  cancelGrow(); cancelBridge();
  if (m !== 'shape') { selected = -1; world.select(-1); }
  ui.sheetDirty = true;
}
function cancelGrow() { growFrom = -1; growing = false; world.growFrom = -1; world.hideGhost(); world.controls.enabled = true; if (!world.bridgeOK.size) setModeHint(null); }
function cancelBridge() { if (world.bridgeFrom >= 0) { world.endBridge(); setModeHint(null); } }
$('bTend').onclick = () => setMode('tend');
$('bShape').onclick = () => setMode('shape');

addEventListener('pointerdown', () => audio.resume(), { passive: true });
// ---------- input ----------
const canvas = $('gl');
let ptr = null;
canvas.addEventListener('pointerdown', (e) => {
  audio.resume();
  ptr = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, id: e.pointerId };
  if (growFrom >= 0) { growing = true; updateGhost(e); }
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptr || ptr.id !== e.pointerId) return;
  if (Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 9) ptr.moved = true;
  if (growing) updateGhost(e);
});
canvas.addEventListener('pointerup', (e) => {
  if (!ptr || ptr.id !== e.pointerId) return;
  const p = ptr; ptr = null;
  if (growing) { commitGrow(e); return; }
  if (!p.moved && performance.now() - p.t < 450) tap(e.clientX, e.clientY);
});
canvas.addEventListener('pointercancel', () => { ptr = null; if (growing) { world.hideGhost(); growing = false; } });
let ghostPv = null;
function updateGhost(e) { const hit = world.ghostPoint(e.clientX, e.clientY, growFrom); if (!hit) return; ghostPv = world.showGhost(growFrom, hit); }
function commitGrow(e) {
  growing = false; const parent = growFrom;
  if (!ghostPv) { world.hideGhost(); return; }
  const pv = ghostPv; ghostPv = null;
  if (pv.err) {
    world.hideGhost();
    toast({ short: 'Drag a little further to make a branch.', full: 'That branch is full.', close: 'Too close to another branch.', sap: `A branch that long costs <b>${fmt(pv.cost)}</b> sap.` }[pv.err]);
    return;
  }
  const res = sim.grow(parent, pv.x, pv.y, pv.z);
  world.hideGhost();
  if (typeof res === 'string') { toast(res); return; }
  audio.grow(); if (navigator.vibrate) navigator.vibrate(12);
  setHint(2); cancelGrow(); selected = res.id; world.select(selected); ui.sheetDirty = true;
}
function nearest(list, x, y, max) {
  let best = null, bd = max;
  for (const it of list) { if (!it.p.ok) continue; const d = Math.hypot(it.p.x - x, it.p.y - y); if (d < bd) { bd = d; best = it; } }
  return best;
}
function tap(x, y) {
  const ws = world.winderScale();
  const winders = sim.s.winders.map((w) => { const r = sim.rt.get(w.id); return { w, p: world.project(r.x, r.y + 0.2 * ws, r.z) }; });
  if (mode === 'shape' && world.bridgeFrom < 0) {
    const allN = sim.s.nodes.filter((n) => !n.dead).map((n) => ({ id: n.id, p: world.project(n.x, n.y, n.z) }));
    const hn = nearest(allN, x, y, 22);
    if (hn) { selected = hn.id; world.select(selected); ui.sheetDirty = true; return; }
  }
  const wh = nearest(winders, x, y, 34);
  if (wh) { winderModal(wh.w); return; }
  if (world.bridgeFrom >= 0) {
    const cand = [...world.bridgeOK].map((id) => { const n = sim.s.nodes[id]; return { id, p: world.project(n.x, n.y, n.z) }; });
    const h = nearest(cand, x, y, 40);
    if (h) {
      const res = sim.addBridge(world.bridgeFrom, h.id);
      if (res) toast(res); else { audio.grow(); cancelBridge(); ui.sheetDirty = true; }
    }
    return;
  }
  if (mode === 'tend') {
    const tips = sim.tips.map((t) => { const n = sim.s.nodes[t]; return { t, p: world.project(n.x, n.y + 0.3, n.z) }; });
    const h = nearest(tips, x, y, 46);
    if (h) {
      if (sim.shake(h.t)) { if (navigator.vibrate) navigator.vibrate(8); } else { world.wobble.set(h.t, 0.15); floatText('still filling…', h.p.x, h.p.y - 10, 'cog'); }
    }
  } else {
    const all = sim.s.nodes.filter((n) => !n.dead).map((n) => ({ id: n.id, p: world.project(n.x, n.y, n.z) }));
    const h = nearest(all, x, y, 32);
    selected = h ? h.id : -1; world.select(selected); ui.sheetDirty = true;
  }
}

// ---------- the shape sheet ----------
const sheet = $('sheet');
function costTag(c) { const ok = sim.afford(c); return `<span class="cost ${ok ? '' : 'no'}">${c.sap ? fmt(c.sap) + ' sap' : ''}${c.sap && c.cogs ? ' + ' : ''}${c.cogs ? c.cogs + ' cogs' : ''}</span>`; }
function nodeTitle(n) {
  if (n.id === 0) return 'The Roots';
  if (sim.tips.includes(n.id)) return 'Branch tip';
  if (n.id <= 3) return 'The trunk';
  return 'Branch joint';
}
let sheetSig = '';
function renderSheet(force) {
  const n = selected >= 0 ? sim.s.nodes[selected] : null;
  if (mode !== 'shape' || !n || n.dead || growFrom >= 0 || world.bridgeFrom >= 0) { sheet.hidden = true; sheetSig = ''; return; }
  const afford = [sim.growCost(1.6), ...Object.keys(BUILD).map((t) => sim.buildCost(t))].map((c) => sim.afford(c.sap !== undefined ? c : { sap: c }) ? 1 : 0).join('');
  const sig = [selected, n.b, n.route, sim.s.bridges.length, sim.alive, afford].join('|');
  if (!force && sig === sheetSig) return; sheetSig = sig; sheet.hidden = false;
  let h = `<h3>${nodeTitle(n)}<small>height ${n.y.toFixed(1)} · ${n.b ? BUILD[n.b].name : 'free'}</small></h3>`;
  if (n.id === 0) {
    h += `<div style="color:var(--muted);font-size:13px">All sap ends up here. The Hollow has <b style="color:var(--amber)">${state.hollow}</b> lit cottages. Raise your total sap to light more.</div><div class="row2"><button class="btn ghost sm" data-a="close">Close</button></div>`;
    sheet.innerHTML = h; return;
  }
  const kids = sim.ch[n.id].length, gc = { sap: sim.growCost(1.6) };
  h += '<div class="grid">';
  h += `<button class="act primary" data-a="grow" ${kids >= 3 ? 'disabled' : ''}><b>Grow a branch</b><span class="cost">from ${fmt(gc.sap)} sap</span><small>${kids >= 3 ? 'This joint is full.' : 'Drag to choose where it reaches.'}</small></button>`;
  const targets = sim.bridgeTargets(n.id);
  if (targets.length && sim.s.bridges.filter((b) => b.a === n.id).length < 2) {
    const near = Math.min(...targets.map((t) => sim.bridgeCost(n.id, t)));
    h += `<button class="act" data-a="bridge"><b>Run a rope</b><span class="cost ${sim.s.sap >= near ? '' : 'no'}">from ${fmt(near)} sap</span><small>Send sap, and Winders, down a new route.</small></button>`;
  }
  if (sim.options(n.id).length >= 2) {
    h += `<button class="act" data-a="route"><b>Sap route</b><span class="cost">${['Alternate', 'Branch only', 'Rope only'][n.route]}</span><small>Tap to change where drops go.</small></button>`;
  }
  for (const b of sim.s.bridges.filter((x) => x.a === n.id)) h += `<button class="act" data-a="rmbridge" data-b="${b.b}"><b>Cut a rope</b><span class="cost">refund ${fmt(Math.round(sim.bridgeCost(b.a, b.b) * 0.5))}</span><small>Down to joint at height ${sim.s.nodes[b.b].y.toFixed(1)}.</small></button>`;
  if (sim.canPrune(n.id)) h += `<button class="act" data-a="prune"><b>Prune this tip</b><span class="cost">refund ${fmt(Math.round(sim.growCost(sim.len(n.p, n.id) / 1.08) * 0.5))}</span><small>The leaf folds back into the tree.</small></button>`;
  h += '</div>';
  if (n.b) {
    h += `<div class="grid"><div class="act" style="cursor:default"><b>${BUILD[n.b].name}</b><small>${BUILD[n.b].blurb}</small></div><button class="act" data-a="demolish"><b>Take it down</b><small>Get most of the cost back.</small></button></div>`;
  } else {
    h += '<div class="grid">';
    for (const t of Object.keys(BUILD)) {
      const c = sim.buildCost(t), ok = sim.afford(c);
      h += `<button class="act" data-a="build" data-t="${t}" ${ok ? '' : 'disabled'}><b>${BUILD[t].name}</b>${costTag(c)}<small>${BUILD[t].blurb}</small></button>`;
    }
    h += '</div>';
  }
  h += '<div class="row2"><button class="btn ghost sm" data-a="close">Close</button></div>';
  sheet.innerHTML = h;
}
sheet.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, n = sim.s.nodes[selected];
  audio.resume();
  if (a === 'close') { selected = -1; world.select(-1); sheet.hidden = true; return; }
  if (!n) return;
  if (a === 'grow') { growFrom = selected; world.growFrom = selected; world.controls.enabled = false; setModeHint('Drag to shape the new branch. Release to grow it.', cancelGrow); sheet.hidden = true; return; }
  if (a === 'bridge') { world.beginBridge(selected); setModeHint('Tap a glowing joint lower down to run a rope to it.', () => { cancelBridge(); ui.sheetDirty = true; }); sheet.hidden = true; return; }
  if (a === 'route') { sim.cycleRoute(selected); }
  if (a === 'rmbridge') { sim.removeBridge(selected, +b.dataset.b); }
  if (a === 'prune') { sim.prune(selected); selected = -1; world.select(-1); }
  if (a === 'demolish') { sim.demolish(selected); }
  if (a === 'build') {
    const t = b.dataset.t, res = sim.build(selected, t);
    if (res) toast(res); else { audio.grow(); setHint(3); if (t === 'hut') toast('A Winder moves in. Tap them to say hello.'); }
  }
  ui.sheetDirty = true;
});

// ---------- modals ----------
const modal = $('modal'); let modalOpen = false; const modalQ = [];
function openModal(html, onClose) {
  modal.innerHTML = `<div class="card">${html}</div>`; modal.hidden = false; modalOpen = true; modal._onClose = onClose;
}
function closeModal() { modal.hidden = true; modalOpen = false; const f = modal._onClose; modal._onClose = null; if (f) f(); const next = modalQ.shift(); if (next) next(); }
function queueModal(fn) { if (modalOpen) modalQ.push(fn); else fn(); }
modal.addEventListener('click', (e) => { if (e.target === modal && !modal.querySelector('[data-nodismiss]')) closeModal(); });

function introModal() {
  openModal(`<div class="eyebrow">Emberwood</div><h2>A seed fell through the cracks of a giant's workbench.</h2>
  <p>It is dark between a spool and a screw. The wood is warm, the ceiling is very far away, and something enormous is breathing slowly above you.</p>
  <p>The seed has begun to glow. Clockwork folk, left behind long ago, are waking in its light. Grow the tree. Look after them. Nothing here ever needs rushing.</p>
  <div class="row2"><button class="btn" id="begin">Begin</button></div>`, () => { setHint(0); });
  $('begin').onclick = closeModal;
}
function awayModal(rep) {
  const mins = Math.round(rep.seconds / 60), t = mins >= 120 ? Math.round(mins / 60) + ' hours' : mins + ' minutes';
  openModal(`<div class="eyebrow">Welcome back</div><h2>While you were away <em>${t}</em></h2>
  <div class="stats"><div><b>+${fmt(rep.sap)}</b><small>sap reached the roots</small></div>${rep.cogs ? `<div><b>+${rep.cogs}</b><small>cogs shaken loose</small></div>` : ''}</div>
  <ul class="tales">${rep.lines.map((l) => `<li>${esc(l)}</li>`).join('')}${rep.tales.length ? `<li>${rep.tales.map(esc).join(' and ')} opened up while you were gone. Check the Folk list.</li>` : ''}</ul>
  <div class="row2"><button class="btn" id="ok">Back to the tree</button></div>`);
  $('ok').onclick = closeModal;
}
function choiceModal(c) {
  const key = c.key;
  openModal(`<div class="eyebrow">A fork in the wood</div><h2>${esc(c.title)}</h2><p>${esc(c.body)} This choice is permanent.</p>
  <div class="choice">${c.options.map((o) => `<button class="act" data-o="${o}"><b>${esc(BOONS[o].name)}</b><small>${esc(BOONS[o].desc)}</small></button>`).join('')}</div>
  <div class="row2"><button class="btn ghost sm" id="later">Decide later</button></div>`);
  modal.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => { if (sim.choose(key, b.dataset.o)) { audio.chord(); toast(`<b>${esc(BOONS[b.dataset.o].name)}</b>: ${esc(BOONS[b.dataset.o].desc)}`); badge('bBook', false); closeModal(); } }; });
  $('later').onclick = closeModal;
}
function moodBar(w) { return `<div class="bar"><i style="width:${w.mood.toFixed(0)}%"></i></div>`; }
function folkModal() {
  const ws = sim.s.winders;
  badge('bFolk', false);
  openModal(`<div class="eyebrow">Folk</div><h2>${ws.length ? 'The Winders' : 'No one lives here yet'}</h2>
  ${ws.length ? `<div class="list">${ws.map((w) => `<button class="item" data-w="${w.id}"><b>${esc(w.name)}</b><small>${esc(sim.folkOf(w).trait)} · ${w.tales}/3 tales</small>${moodBar(w)}</button>`).join('')}</div>` : '<p>Build a <b>Winder Hut</b> on a branch in Shape mode, and the first Winder will move in.</p>'}
  <div class="row2"><button class="btn ghost" id="x">Close</button></div>`);
  modal.querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => winderModal(sim.s.winders.find((w) => w.id === +b.dataset.w)); });
  $('x').onclick = closeModal;
}
function winderModal(w) {
  const f = sim.folkOf(w), r = sim.rt.get(w.id);
  badge('bFolk', false);
  openModal(`<div class="eyebrow">${esc(f.trait)}</div><h2>${esc(w.name)}</h2>
  <div><small style="color:var(--muted)">Fondness</small>${moodBar(w)}</div>
  <ul class="tales">${f.tales.map((t, i) => `<li class="${i < w.tales ? '' : 'locked'}">${i < w.tales ? esc(t) : 'A tale they have not told yet. They open up the longer they live in the light.'}</li>`).join('')}</ul>
  <div class="row2"><button class="btn" id="wind" ${w.windCd > 0 ? 'disabled' : ''}>${w.windCd > 0 ? 'Resting…' : 'Wind their key'}</button><button class="btn ghost" id="x">Close</button></div>
  <div><small style="color:var(--muted)">Rename</small><input type="text" id="nm" maxlength="14" value="${esc(w.name)}"></div>`);
  $('wind').onclick = () => { if (sim.windKey(w.id)) { audio.chord(); toast(`<b>${esc(w.name)}</b> is wound up and working twice as hard for a while.`); } closeModal(); };
  $('x').onclick = closeModal;
  $('nm').onchange = (e) => { const v = e.target.value.trim().slice(0, 14); if (v) w.name = v; };
}
function journalModal() {
  badge('bBook', false);
  const pend = sim.pending, got = LORE.filter((e) => state.journal.includes(e.id)), rings = Object.entries(state.choices);
  openModal(`<div class="eyebrow">Journal</div><h2>${esc(state.treeName || 'The Emberwood')}</h2>
  <div class="stats"><div><b>${fmt(state.total)}</b><small>sap gathered, ever</small></div><div><b>${sim.grown}</b><small>branches grown</small></div><div><b>${state.winders.length}</b><small>Winders</small></div></div>
  ${pend ? `<button class="act primary" id="pend"><b>The tree is waiting for a choice</b><small>${esc(pend.title)}</small></button>` : ''}
  <div class="eyebrow">Memories</div><ul class="tales">${got.map((e) => `<li><b>${esc(e.title)}.</b> ${esc(e.text)}</li>`).join('')}${got.length < LORE.length ? `<li class="locked">${LORE.length - got.length} more memories are still asleep in the wood.</li>` : ''}</ul>
  ${rings.length ? `<div class="eyebrow">Rings in the trunk</div><ul class="tales">${rings.map(([k, o]) => `<li><b>${esc(BOONS[o].name)}.</b> ${esc(BOONS[o].desc)}</li>`).join('')}</ul>` : ''}
  <div class="row2"><button class="btn ghost" id="x">Close</button></div>`);
  $('x').onclick = closeModal; if (pend) $('pend').onclick = () => { closeModal(); queueModal(() => choiceModal(pend)); };
}
function menuModal() {
  openModal(`<div class="eyebrow">Settings</div><h2>Emberwood</h2>
  <div class="row2"><button class="btn ghost" id="snd">Sound: ${audio.enabled ? 'on' : 'off'}</button><button class="btn ghost" id="rc">Recentre view</button></div>
  <div><small style="color:var(--muted)">Leaf colour</small><div class="swatches" style="margin-top:6px">${Object.entries(PALETTES).map(([k, p]) => `<button class="sw" data-p="${k}" aria-label="${p.name}" aria-pressed="${state.palette === k}" style="background:${p.col ? `rgb(${p.col.map((c) => Math.round(c * 255)).join(',')})` : 'conic-gradient(#8fff9c,#ff8a2a,#ffc23a,#9fd8ff,#8fff9c)'}"></button>`).join('')}</div></div>
  <div><small style="color:var(--muted)">Name your tree</small><input type="text" id="tn" maxlength="24" value="${esc(state.treeName)}" placeholder="The Emberwood"></div>
  <div class="row2"><button class="btn ghost sm" id="exp">Copy save code</button><button class="btn ghost sm" id="imp">Load save code</button><button class="btn ghost sm" id="rst">Start over</button></div>
  <div id="io"></div>
  <div class="row2"><button class="btn" id="x">Done</button></div>`);
  $('x').onclick = closeModal;
  $('snd').onclick = (e) => { audio.enabled = !audio.enabled; state.sound = audio.enabled; audio.apply(); e.target.textContent = 'Sound: ' + (audio.enabled ? 'on' : 'off'); };
  $('rc').onclick = () => { world.fit(true); closeModal(); };
  modal.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { state.palette = b.dataset.p; world.recolorFoliage(); modal.querySelectorAll('[data-p]').forEach((o) => o.setAttribute('aria-pressed', o === b)); });
  $('tn').onchange = (e) => { state.treeName = e.target.value.trim().slice(0, 24); };
  $('exp').onclick = async () => { save(); const code = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); try { await navigator.clipboard.writeText(code); toast('Save code copied.'); } catch (e) { $('io').innerHTML = `<input type="text" readonly value="${code}" onfocus="this.select()">`; } };
  $('imp').onclick = () => { $('io').innerHTML = '<input type="text" id="code" placeholder="Paste save code, then press Load"><div class="row2" style="margin-top:8px"><button class="btn sm" id="go">Load</button></div>'; $('go').onclick = () => { try { const raw = decodeURIComponent(escape(atob($('code').value.trim()))); if (!loadState(raw)) throw 0; localStorage.setItem(SAVE_KEY, raw); location.reload(); } catch (e) { toast('That save code did not work.'); } }; };
  $('rst').onclick = (e) => { if (e.target.dataset.sure) { try { localStorage.removeItem(SAVE_KEY); } catch (er) { /* ignore */ } state.last = 0; location.reload(); } else { e.target.dataset.sure = 1; e.target.textContent = 'Really erase everything?'; } };
}
$('bFolk').onclick = () => { if (!modalOpen) folkModal(); };
$('bBook').onclick = () => { if (!modalOpen) journalModal(); };
$('menuBtn').onclick = () => { if (!modalOpen) menuModal(); };

// ---------- HUD ----------
ui = {
  sheetDirty: true, t: 0,
  update(dt) {
    this.t += dt;
    if (this.t > 0.2) {
      this.t = 0;
      $('sap').textContent = fmt(Math.floor(state.sap)); $('cogs').textContent = state.cogs;
      const pm = sim.idlePerMinute(); $('rate').textContent = '+' + fmt(pm) + ' / min idle';
      const sea = sim.sea; $('seasonName').textContent = sea.cur.name; $('seasonNote').textContent = sea.cur.note;
      renderSheet(this.sheetDirty); this.sheetDirty = false;
    }
    const now = performance.now();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i], r = sim.rt.get(b.w.id);
      if (now > b.until || !r) { b.el.remove(); bubbles.splice(i, 1); continue; }
      const p = world.project(r.x, r.y + 0.5 * world.winderScale(), r.z);
      if (!p.ok) { b.el.style.display = 'none'; continue; } b.el.style.display = ''; b.el.style.left = p.x + 'px'; b.el.style.top = p.y + 'px';
    }
  },
};

// ---------- start ----------
if (fresh) { queueModal(introModal); }
else {
  const away = (Date.now() - state.last) / 1000;
  if (away > 30) { const rep = sim.offline(away); if (away > 90 && rep.drops > 0) queueModal(() => awayModal(rep)); }
  state.hint = Math.max(state.hint, 1);
}
sim.checkProgress(); showHint();
$('hint').hidden = state.hint >= 4;

let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  let dt = (t - last) / 1000; last = t;
  if (dt > 2.5) { const rep = sim.offline(dt); if (dt > 60 && rep.drops > 0) queueModal(() => awayModal(rep)); dt = 0.016; }
  dt = Math.min(dt, 0.1);
  if (!modalOpen || true) sim.tick(dt);
  world.frame(dt, t / 1000); ui.update(dt);
}
requestAnimationFrame(loop);
