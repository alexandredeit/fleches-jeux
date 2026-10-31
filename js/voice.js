/* ----- Commande vocale : transforme une phrase reconnue en coups ----- */

// Mots français -> nombres (le navigateur peut écrire « quinze » ou « 15 »)
const VOICE_NUM = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20
};
const VOICE_TEEN = { sept: 7, huit: 8, neuf: 9 }; // « dix-sept », « dix-huit », « dix-neuf » (10 + ce chiffre)

// Met en minuscules, enlève accents et ponctuation : « Raté ! » -> « rate », « doublé » -> « double »
function normalizeVoice(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'\-.,;:!?]/g, ' ').replace(/\s+/g, ' ').trim();
}

function dartOf(n, mult) {
  if (mult === 3) return { t: 'dart', p: 3 * n, label: 'T' + n, dbl: false };
  if (mult === 2) return { t: 'dart', p: 2 * n, label: 'D' + n, dbl: true };
  return { t: 'dart', p: n, label: String(n), dbl: false };
}
const VOICE_BULL = { t: 'dart', p: 25, label: 'Bull', dbl: false };
const VOICE_BULLE = { t: 'dart', p: 50, label: 'Bulle', dbl: true };
const VOICE_MISS = { t: 'dart', p: 0, label: 'Raté', dbl: false };

// Renvoie la liste des actions dans l'ordre : { t:'dart', p, label, dbl } ou { t:'next' } ou { t:'undo' }
function parseVoice(text) {
  const w = normalizeVoice(text).split(' ').filter(Boolean);
  const out = [];

  // nombre à la position k : [valeur, nombre de mots utilisés] ou null
  const numAt = k => {
    const x = w[k];
    if (x === undefined) return null;
    if (/^\d+$/.test(x)) return [parseInt(x, 10), 1];
    if (x === 'dix' && VOICE_TEEN[w[k + 1]]) return [VOICE_TEEN[w[k + 1]] + 10, 2];
    if (VOICE_NUM[x] !== undefined) return [VOICE_NUM[x], 1];
    return null;
  };

  let i = 0;
  while (i < w.length) {
    const x = w[i];

    if (x === 'suivant' || x === 'passe' || x === 'passer') { out.push({ t: 'next' }); i++; continue; }
    if (x === 'fin' && w[i + 1] === 'du' && w[i + 2] === 'tour') { out.push({ t: 'next' }); i += 3; continue; }
    if (x === 'tour' && w[i + 1] === 'suivant') { out.push({ t: 'next' }); i += 2; continue; }
    if (x === 'annule' || x === 'annuler' || x === 'corrige' || x === 'corriger') { out.push({ t: 'undo' }); i++; continue; }
    if (x === 'rate' || x === 'zero') { out.push(VOICE_MISS); i++; continue; }
    if (x === 'bull') { out.push(VOICE_BULL); i++; continue; }
    if (x === 'bulle') { out.push(VOICE_BULLE); i++; continue; }

    if (x === 'simple' || x === 'double' || x === 'triple') {
      const mult = { simple: 1, double: 2, triple: 3 }[x];
      if (w[i + 1] === 'bull' || w[i + 1] === 'bulle') {
        if (mult !== 3) out.push(mult === 2 || w[i + 1] === 'bulle' ? VOICE_BULLE : VOICE_BULL);
        i += 2;
        continue;
      }
      const n = numAt(i + 1);
      if (n && n[0] >= 1 && n[0] <= 20) { out.push(dartOf(n[0], mult)); i += 1 + n[1]; continue; }
      i++;
      continue;
    }

    const n = numAt(i);
    if (n) {
      const v = n[0];
      if (v === 25) out.push(VOICE_BULL);
      else if (v === 50) out.push(VOICE_BULLE);
      else if (v >= 1 && v <= 20) out.push(dartOf(v, 1));
      i += n[1];
      continue;
    }
    i++;
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { parseVoice, normalizeVoice };
