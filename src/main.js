import { Sim, newState, loadState, fmt, clamp, defOf, passengerAt, regionOf, stopName, landmarkFor, GW, GH } from './logic.js';
import { World } from './world.js';
import { Audio } from './audio.js';
import { ROOMS, LORE, HINTS, HOBBY_ROOM } from './data.js';

const SAVE_KEY = 'marigold.save.v2';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// ---------- load ----------
let state = null, fresh = false;
try { state = loadState(localStorage.getItem(SAVE_KEY)); } catch (e) { state = null; }
if (!state) { state = newState(); fresh = true; }
const audio = new Audio(); audio.enabled = state.sound !== false;
const hooks = {};
const sim = new Sim(state, hooks);
let world;
try { world = new World($('gl'), sim); }
catch (e) {
  document.body.insertAdjacentHTML('beforeend', '<div id="modal"><div class="card"><div class="eyebrow">The Marigold Line</div><h2>This device could not start 3D graphics.</h2><p>The game needs WebGL. Try a recent version of Safari, Chrome or Firefox, and make sure hardware acceleration is on. Your progress is safe.</p></div></div>');
  throw e;
}
let errShown = false;
addEventListener('error', () => { if (errShown) return; errShown = true; try { toast('Something went wrong. Your progress is saved; reloading the page is safe.'); } catch (e) { /* ignore */ } });
window.__game = { sim, world, state, landmarkFor };
if (state.gfx === 'low' || state.gfx === 'high') world.setGfx(state.gfx);
function save() { try { state.last = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage may be unavailable */ } }
addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);
setInterval(save, 10000);
addEventListener('pointerdown', () => audio.resume(), { passive: true });

// ---------- small ui helpers ----------
const labels = $('labels');
let floats = 0;
function floatText(text, x, y, cls = '') {
  if (floats > 12) return; floats++;
  const el = document.createElement('div'); el.className = 'float ' + cls; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px';
  el.addEventListener('animationend', () => { el.remove(); floats--; }); labels.appendChild(el);
}
function toast(html) { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; $('toast').appendChild(el); el.addEventListener('animationend', () => el.remove()); }
function badge(id, on) { const b = $(id); let i = b.querySelector('.badge'); if (!i && on) { i = document.createElement('i'); i.className = 'badge'; b.appendChild(i); } if (i) i.hidden = !on; }

// ---------- hints ----------
let hintTimer = 0;
function setHint(n) { if (n <= state.hint && n !== 0) return; state.hint = n; showHint(); }
function showHint() {
  const el = $('hint'); if (drawing) return;
  if (state.hint >= HINTS.length) { el.hidden = true; return; }
  el.innerHTML = HINTS[state.hint]; el.hidden = false; clearTimeout(hintTimer);
  if (state.hint === 3) hintTimer = setTimeout(() => { if (state.hint === 3) { state.hint = 4; showHint(); } }, 45000);
}

// ---------- modals ----------
const modal = $('modal'); let modalOpen = false; const modalQ = [];
function openModal(html, onClose) { modal.innerHTML = `<div class="card">${html}</div>`; modal.hidden = false; modalOpen = true; modal._onClose = onClose; sheetHide(); }
function closeModal() { modal.hidden = true; modalOpen = false; const f = modal._onClose; modal._onClose = null; if (f) f(); const next = modalQ.shift(); if (next) next(); }
function queueModal(fn) { if (modalOpen) modalQ.push(fn); else fn(); }
modal.addEventListener('click', (e) => { if (e.target === modal && !modal.querySelector('[data-nodismiss]')) closeModal(); });

