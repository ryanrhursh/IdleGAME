import { Sim, newState, loadState, fmt, clamp, defOf, passengerAt, regionOf, stopName, landmarkFor, tellOf, talkOutcome, GW, GH, relOf, relKey, firstOf } from './logic.js';
import { World } from './world.js';
import { Audio } from './audio.js';
import { ROOMS, LORE, HINTS, HOBBY_ROOM, VOLUMES, NEED_TEXT, PALETTES, TALK, RAPPORT_TEXT, RETURN_LINES } from './data.js';
import { LOOK, LOOKS, LOOK_ID, saveLook } from './look.js';
import { scene, portrait, plateSwatch } from './scenes.js';
import { Journey } from './journey.js';
document.body.dataset.look = LOOK.ui;

const SAVE_KEY = 'marigold.save.v2';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// ---------- load ----------
let state = null, fresh = false;
try { state = loadState(localStorage.getItem(SAVE_KEY)); } catch (e) { state = null; }
if (!state) { state = newState(); fresh = true; }
const AFK_MS = 30 * 60 * 1000;
const CTL_LABEL = { both: 'stick + tap', tap: 'tap to walk', stick: 'joystick' };
if (!state.controlsSet) state.controls = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'tap' : 'both';   // phones get the stick and tap-to-walk together
if (state.mode === 'journey' && Date.now() - (state.lastInput || 0) > AFK_MS) state.mode = 'afk';
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
window.__game = { passengerAt, audio, sim, world, state, landmarkFor, stopModal: () => stopModal(), farewellModal: (p, k, f) => farewellModal(p, k, f), talkScene: (c, st) => talkScene(c, st) };
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

