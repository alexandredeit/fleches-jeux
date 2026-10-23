/* ----- Vies : battle royale ou classique (selon GAME_MODE) ----- */

$('gbrand').innerHTML = `${esc(GAME_LABEL)} <span>fléchettes</span>`;

// Clavier : 1 à 20, Raté, Bull (25) et Bulle (50)
$('keys').innerHTML =
  Array.from({ length: 20 }, (_, k) => `<button class="key" data-n="${k + 1}">${k + 1}</button>`).join('')
  + '<button class="key" data-sp="0">Raté</button>'
  + '<button class="key" data-sp="25">Bull · 25</button>'
  + '<button class="key" data-sp="50">Bulle · 50</button>';

function inProgressLives() {
  return !!lv && lv.phase !== 'over';
}

function alivePlayers() {
  return lv.players.map((_, i) => i).filter(i => lv.players[i].lives > 0);
}

// Les joueurs de la liste, dans l'ordre tiré au sort, en commençant par le lanceur
function orderFrom(list, starter) {
  const pos = lv.order.indexOf(starter);
  const out = [];
  for (let k = 0; k < lv.order.length; k++) {
    const j = lv.order[(pos + k) % lv.order.length];
    if (list.includes(j)) out.push(j);
  }
  return out;
}

// Une étape de jeu : qui lance, dans quel ordre, avec des totaux remis à zéro
function startStage(pool) {
  lv.pool = pool;
  lv.seq = orderFrom(pool, lv.starter);
  lv.k = 0;
  lv.cur = [];
  lv.totals = {};
  lv.prev = null;
  lv.phase = 'turn';
}

function beginRound() {
  lv.stages = [];
  lv.tieLevel = 0;
  startStage(alivePlayers());
}

function checkLivesEnd() {
  const alive = alivePlayers();
  if (alive.length <= 1) {
    lv.winner = alive.length ? alive[0] : 'draw';
    lv.phase = 'over';
    return true;
  }
  return false;
}

function startLives() {
  lcfg.names = lcfg.names.map((n, i) => n.trim() || `Joueur ${i + 1}`);
  const order = shuffle(Array.from({ length: lcfg.names.length }, (_, i) => i));
  lv = {
    mode: GAME_MODE,
    start: lcfg.lives,
    players: lcfg.names.map(name => ({ name, lives: lcfg.lives })),
    order,
    starter: order[0],
    round: 1,
    seq: [], pool: [], k: 0, cur: [], totals: {}, prev: null,
    phase: 'turn', info: '', stages: [], tieLevel: 0, winner: null
  };
  beginRound();
  lv.info = 'Ordre tiré au sort : ' + order.map(i => lv.players[i].name).join(', ') + '.';
  history = [];
  setMult(1);
  show('lives');
  refresh();
}

function nextRound(prefix = '') {
  const pos = lv.order.indexOf(lv.starter);
  lv.starter = lv.order[(pos + 1) % lv.order.length];
  lv.round++;
  beginRound();
  lv.info = (prefix ? prefix + ' ' : '') + `Manche ${lv.round} : ${lv.players[lv.seq[0]].name} commence.`;
}

function addDart(p, label) {
  if (!lv || lv.phase !== 'turn' || lv.cur.length >= 3) return;
  snap();
  lv.cur.push({ label, p });
  buzz();
  setMult(1);
  refresh();
}

// Fin du tour de la personne en cours (3 fléchettes saisies)
function validateTurn() {
  if (!lv || lv.phase !== 'turn' || lv.cur.length < 3) return;
  snap();
  const idx = lv.seq[lv.k];
  const p = lv.players[idx];
  const total = lv.cur.reduce((s, d) => s + d.p, 0);
  lv.totals[idx] = total;
  lv.cur = [];

  if (GAME_MODE === 'classic') {
    if (lv.prev === null) {
      lv.info = `${p.name} fait ${total} : c'est la référence de la manche.`;
    } else if (total <= lv.prev.total) {
      p.lives--;
      lv.info = `${p.name} fait ${total}, il ne bat pas ${lv.prev.name} (${lv.prev.total}) : il perd une vie.`
        + (p.lives <= 0 ? ' Il est éliminé.' : '');
    } else {
      lv.info = `${p.name} fait ${total} et bat ${lv.prev.name} (${lv.prev.total}).`;
    }
    lv.prev = { idx, name: p.name, total };
    lv.k++;
    if (!checkLivesEnd() && lv.k >= lv.seq.length) nextRound(lv.info);
  } else {
    lv.k++;
    if (lv.k >= lv.seq.length) resolveStage();
    else lv.info = `${p.name} fait ${total}.`;
  }
  refresh();
}