// ---------- sim hooks ----------
hooks.layout = () => { sheetDirty = true; };
hooks.emote = (e) => { if (view === 'inside') world.inside.emote(e.id, e.kind); };
hooks.stop = (st) => {
  toast(`The Marigold slows into <b>${esc(st.name)}</b>.`); audio.whistle(); platformDirty = true;
  setTimeout(() => { if (state.line.pending && !modalOpen && view === 'line') stopModal(); }, 1600);
};
hooks.whistle = (name, bonus) => { toast(`Whistle-stop at <b>${esc(name)}</b>. +${bonus} Charm.`); audio.pop(); };
hooks.postcard = (c) => { toast(`<i>${esc(c.text)}</i>`); badge('bBook', true); };
hooks.region = (r) => { toast(`Into the <b>${esc(r.name)}</b>.`); audio.chord(); forkDirty = true; };
hooks.fork = () => { forkDirty = true; toast('A <b>fork</b> in the Line is coming up. Choose a way.'); audio.whistle(); };
hooks.board = (p, c) => { toast(`<b>${esc(p.name)}</b> boards. ${esc(c.trait)}.`); audio.chord(); setHint(2); platformDirty = true; };
hooks.unlock = (type) => toast(`<b>${esc(ROOMS[type].name)}</b> unlocked. You can build one now.`);
hooks.tale = (p, text) => { toast(`<b>${esc(p.name)}</b> opened up. A new tale is in People.`); badge('bPeople', true); audio.note(9, 0.5); };
hooks.depart = ({ p, keep }) => { toast(`<b>${esc(p.name)}</b> steps off at their stop and leaves <b>${esc(keep.name)}</b>.`); audio.chord(); };
hooks.lore = (e) => { if (e.id !== 'start') { toast(`A memory stirs: <b>${esc(e.title)}</b>`); badge('bBook', true); } };

// ---------- view switching ----------
let view = 'line', platformDirty = true, forkDirty = true, sheetDirty = true, sheetMode = null, drawing = null, selRoom = null;
function setView(v) {
  if (v === view) return;
  cancelDraw(); selRoom = null; sheetMode = null; world.inside.setSelected(null);
  const fade = $('fade'); fade.style.opacity = 1;
  setTimeout(() => {
    view = v; world.setView(v);
    $('bLine').setAttribute('aria-pressed', v === 'line'); $('bInside').setAttribute('aria-pressed', v === 'inside');
    $('stoke').hidden = v !== 'line'; $('inbar').hidden = v !== 'inside'; sheetHide(); platformDirty = forkDirty = true;
    if (v === 'inside') { setHint(3); showHint(); }
    fade.style.opacity = 0;
  }, 200);
}
$('bLine').onclick = () => { if (!modalOpen) setView('line'); };
$('bInside').onclick = () => { if (!modalOpen) setView('inside'); };

// ---------- stoke ----------
let stokeT = 0, needleQ = 0.5;
$('stokeBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault(); audio.resume();
  const res = sim.stoke(needleQ), r = $('stokeBtn').getBoundingClientRect();
  audio.coal(res === 'perfect'); if (navigator.vibrate) navigator.vibrate(res === 'perfect' ? 18 : 8);
  floatText(res === 'perfect' ? 'Perfect!' : '+steam', r.left + r.width * needleQ, r.top - 6, res === 'perfect' ? 'perfect' : '');
  if (state.hint === 0) setHint(1);
});

// ---------- the fork banner and platform button ----------
function renderFork() {
  const L = state.line, el = $('fork'), info = sim.forkInfo();
  if (view !== 'line' || !L.forkAnnounced || state.miles >= info.end) { el.hidden = true; return; }
  const c = L.forkChosen;
  el.hidden = false;
  el.innerHTML = `<div class="cap">${c ? 'Switch set. You can still change your mind.' : 'A fork in the Line. Choose a way, or the Line will decide.'}</div><div class="two">` +
    ['L', 'R'].map((s) => `<button class="fk" data-s="${s}" aria-pressed="${c === s}"><b>${s === 'L' ? '← ' : ''}${esc(info[s].name)}${s === 'R' ? ' →' : ''}</b><small>${esc(info[s].hint)}</small></button>`).join('') + '</div>';
}
$('fork').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; sim.chooseFork(b.dataset.s); audio.grow(); renderFork(); });
function renderPlatform() {
  const st = state.line.pending, b = $('platform');
  b.hidden = !st || modalOpen || !!drawing;
  if (st) b.textContent = `Someone is waiting at ${st.name}`;
}
$('platform').onclick = () => { if (!modalOpen) stopModal(); };

