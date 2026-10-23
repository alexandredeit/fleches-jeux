/* ----- Morpion ----- */

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function makeCells(withBull) {
  const nums = shuffle(Array.from({ length: 20 }, (_, i) => i + 1));
  const vals = withBull ? [...nums.slice(0, 8), 'BULLE'] : nums.slice(0, 9);
  return shuffle(vals).map(v => ({ v, hits: [0, 0], owner: -1 }));
}

function inProgress() {
  return !!st && st.winner === null;
}

function newGame() {
  lv = null;
  st = {
    names: cfg.names.slice(),
    cells: makeCells(cfg.bull),
    turn: 0,
    darts: 0,
    thrown: [0, 0],
    winner: null,
    line: null
  };
  history = [];
  setMult(1);
  show('game');
  refresh();
}

function checkMorpionEnd() {
  for (const L of LINES) {
    const [a, b, c] = L;
    const o = st.cells[a].owner;
    if (o !== -1 && o === st.cells[b].owner && o === st.cells[c].owner) {
      st.winner = o;
      st.line = L;
      return;
    }
  }
  if (st.cells.every(c => c.owner !== -1)) st.winner = 'draw';
}

// i = index de la case touchée, null = fléchette ratée
function dart(i) {
  if (!inProgress()) return;
  snap();
  const t = st.turn;
  const m = mult;
  const kind = m === 3 ? 'Triple' : m === 2 ? 'Double' : '';
  st.thrown[t]++;
  st.darts++;
  let msg;
  if (i === null) {
    msg = 'Fléchette ratée';
  } else {
    const c = st.cells[i];
    if (c.owner !== -1) {
      msg = 'Case déjà prise, fléchette perdue';
    } else {
      c.hits[t] = Math.min(WIN, c.hits[t] + m);
      buzz();
      if (c.hits[t] >= WIN) {
        c.owner = t;
        msg = `${st.names[t]} gagne la case ${c.v} !`;
      } else {
        msg = `${kind ? kind + ' · ' : ''}${c.v} : ${c.hits[t]}/${WIN}`;
      }
    }
  }
  checkMorpionEnd();
  setMult(1);
  toast(msg);
  refresh();
}

function passMorpion() {
  if (!inProgress()) return;
  snap();
  st.turn = 1 - st.turn;
  st.darts = 0;
  setMult(1);
  toast(`À ${st.names[st.turn]}`);
  refresh();
}

function renderMorpion() {
  if (!st) return;
  const over = st.winner !== null;
  const t = st.turn;

  document.querySelectorAll('#game .team').forEach(el => {
    const i = +el.dataset.t;
    el.classList.toggle('active', !over && i === t);
    el.querySelector('.tname').textContent = st.names[i];
    el.querySelector('.w').textContent = st.cells.filter(c => c.owner === i).length;
    el.querySelector('.h').textContent = st.cells.reduce((s, c) => s + c.hits[i], 0);
  });

  $('turn').textContent = over ? 'Partie terminée' : `Tour : ${st.names[t]}`;
  $('count').textContent = `Fléchettes : ${st.darts}`;

  const row = (team, c) =>
    `<span class="trow ${team ? 'tb' : 'ta'}">${[0, 1, 2, 3].map(k =>
      `<i class="${k < c.hits[team] ? 'on' : ''}"></i>`).join('')}</span>`;

  $('board').innerHTML = st.cells.map((c, i) => {
    const won = c.owner !== -1;
    const bull = c.v === 'BULLE';
    const line = st.line && st.line.includes(i);
    const label = won
      ? `Case ${c.v}, gagnée par ${st.names[c.owner]}`
      : `Case ${c.v} : ${st.names[0]} ${c.hits[0]}/${WIN}, ${st.names[1]} ${c.hits[1]}/${WIN}`;
    return `<button class="cell${bull ? ' bull' : ''}${won ? ' won' : ''}${line ? ' line' : ''}"`
      + ` data-i="${i}" data-w="${c.owner}" aria-label="${esc(label)}">`
      + `<span class="val">${esc(c.v)}</span>`
      + (won
          ? `<span class="own">${esc(st.names[c.owner])}</span>`
          : `<span class="tally">${row(0, c)}${row(1, c)}</span>`)
      + `</button>`;
  }).join('');

  $('mult').querySelectorAll('button').forEach(b => { b.disabled = over; });
  $('miss').disabled = over;
  $('pass').disabled = over;
  $('undo').disabled = !history.length;

  $('end').hidden = !over;
  if (over) {
    const total = st.thrown[0] + st.thrown[1];
    if (st.winner === 'draw') {
      $('endTitle').textContent = 'Égalité';
      $('endText').textContent = `Toutes les cases sont prises, sans alignement. ${total} fléchettes lancées.`;
    } else {
      $('endTitle').textContent = `${st.names[st.winner]} gagne !`;
      $('endText').textContent = `Trois cases alignées après ${total} fléchettes.`;
    }
  }
}

function refresh() {
  renderMorpion();
  save();
}

function setBull(v) {
  cfg.bull = v;
  $('bullBtn').setAttribute('aria-pressed', String(v));
}

function showMsetup() {
  show('msetup');
  $('nameA').value = cfg.names[0];
  $('nameB').value = cfg.names[1];
  setBull(cfg.bull);
  $('mresume').hidden = !inProgress();
}

/* ----- événements ----- */

$('menu').addEventListener('click', showMsetup);
$('bullBtn').addEventListener('click', () => setBull(!cfg.bull));
$('start').addEventListener('click', () => {
  const a = $('nameA').value.trim() || 'Rouge';
  const b = $('nameB').value.trim() || 'Verte';
  cfg.names = [a, b === a ? b + ' 2' : b];
  newGame();
});
$('mresume').addEventListener('click', () => { show('game'); renderMorpion(); });
$('board').addEventListener('click', e => {
  const b = e.target.closest('.cell');
  if (b) dart(+b.dataset.i);
});
$('miss').addEventListener('click', () => dart(null));
$('pass').addEventListener('click', passMorpion);
$('undo').addEventListener('click', undo);
$('again').addEventListener('click', newGame);
$('change').addEventListener('click', showMsetup);

/* ----- démarrage ----- */

restoreSaved();
if (inProgress()) { show('game'); renderMorpion(); }
else showMsetup();
