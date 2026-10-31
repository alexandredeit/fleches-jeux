/* ----- X01 ----- */

// Réglages de la prochaine partie (le score de départ et le double sont dans la partie)
let xSetupStart = 501;
let xSetupDouble = true;

// Clavier : 1 à 20, Raté, Bull (25, simple) et Bulle (50, double)
$('xkeys').innerHTML =
  Array.from({ length: 20 }, (_, k) => `<button class="key" data-n="${k + 1}">${k + 1}</button>`).join('')
  + '<button class="key" data-sp="0">Raté</button>'
  + '<button class="key" data-sp="25">Bull · 25</button>'
  + '<button class="key" data-sp="50">Bulle · 50</button>';

function inProgressX() {
  return !!lv && lv.phase !== 'over';
}

function startX() {
  lcfg.names = lcfg.names.map((n, i) => n.trim() || `Joueur ${i + 1}`);
  lv = {
    start: xSetupStart,
    doubleOut: xSetupDouble,
    phase: 'turn',
    turn: 0,
    cur: [],
    winner: null,
    info: '',
    players: lcfg.names.map(name => ({ name, score: xSetupStart, darts: 0, last: null }))
  };
  lv.info = `${lv.players[0].name} commence.`;
  history = [];
  setMult(1);
  show('xgame');
  refresh();
  if (voiceOn()) { primeSpeech(); startVoice(); }
}

function curPlayer() { return lv.players[lv.turn]; }
function curSum() { return lv.cur.reduce((s, d) => s + d.p, 0); }
function remaining() { return curPlayer().score - curSum(); }

function addX(p, label, dbl) {
  if (!lv || lv.phase !== 'turn' || lv.cur.length >= 3) return;
  snap();
  lv.cur.push({ p, label, dbl });
  buzz();
  setMult(1);
  judge();
  refresh();
}

// Vérifie le dernier état du tour : bust, victoire, ou fin normale après 3 fléchettes
function judge() {
  const rem = remaining();
  const last = lv.cur[lv.cur.length - 1];
  if (rem < 0 || (lv.doubleOut && rem === 1)) return endTurn(true);
  if (rem === 0) {
    if (!lv.doubleOut || last.dbl) return winTurn();
    return endTurn(true);
  }
  if (lv.cur.length === 3) endTurn(false);
}

function endTurn(bust) {
  const pl = curPlayer();
  const sum = curSum();
  pl.darts += lv.cur.length;
  if (bust) {
    pl.last = 'Bust';
    lv.info = `${pl.name} bust : ce tour ne compte pas.`;
  } else {
    pl.score -= sum;
    pl.last = sum;
    lv.info = `${pl.name} fait ${sum}, il reste ${pl.score}.`;
  }
  lv.cur = [];
  lv.turn = (lv.turn + 1) % lv.players.length;
}

function winTurn() {
  const pl = curPlayer();
  pl.darts += lv.cur.length;
  pl.last = curSum();
  pl.score = 0;
  lv.cur = [];
  lv.winner = lv.turn;
  lv.phase = 'over';
  lv.info = `${pl.name} termine à zéro.`;
}

// Fin du tour avant 3 fléchettes
function passX() {
  if (!lv || lv.phase !== 'turn' || lv.cur.length === 0) return;
  snap();
  if (lv.doubleOut && remaining() === 1) endTurn(true);
  else endTurn(false);
  setMult(1);
  refresh();
}