// ---------- the stop: meeting a passenger ----------
function stopModal() {
  const st = state.line.pending; if (!st) return;
  const c = passengerAt(st.idx, state.line.seed), free = sim.freeBeds();
  const gift = c.gift && !state.unlocked.includes(c.gift) ? `Brings the know-how for a <b>${esc(ROOMS[c.gift].name)}</b>.` : c.gift ? `Already knows a craft you have: ${esc(ROOMS[c.gift].name)}.` : '';
  openModal(`<div class="eyebrow">Platform · ${esc(st.name)}</div><h2>${esc(c.name)}</h2>
  <div class="chips"><span class="chip">${esc(c.trait)}</span>${c.hobby ? `<span class="chip">likes: ${esc(c.hobby === 'chat' ? 'good company' : ROOMS[HOBBY_ROOM[c.hobby]].name)}</span>` : ''}</div>
  <div class="quote">${esc(c.line)}</div>
  <p>${gift} Berths free: <b>${free}</b> of ${sim.beds}.</p>
  <div class="row2"><button class="btn" id="inv" ${free <= 0 ? 'disabled' : ''}>Invite aboard</button><button class="btn ghost" id="wave">Wave goodbye</button><button class="btn ghost" id="later">Not yet</button></div>
  ${free <= 0 ? '<p style="color:var(--bad);font-size:13px">No berth is free. Build more Sleeper space inside, then come back to the platform.</p>' : ''}`, () => { platformDirty = true; });
  $('inv').onclick = () => { const r = sim.invite(); if (r) toast(esc(r)); else { audio.chord(); closeModal(); } };
  $('wave').onclick = () => { sim.decline(); toast('You wave from the window until they are small.'); closeModal(); };
  $('later').onclick = closeModal;
}

// ---------- people ----------
function moodBar(p) { return `<div class="bar"><i style="width:${p.mood.toFixed(0)}%"></i></div>`; }
function peopleModal() {
  badge('bPeople', false);
  const ps = state.passengers;
  openModal(`<div class="eyebrow">People</div><h2>${ps.length ? 'Aboard the Marigold' : 'An empty train'}</h2>
  ${ps.length ? `<div class="list">${ps.map((p) => { const d = defOf(p); return `<button class="item" data-p="${p.id}"><b>${esc(p.name)}</b><small>${esc(d.trait)} · ${p.tales}/3 tales · off in ~${Math.max(1, Math.round(p.dest - state.miles))} mi</small>${moodBar(p)}</button>`; }).join('')}</div>` : '<p>Stop at a station, and invite someone aboard. They bring their stories and their own know-how.</p>'}
  <p style="color:var(--muted);font-size:13px">Free berths: ${sim.freeBeds()} of ${sim.beds}.</p>
  <div class="row2"><button class="btn ghost" id="x">Close</button></div>`);
  modal.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => passengerModal(state.passengers.find((p) => p.id === +b.dataset.p)); });
  $('x').onclick = closeModal;
}
function passengerModal(p) {
  if (!p) return; const d = defOf(p), room = sim.rt.get(p.id);
  openModal(`<div class="eyebrow">${esc(d.trait)}</div><h2>${esc(p.name)}</h2>
  <div><small style="color:var(--muted)">Fondness for the train</small>${moodBar(p)}</div>
  <p style="color:var(--muted)">Getting off in about <b style="color:var(--gold)">${Math.max(1, Math.round(p.dest - state.miles))} miles</b>. Likes ${esc(d.hobby === 'chat' ? 'good company' : ROOMS[HOBBY_ROOM[d.hobby]].name)}.</p>
  ${p.trip ? `<p style="color:var(--muted);font-size:13px">Average trip: <b style="color:var(--gold)">${Math.round(p.trip)} steps</b>. ${p.trip <= 6 ? 'Short walks make them happy: +25% Charm.' : p.trip <= 12 ? 'A comfortable walk.' : 'Long walks wear on them. Move their favorite rooms closer to the berths.'}</p>` : ''}
  <ul class="tales">${d.tales.map((t, i) => `<li class="${i < p.tales ? '' : 'locked'}">${i < p.tales ? esc(t) : 'A tale they have not told yet. It comes when they feel at home.'}</li>`).join('')}</ul>
  <div class="row2"><button class="btn" id="find">Find them inside</button><button class="btn ghost" id="x">Close</button></div>
  <div><small style="color:var(--muted)">Rename</small><input type="text" id="nm" maxlength="22" value="${esc(p.name)}"></div>`);
  $('x').onclick = closeModal; $('nm').onchange = (e) => { const v = e.target.value.trim().slice(0, 22); if (v) p.name = v; };
  $('find').onclick = () => { closeModal(); const go = () => { const c = world.inside.controls; c.target.set(p.x, 0, p.y); world.inside.camera.position.set(p.x, 9, p.y + 9); }; if (view !== 'inside') { setView('inside'); setTimeout(go, 260); } else go(); };
}