// ---------- journey mode: the conductor on foot ----------
let speechT = 0, dutiesDirty = true, journey = null;
const jui = {
  audio,
  speech(name, text, tale) { const el = $('speech'); el.innerHTML = `<small>${tale === 'look' ? 'you see' : tale === 'moment' ? 'a quiet moment' : tale ? 'tells you a tale' : 'says'}</small><b>${esc(name)}</b><p>${esc(text)}</p>`; el.hidden = false; clearTimeout(speechT); speechT = setTimeout(() => { el.hidden = true; }, 4200 + text.length * 40); audio.note(9, 0.3); },
  note(msg) { toast(esc(msg)); },
  prompt(n) { const b = $('actBtn'); if (n) { b.textContent = n.label; b.hidden = false; } else b.hidden = true; },
  console(near) { if (view === 'journey') $('stoke').hidden = !near; },
  lock(on) { if (on) state.lockSeen = true; mouseUi(); },
};
journey = new Journey(world, sim, jui);
window.__game.journey = journey; journey.sens = clamp(+state.sens || 1, 0.25, 2);
let lastInputWrite = 0;
function markInput() { const n = Date.now(); if (n - lastInputWrite > 1000) { state.lastInput = n; lastInputWrite = n; } }
['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, markInput, { passive: true }));
markInput();
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
function mouseUi() {
  const j = view === 'journey' && finePointer && state.mouselook !== false;
  $('cross').hidden = !(j && (journey.locked || journey.hover));
  $('lockHint').hidden = !(j && !journey.locked && !journey.hover && !state.lockSeen);
}
function applyControls() { mouseUi(); const st = view === 'journey' && state.controls !== 'tap'; $('stick').hidden = !st; document.body.dataset.stick = st ? '1' : '0'; }
function renderDuties() {
  const el = $('duties'); if (view !== 'journey') { el.hidden = true; return; }
  const J = state.jobs.list;
  el.hidden = false; if (el.dataset.init !== '1') { el.dataset.init = '1'; el.classList.toggle('open', state.jobs.done < 3); el.onclick = () => el.classList.toggle('open'); }
  el.innerHTML = `<h4>Duties <i>${el.classList.contains('open') ? '\u25be' : '\u25b8'}</i></h4>${J.length ? J.map((j) => `<div class="duty"><b>${esc(j.title)}</b>${j.goal > 1 ? `<span>${j.prog}/${j.goal}</span>` : ''}<small>${esc(j.desc)}</small></div>`).join('') : '<small>No duties just now. Another will be posted soon.</small>'}${sim.carry ? `<div class="carry">Carrying: ${sim.carry.kind === 'tea' ? 'a cup of tea' : 'the post bag'}</div>` : ''}<small class="bonus">Walking your train: +25% Charm</small>`;
}
hooks.jobs = () => { dutiesDirty = true; };
hooks.jobdone = (job) => { toast(`Duty done: <b>${esc(job.title)}</b>. +${fmt(job.reward)} Charm.`); audio.chord(); dutiesDirty = true; if (journey && journey.active) journey.syncProps(true); };

// ---------- hints ----------
let hintTimer = 0;
function setHint(n) { if (n <= state.hint && n !== 0) return; state.hint = n; showHint(); }
function showHint() {
  const el = $('hint'); if (drawing) return;
  if (view === 'journey') { el.hidden = true; return; }
  if (state.hint >= HINTS.length) { el.hidden = true; return; }
  el.innerHTML = HINTS[state.hint]; el.hidden = false; clearTimeout(hintTimer);
  if (state.hint === 3) hintTimer = setTimeout(() => { if (state.hint === 3) { state.hint = 4; showHint(); } }, 45000);
}

// ---------- modals ----------
const modal = $('modal'); let modalOpen = false; const modalQ = [];
function openModal(html, onClose) { if (journey) journey.releaseLock(); modal.innerHTML = `<div class="card">${html}</div>`; modal.hidden = false; modalOpen = true; modal._onClose = onClose; sheetHide(); }
function closeModal() { modal.hidden = true; modalOpen = false; const f = modal._onClose; modal._onClose = null; if (f) f(); const next = modalQ.shift(); if (next) next(); }
function queueModal(fn) { if (modalOpen) modalQ.push(fn); else fn(); }
modal.addEventListener('click', (e) => { if (e.target === modal && !modal.querySelector('[data-nodismiss]')) closeModal(); });

// ---------- sim hooks ----------
hooks.layout = () => { sheetDirty = true; };
hooks.emote = (e) => { if (view === 'inside' || view === 'journey') world.inside.emote(e.id, e.kind); };
hooks.stop = (st) => {
  toast(`The Marigold slows into <b>${esc(st.name)}</b>.`); audio.whistle(); platformDirty = true;
  setTimeout(() => { if (state.line.pending && !modalOpen && (view === 'line' || view === 'journey')) stopModal(); }, 1600);
};
hooks.whistle = (name, bonus) => { toast(`Whistle-stop at <b>${esc(name)}</b>. +${bonus} Charm.`); audio.pop(); };
hooks.postcard = (c) => { toast(`<i>${esc(c.text)}</i>`); badge('bBook', true); };
hooks.region = (r) => { showChapter(r); audio.chord(); forkDirty = true; };
hooks.fork = () => { forkDirty = true; toast('A <b>fork</b> in the Line is coming up. Choose a way.'); audio.whistle(); };
hooks.board = (p, c) => { toast(`<b>${esc(p.name)}</b> boards. ${esc(c.trait)}.`); audio.chord(); setHint(2); platformDirty = true; };
hooks.unlock = (type) => toast(`<b>${esc(ROOMS[type].name)}</b> unlocked. You can build one now.`);
hooks.tale = (p, text) => { toast(`<b>${esc(p.name)}</b> opened up. A new tale is in People.`); badge('bPeople', true); audio.note(9, 0.5); };
hooks.depart = ({ p, keep, farewell }) => { showSlip('\u2766 A farewell', p.name, () => farewellModal(p, keep, farewell)); audio.chord(); };
hooks.wishseen = (p, w) => { toast(`<b>${esc(firstOf(p.name))}</b> confides a hope: <i>${esc(w.text)}</i>`); badge('bPeople', true); audio.note(9, 0.5); };
hooks.wish = (p, w) => { showSlip('\u2726 A wish came true', p.name, () => passengerModal(p)); audio.chord(); };
hooks.bond = (a, b, t) => { toast(`<i>${esc(t)}</i>`); audio.note(10, 0.4); badge('bPeople', true); };
hooks.squabble = (a, b, t) => { toast(`<i>${esc(t)}</i>${view === 'journey' ? ' Go and sit between them.' : ''}`); audio.note(3, 0.3); };
hooks.bell = () => { toast('<i>The dinner bell rings. Everyone is heading for the dining car.</i>'); };
hooks.dinner = ({ n, gain }) => { toast(n ? `Dinner is over. <b>${n}</b> ${n === 1 ? 'traveller' : 'travellers'} shared it. +${fmt(gain)} Charm.` : 'Dinner is over. Nobody made it to the table, but the soup was lovely.'); audio.chord(); };
hooks.letter = (c) => { showSlip('\u2709 A letter has come', 'from ' + c.from.split(' ')[0], () => bookModal(null, 'postcards')); badge('bBook', true); audio.note(8, 0.5); };
hooks.lore = (e) => { if (e.id !== 'start') { showPageNote(e); badge('bBook', true); audio.note(11, 0.45); } };

// ---------- storybook touches: chapter banners and new-page slips ----------
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const roman = (n) => (n < ROMAN.length ? ROMAN[n] : String(n));
const seedOf = (name) => Math.abs(Array.from(String(name)).reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7));
let chapterTimer = 0, noteTimer = 0;
function showChapter(r) {
  const el = $('chapterBanner'), n = (state.plates || []).length;
  el.innerHTML = `<small>Chapter ${roman(n)}</small><b>${esc(r.name)}</b><i>In which the Marigold finds ${esc(r.hint)}.</i>`;
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(chapterTimer); chapterTimer = setTimeout(() => { el.hidden = true; }, 6200);
}
const slipQ = []; let slipAct = null, slipOn = false;
function nextSlip() {
  const b = $('pageNote'), s = slipQ.shift();
  if (!s) { b.hidden = true; slipOn = false; slipAct = null; return; }
  slipOn = true; slipAct = s.act; b.innerHTML = `<span>${s.label}</span><b>${esc(s.title)}</b>`; b.hidden = false;
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  clearTimeout(noteTimer); noteTimer = setTimeout(nextSlip, 9000);
}
function showSlip(label, title, act) { slipQ.push({ label, title, act }); if (!slipOn) nextSlip(); }
function showPageNote(e) { showSlip('✎ A page has been written', e.title, () => bookModal(e.id)); }
$('pageNote').onclick = () => { const a = slipAct; clearTimeout(noteTimer); nextSlip(); if (a && !modalOpen) a(); };

