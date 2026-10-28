/* ----- Cricket : standard, cut-throat et caché ----- */

const CR_LABELS = { standard: 'Cricket', cutthroat: 'Cut-throat', hidden: 'Cricket caché' };
const CR_DESC = {
  standard: 'Ferme 15 à 20 et la bulle en touchant chaque case 3 fois. Une case fermée rapporte des points tant qu’un adversaire ne l’a pas fermée. Gagne celui qui ferme tout avec autant de points que les autres, ou plus.',
  cutthroat: 'Comme le cricket, mais les points vont aux adversaires qui n’ont pas encore fermé la case. Gagne celui qui ferme tout avec le moins de points.',
  hidden: 'Sept cases cachées parmi 1 à 20 et la bulle. Touche un chiffre pour le tester : s’il est caché, il se révèle et se compte ; sinon il est noté comme non trouvé. Règles du cricket standard.'
};
const CR_COLORS = ['#FF5C4D', '#3FD29A', '#F2B84B', '#7AA7FF', '#E58AE5', '#9BE564'];
const CR_STD = [20, 19, 18, 17, 16, 15, 'BULL'];
const CR_ALL = Array.from({ length: 20 }, (_, i) => i + 1).concat(['BULL']);

let crCfg = { mode: 'standard', names: ['Joueur 1', 'Joueur 2'] };
let cr = null;

const valueOf = t => (t === 'BULL' ? 25 : t);
const labelOf = t => (t === 'BULL' ? 'Bull' : String(t));
const sortKey = t => (t === 'BULL' ? 99 : t);
const colorOf = q => CR_COLORS[q % CR_COLORS.length];

function buildKeys(mode) {
  const list = mode === 'hidden' ? CR_ALL : CR_STD;
  $('ckeys').innerHTML = list.map(v => `<button class="key" data-v="${v}">${labelOf(v)}</button>`).join('')
    + '<button class="key" data-sp="0">Raté</button>';
}

function showCricket(name) {
  show(name);
  $('menu').hidden = name !== 'cgame';
}

function newCricket() {
  const names = crCfg.names.map((n, i) => n.trim() || `Joueur ${i + 1}`);
  crCfg.names = names;
  const targets = crCfg.mode === 'hidden'
    ? shuffle(CR_ALL.slice()).slice(0, 7).sort((a, b) => sortKey(a) - sortKey(b))
    : CR_STD.slice();
  cr = {
    mode: crCfg.mode,
    names,
    targets,
    revealed: targets.map(() => crCfg.mode !== 'hidden'),
    marks: names.map(() => targets.map(() => 0)),
    points: names.map(() => 0),
    tested: [],
    turn: 0,
    darts: 0,
    thrown: names.map(() => 0),
    winner: null,
    info: `${names[0]} commence.`
  };
  history = [];
  buildKeys(cr.mode);
  setMult(1);
  showCricket('cgame');
  refreshCricket();
}

// Ajoute m marques sur la case ti du joueur p. Renvoie les points par destinataire.
function crHit(p, ti, m) {
  const t = cr.targets[ti];
  const a = cr.marks[p][ti];
  const used = Math.min(m, Math.max(0, 3 - a));
  const excess = m - used;
  cr.marks[p][ti] = a + m;
  const open = cr.names.map((_, q) => q).filter(q => q !== p && cr.marks[q][ti] < 3);
  if (excess <= 0 || open.length === 0) return 0;
  const pts = valueOf(t) * excess;
  if (cr.mode === 'cutthroat') open.forEach(q => { cr.points[q] += pts; });
  else cr.points[p] += pts;
  return pts;
}

function checkCricketWin() {
  const n = cr.names.length;
  for (let p = 0; p < n; p++) {
    if (!cr.targets.every((_, ti) => cr.marks[p][ti] >= 3)) continue;
    const others = cr.points.filter((_, q) => q !== p);
    const ok = cr.mode === 'cutthroat'
      ? others.every(o => cr.points[p] <= o)
      : others.every(o => cr.points[p] >= o);
    if (ok) { cr.winner = p; return; }
  }
}

