/* ----- Trois cents : un sniper (centre seulement) contre un fantassin, deux tours ----- */

const T_TARGET = 300;   // atteint ou dépassé : le joueur finit ses fléchettes, l'autre ne joue plus
const T_SNIPER = 9;     // fléchettes du sniper dans son tour

function tInProgress() {
  return !!lv && lv.phase !== 'over';
}

function startTrois() {
  lcfg.names = lcfg.names.map((n, i) => n.trim() || `Joueur ${i + 1}`);
  const first = Math.random() < 0.5 ? 0 : 1;
  lv = {
    names: lcfg.names.slice(),
    tourNo: 1,
    sniper: first,
    phase: 'sniper',          // 'sniper' | 'infantry' | 'tourEnd' | 'over'
    sniperThrown: 0,
    firstCentre: null,        // rang (1 à 9) du premier coup au centre du sniper
    infantryLimit: 0,         // fléchettes accordées au fantassin
    infantryThrown: 0,
    tourPts: [0, 0],          // points de ce tour
    done: [],                 // { sniper, pts } des tours terminés
    log: [],
    info: ''
  };
  lv.info = `Tirage au sort : ${lv.names[first]} commence en sniper.`;
  history = [];
  setMult(1);
  show('tgame');
  refresh();
}

function tTotals() {
  return [0, 1].map(p => lv.done.reduce((s, t) => s + t.pts[p], 0));
}

// Coup du sniper : 25 (bull), 50 (bulle) ou raté. Il lance ses 9 fléchettes sans s'arrêter.
function snipe(label, pts) {
  if (!lv || lv.phase !== 'sniper') return;
  snap();
  const s = lv.sniper;
  lv.sniperThrown++;
  lv.tourPts[s] += pts;
  if (pts > 0 && lv.firstCentre === null) lv.firstCentre = lv.sniperThrown;
  lv.log.push({ who: s, label, pts });
  setMult(1);
  if (lv.sniperThrown >= T_SNIPER) finishSniper();
  else if (lv.tourPts[s] >= T_TARGET) lv.info = `${lv.names[s]} atteint ${T_TARGET} : il finit ses fléchettes.`;
  refresh();
}

function finishSniper() {
  const s = lv.sniper;
  // Pas de centre en 9 fléchettes : le rang vaut 10, donc le fantassin a 9 fléchettes
  const rank = lv.firstCentre === null ? T_SNIPER + 1 : lv.firstCentre;
  lv.infantryLimit = rank - 1;
  if (lv.tourPts[s] >= T_TARGET) {
    endTour(`${lv.names[s]} atteint ${T_TARGET} : ${lv.names[1 - s]} ne joue pas.`);
  } else if (lv.infantryLimit === 0) {
    endTour(`Centre au premier coup : ${lv.names[1 - s]} n’a pas de fléchette.`);
  } else {
    lv.phase = 'infantry';
    lv.info = `${lv.names[s]} a fini ses ${T_SNIPER} fléchettes. ${lv.names[1 - s]} joue ${lv.infantryLimit} fléchette${lv.infantryLimit > 1 ? 's' : ''}.`;
  }
}

// Coup du fantassin : tous les scores comptent, avec simple, double ou triple
function infantryHit(label, pts) {
  if (!lv || lv.phase !== 'infantry') return;
  snap();
  const f = 1 - lv.sniper;
  lv.infantryThrown++;
  lv.tourPts[f] += pts;
  lv.log.push({ who: f, label, pts });
  setMult(1);
  if (lv.infantryThrown >= lv.infantryLimit) {
    endTour(`${lv.names[f]} a joué ses ${lv.infantryLimit} fléchette${lv.infantryLimit > 1 ? 's' : ''}.`);
  } else {
    lv.info = lv.tourPts[f] >= T_TARGET
      ? `${lv.names[f]} atteint ${T_TARGET} : il finit ses fléchettes.`
      : `${lv.names[f]} : ${lv.tourPts[f]} points dans ce tour.`;
  }
  refresh();
}

// Fin du tour (fantassin qui arrête, ou plus de fléchettes)
function passTrois() {
  if (!lv || lv.phase !== 'infantry') return;
  snap();
  endTour(`${lv.names[1 - lv.sniper]} arrête son tour.`);
  refresh();
}

function endTour(msg) {
  lv.done.push({ sniper: lv.sniper, pts: lv.tourPts.slice() });
  lv.phase = lv.tourNo < 2 ? 'tourEnd' : 'over';
  lv.info = msg;
  lv.log = [];
}

function nextTour() {
  if (!lv || lv.phase !== 'tourEnd') return;
  lv.tourNo = 2;
  lv.sniper = 1 - lv.done[0].sniper;
  lv.phase = 'sniper';
  lv.sniperThrown = 0;
  lv.firstCentre = null;
  lv.infantryLimit = 0;
  lv.infantryThrown = 0;
  lv.tourPts = [0, 0];
  lv.info = `Tour 2 : ${lv.names[lv.sniper]} est sniper.`;
  history = [];
  setMult(1);
  refresh();
}