function renderX() {
  if (!lv) return;
  const over = lv.phase === 'over';
  const pl = lv.players[lv.turn];
  const rem = over ? 0 : remaining();

  $('xmode').textContent = `Départ ${lv.start}${lv.doubleOut ? ' · double pour finir' : ''}`;

  $('xplayers').innerHTML = lv.players.map((p, i) => {
    const active = !over && i === lv.turn;
    const done = p.score === 0;
    return `<div class="prow x${active ? ' active' : ''}${done ? ' win' : ''}">`
      + `<div class="pname">${esc(p.name)}</div>`
      + `<div class="xscore">${p.score}</div>`
      + `<div class="xlast">${p.last === null ? '—' : p.last}</div></div>`;
  }).join('');

  $('xcur').textContent = over ? 'Partie terminée' : pl.name;
  $('xrem').textContent = over ? '' : `Reste ${rem}`;

  let hint = '';
  if (!over && lv.doubleOut) {
    if (rem === 50) hint = 'Bulle pour finir.';
    else if (rem > 0 && rem <= 40 && rem % 2 === 0) hint = `Double ${rem / 2} pour finir.`;
  }
  $('xhint').textContent = hint;

  $('xslots').innerHTML = [0, 1, 2].map(k => {
    const d = lv.cur[k];
    return `<div class="slot${d ? ' filled' : ''}">${d ? `<span>${esc(d.label)}</span><small>${d.p}</small>` : ''}</div>`;
  }).join('');

  $('xinfo').textContent = lv.info;

  const playable = !over;
  $('xmult').querySelectorAll('button').forEach(b => { b.disabled = !playable; });
  document.querySelectorAll('#xkeys .key').forEach(b => { b.disabled = !playable || lv.cur.length >= 3; });
  $('xpass').disabled = !playable || lv.cur.length === 0;
  $('xundo').disabled = !history.length;

  $('xend').hidden = !over;
  if (over) {
    const w = lv.players[lv.winner];
    $('xtitle').textContent = `${w.name} gagne !`;
    $('xtext').textContent = `Terminé en ${w.darts} fléchette${w.darts > 1 ? 's' : ''}, départ ${lv.start}.`;
    stopVoice();
  }
  renderVoiceLine();
}

function refresh() {
  renderX();
  save();
}

function renderXsetup() {
  $('plist').innerHTML = lcfg.names.map((n, i) =>
    `<div class="prowin"><input data-i="${i}" maxlength="18" value="${esc(n)}" aria-label="Nom du joueur ${i + 1}" autocomplete="off">`
    + (lcfg.names.length > 2 ? `<button class="btn ghost rm" data-rm="${i}" aria-label="Retirer ce joueur">×</button>` : '')
    + `</div>`).join('');
  $('addP').disabled = lcfg.names.length >= 8;
  $('xchips').querySelectorAll('[data-v]').forEach(b =>
    b.setAttribute('aria-pressed', String(+b.dataset.v === xSetupStart)));
  $('xdouble').setAttribute('aria-pressed', String(xSetupDouble));
  $('xvoiceBtn').setAttribute('aria-pressed', String(voiceOn()));
  $('xspeakBtn').setAttribute('aria-pressed', String(!!(lcfg.voice && lcfg.voice.speak)));
  $('xvoiceBtn').disabled = !SR;
  renderVoiceHint();
}

function renderVoiceHint() {
  const lines = [];
  if (!SR) lines.push('Reconnaissance vocale indisponible dans ce navigateur. Sur iPhone : Safari ; sur Android : Chrome.');
  else if (voiceOn()) lines.push('Dis une fléchette par « triple 15 », « double 20 », « 5 », « bulle » (50), « bull » (25) ou « raté ». Plusieurs d’un coup, c’est possible. Le total du tour se dit « total 85 » ou « quatre vingt cinq ». « Joueur suivant » passe la main, « annule » retire le dernier coup.');
  if (lcfg.voice && lcfg.voice.speak && frVoiceMissing) lines.push('Aucune voix française sur cet appareil : l’annonce utilisera la voix par défaut.');
  $('xvoiceHint').textContent = lines.join(' ');
}

function showXsetup() {
  stopVoice();
  renderXsetup();
  $('xresume').hidden = !inProgressX();
  show('lsetup');
}

/* ----- commande vocale ----- */

// Reconnaissance du navigateur (Chrome sur Android, Safari sur iPhone récent, Chrome/Edge sur ordinateur)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;            // reconnaissance en cours
let listening = false;     // l'écoute doit continuer pendant la partie
let restartTimer = 0;
let muted = false;         // pendant que l'application parle, on ignore ce qui est entendu
let muteTimer = 0;
let wakeLock = null;       // garde l'écran allumé pendant l'écoute, si le navigateur le permet
let voiceStatus = '';
let lastHeard = '';

function voiceOn() { return !!(lcfg.voice && lcfg.voice.on); }

function renderVoiceLine() {
  const el = $('xvoice');
  const visible = voiceOn() && !!lv && lv.phase === 'turn';
  el.hidden = !visible;
  if (!visible) return;
  el.textContent = `Micro : ${voiceStatus}` + (lastHeard ? ` · Entendu : « ${lastHeard} »` : '');
}

function setVoiceStatus(t) { voiceStatus = t; renderVoiceLine(); }

async function keepAwake() {
  try { if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}

function releaseAwake() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}