// ---------- view switching ----------
let view = 'line', platformDirty = true, forkDirty = true, sheetDirty = true, sheetMode = null, drawing = null, selRoom = null;
function setView(v) {
  if (v === view) return;
  const prev = view;
  cancelDraw(); selRoom = null; sheetMode = null; world.inside.setSelected(null);
  const fade = $('fade'); fade.style.opacity = 1;
  setTimeout(() => {
    view = v; world.setView(v);
    if (prev === 'journey') journey.exit();
    if (v === 'journey') journey.enter();
    $('bLine').setAttribute('aria-pressed', v === 'line'); $('bInside').setAttribute('aria-pressed', v === 'inside');
    $('stoke').hidden = !(v === 'line'); $('inbar').hidden = v !== 'inside'; sheetHide(); platformDirty = forkDirty = true;
    $('actBtn').hidden = true; $('speech').hidden = true; dutiesDirty = true; applyControls();
    if (v === 'inside') { setHint(3); showHint(); } else if (v === 'journey') { $('hint').hidden = true; }
    fade.style.opacity = 0;
  }, 200);
}
// ---------- the two ways to play: AFK and Journey ----------
function setGameMode(mode, auto) {
  if (state.mode === mode && view === (mode === 'journey' ? 'journey' : view)) { if (mode === 'afk' || view === 'journey') return; }
  state.mode = mode; document.body.dataset.mode = mode;
  $('modeBtn').textContent = mode === 'journey' ? 'AFK' : 'Journey'; $('modeBtn').setAttribute('aria-pressed', mode === 'journey');
  if (mode === 'journey') {
    setView('journey');
    if (!state.seenJourney) { state.seenJourney = true; queueModal(journeyIntro); }
  } else {
    setView('line');
    if (auto) toast('The conductor has stepped away. The Marigold runs herself.');
  }
}
$('modeBtn').onclick = () => { if (!modalOpen) setGameMode(state.mode === 'journey' ? 'afk' : 'journey'); };
function journeyIntro() {
  openModal(`<div class="head">${portrait(7, 76)}<div><div class="eyebrow">Journey mode</div><h2>The conductor on foot</h2></div></div>
  <p class="dropcap">You can walk the Marigold yourself. Stand among your passengers, hear their tales in person, and see to the small duties that keep a train warm.</p>
  <p>${state.controls === 'stick' ? 'Use the stick to walk and drag the screen to look.' : state.controls === 'both' ? 'Use the stick to walk, drag the screen to look, or just tap the floor to walk there.' : 'Tap anywhere on the floor to walk there, and drag to look around.'} On a computer, click the view to look around with your mouse (press Esc to let go and use the buttons), and use W A S D and E. Gold lights mark what your duties need.</p>
  <p>While you are walking your train, it earns a quarter more, and each finished duty pays Charm. Step back to AFK at any time and she will run herself, steady and calm. After half an hour without a touch, she does it for you.</p>
  <div class="row2"><button class="btn" id="go">Take the cap</button></div>`);
  $('go').onclick = closeModal;
}
$('bLine').onclick = () => { if (!modalOpen) setView('line'); };
$('bInside').onclick = () => { if (!modalOpen) setView('inside'); };

// ---------- stoke ----------
let stokeT = 0, needleQ = 0.5;
$('stokeBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault(); audio.resume();
  const res = sim.stoke(needleQ), r = $('stokeBtn').getBoundingClientRect();
  sim.jobEvent('stoke'); audio.coal(res === 'perfect'); if (navigator.vibrate) navigator.vibrate(res === 'perfect' ? 18 : 8);
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
  const sp = sim.stopPerson(), c = sp.c, free = sim.freeBeds(), first = firstOf(c.name), fits = sim.fits(c);
  const oddTxt = c.beds === 0 ? `Takes <b>no berth</b>, and is worth ${Math.round((c.mult - 1) * 100)}% more Charm.` : c.beds > 1 ? `Needs <b>${c.beds} berths</b>.` : '';
  const rels = state.passengers.map((p) => [p, relOf(c.name, p.name)]).filter(([, r]) => r.kind !== 'neutral');
  const relTxt = rels.length ? `<p class="tell">${rels.map(([p, r]) => r.kind === 'friends' ? `Would get on well with ${esc(firstOf(p.name))}.` : `Might clash with ${esc(firstOf(p.name))}.`).join(' ')}</p>` : '';
  const hobbyName = c.hobby ? (c.hobby === 'chat' ? 'good company' : ROOMS[HOBBY_ROOM[c.hobby]].name) : '';
  const gift = !sp.returning && c.gift && !state.unlocked.includes(c.gift) ? `Brings the know-how for a <b>${esc(ROOMS[c.gift].name)}</b>.` : !sp.returning && c.gift ? `Already knows a craft you have: ${esc(ROOMS[c.gift].name)}.` : '';
  const story = sp.returning
    ? `<div class="quote">${esc(first)} is back on the platform, waving with the whole arm. ${esc(RETURN_LINES[c.hobby || 'chat'])}</div>`
    : `<div class="quote">${esc(c.line)}</div><p class="tell">${esc(tellOf(c))}</p>`;
  openModal(`<div class="head">${portrait(seedOf(c.name), 76)}<div><div class="eyebrow">${sp.returning ? 'A familiar face' : 'Platform'} · ${esc(st.name)}</div><h2>${esc(c.name)}</h2></div></div>
  <div class="chips"><span class="chip">${esc(c.trait)}</span>${hobbyName ? `<span class="chip">likes: ${esc(hobbyName)}</span>` : ''}</div>
  ${story}
  ${relTxt}
  <p>${gift} ${oddTxt} Berths free: <b>${free}</b> of ${sim.beds}.</p>
  <div class="row2"><button class="btn" id="inv" ${!fits ? 'disabled' : ''}>${sp.returning ? 'Welcome them back' : 'Invite aboard'}</button>${sp.returning ? '' : `<button class="btn ghost" id="talk" ${!fits ? 'disabled' : ''}>Talk first</button>`}<button class="btn ghost" id="wave">${sp.returning ? 'Not this time' : 'Wave goodbye'}</button><button class="btn ghost" id="later">Not yet</button></div>
  ${!fits ? `<p style="color:var(--bad);font-size:13px">${c.beds > 1 ? first + ' needs ' + c.beds + ' free berths.' : 'No berth is free.'} Build more Sleeper space inside, then come back to the platform.</p>` : ''}`, () => { platformDirty = true; });
  $('inv').onclick = () => { const r = sim.invite(); if (r) toast(esc(r)); else { audio.chord(); closeModal(); } };
  if ($('talk')) $('talk').onclick = () => talkScene(c, st);
  $('wave').onclick = () => { sim.decline(); toast(sp.returning ? 'You wave, and promise to look for them again.' : 'You wave from the window until they are small.'); closeModal(); };
  $('later').onclick = closeModal;
}
// The optional conversation. Whatever you do, they come aboard; reading them well just starts things warmer.
function talkScene(c, st) {
  openModal(`<div class="head">${portrait(seedOf(c.name), 76)}<div><div class="eyebrow">A word on the platform</div><h2>${esc(c.name)}</h2></div></div>
  <p class="tell">${esc(tellOf(c))}</p>
  <p>What do you do?</p>
  <div class="talk">${Object.entries(TALK).map(([k, t]) => `<button class="act" data-k="${k}"><b>${esc(t.label)}</b><small>${esc(t.sub)}</small></button>`).join('')}</div>
  <div class="row2"><button class="btn ghost" id="back">Never mind</button></div>`, () => { platformDirty = true; });
  modal.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => {
    const o = talkOutcome(c, b.dataset.k);
    modal.querySelector('.card').innerHTML = `<div class="head">${portrait(seedOf(c.name), 76)}<div><div class="eyebrow">${esc(RAPPORT_TEXT[o.level])}</div><h2>${esc(c.name)}</h2></div></div>
      <div class="quote">${esc(o.reply)}</div>
      <div class="row2"><button class="btn" id="board">Welcome aboard</button></div>`;
    $('board').onclick = () => { const r = sim.invite(o); if (r) toast(esc(r)); else { audio.chord(); closeModal(); } };
  }; });
  $('back').onclick = () => { closeModal(); setTimeout(() => { if (state.line.pending && !modalOpen) stopModal(); }, 50); };
}
function farewellModal(p, keep, farewell) {
  openModal(`<div class="head">${portrait(seedOf(p.name), 76)}<div><div class="eyebrow">A farewell</div><h2>${esc(p.name)} steps off</h2></div></div>
  <div class="quote">${esc(farewell)}</div>
  <p>They leave <b>${esc(keep.name)}</b> behind. ${esc(keep.line)}</p>
  <p style="color:var(--muted);font-size:14px;font-style:italic">They may write. They may come back.</p>
  <div class="row2"><button class="btn" id="x">Wave from the window</button></div>`);
  $('x').onclick = closeModal;
}

