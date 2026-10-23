/* Logique commune à tous les jeux : état, sauvegarde, navigation, messages. */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WIN = 4;

let cfg = { names: ['Rouge', 'Verte'], bull: false };
let lcfg = { names: ['Joueur 1', 'Joueur 2'], lives: 5 };
let st = null;        // partie morpion
let lv = null;        // partie vies
let history = [];
let mult = 1;         // multiplicateur de la prochaine fléchette
let toastTimer = 0;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Vies conseillées selon le nombre de joueurs (pour garder une partie courte)
const suggestLives = n => (n <= 2 ? 5 : n === 3 ? 4 : n <= 5 ? 3 : 2);

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
}

function buzz() {
  try { navigator.vibrate && navigator.vibrate(15); } catch (e) {}
}

function setMult(v) {
  mult = v;
  document.querySelectorAll('.mult [data-m]').forEach(b =>
    b.setAttribute('aria-pressed', String(+b.dataset.m === v)));
}

document.querySelectorAll('.mult').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('[data-m]');
  if (b && !b.disabled) setMult(+b.dataset.m);
}));

function show(name) {
  document.querySelectorAll('[data-screen]').forEach(s => { s.hidden = s.dataset.screen !== name; });
  $('menu').hidden = name === 'msetup' || name === 'lsetup';
  window.scrollTo(0, 0);
}

function snap() {
  history.push(JSON.stringify({ st, lv }));
  if (history.length > 300) history.shift();
}

function undo() {
  if (!history.length) return;
  const s = JSON.parse(history.pop());
  st = s.st;
  lv = s.lv;
  setMult(1);
  toast('Coup annulé');
  refresh();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ cfg, lcfg, st, lv, history })); } catch (e) {}
}

function restoreSaved() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!s) return;
  cfg = s.cfg || cfg;
  lcfg = s.lcfg || lcfg;
  st = s.st || null;
  lv = s.lv || null;
  history = s.history || [];
}