function startVoice() {
  if (!SR || !voiceOn() || !lv || lv.phase !== 'turn') return;
  listening = true;
  clearTimeout(restartTimer);
  if (rec) return;
  keepAwake();
  rec = new SR();
  rec.lang = 'fr-FR';
  rec.continuous = true;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  let retry = 300;
  rec.onresult = e => {
    if (muted) return;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) handleSpeech(e.results[i][0].transcript);
    }
  };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      listening = false;
      lcfg.voice.on = false;
      save();
      setVoiceStatus('micro refusé, autorise-le dans le navigateur');
      renderXsetup();
    } else if (e.error === 'network') {
      retry = 3000;
      setVoiceStatus('pas de connexion internet, la reconnaissance ne marche pas hors ligne');
    } else if (e.error === 'audio-capture') {
      listening = false;
      setVoiceStatus('aucun micro détecté');
    }
  };
  rec.onend = () => {
    rec = null;
    if (listening && lv && lv.phase === 'turn') restartTimer = setTimeout(startVoice, retry);
  };
  try {
    rec.start();
    setVoiceStatus(muted ? 'il parle…' : 'à l’écoute');
  } catch (e) {
    rec = null;
  }
}

function stopVoice() {
  listening = false;
  clearTimeout(restartTimer);
  const r = rec;
  rec = null;
  if (r) {
    r.onend = null;
    try { r.abort ? r.abort() : r.stop(); } catch (e) {}
  }
  releaseAwake();
}

// Voix française de l'appareil (si elle existe)
let frVoice = null;
let frVoiceMissing = false;

function pickFrVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    frVoice = vs.find(v => /^fr/i.test(v.lang)) || null;
    frVoiceMissing = vs.length > 0 && !frVoice;
  } catch (e) {
    frVoice = null;
  }
  renderVoiceHint();
}

// Certains navigateurs (iPhone surtout) n'acceptent de parler qu'après un appui : on « réveille » la voix au moment de Commencer
function primeSpeech() {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch (e) {}
}

// L'application annonce à voix haute. Le micro coupe souvent la voix (surtout sur Android) :
// on arrête donc l'écoute le temps de parler, puis on la relance.
function speak(text) {
  if (!lcfg.voice || !lcfg.voice.speak) return;
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    setVoiceStatus('annonce vocale indisponible sur ce navigateur');
    return;
  }
  const resume = () => {
    clearTimeout(muteTimer);
    muteTimer = setTimeout(() => {
      muted = false;
      if (listening) startVoice();
    }, 400);
  };
  try {
    if (rec) {
      const r = rec;
      rec = null;
      r.onend = null;
      try { r.abort(); } catch (e) {}
    }
    muted = true;
    setVoiceStatus('il parle…');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 1.05;
    if (frVoice) u.voice = frVoice;
    u.onend = resume;
    u.onerror = e => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') setVoiceStatus('annonce vocale bloquée par l’appareil');
      resume();
    };
    clearTimeout(muteTimer);
    muteTimer = setTimeout(() => { muted = false; if (listening) startVoice(); }, 6000);
    speechSynthesis.speak(u);
  } catch (e) {
    muted = false;
    setVoiceStatus('annonce vocale impossible');
    if (listening) startVoice();
  }
}

function spokenLabel(l) {
  if (l === 'Bull' || l === 'Bulle') return l;
  if (l === 'Raté') return 'raté';
  if (l[0] === 'T') return `triple ${l.slice(1)}`;
  if (l[0] === 'D') return `double ${l.slice(1)}`;
  return l;
}

// « joueur suivant » : passe la main, même sans fléchette lancée
function voiceNext() {
  if (lv.cur.length > 0) { passX(); return; }
  snap();
  lv.turn = (lv.turn + 1) % lv.players.length;
  setMult(1);
  lv.info = `${curPlayer().name}, à toi.`;
  refresh();
}

// « total 85 » : le score des 3 fléchettes du tour, dit d'un coup (à dire avant les fléchettes du tour)
function voiceTotal(n) {
  snap();
  const pl = curPlayer();
  const rem = pl.score - n;
  pl.darts += 3;
  pl.last = n;
  if (rem < 0 || (lv.doubleOut && rem === 1)) {
    pl.last = 'Bust';
    lv.info = `${pl.name} bust : ce tour ne compte pas.`;
    lv.turn = (lv.turn + 1) % lv.players.length;
  } else if (rem === 0) {
    // Le total ne dit pas si la dernière fléchette était un double : on accepte le zéro
    pl.score = 0;
    lv.winner = lv.turn;
    lv.phase = 'over';
    lv.info = `${pl.name} termine à zéro.`;
  } else {
    pl.score = rem;
    lv.info = `${pl.name} fait ${n}, il reste ${rem}.`;
    lv.turn = (lv.turn + 1) % lv.players.length;
  }
  setMult(1);
  refresh();
}