// ---------- people ----------
function wishHtml(p) {
  if (!p.wish) return '';
  if (p.wishState === 'granted') return `<p class="tale wishline">\u2726 <b>Wish granted:</b> ${esc(p.wish.text)}</p>`;
  if (!p.wishSeen) return `<p class="trait wishline">They seem to be hoping for something. Keep them company, and they may tell you.</p>`;
  const pr = Math.round(sim.wishProgress(p) * 100);
  return `<p class="tale wishline">\u2726 <b>A hope:</b> ${esc(p.wish.text)}</p><div class="bar"><i style="width:${pr}%"></i></div>`;
}
function relsHtml(p) {
  const out = [];
  for (const q of state.passengers) if (q !== p) { const r = relOf(p.name, q.name); if (r.kind === 'neutral') continue; const x = state.rel[relKey(p.name, q.name)];
    out.push(r.kind === 'friends' ? `Friends with <b>${esc(firstOf(q.name))}</b>${x && x.bond >= 30 ? ' \u2665' : ''}` : `${x && x.feud ? 'Quarrelling with' : 'Does not always see eye to eye with'} <b>${esc(firstOf(q.name))}</b>`); }
  return out.length ? `<p style="color:var(--muted);font-size:13px">${out.join(' \u00b7 ')}</p>` : '';
}
function moodBar(p) { return `<div class="bar"><i style="width:${p.mood.toFixed(0)}%"></i></div>`; }
function peopleModal() {
  badge('bPeople', false);
  const ps = state.passengers;
  openModal(`<div class="eyebrow">People</div><h2>${ps.length ? 'Aboard the Marigold' : 'An empty train'}</h2>
  ${ps.length ? `<div class="list">${ps.map((p) => { const d = defOf(p); return `<button class="item" data-p="${p.id}"><b>${esc(p.name)}</b><small>${p.wish && p.wishState === 'granted' ? '\u2726 ' : ''}${esc(d.trait)} · ${p.tales}/3 tales · off in ~${Math.max(1, Math.round(p.dest - state.miles))} mi${d.beds !== 1 ? ' · ' + (d.beds ? d.beds + ' berths' : 'no berth') : ''}</small>${moodBar(p)}</button>`; }).join('')}</div>` : '<p>Stop at a station, and invite someone aboard. They bring their stories and their own know-how.</p>'}
  <p style="color:var(--muted);font-size:13px">Free berths: ${sim.freeBeds()} of ${sim.beds}.</p>
  <div class="row2"><button class="btn ghost" id="x">Close</button></div>`);
  modal.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => passengerModal(state.passengers.find((p) => p.id === +b.dataset.p)); });
  $('x').onclick = closeModal;
}
function passengerModal(p) {
  if (!p) return; const d = defOf(p), room = sim.rt.get(p.id);
  openModal(`<div class="head">${portrait(seedOf(p.name), 76)}<div><div class="eyebrow">${esc(d.trait)}</div><h2>${esc(p.name)}</h2></div></div>
  <div><small style="color:var(--muted)">Fondness for the train</small>${moodBar(p)}</div>
  <p style="color:var(--muted)">Getting off in about <b style="color:var(--gold)">${Math.max(1, Math.round(p.dest - state.miles))} miles</b>. Likes ${esc(d.hobby === 'chat' ? 'good company' : ROOMS[HOBBY_ROOM[d.hobby]].name)}.</p>
  ${wishHtml(p)}${relsHtml(p)}
  ${p.first ? `<p style="color:var(--muted);font-size:13px">How you met: <b style="color:var(--gold)">${esc(p.first.level === 'returned' ? 'An old friend, back aboard.' : RAPPORT_TEXT[p.first.level] || '')}</b>${p.first.choice ? ' You ' + esc(TALK[p.first.choice].label.toLowerCase()) + '.' : ''}</p>` : ''}
  ${p.since ? `<p class="tell">Since last time: ${esc(p.since)}</p>` : ''}
  ${p.trip ? `<p style="color:var(--muted);font-size:13px">Average trip: <b style="color:var(--gold)">${Math.round(p.trip)} steps</b>. ${p.trip <= 6 ? 'Short walks make them happy: +25% Charm.' : p.trip <= 12 ? 'A comfortable walk.' : 'Long walks wear on them. Move their favorite rooms closer to the berths.'}</p>` : ''}
  <ul class="tales">${d.tales.map((t, i) => `<li class="${i < p.tales ? '' : 'locked'}">${i < p.tales ? esc(t) : 'A tale they have not told yet. It comes when they feel at home.'}</li>`).join('')}</ul>
  <div class="row2"><button class="btn" id="find">Find them inside</button><button class="btn ghost" id="x">Close</button></div>
  <div><small style="color:var(--muted)">Rename</small><input type="text" id="nm" maxlength="22" value="${esc(p.name)}"></div>`);
  $('x').onclick = closeModal; $('nm').onchange = (e) => { const v = e.target.value.trim().slice(0, 22); if (v) p.name = v; };
  $('find').onclick = () => { closeModal(); const go = () => { const c = world.inside.controls; c.target.set(p.x, 0, p.y); world.inside.camera.position.set(p.x, 9, p.y + 9); }; if (view !== 'inside') { setView('inside'); setTimeout(go, 260); } else go(); };
}