// v = 'BULL', un chiffre, ou null pour une fléchette ratée
function crDart(v) {
  if (!cr || cr.winner !== null) return;
  if (cr.mode !== 'hidden' && v !== null && !CR_STD.includes(v)) return;
  history.push(JSON.stringify(cr));
  if (history.length > 300) history.shift();
  const p = cr.turn;
  const m = mult;
  const kind = m === 3 ? 'Triple ' : m === 2 ? 'Double ' : '';
  cr.thrown[p]++;
  cr.darts++;
  let msg;
  if (v === null) {
    msg = 'Fléchette ratée';
  } else if (cr.mode === 'hidden' && cr.targets.indexOf(v) === -1) {
    if (cr.tested.includes(v)) {
      msg = `${labelOf(v)} : déjà testé, pas une cible`;
    } else {
      cr.tested.push(v);
      msg = `${labelOf(v)} : pas une cible`;
    }
  } else {
    const ti = cr.targets.indexOf(v);
    let prefix = '';
    if (cr.mode === 'hidden' && !cr.revealed[ti]) {
      cr.revealed[ti] = true;
      prefix = 'Découvert ! ';
    }
    const pts = crHit(p, ti, m);
    buzz();
    const a = cr.marks[p][ti];
    msg = `${prefix}${kind}${labelOf(v)} : ${Math.min(a, 3)}/3`;
    if (pts) msg += cr.mode === 'cutthroat' ? ` · +${pts} aux adversaires` : ` · +${pts} pts`;
  }
  checkCricketWin();
  if (cr.winner === null && cr.darts >= 3) {
    cr.turn = (p + 1) % cr.names.length;
    cr.darts = 0;
    msg += ` · À ${cr.names[cr.turn]}`;
  }
  cr.info = msg;
  setMult(1);
  toast(msg);
  refreshCricket();
}

function crPass() {
  if (!cr || cr.winner !== null || cr.darts === 0) return;
  history.push(JSON.stringify(cr));
  cr.turn = (cr.turn + 1) % cr.names.length;
  cr.darts = 0;
  cr.info = `À ${cr.names[cr.turn]}`;
  setMult(1);
  toast(cr.info);
  refreshCricket();
}

function crUndo() {
  if (!history.length) return;
  cr = JSON.parse(history.pop());
  setMult(1);
  toast('Coup annulé');
  refreshCricket();
}

function renderCricket() {
  if (!cr) return;
  const n = cr.names.length;
  const over = cr.winner !== null;
  const p = cr.turn;
  $('ctable').style.setProperty('--n', n);
  $('cturn').textContent = over ? 'Partie terminée' : `Tour : ${cr.names[p]}`;
  $('ccount').textContent = `Fléchettes : ${cr.darts}/3`;

  const head = '<div class="crow chead"><span></span>' + cr.names.map((nm, q) =>
    `<span class="cname${!over && q === p ? ' cur' : ''}" style="--pc:${colorOf(q)}">${esc(nm)}</span>`).join('') + '</div>';

  const rows = cr.targets.map((t, ti) => {
    const all = cr.names.every((_, q) => cr.marks[q][ti] >= 3);
    const shown = cr.revealed[ti];
    const cells = cr.names.map((_, q) => {
      const a = cr.marks[q][ti];
      const sym = a === 0 ? '·' : a === 1 ? '/' : a === 2 ? 'X' : '⊗';
      const extra = a > 3 ? `<small>+${a - 3}</small>` : '';
      return `<span class="mk${a >= 3 ? ' closed' : ''}" style="--pc:${colorOf(q)}">${sym}${extra}</span>`;
    }).join('');
    return `<div class="crow ctr${all ? ' done' : ''}"><span class="clab${shown ? '' : ' hid'}">${shown ? esc(labelOf(t)) : '?'}</span>${cells}</div>`;
  }).join('');

  const pts = '<div class="crow cpts"><span class="clab">Pts</span>' + cr.points.map((v, q) =>
    `<span class="pv" style="--pc:${colorOf(q)}">${v}</span>`).join('') + '</div>';

  const tested = cr.mode === 'hidden' && cr.tested.length
    ? `<p class="tested">Testés, pas des cibles : ${cr.tested.map(labelOf).join(', ')}</p>` : '';

  $('ctable').innerHTML = head + rows + pts + tested;
  $('cinfo').textContent = cr.info || '';
  $('cmult').querySelectorAll('button').forEach(b => { b.disabled = over; });
  $('ckeys').querySelectorAll('.key').forEach(b => {
    b.disabled = over || (b.dataset.v === 'BULL' && mult === 3);
  });
  $('cpass').disabled = over || cr.darts === 0;
  $('cundo').disabled = !history.length;

  $('cend').hidden = !over;
  if (over) {
    const total = cr.thrown.reduce((s, x) => s + x, 0);
    $('ctitle').textContent = `${cr.names[cr.winner]} gagne !`;
    $('ctext').textContent = `${CR_LABELS[cr.mode]} · ${total} fléchettes lancées.`;
  }
}