function renderTrois() {
  if (!lv) return;
  const over = lv.phase === 'over';
  const between = lv.phase === 'tourEnd';
  const sn = lv.sniper;
  const fi = 1 - sn;
  const tot = tTotals();
  const live = !over && !between;

  $('tmode').textContent = `Tour ${lv.tourNo} sur 2`;

  $('tplayers').innerHTML = [0, 1].map(p => {
    const role = live ? (p === sn ? 'Sniper' : 'Fantassin') : '';
    const active = live && (lv.phase === 'sniper' ? p === sn : p === fi);
    const total = tot[p] + (live ? lv.tourPts[p] : 0);
    return `<div class="prow x${active ? ' active' : ''}">`
      + `<div class="pname">${esc(lv.names[p])}${role ? ` <span class="role">${role}</span>` : ''}</div>`
      + `<div class="xscore">${total}</div>`
      + `<div class="xlast">${live || between ? lv.tourPts[p] : ''}</div></div>`;
  }).join('');

  let cur = '';
  let rem = '';
  let hint = '';
  if (lv.phase === 'sniper') {
    cur = `${lv.names[sn]} · sniper`;
    rem = `Reste ${T_SNIPER - lv.sniperThrown} fléchette${T_SNIPER - lv.sniperThrown > 1 ? 's' : ''}`;
    hint = lv.tourPts[sn] >= T_TARGET
      ? `${T_TARGET} atteint : il finit ses fléchettes, l’autre ne joue pas.`
      : 'Centre seulement : Bull 25 ou Bulle 50. Il lance ses 9 fléchettes d’affilée.';
  } else if (lv.phase === 'infantry') {
    const left = lv.infantryLimit - lv.infantryThrown;
    cur = `${lv.names[fi]} · fantassin`;
    rem = `Reste ${left} fléchette${left > 1 ? 's' : ''}`;
    hint = 'Tous les scores comptent. « Fin du tour » arrête quand tu veux.';
  } else if (between) {
    cur = `Tour ${lv.tourNo} terminé`;
  } else {
    cur = 'Partie terminée';
  }
  $('tcur').textContent = cur;
  $('trem').textContent = rem;
  $('thint').textContent = hint;
  $('tlog').textContent = lv.log.slice(-12).map(d => `${lv.names[d.who]} : ${d.label}${d.pts ? ' (' + d.pts + ')' : ''}`).join(' · ');
  $('tinfo').textContent = lv.info || '';

  const sniperTurn = lv.phase === 'sniper';
  const infTurn = lv.phase === 'infantry';
  $('tkeys').innerHTML = sniperTurn
    ? '<button class="key" data-sp="0">Raté</button><button class="key" data-sp="25">Bull · 25</button><button class="key" data-sp="50">Bulle · 50</button>'
    : Array.from({ length: 20 }, (_, k) => `<button class="key" data-n="${k + 1}">${k + 1}</button>`).join('')
      + '<button class="key" data-sp="0">Raté</button><button class="key" data-sp="25">Bull · 25</button><button class="key" data-sp="50">Bulle · 50</button>';
  $('tkeys').querySelectorAll('.key').forEach(b => { b.disabled = !(sniperTurn || infTurn); });
  $('tmult').querySelectorAll('button').forEach(b => { b.disabled = !infTurn; });
  $('tpass').disabled = !infTurn;
  $('tundo').disabled = !history.length;

  $('tend').hidden = !(between || over);
  $('tnext').hidden = !between;
  $('tagain').hidden = !over;
  if (between) {
    const d = lv.done[lv.done.length - 1];
    $('ttitle').textContent = `Fin du tour ${lv.tourNo}`;
    $('ttext').textContent = `${lv.names[0]} : ${d.pts[0]} · ${lv.names[1]} : ${d.pts[1]}`;
  } else if (over) {
    const t = tTotals();
    const diff = Math.abs(t[0] - t[1]);
    $('ttitle').textContent = t[0] === t[1] ? 'Égalité' : `${lv.names[t[0] > t[1] ? 0 : 1]} gagne !`;
    const rows = lv.done.map((d, i) => `Tour ${i + 1} : ${lv.names[0]} ${d.pts[0]} – ${lv.names[1]} ${d.pts[1]}`).join(' · ');
    $('ttext').textContent = `${rows}. Total : ${lv.names[0]} ${t[0]}, ${lv.names[1]} ${t[1]}. Différence : ${diff}.`;
  }
}

function refresh() {
  if (lv) renderTrois();
  save();
}

function renderTsetup() {
  $('tplayers-setup').innerHTML = lcfg.names.slice(0, 2).map((n, i) =>
    `<div class="field"><label for="tn${i}">Joueur ${i + 1}</label><input id="tn${i}" data-i="${i}" maxlength="18" value="${esc(n)}" autocomplete="off"></div>`
  ).join('');
}

function showTsetup() {
  renderTsetup();
  $('tresume').hidden = !tInProgress();
  show('tsetup');
}

/* ----- événements ----- */

$('menu').addEventListener('click', showTsetup);
$('tplayers-setup').addEventListener('input', e => {
  const i = +e.target.dataset.i;
  if (!Number.isNaN(i)) lcfg.names[i] = e.target.value;
});
$('tstart').addEventListener('click', startTrois);
$('tresume').addEventListener('click', () => { show('tgame'); renderTrois(); });
$('tkeys').addEventListener('click', e => {
  const b = e.target.closest('.key');
  if (!b || b.disabled) return;
  if (lv && lv.phase === 'sniper') {
    const v = b.dataset.sp !== undefined ? +b.dataset.sp : 0;
    snipe(v === 0 ? 'Raté' : v === 25 ? 'Bull' : 'Bulle', v);
    return;
  }
  if (b.dataset.n) {
    const n = +b.dataset.n;
    const m = mult;
    infantryHit((m === 3 ? 'T' : m === 2 ? 'D' : '') + n, n * m);
  } else {
    const v = +b.dataset.sp;
    infantryHit(v === 0 ? 'Raté' : v === 25 ? 'Bull' : 'Bulle', v);
  }
});
$('tundo').addEventListener('click', undo);
$('tpass').addEventListener('click', passTrois);
$('tnext').addEventListener('click', nextTour);
$('tagain').addEventListener('click', startTrois);
$('tchange').addEventListener('click', showTsetup);

/* ----- démarrage ----- */

restoreSaved();
if (tInProgress()) { show('tgame'); renderTrois(); }
else showTsetup();