// Battle royale : fin d'une étape. Si plusieurs joueurs ont le plus petit total,
// ils relancent 3 fléchettes chacun ; les autres sont qualifiés. Une seule perte de vie par manche.
function resolveStage() {
  const rows = lv.seq.map(i => ({ idx: i, name: lv.players[i].name, total: lv.totals[i] }));
  const min = Math.min(...rows.map(r => r.total));
  const losers = rows.filter(r => r.total === min).map(r => r.idx);
  const tie = losers.length > 1;
  const label = lv.tieLevel ? `Départage ${lv.tieLevel}` : `Manche ${lv.round}`;
  const sorted = rows
    .slice()
    .sort((a, b) => b.total - a.total)
    .map(r => ({
      name: r.name,
      total: r.total,
      tie: tie && losers.includes(r.idx),
      lost: !tie && r.idx === losers[0]
    }));

  if (!tie) {
    lv.players[losers[0]].lives--;
    lv.stages.push({ label, rows: sorted, final: true });
    lv.info = `${lv.players[losers[0]].name} perd une vie avec ${min} points.`;
    lv.phase = 'summary';
    checkLivesEnd();
  } else {
    lv.stages.push({ label, rows: sorted, final: false });
    const names = losers.map(i => lv.players[i].name).join(', ');
    lv.tieLevel++;
    lv.info = `Égalité à ${min} entre ${names} : ils relancent 3 fléchettes chacun pour départager.`;
    startStage(losers);
  }
}

function stageStatus(stage, r) {
  if (stage.final) return r.lost ? 'perd une vie' : 'sauve sa vie';
  return r.tie ? 'à égalité' : 'qualifié';
}

function renderLives() {
  if (!lv) return;
  const over = lv.phase === 'over';
  const sum = lv.phase === 'summary';
  const playable = lv.phase === 'turn';
  const idx = lv.seq[lv.k];
  const cur = lv.cur;

  $('lmode').textContent = `${GAME_LABEL} · Manche ${lv.round}${lv.tieLevel ? ' · Départage ' + lv.tieLevel : ''}`;

  $('lplayers').innerHTML = lv.players.map((p, i) => {
    const out = p.lives <= 0;
    const active = playable && i === idx;
    const qualified = playable && lv.tieLevel > 0 && !lv.pool.includes(i) && !out;
    const hearts = Array.from({ length: lv.start }, (_, k) =>
      `<i class="heart${k < p.lives ? ' on' : ''}"></i>`).join('');
    let tot;
    if (out) tot = '<span class="tag2">Éliminé</span>';
    else if (qualified) tot = '<span class="tag2">Qualifié</span>';
    else tot = lv.totals[i] !== undefined ? lv.totals[i] : '';
    return `<div class="prow${active ? ' active' : ''}${out ? ' out' : ''}">`
      + `<div class="pname">${esc(p.name)}</div>`
      + `<div class="hearts" role="img" aria-label="${p.lives} vie(s) sur ${lv.start}">${hearts}</div>`
      + `<div class="ptot">${tot}</div></div>`;
  }).join('');

  let target = '';
  if (playable) {
    if (GAME_MODE === 'battle') {
      target = lv.tieLevel
        ? 'Départage : seuls les joueurs à égalité relancent 3 fléchettes. Le total le plus bas perd une vie.'
        : 'Le total le plus bas de la manche perd une vie. En cas d’égalité, les ex-aequo relancent.';
    } else {
      target = lv.prev
        ? `À battre : ${lv.prev.total} (${lv.prev.name})`
        : 'Premier de la manche : il fixe la référence et ne perd pas de vie.';
    }
  }
  $('ltarget').textContent = target;

  $('lcur').textContent = playable ? lv.players[idx].name : (over ? 'Partie terminée' : 'Fin de manche');
  $('lsum').textContent = `Total : ${cur.reduce((s, d) => s + d.p, 0)}`;
  $('lslots').innerHTML = [0, 1, 2].map(k => {
    const d = cur[k];
    return `<div class="slot${d ? ' filled' : ''}">${d ? `<span>${esc(d.label)}</span><small>${d.p}</small>` : ''}</div>`;
  }).join('');

  $('linfo').textContent = lv.info;

  $('lmult').querySelectorAll('button').forEach(b => { b.disabled = !playable; });
  document.querySelectorAll('#keys .key').forEach(b => { b.disabled = !playable || cur.length >= 3; });
  $('lvalid').disabled = !(playable && cur.length === 3);
  $('lundo').disabled = !history.length;

  $('lend').hidden = !(over || sum);
  $('lnext').hidden = !sum;
  $('lagain').hidden = !over;
  $('lchange').hidden = !over;
  if (over) {
    $('ltitle').textContent = lv.winner === 'draw' ? 'Égalité' : `${lv.players[lv.winner].name} gagne !`;
    $('ltext').textContent = `Partie terminée en ${lv.round} manche${lv.round > 1 ? 's' : ''}.`;
  } else {
    $('ltitle').textContent = `Fin de la manche ${lv.round}`;
    $('ltext').textContent = '';
  }
  $('lrows').innerHTML = (lv.stages || []).map(s =>
    `<div class="stagehd">${esc(s.label)}</div>`
    + s.rows.map(r =>
        `<div class="srow"><span>${esc(r.name)}</span><span><b>${r.total}</b> · ${stageStatus(s, r)}</span></div>`
      ).join('')
  ).join('');
}