// ---------- journal ----------
function journalModal() {
  badge('bBook', false);
  const got = LORE.filter((e) => state.journal.includes(e.id));
  openModal(`<div class="eyebrow">Conductor's Journal</div><h2>${esc(state.name || 'The Marigold')}</h2>
  <div class="stats"><div><b>${fmt(state.miles)}</b><small>miles travelled</small></div><div><b>${state.tickets.length}</b><small>regions punched</small></div><div><b>${state.keepsakes.length}</b><small>keepsakes</small></div></div>
  ${state.tickets.length ? `<div class="eyebrow">Ticket punches</div><div class="chips">${state.tickets.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
  <div class="eyebrow">Memories</div><ul class="tales">${got.map((e) => `<li><b>${esc(e.title)}.</b> ${esc(e.text)}</li>`).join('')}${got.length < LORE.length ? `<li class="locked">${LORE.length - got.length} memories are still waiting somewhere on the Line.</li>` : ''}</ul>
  ${state.keepsakes.length ? `<div class="eyebrow">Keepsakes left behind</div><ul class="tales">${state.keepsakes.map((k) => `<li><b>${esc(k.name)}</b>, from ${esc(k.who)}. ${esc(k.line)}</li>`).join('')}</ul>` : ''}
  <div class="eyebrow">Postcards</div><div class="pcs">${state.postcards.length ? state.postcards.slice().reverse().slice(0, 30).map((c) => `<div class="card-pc">${esc(c.text)}<small>Mile ${c.mile} · ${esc(c.region)}</small></div>`).join('') : '<p style="color:var(--muted)">Postcards turn up as the Line rolls by.</p>'}</div>
  <div class="row2"><button class="btn ghost" id="x">Close</button></div>`);
  $('x').onclick = closeModal;
}
function menuModal() {
  openModal(`<div class="eyebrow">Settings</div><h2>The Marigold Line</h2>
  <div class="row2"><button class="btn ghost" id="snd">Sound: ${audio.enabled ? 'on' : 'off'}</button><button class="btn ghost" id="rc">Recentre the view</button></div>
  <div class="row2"><button class="btn ghost" id="gfx">Graphics: ${({ low: 'Low (faster)', high: 'High', undefined: 'Auto' })[state.gfx]}</button></div>
  <div class="row2"><button class="btn ghost" id="auto">While I'm away, welcome travellers: ${state.auto ? 'yes' : 'no'}</button></div>
  <div><small style="color:var(--muted)">Name your train</small><input type="text" id="tn" maxlength="24" value="${esc(state.name)}" placeholder="The Marigold"></div>
  <div class="row2"><button class="btn ghost sm" id="exp">Copy save code</button><button class="btn ghost sm" id="imp">Load save code</button><button class="btn ghost sm" id="rst">Start over</button></div>
  <div id="io"></div><div class="row2"><button class="btn" id="x">Done</button></div>`);
  $('x').onclick = closeModal;
  $('snd').onclick = (e) => { audio.enabled = !audio.enabled; state.sound = audio.enabled; audio.apply(); e.target.textContent = 'Sound: ' + (audio.enabled ? 'on' : 'off'); };
  $('rc').onclick = () => { world.line.recentre(world.aspect); world.inside.fit(world.aspect); closeModal(); };
  $('auto').onclick = (e) => { state.auto = !state.auto; e.target.textContent = `While I'm away, welcome travellers: ${state.auto ? 'yes' : 'no'}`; };
  $('gfx').onclick = (e) => { const order = [undefined, 'low', 'high'], i = (order.indexOf(state.gfx) + 1) % 3; state.gfx = order[i]; world.setGfx(state.gfx || 'auto'); e.target.textContent = 'Graphics: ' + ({ low: 'Low (faster)', high: 'High', undefined: 'Auto' })[state.gfx]; };
  $('tn').onchange = (e) => { state.name = e.target.value.trim().slice(0, 24); };
  $('exp').onclick = async () => { save(); const code = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); try { await navigator.clipboard.writeText(code); toast('Save code copied.'); } catch (e) { $('io').innerHTML = `<input type="text" readonly value="${code}" onfocus="this.select()">`; } };
  $('imp').onclick = () => { $('io').innerHTML = '<input type="text" id="code" placeholder="Paste save code, then press Load"><div class="row2" style="margin-top:8px"><button class="btn sm" id="go">Load</button></div>'; $('go').onclick = () => { try { const raw = decodeURIComponent(escape(atob($('code').value.trim()))); if (!loadState(raw)) throw 0; localStorage.setItem(SAVE_KEY, raw); location.reload(); } catch (e) { toast('That save code did not work.'); } }; };
  $('rst').onclick = (e) => { if (e.target.dataset.sure) { try { localStorage.removeItem(SAVE_KEY); } catch (er) { /* ignore */ } state.last = 0; location.reload(); } else { e.target.dataset.sure = 1; e.target.textContent = 'Really erase everything?'; } };
}
$('bPeople').onclick = () => { if (!modalOpen) peopleModal(); };
$('bBook').onclick = () => { if (!modalOpen) journalModal(); };
$('menuBtn').onclick = () => { if (!modalOpen) menuModal(); };

function introModal() {
  openModal(`<div class="eyebrow">The Marigold Line</div><h2>A small train that is much larger on the inside.</h2>
  <p>She has three carriages and one tired engine. Someone long ago stitched a charm into her seams, so that every room on board is as big as the people in it need.</p>
  <p>The track appears only a little way ahead of the wheels. People wait at stations. Some of them will stay a while and fill the rooms you make. Some will leave something behind.</p>
  <p>You are the conductor. Nothing here ever needs rushing.</p>
  <div class="row2"><button class="btn" id="begin">All aboard</button></div>`, () => { setHint(0); });
  $('begin').onclick = closeModal;
}
function awayModal(rep) {
  const mins = Math.round(rep.secs / 60), t = mins >= 120 ? Math.round(mins / 60) + ' hours' : mins + ' minutes';
  openModal(`<div class="eyebrow">Welcome back</div><h2>While you were away <em>${t}</em></h2>
  <div class="stats"><div><b>+${fmt(rep.charm)}</b><small>Charm gathered</small></div><div><b>${rep.miles.toFixed(0)}</b><small>miles rolled</small></div></div>
  ${rep.departed.length ? `<ul class="tales">${rep.departed.map((d) => `<li><b>${esc(d.p.name)}</b> stepped off at their stop and left <b>${esc(d.keep.name)}</b>.</li>`).join('')}</ul>` : ''}
  ${rep.boarded.length ? `<ul class="tales">${rep.boarded.map((p) => `<li><b>${esc(p.name)}</b> came aboard while you were away.</li>`).join('')}</ul>` : ''}
  ${rep.postcards.length ? `<div class="pcs">${rep.postcards.map((c) => `<div class="card-pc">${esc(c.text)}<small>Mile ${c.mile} · ${esc(c.region)}</small></div>`).join('')}</div>` : ''}
  ${rep.waiting ? `<p>The Marigold is waiting at <b>${esc(rep.waiting.name)}</b>. Someone is on the platform.</p>` : ''}
  <div class="row2"><button class="btn" id="ok">${rep.waiting ? 'Meet them' : 'Back to the Line'}</button></div>`, () => { if (state.line.pending) setTimeout(() => { if (!modalOpen && state.line.pending) stopModal(); }, 350); });
  $('ok').onclick = closeModal;
}

// ---------- the inside: sheet, building, unfolding ----------
const sheet = $('sheet');
function sheetHide() { sheet.hidden = true; }
const ERR = { locked: 'You do not know how to build that yet.', size: 'That is not a size this room can be.', outside: 'That is outside the unfolded space. Unfold more first.', overlap: 'That overlaps another room.', apart: 'A room has to touch an existing room.', charm: 'Not enough Charm.' };
function renderSheet() {
  if (view !== 'inside' || modalOpen || drawing) { sheet.hidden = true; return; }
  if (sheetMode === 'build') {
    sheet.hidden = false;
    sheet.innerHTML = `<h3>Build a room<small>${fmt(state.charm)} Charm</small></h3><div class="grid">${Object.keys(ROOMS).map((t) => {
      const d = ROOMS[t], ok = state.unlocked.includes(t), per = sim.roomCost(t, 1, 1);
      return ok ? `<button class="act" data-b="${t}"><b>${d.name}</b><span class="cost">${per} Charm / tile</span><small>${d.blurb}</small></button>` : `<div class="act locked"><b>${d.name}</b><small>A passenger will bring the know-how.</small></div>`;
    }).join('')}</div><div class="row2"><button class="btn ghost sm" data-a="close">Close</button></div>`;
  } else if (sheetMode === 'unfold') {
    sheet.hidden = false;
    const dirs = [['n', 'North', '↑'], ['s', 'South', '↓'], ['w', 'West', '←'], ['e', 'East', '→']];
    sheet.innerHTML = `<h3>Unfold more space<small>${fmt(state.charm)} Charm</small></h3><p style="margin:0;color:var(--muted);font-size:13px">The charm stretches the pocket by one row or column. Each unfolding costs a little more than the last.</p><div class="grid">${dirs.map(([d, n, a]) => { const can = sim.canUnfold(d), c = sim.unfoldCost(d); return `<button class="act" data-u="${d}" ${can && c <= state.charm ? '' : 'disabled'}><b>${a} ${n}</b><span class="cost ${c <= state.charm ? '' : 'no'}">${can ? c + ' Charm' : 'No more'}</span></button>`; }).join('')}</div><div class="row2"><button class="btn ghost sm" data-a="close">Close</button></div>`;
  } else if (sheetMode === 'room' && selRoom && sim.roomById.get(selRoom.id)) {
    const r = sim.roomById.get(selRoom.id), d = ROOMS[r.type], here = state.passengers.filter((p) => sim.roomAt(Math.floor(p.x), Math.floor(p.y)) === r);
    const refund = Math.round(sim.roomCost(r.type, r.w, r.h) * 0.6 / 1);
    sheet.hidden = false;
    sheet.innerHTML = `<h3>${d.name}${r.lv ? ' ' + '\u2605'.repeat(Math.min(r.lv, 5)) : ''}<small>${r.w} × ${r.h}${r.type === 'sleeper' ? ` · ${Math.floor(r.w * r.h / 3)} berths` : ''}</small></h3><p style="margin:0;color:var(--muted);font-size:13px">${d.blurb}</p>
    ${here.length ? `<div class="chips">${here.map((p) => `<span class="chip">${esc(p.name)}</span>`).join('')}</div>` : ''}
    ${r.type !== 'corridor' ? `<div class="grid"><button class="act" data-a="upgrade" ${sim.upgradeCost(r) <= state.charm ? '' : 'disabled'}><b>Furnish: level ${(r.lv || 0)} \u2192 ${(r.lv || 0) + 1}</b><span class="cost ${sim.upgradeCost(r) <= state.charm ? '' : 'no'}">${sim.upgradeCost(r)} Charm</span><small>+20% Charm from everyone who uses it.</small></button><button class="act" data-a="restyle"><b>Restyle</b><span class="cost">Free</span><small>Change the colors.</small></button></div>` : ''}
    <div class="row2"><button class="btn ghost sm" data-a="remove" ${state.rooms.length <= 2 ? 'disabled' : ''}>Take it down (+${refund})</button><button class="btn ghost sm" data-a="close">Close</button></div>`;
  } else { sheet.hidden = true; }
}
sheet.addEventListener('click', (e) => {
  audio.resume();
  const b = e.target.closest('[data-b],[data-u],[data-a]'); if (!b || b.disabled) return;
  if (b.dataset.b) { startDraw(b.dataset.b); return; }
  if (b.dataset.u) { const r = sim.unfold(b.dataset.u); if (r) toast(esc(r)); else { audio.grow(); setHint(4); } sheetDirty = true; return; }
  if (b.dataset.a === 'close') { sheetMode = null; selRoom = null; world.inside.setSelected(null); }
  if (b.dataset.a === 'upgrade' && selRoom) { const r = sim.upgrade(selRoom.id); if (r) toast(esc(r)); else { audio.chord(); } }
  if (b.dataset.a === 'restyle' && selRoom) { sim.restyle(selRoom.id); audio.pop(); }
  if (b.dataset.a === 'remove' && selRoom) { sim.demolish(selRoom.id); selRoom = null; sheetMode = null; world.inside.setSelected(null); audio.pop(); }
  sheetDirty = true;
});
$('bBuild').onclick = () => { if (drawing) { cancelDraw(); return; } sheetMode = sheetMode === 'build' ? null : 'build'; selRoom = null; world.inside.setSelected(null); sheetDirty = true; };
$('bUnfold').onclick = () => { if (drawing) return; sheetMode = sheetMode === 'unfold' ? null : 'unfold'; selRoom = null; world.inside.setSelected(null); sheetDirty = true; };

function startDraw(type) {
  drawing = { type, a: null, rect: null }; sheetMode = null; sheet.hidden = true;
  world.inside.controls.enabled = false;
  const d = ROOMS[type];
  $('hint').innerHTML = `Drag on the floor to size the <b>${d.name}</b> (${d.line ? `a line ${d.min} to ${d.max} long` : `${d.min} to ${d.max} wide`}). Or just tap to place the smallest one.`; $('hint').hidden = false;
  $('bBuild').textContent = 'Cancel'; $('bUnfold').hidden = true; platformDirty = true;
}
function cancelDraw() {
  if (!drawing) return; drawing = null; world.inside.setGhost(null); world.inside.controls.enabled = view === 'inside'; $('drawcost').hidden = true;
  $('bBuild').textContent = 'Build a room'; $('bUnfold').hidden = false; showHint();
}
function rectFor(type, a, b) {
  const d = ROOMS[type]; const dx = b.x - a.x, dy = b.y - a.y; let w = Math.abs(dx) + 1, h = Math.abs(dy) + 1;
  if (d.line) { if (Math.abs(dx) >= Math.abs(dy)) { w = clamp(w, d.min, d.max); h = 1; } else { h = clamp(h, d.min, d.max); w = 1; } }
  else { w = clamp(w, d.min, d.max); h = clamp(h, d.min, d.max); }
  const horizontalLine = d.line && h === 1 && w >= 1 && Math.abs(dx) >= Math.abs(dy);
  const x = dx >= 0 ? a.x : a.x - (w - 1), y = dy >= 0 ? a.y : a.y - (h - 1);
  return { x: horizontalLine && dx < 0 ? a.x - (w - 1) : x, y, w, h };
}
function updateDraw(cx, cy) {
  const t = world.inside.tileAt(cx, cy); if (!t || !drawing) return;
  if (!drawing.a) drawing.a = t;
  const rc = rectFor(drawing.type, drawing.a, t); drawing.rect = rc;
  const err = sim.canPlace(drawing.type, rc.x, rc.y, rc.w, rc.h);
  world.inside.setGhost(drawing.type, rc.x, rc.y, rc.w, rc.h, !err);
  const p = world.project(rc.x + rc.w / 2, 0.3, rc.y + rc.h / 2), el = $('drawcost');
  el.hidden = false; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.classList.toggle('bad', !!err);
  el.textContent = err ? ERR[err] : `${rc.w} × ${rc.h} · ${sim.roomCost(drawing.type, rc.w, rc.h)} Charm`;
}
function commitDraw() {
  const dr = drawing; if (!dr || !dr.rect) { return; }
  const rc = dr.rect, r = sim.build(dr.type, rc.x, rc.y, rc.w, rc.h);
  if (typeof r === 'string') { toast(esc(ERR[r] || r)); world.inside.setGhost(null); dr.a = null; dr.rect = null; $('drawcost').hidden = true; return; }
  audio.grow(); if (navigator.vibrate) navigator.vibrate(12); setHint(4); cancelDraw(); selRoom = r; sheetMode = 'room'; world.inside.setSelected(r);
}

// ---------- pointer input ----------
const canvas = $('gl'); let ptr = null;
canvas.addEventListener('pointerdown', (e) => {
  ptr = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, id: e.pointerId };
  if (drawing && view === 'inside') updateDraw(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptr || ptr.id !== e.pointerId) return;
  if (Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 9) ptr.moved = true;
  if (drawing && view === 'inside') updateDraw(e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', (e) => {
  if (!ptr || ptr.id !== e.pointerId) return; const p = ptr; ptr = null;
  if (drawing && view === 'inside') { commitDraw(); return; }
  if (!p.moved && performance.now() - p.t < 450) tap(e.clientX, e.clientY);
});
canvas.addEventListener('pointercancel', () => { ptr = null; if (drawing) { world.inside.setGhost(null); drawing.a = null; drawing.rect = null; $('drawcost').hidden = true; } });
function tap(x, y) {
  if (view !== 'inside') return;
  let best = null, bd = 34;
  for (const p of state.passengers) { const q = world.project(p.x, 0.55, p.y); if (!q.ok) continue; const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = p; } }
  if (best) { passengerModal(best); return; }
  const t = world.inside.tileAt(x, y), r = t && sim.roomAt(t.x, t.y);
  if (r) { selRoom = r; sheetMode = 'room'; world.inside.setSelected(r); audio.pop(); } else { selRoom = null; sheetMode = null; world.inside.setSelected(null); }
  sheetDirty = true;
}