// ---------- the storybook ----------
let bookTab = 'chapters', bookIdx = 0, folkIdx = 0;
// ---------- photographs: kept on this device only (they would make the save code enormous) ----------
const PHOTO_KEY = 'marigold.photos.v1'; let photos = [], snapPending = false;
try { photos = JSON.parse(localStorage.getItem(PHOTO_KEY) || '[]'); if (!Array.isArray(photos)) photos = []; } catch (e) { photos = []; }
function savePhotos() { for (let i = 0; i < 6; i++) { try { localStorage.setItem(PHOTO_KEY, JSON.stringify(photos)); return; } catch (e) { if (photos.length < 2) return; photos.shift(); } } }
function takePhoto() {
  const c = world.canvas, W = 320, H = Math.max(1, Math.round((c.height * W) / c.width)), t = document.createElement('canvas'); t.width = W; t.height = H;
  let img; try { t.getContext('2d').drawImage(c, 0, 0, W, H); img = t.toDataURL('image/jpeg', 0.72); } catch (e) { toast('The camera would not take that one.'); return; }
  const rg = sim.region(), rm = view === 'journey' ? sim.roomAt(Math.floor(journey.x), Math.floor(journey.z)) : null;
  const cap = view === 'journey' ? `${rm ? ROOMS[rm.type].name : 'On board'}, in the ${rg.name}` : view === 'inside' ? 'The Marigold, inside' : `The ${rg.name}`;
  photos.push({ id: Date.now(), img, cap, mile: Math.round(state.miles) }); if (photos.length > 14) photos.shift(); savePhotos();
  state.photosTaken = (state.photosTaken || 0) + 1; if (!state.photoRegions) state.photoRegions = [];
  let bonus = ''; if (!state.photoRegions.includes(rg.name)) { state.photoRegions.push(rg.name); state.charm += 20 * sim.charmMul; bonus = ` A new view: +${Math.round(20 * sim.charmMul)} Charm.`; }
  const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); audio.shutter();
  toast(`Snap! It is in the Book, under <b>Album</b>.${bonus}`); badge('bBook', true); sim.checkProgress();
}
$('snap').onclick = () => { snapPending = true; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function needLine(e) { return Object.entries(e.need).map(([k, v]) => NEED_TEXT[k](v)).join(' and '); }
function bookModal(openId, tab) {
  badge('bBook', false); if (tab) bookTab = tab;
  if (openId) { const i = LORE.findIndex((e) => e.id === openId); if (i >= 0) { bookTab = 'chapters'; bookIdx = i; } }
  else if (bookTab === 'chapters') { let last = 0; LORE.forEach((e, i) => { if (state.journal.includes(e.id)) last = i; }); bookIdx = Math.min(LORE.length - 1, Math.max(bookIdx, last)); }
  openModal(`<div class="book"><div class="spine"><span>${esc(state.name || 'The Marigold Line')}</span><small>${state.journal.length} of ${LORE.length} pages written</small></div>
  <nav class="tabs" role="tablist">${[['chapters', 'Chapters'], ['folk', 'Folk'], ['plates', 'Plates'], ['postcards', 'Postcards'], ['album', 'Album'], ['keeps', 'Keepsakes']].map(([k, n]) => `<button role="tab" data-t="${k}" aria-selected="${k === bookTab}">${n}</button>`).join('')}</nav>
  <div id="pg" class="page"></div><div class="pager" id="pager"></div><div class="row2"><button class="btn ghost" id="x">Close the book</button></div></div>`);
  $('x').onclick = closeModal;
  modal.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { bookTab = b.dataset.t; modal.querySelectorAll('[data-t]').forEach((o) => o.setAttribute('aria-selected', o === b)); renderBook(true); }; });
  renderBook(false);
}
function renderBook(flip) {
  const pg = $('pg'), pager = $('pager'); let html = '', pagerHtml = '';
  if (bookTab === 'chapters') {
    const e = LORE[bookIdx], got = state.journal.includes(e.id), pr = sim.loreProgress(e);
    html = `<div class="vol">Volume ${roman(e.vol + 1)} · ${esc(VOLUMES[e.vol])}</div><div class="ch">Chapter ${roman(bookIdx + 1)}</div>`
      + (got ? `<div class="plate">${scene(e.scene)}</div><h3>${esc(e.title)}</h3><p class="dropcap">${esc(e.text)}</p>`
        : `<div class="plate blank"><span>❦</span></div><h3>A page not yet written</h3><p class="hintline">${esc(needLine(e))}, and the page will write itself.</p><div class="bar"><i style="width:${Math.round(pr * 100)}%"></i></div>`);
    pagerHtml = `<button id="pv" ${bookIdx <= 0 ? 'disabled' : ''} aria-label="Previous page">‹</button><span>Page ${bookIdx + 1} of ${LORE.length}</span><button id="nx" ${bookIdx >= LORE.length - 1 ? 'disabled' : ''} aria-label="Next page">›</button>`;
  } else if (bookTab === 'folk') {
    const ps = state.passengers; folkIdx = Math.min(folkIdx, Math.max(0, ps.length - 1));
    if (!ps.length) html = '<div class="vol">The Folk</div><h3>No one is aboard</h3><p class="dropcap">When someone steps onto the Marigold, their page is started here, and it fills in as they feel at home.</p>';
    else { const p = ps[folkIdx], d = defOf(p); html = `<div class="vol">The Folk</div><div class="folkhead">${portrait(seedOf(p.name), 84)}<div><h3>${esc(p.name)}</h3><p class="trait">${esc(d.trait)}</p><p class="trait">Off in about ${Math.max(1, Math.round(p.dest - state.miles))} miles</p></div></div>${p.since ? `<p class="tale since">Since last time: ${esc(p.since)}</p>` : ''}${wishHtml(p)}${relsHtml(p)}${d.tales.map((t, i) => `<p class="${i < p.tales ? 'tale' : 'tale blankline'}">${i < p.tales ? esc(t) : 'Not yet told.'}</p>`).join('')}${p.first ? `<p class="trait">${esc(p.first.level === 'returned' ? 'An old friend, back aboard.' : RAPPORT_TEXT[p.first.level] || '')}</p>` : ''}`; }
    pagerHtml = ps.length > 1 ? `<button id="pv" ${folkIdx <= 0 ? 'disabled' : ''}>‹</button><span>${folkIdx + 1} of ${ps.length}</span><button id="nx" ${folkIdx >= ps.length - 1 ? 'disabled' : ''}>›</button>` : '';
  } else if (bookTab === 'plates') {
    const pl = (state.plates || []).slice().reverse();
    html = `<div class="vol">Plates</div><p class="intro">Each region you cross is painted into the book. There is always another.</p><div class="plates">${pl.map((x) => { const P = PALETTES[x.pal] || PALETTES[0]; return `<figure>${plateSwatch(hex(P.sky[0]), hex(P.sky[1]), hex(P.ground), hex(P.tint), x.weather)}<figcaption><b>${esc(x.name)}</b><span>${esc(x.line)}</span><small>Mile ${x.mile}</small></figcaption></figure>`; }).join('')}</div>`;
  } else if (bookTab === 'album') {
    html = `<div class="vol">Album</div>${photos.length ? `<div class="album">${photos.slice().reverse().map((p) => `<figure class="polaroid"><img src="${p.img}" alt="${esc(p.cap)}"><figcaption>${esc(p.cap)}<small>${esc(new Date(p.id).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))} · mile ${p.mile}</small></figcaption><button class="del" data-del="${p.id}" aria-label="Remove this photograph">\u00d7</button></figure>`).join('')}</div>` : '<p class="intro">Tap the camera at the top right to take a photograph of whatever is in front of you. They will be kept here. (Photographs stay on this device and are not part of the save code.)</p>'}`;
  } else if (bookTab === 'postcards') {
    html = `<div class="vol">Postcards</div><div class="pcs">${state.postcards.length ? state.postcards.slice().reverse().slice(0, 40).map((c) => c.from ? `<div class="card-pc letter"><em>${esc(c.text)}</em><small>\u2709 ${esc(c.from)} · mile ${c.mile}</small></div>` : `<div class="card-pc">${esc(c.text)}<small>Mile ${c.mile} · ${esc(c.region)}</small></div>`).join('') : '<p class="intro">Postcards turn up as the Line rolls by.</p>'}</div>`;
  } else {
    html = `<div class="vol">Keepsakes</div>${state.keepsakes.length ? `<ul class="keeps">${state.keepsakes.map((k) => `<li><b>${esc(k.name)}</b><span>left by ${esc(k.who)}. ${esc(k.line)}</span></li>`).join('')}</ul>` : '<p class="intro">When someone steps off at their stop, they leave a small thing behind. It will be kept here.</p>'}`;
  }
  pg.innerHTML = html; pg.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { photos = photos.filter((p) => String(p.id) !== b.dataset.del); savePhotos(); renderBook(false); }; });
  pager.innerHTML = pagerHtml; pager.hidden = !pagerHtml; pg.scrollTop = 0;
  if (flip) { pg.classList.remove('flip'); void pg.offsetWidth; pg.classList.add('flip'); }
  const pv = $('pv'), nx = $('nx');
  if (pv) pv.onclick = () => { if (bookTab === 'chapters') bookIdx--; else folkIdx--; audio.pop(); renderBook(true); };
  if (nx) nx.onclick = () => { if (bookTab === 'chapters') bookIdx++; else folkIdx++; audio.pop(); renderBook(true); };
}
const BUILD_TIME = typeof __BUILD_TIME__ === 'undefined' ? '' : __BUILD_TIME__;
function buildStamp() { if (!BUILD_TIME) return 'unknown (dev build)'; const d = new Date(BUILD_TIME); return isNaN(d) ? BUILD_TIME : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' (' + d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC)'; }
const DBG = { bloom: 'Glow (bloom)', outline: 'Outlines', grain: 'Paper grain', glow: 'Lamp glows and dust', paper: 'Wallpaper pattern', pics: 'Wall pictures' }, dbgOff = {};
function menuModal() {
  openModal(`<div class="eyebrow">Settings</div><h2>The Marigold Line</h2>
  <div class="row2"><button class="btn ghost" id="snd">Sound: ${audio.enabled ? 'on' : 'off'}</button><button class="btn ghost" id="rc">Recentre the view</button></div>
  <div class="slider"><label for="sens">Look sensitivity <b id="sensVal">${(clamp(+state.sens || 1, 0.25, 2)).toFixed(2)}\u00d7</b></label><input type="range" id="sens" min="0.25" max="2" step="0.05" value="${clamp(+state.sens || 1, 0.25, 2)}"></div>
  <div class="row2"><button class="btn ghost" id="ml">Mouse look: ${state.mouselook === false ? 'off' : 'on'} (change)</button></div>
  <div class="row2"><button class="btn ghost" id="ctl">Walking: ${CTL_LABEL[state.controls] || 'tap to walk'} (change)</button></div>
  <div class="row2"><button class="btn ghost" id="look">Look: ${esc(LOOK.name)} (change)</button></div>
  <div class="row2"><button class="btn ghost" id="gfx">Graphics: ${({ low: 'Low (faster)', high: 'High', undefined: 'Auto' })[state.gfx]}</button></div>
  <div class="row2"><button class="btn ghost" id="auto">While I'm away, welcome travellers: ${state.auto ? 'yes' : 'no'}</button></div>
  <div><small style="color:var(--muted)">Name your train</small><input type="text" id="tn" maxlength="24" value="${esc(state.name)}" placeholder="The Marigold"></div>
  <div class="row2"><button class="btn ghost sm" id="exp">Copy save code</button><button class="btn ghost sm" id="imp">Load save code</button><button class="btn ghost sm" id="rst">Start over</button></div>
  <details style="margin:6px 0"><summary style="cursor:pointer;color:var(--muted);font-size:13px">Troubleshooting: switch parts of the picture off</summary>
    <p style="color:var(--muted);font-size:12px;margin:6px 0">If you see odd dots or specks in Journey, turn these off one at a time and see which makes them vanish. Tell me which. (They reset when you reload.)</p>
    <div class="row2">${Object.entries(DBG).map(([k, n]) => `<button class="btn ghost sm" data-dbg="${k}">${n}: ${dbgOff[k] ? 'off' : 'on'}</button>`).join('')}</div></details>
  <div id="io"></div><p class="buildstamp" style="color:var(--muted);font-size:12px;text-align:center;margin:4px 0" title="${esc(BUILD_TIME)}">Updated ${esc(buildStamp())}</p><div class="row2"><button class="btn" id="x">Done</button></div>`);
  modal.querySelectorAll('[data-dbg]').forEach((b) => { b.onclick = () => { const k = b.dataset.dbg; dbgOff[k] = !dbgOff[k]; world.debug(k, dbgOff[k]); b.textContent = `${DBG[k]}: ${dbgOff[k] ? 'off' : 'on'}`; }; });
  $('x').onclick = closeModal;
  $('snd').onclick = (e) => { audio.enabled = !audio.enabled; state.sound = audio.enabled; audio.apply(); e.target.textContent = 'Sound: ' + (audio.enabled ? 'on' : 'off'); };
  $('rc').onclick = () => { world.line.recentre(world.aspect); world.inside.fit(world.aspect); closeModal(); };
  $('auto').onclick = (e) => { state.auto = !state.auto; e.target.textContent = `While I'm away, welcome travellers: ${state.auto ? 'yes' : 'no'}`; };
  $('sens').oninput = (e) => { const v = clamp(+e.target.value, 0.25, 2); state.sens = v; journey.sens = v; $('sensVal').textContent = v.toFixed(2) + '\u00d7'; };
  $('ml').onclick = (e) => { state.mouselook = state.mouselook === false; e.target.textContent = `Mouse look: ${state.mouselook === false ? 'off' : 'on'} (change)`; if (state.mouselook === false) journey.releaseLock(); mouseUi(); };
  $('ctl').onclick = (e) => { state.controls = { both: 'tap', tap: 'stick', stick: 'both' }[state.controls] || 'both'; state.controlsSet = true; e.target.textContent = `Walking: ${CTL_LABEL[state.controls]} (change)`; applyControls(); };
  $('look').onclick = () => { const ids = Object.keys(LOOKS), next = ids[(ids.indexOf(LOOK_ID) + 1) % ids.length]; save(); saveLook(next); location.href = location.pathname + location.hash; };
  $('gfx').onclick = (e) => { const order = [undefined, 'low', 'high'], i = (order.indexOf(state.gfx) + 1) % 3; state.gfx = order[i]; world.setGfx(state.gfx || 'auto'); e.target.textContent = 'Graphics: ' + ({ low: 'Low (faster)', high: 'High', undefined: 'Auto' })[state.gfx]; };
  $('tn').onchange = (e) => { state.name = e.target.value.trim().slice(0, 24); };
  $('exp').onclick = async () => { save(); const code = btoa(unescape(encodeURIComponent(JSON.stringify(state)))); try { await navigator.clipboard.writeText(code); toast('Save code copied.'); } catch (e) { $('io').innerHTML = `<input type="text" readonly value="${code}" onfocus="this.select()">`; } };
  $('imp').onclick = () => { $('io').innerHTML = '<input type="text" id="code" placeholder="Paste save code, then press Load"><div class="row2" style="margin-top:8px"><button class="btn sm" id="go">Load</button></div>'; $('go').onclick = () => { try { const raw = decodeURIComponent(escape(atob($('code').value.trim()))); if (!loadState(raw)) throw 0; localStorage.setItem(SAVE_KEY, raw); location.reload(); } catch (e) { toast('That save code did not work.'); } }; };
  $('rst').onclick = (e) => { if (e.target.dataset.sure) { try { localStorage.removeItem(SAVE_KEY); } catch (er) { /* ignore */ } state.last = 0; location.reload(); } else { e.target.dataset.sure = 1; e.target.textContent = 'Really erase everything?'; } };
}
$('bPeople').onclick = () => { if (!modalOpen) peopleModal(); };
$('bBook').onclick = () => { if (!modalOpen) bookModal(); };
$('menuBtn').onclick = () => { if (!modalOpen) menuModal(); };