function refresh() {
  if (lv) renderLives();
  save();
}

function renderLsetup() {
  $('plist').innerHTML = lcfg.names.map((n, i) =>
    `<div class="prowin"><input data-i="${i}" maxlength="18" value="${esc(n)}" aria-label="Nom du joueur ${i + 1}" autocomplete="off">`
    + (lcfg.names.length > 2 ? `<button class="btn ghost rm" data-rm="${i}" aria-label="Retirer ce joueur">×</button>` : '')
    + `</div>`).join('');
  $('addP').disabled = lcfg.names.length >= 8;
  $('livesOut').textContent = lcfg.lives;
  const n = lcfg.names.length;
  const s = suggestLives(n);
  $('livesHint').textContent = `Conseillé : ${s} vie${s > 1 ? 's' : ''} pour ${n} joueurs.`;
}

function showLsetup() {
  $('lsetupTitle').textContent = GAME_LABEL;
  $('lrule').textContent = GAME_MODE === 'battle'
    ? 'Chaque manche, chacun lance 3 fléchettes. Le total le plus bas perd une vie. En cas d’égalité sur ce total, les joueurs à égalité relancent 3 fléchettes chacun ; les autres sont qualifiés. Un joueur à zéro vie est éliminé. Le dernier en lice gagne.'
    : 'Dans un ordre tiré au sort, chacun lance 3 fléchettes et doit faire plus que le joueur qui vient de jouer, sinon il perd une vie. Le premier de la manche fixe la référence et ne perd pas de vie. Le dernier en lice gagne.';
  renderLsetup();
  $('lresume').hidden = !inProgressLives();
  show('lsetup');
}

/* ----- événements ----- */

$('menu').addEventListener('click', showLsetup);
$('plist').addEventListener('input', e => {
  const i = +e.target.dataset.i;
  if (!Number.isNaN(i)) lcfg.names[i] = e.target.value;
});
$('plist').addEventListener('click', e => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  lcfg.names.splice(+b.dataset.rm, 1);
  lcfg.lives = suggestLives(lcfg.names.length);
  renderLsetup();
});
$('addP').addEventListener('click', () => {
  if (lcfg.names.length >= 8) return;
  lcfg.names.push(`Joueur ${lcfg.names.length + 1}`);
  lcfg.lives = suggestLives(lcfg.names.length);
  renderLsetup();
});
$('livesDec').addEventListener('click', () => {
  lcfg.lives = Math.max(1, lcfg.lives - 1);
  $('livesOut').textContent = lcfg.lives;
});
$('livesInc').addEventListener('click', () => {
  lcfg.lives = Math.min(10, lcfg.lives + 1);
  $('livesOut').textContent = lcfg.lives;
});
$('lstart').addEventListener('click', startLives);
$('lresume').addEventListener('click', () => { show('lives'); renderLives(); });

$('keys').addEventListener('click', e => {
  const b = e.target.closest('.key');
  if (!b || b.disabled) return;
  if (b.dataset.n) {
    const n = +b.dataset.n;
    const m = mult;
    addDart(n * m, (m === 3 ? 'T' : m === 2 ? 'D' : '') + n);
  } else {
    const v = +b.dataset.sp;
    addDart(v, v === 0 ? 'Raté' : v === 25 ? 'Bull' : 'Bulle');
  }
});
$('lvalid').addEventListener('click', validateTurn);
$('lundo').addEventListener('click', undo);
$('lnext').addEventListener('click', () => {
  if (!lv || lv.phase !== 'summary') return;
  snap();
  nextRound();
  refresh();
});
$('lagain').addEventListener('click', startLives);
$('lchange').addEventListener('click', showLsetup);

/* ----- démarrage ----- */

restoreSaved();
if (inProgressLives()) { show('lives'); renderLives(); }
else showLsetup();