// ---------- hud updates ----------
const roomLabels = new Map(), tagLabels = new Map();
let hudT = 0, chuffT = 0;
function updateHud(dt, time) {
  hudT += dt;
  // stoke needle
  stokeT += dt; needleQ = 0.5 + 0.5 * Math.sin(stokeT * 2.6);
  $('needle').style.left = `calc((100% - 5px) * ${needleQ.toFixed(3)})`;
  if (hudT > 0.2) {
    hudT = 0;
    $('charm').textContent = fmt(Math.floor(state.charm));
    $('rate').textContent = '+' + fmt(sim.charmRate() * 60) + ' / min';
    $('miles').textContent = fmt(Math.floor(state.miles)) + ' mi';
    const L = state.line, reg = sim.region();
    $('region').textContent = L.pending ? `waiting at ${L.pending.name}` : `${reg.name} · stop in ${Math.max(0.1, L.nextStop - state.miles).toFixed(1)} mi`;
    const pr = (state.pressure - 22) / 78; $('steamBar').style.width = Math.round(clamp(pr, 0, 1) * 100 + 6) + '%'; $('steamTxt').textContent = `Steam · ${sim.speedMul().toFixed(1)}× speed`;
    if (platformDirty) { renderPlatform(); platformDirty = false; } else renderPlatform();
    if (forkDirty) { renderFork(); forkDirty = false; }
    if (sheetDirty) { renderSheet(); sheetDirty = false; }
    else if (sheetMode === 'build' || sheetMode === 'unfold' || sheetMode === 'room') renderSheetCosts();
    if (view === 'line' && !L.forkChosen && L.forkAnnounced) renderFork();
  }
  // room labels
  const show = view === 'inside' && !modalOpen;
  for (const r of state.rooms) {
    let el = roomLabels.get(r.id);
    if (!el) { el = document.createElement('div'); el.className = 'rname'; el.textContent = ROOMS[r.type].name; labels.appendChild(el); roomLabels.set(r.id, el); }
    if (!show) { el.style.display = 'none'; continue; }
    const p = world.project(r.x + r.w / 2, 0.75, r.y + r.h / 2); el.style.display = p.ok ? '' : 'none'; el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  }
  for (const [id, el] of roomLabels) if (!sim.roomById.has(id)) { el.remove(); roomLabels.delete(id); }
  for (const p of state.passengers) {
    let el = tagLabels.get(p.id);
    if (!el) { el = document.createElement('div'); el.className = 'ptag'; labels.appendChild(el); tagLabels.set(p.id, el); }
    el.textContent = p.name.split(' ')[0];
    if (!show) { el.style.display = 'none'; continue; }
    const q = world.project(p.x, 1.35, p.y); el.style.display = q.ok ? '' : 'none'; el.style.left = q.x + 'px'; el.style.top = q.y + 'px';
  }
  for (const [id, el] of tagLabels) if (!state.passengers.some((p) => p.id === id)) { el.remove(); tagLabels.delete(id); }
  // soft train sound
  chuffT -= dt; if (chuffT <= 0 && sim.speed > 0.02) { chuffT = 0.7 / sim.speedMul(); audio.chuff(view === 'line' ? 0.7 : 0.25); }
}
let lastCosts = '';
function renderSheetCosts() { const sig = [state.charm | 0, state.rooms.length, state.unfolds].join(); if (sig !== lastCosts) { lastCosts = sig; renderSheet(); } }

// ---------- start ----------
if (fresh) queueModal(introModal);
else {
  const away = (Date.now() - state.last) / 1000;
  if (away > 30) { const rep = sim.offline(away); if (away > 90 && (rep.miles > 0.3 || rep.charm > 2)) queueModal(() => awayModal(rep)); }
  state.hint = Math.max(state.hint, 1);
}
sim.checkProgress(); showHint();
world.line.recentre(world.aspect);
let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  let dt = (t - last) / 1000; last = t;
  if (dt > 2.5) { const rep = sim.offline(dt); if (dt > 60 && (rep.miles > 0.3 || rep.charm > 2)) queueModal(() => awayModal(rep)); dt = 0.016; }
  dt = Math.min(dt, 0.1);
  sim.tick(dt); world.frame(dt, t / 1000); updateHud(dt, t / 1000);
}
requestAnimationFrame(loop);