function handleSpeech(text) {
  lastHeard = String(text).trim();
  if (!lv || lv.phase !== 'turn') { renderVoiceLine(); return; }
  const actions = parseVoice(text);
  if (!actions.length) { lastHeard += ' (non compris)'; renderVoiceLine(); return; }

  const said = [];
  let passed = false;
  let undone = false;
  for (const a of actions) {
    if (lv.phase !== 'turn') break;
    if (a.t === 'dart') {
      addX(a.p, a.label, a.dbl);
      said.push(spokenLabel(a.label));
    } else if (a.t === 'next') {
      voiceNext();
      passed = true;
    } else if (a.t === 'total') {
      if (lv.cur.length > 0) {
        lastHeard += ' (le total se dit avant les fléchettes du tour)';
      } else {
        voiceTotal(a.p);
        said.push(`total ${a.p}`);
        passed = true;
      }
    } else if (a.t === 'undo') {
      undo();
      undone = true;
      break;
    }
  }
  renderVoiceLine();

  if (undone) { speak('Annulé.'); return; }
  if (lv.phase === 'over') {
    const w = lv.players[lv.winner];
    stopVoice();
    speak(`${w.name} gagne !`);
    return;
  }
  if (said.length || passed) {
    const tail = lv.cur.length === 0 ? lv.info : `Total ${curSum()}`;
    speak([said.join(', '), tail].filter(Boolean).join('. '));
  }
}

/* ----- événements ----- */

$('menu').addEventListener('click', showXsetup);
$('plist').addEventListener('input', e => {
  const i = +e.target.dataset.i;
  if (!Number.isNaN(i)) lcfg.names[i] = e.target.value;
});
$('plist').addEventListener('click', e => {
  const b = e.target.closest('[data-rm]');
  if (!b) return;
  lcfg.names.splice(+b.dataset.rm, 1);
  renderXsetup();
});
$('addP').addEventListener('click', () => {
  if (lcfg.names.length >= 8) return;
  lcfg.names.push(`Joueur ${lcfg.names.length + 1}`);
  renderXsetup();
});
$('xchips').addEventListener('click', e => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  xSetupStart = +b.dataset.v;
  renderXsetup();
});
$('xdouble').addEventListener('click', () => {
  xSetupDouble = !xSetupDouble;
  renderXsetup();
});
$('xstartBtn').addEventListener('click', startX);
$('xresume').addEventListener('click', () => { show('xgame'); renderX(); if (voiceOn()) { primeSpeech(); startVoice(); } });

$('xkeys').addEventListener('click', e => {
  const b = e.target.closest('.key');
  if (!b || b.disabled) return;
  if (b.dataset.n) {
    const n = +b.dataset.n;
    const m = mult;
    addX(n * m, (m === 3 ? 'T' : m === 2 ? 'D' : '') + n, m === 2);
  } else {
    const v = +b.dataset.sp;
    if (v === 0) addX(0, 'Raté', false);
    else if (v === 25) addX(25, 'Bull', false);
    else addX(50, 'Bulle', true);
  }
});
$('xundo').addEventListener('click', undo);
$('xpass').addEventListener('click', passX);
$('xagain').addEventListener('click', startX);
$('xchange').addEventListener('click', showXsetup);
$('xvoiceBtn').addEventListener('click', () => {
  if (!SR) return;
  lcfg.voice.on = !voiceOn();
  save();
  renderXsetup();
});
$('xspeakBtn').addEventListener('click', () => {
  lcfg.voice.speak = !lcfg.voice.speak;
  save();
  renderXsetup();
});
// Au retour dans l'appli, on relance l'écoute si elle était active
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && listening) {
    keepAwake();
    if (!rec) startVoice();
  }
});

/* ----- démarrage ----- */

restoreSaved();
lcfg.voice = Object.assign({ on: false, speak: true }, lcfg.voice);
if ('speechSynthesis' in window) {
  pickFrVoice();
  speechSynthesis.onvoiceschanged = pickFrVoice;
}
if (inProgressX()) { show('xgame'); renderX(); }
else showXsetup();