function refreshCricket() {
  renderCricket();
  crSave();
}

function crSave() {
  try { localStorage.setItem(KEY, JSON.stringify({ crCfg, cr, history })); } catch (e) {}
}

function renderCsetup() {
  document.querySelectorAll('#cmodes [data-cm]').forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.cm === crCfg.mode)));
  $('cmodeText').textContent = CR_DESC[crCfg.mode];
  $('cplist').innerHTML = crCfg.names.map((n, i) =>
    `<div class="prowin"><input data-i="${i}" maxlength="18" value="${esc(n)}" aria-label="Nom du joueur ${i + 1}" autocomplete="off">`
    + (crCfg.names.length > 2 ? `<button class="btn ghost rm" data-rm="${i}" aria-label="Retirer ce joueur">×</button>` : '')
    + '</div>').join('');
  $('caddP').disabled = crCfg.names.length >= 6;
  $('cresume').hidden = !(cr && cr.winner === null);
}

function showCsetup() {
  showCricket('csetup');
  renderCsetup();
}

/* ----- événements ----- */

$('menu').addEventListener('click', showCsetup);
$('cmodes').addEventListener('click', e => {
  const b = e.target.closest('[data-cm]');
  if (!b) return;
  crCfg.mode = b.dataset.cm;
  renderCsetup();
});
$('cplist').addEventListener('input', e => {
  const i = +e.target.dataset.i;
  if (!Number.isNaN(i)) crCfg.names[i] = e.target.value;
});
$('cplist').addEventListener('click', e => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  crCfg.names.splice(+b.dataset.rm, 1);
  renderCsetup();
});
$('caddP').addEventListener('click', () => {
  if (crCfg.names.length >= 6) return;
  crCfg.names.push(`Joueur ${crCfg.names.length + 1}`);
  renderCsetup();
});
$('cstart').addEventListener('click', newCricket);
$('cresume').addEventListener('click', () => { showCricket('cgame'); renderCricket(); });
$('ckeys').addEventListener('click', e => {
  const b = e.target.closest('.key');
  if (!b || b.disabled) return;
  if (b.dataset.sp !== undefined) crDart(null);
  else crDart(b.dataset.v === 'BULL' ? 'BULL' : +b.dataset.v);
});
$('cundo').addEventListener('click', crUndo);
$('cpass').addEventListener('click', crPass);
$('cagain').addEventListener('click', newCricket);
$('cchange').addEventListener('click', showCsetup);

/* ----- démarrage ----- */

(function init() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (s) {
    crCfg = s.crCfg || crCfg;
    cr = s.cr || null;
    history = s.history || [];
  }
  buildKeys(cr ? cr.mode : crCfg.mode);
  if (cr && cr.winner === null) { showCricket('cgame'); renderCricket(); }
  else showCsetup();
})();