function introModal() {
  openModal(`<div class="book intro"><div class="plate">${scene('once')}</div><div class="vol">A story, begun</div><h2>Once Upon a Rail</h2>
  <p class="dropcap">There was once a small train called the Marigold, and she was far larger inside than out. Someone long ago had stitched a charm into her seams, so that every room on board was exactly as big as the people in it needed.</p>
  <p>The track appeared only a little way ahead of her wheels. People waited at stations. Some of them stayed a while and filled the rooms you made. Some of them left something behind.</p>
  <p>You are the conductor. The book you are holding writes itself as you go. Nothing here ever needs rushing.</p>
  <div class="row2"><button class="btn" id="begin">Turn the page</button></div></div>`, () => { setHint(0); showChapter(sim.region()); });
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
  ptr = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: e.timeStamp, moved: false, id: e.pointerId };
  if (view === 'journey') return;
  if (drawing && view === 'inside') updateDraw(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (!ptr || ptr.id !== e.pointerId) return;
  if (Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > (e.pointerType === 'touch' ? 16 : 9)) ptr.moved = true;
  if (view === 'journey') { if (ptr.moved && !journey.locked) journey.turn(e.clientX - ptr.lx, e.clientY - ptr.ly, 1, e.pointerType !== 'mouse'); ptr.lx = e.clientX; ptr.ly = e.clientY; return; }
  if (drawing && view === 'inside') updateDraw(e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', (e) => {
  if (!ptr || ptr.id !== e.pointerId) return; const p = ptr; ptr = null;
  if (view === 'journey') {
    if (e.pointerType === 'mouse' && finePointer && state.mouselook !== false) {
      if (journey.locked) journey.tapCenter(); else if (!journey.hover) journey.requestLock(); else if (!p.moved && e.timeStamp - p.t < 450) journey.tap(e.clientX, e.clientY);
      return;
    }
    if (!p.moved && e.timeStamp - p.t < 600) journey.tap(e.clientX, e.clientY);
    return;
  }
  if (drawing && view === 'inside') { commitDraw(); return; }
  if (!p.moved && e.timeStamp - p.t < 450) tap(e.clientX, e.clientY);
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
  $('snap').hidden = modalOpen || !!drawing;
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
    if (view === 'journey' && (dutiesDirty || true)) { renderDuties(); dutiesDirty = false; }
  }
  // room labels
  const show = view === 'inside' && !modalOpen, showTags = (view === 'inside' || view === 'journey') && !modalOpen;
  for (const r of state.rooms) {
    let el = roomLabels.get(r.id);
    if (!el) { el = document.createElement('div'); el.className = 'rname'; el.textContent = ROOMS[r.type].name; labels.appendChild(el); roomLabels.set(r.id, el); }
    if (el.textContent !== ROOMS[r.type].name) el.textContent = ROOMS[r.type].name;
    if (!show) { el.style.display = 'none'; continue; }
    const p = world.project(r.x + r.w / 2, 0.75, r.y + r.h / 2); el.style.display = p.ok ? '' : 'none'; el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  }
  for (const [id, el] of roomLabels) if (!sim.roomById.has(id)) { el.remove(); roomLabels.delete(id); }
  for (const p of state.passengers) {
    let el = tagLabels.get(p.id);
    if (!el) { el = document.createElement('div'); el.className = 'ptag'; labels.appendChild(el); tagLabels.set(p.id, el); }
    el.textContent = firstOf(p.name);
    if (!showTags || (view === 'journey' && Math.hypot(p.x - journey.x, p.y - journey.z) > 5)) { el.style.display = 'none'; continue; }
    const q = world.project(p.x, view === 'journey' ? 0.7 : 1.35, p.y); el.style.display = q.ok ? '' : 'none'; el.style.left = q.x + 'px'; el.style.top = q.y + 'px';
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
document.body.dataset.mode = state.mode; $('modeBtn').textContent = state.mode === 'journey' ? 'AFK' : 'Journey';
if (state.mode === 'journey') setTimeout(() => setGameMode('journey'), 50);
world.line.recentre(world.aspect);
let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  let dt = (t - last) / 1000; last = t;
  if (dt > 2.5) { const rep = sim.offline(dt); if (dt > 60 && (rep.miles > 0.3 || rep.charm > 2)) queueModal(() => awayModal(rep)); dt = 0.016; }
  dt = Math.min(dt, 0.1);
  if (state.mode === 'journey' && Date.now() - (state.lastInput || 0) > AFK_MS) setGameMode('afk', true);
  sim.tick(dt); if (view === 'journey') journey.update(dt, t / 1000); world.frame(dt, t / 1000); if (snapPending) { snapPending = false; takePhoto(); } updateHud(dt, t / 1000);
}
requestAnimationFrame(loop);
