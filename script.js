'use strict';

const state = {
  flips: 0,
  history: [],
  isFlipping: false,
};

const $ = (id) => document.getElementById(id);

const dom = {
  question:    $('question'),
  optHeads:    $('opt-heads'),
  optTails:    $('opt-tails'),
  coin:        $('coin'),
  readoutSide: $('readout-side'),
  readoutOpt:  $('readout-option'),
  resultBar:   $('result-bar'),
  resultText:  $('result-text'),
  btnFlip:     $('btn-flip'),
  flipCounter: $('flip-counter'),
  memFeed:     $('memory-feed'),
  histCount:   $('history-count'),
  backdrop:    $('panel-backdrop'),
  panel:       $('detail-panel'),
  panelClose:  $('panel-close'),
  panelTime:   $('panel-time'),
  panelQ:      $('panel-question'),
  panelHeads:  $('panel-heads-opt'),
  panelTails:  $('panel-tails-opt'),
  panelResult: $('panel-result'),
};

function formatTime(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'JUST NOW';
  if (min < 60) return min + (min === 1 ? ' MIN AGO' : ' MINS AGO');
  const hr = Math.floor(min / 60);
  if (hr < 24)  return hr + (hr === 1 ? ' HR AGO' : ' HRS AGO');
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase();
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len - 1) + '\u2026' : str;
}

function saveToSession() {
  try { sessionStorage.setItem('fate-history', JSON.stringify(state.history)); } catch(e) {}
}

function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 350);
}

function resetResult() {
  dom.resultBar.classList.remove('result-bar--active');
  dom.resultText.textContent = '';
  dom.readoutSide.textContent = '--';
  dom.readoutOpt.textContent  = '';
  dom.coin.classList.remove(
    'coin--landed-heads', 'coin--landed-tails',
    'coin--show-heads', 'coin--show-tails'
  );
}

/* =========================================
   MEMORY FEED (structured, inline)
   ========================================= */

function renderFeed() {
  dom.memFeed.innerHTML = '';
  dom.histCount.textContent = state.history.length;

  if (state.history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mem-empty mono-label';
    empty.textContent = 'NO DECISIONS YET.\nFLIP TO BEGIN.';
    dom.memFeed.appendChild(empty);
    return;
  }

  const total = state.history.length;

  state.history.slice().reverse().forEach((d, reverseIndex) => {
    const index = total - reverseIndex; // display number (newest = highest)
    const item = document.createElement('div');
    item.className = 'mem-item mem-item--new';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', 'Decision ' + index + ': ' + d.question);

    // Age classes based on how old in the list
    if (reverseIndex >= 3 && reverseIndex < 8) item.classList.add('mem-item--aged');
    else if (reverseIndex >= 8)                item.classList.add('mem-item--ancient');

    const winner = d.result === 'heads' ? d.optHeads : d.optTails;

    item.innerHTML =
      '<div class="mem-item__index mono-label">' +
        '#' + String(index).padStart(3, '0') + ' &nbsp;&bull;&nbsp; ' + formatTime(d.timestamp) +
      '</div>' +
      '<div class="mem-item__question">' + truncate(d.question || 'Unspoken question', 60) + '</div>' +
      '<div class="mem-item__result">' + (d.result === 'heads' ? 'H' : 'T') + ' &rarr; ' + truncate(winner || d.result, 24) + '</div>';

    item.addEventListener('click', () => openPanel(d.id));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(d.id); }
    });

    dom.memFeed.appendChild(item);
  });

  // remove animation class after it plays so re-renders don't replay
  setTimeout(() => {
    dom.memFeed.querySelectorAll('.mem-item--new').forEach(el => el.classList.remove('mem-item--new'));
  }, 300);
}

/* =========================================
   DETAIL PANEL
   ========================================= */

function openPanel(id) {
  const d = state.history.find(x => x.id === id);
  if (!d) return;
  const winner = d.result === 'heads' ? d.optHeads : d.optTails;
  const side   = d.result === 'heads' ? 'HEADS' : 'TAILS';

  dom.panelTime.textContent   = formatTime(d.timestamp);
  dom.panelQ.textContent      = d.question   || 'An unspoken question.';
  dom.panelHeads.textContent  = d.optHeads   || 'Heads';
  dom.panelTails.textContent  = d.optTails   || 'Tails';
  dom.panelResult.textContent = side + ' \u2014 ' + (winner || side);

  dom.panel.hidden    = false;
  dom.backdrop.hidden = false;
  dom.panelClose.focus();
}

function closePanel() {
  dom.panel.hidden    = true;
  dom.backdrop.hidden = true;
  dom.btnFlip.focus();
}

dom.panelClose.addEventListener('click', closePanel);
dom.backdrop.addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.panel.hidden) closePanel();
});

/* =========================================
   FLIP LOGIC
   ========================================= */

function handleFlip() {
  if (state.isFlipping) { shake(dom.btnFlip); return; }

  const question = dom.question.value.trim();
  const optHeads = dom.optHeads.value.trim() || 'HEADS';
  const optTails = dom.optTails.value.trim() || 'TAILS';

  if (!question) {
    shake(dom.question);
    const orig = dom.question.placeholder;
    dom.question.placeholder = 'ENTER A QUESTION FIRST.';
    dom.question.focus();
    setTimeout(() => { dom.question.placeholder = orig; }, 2500);
    return;
  }

  state.isFlipping     = true;
  dom.btnFlip.disabled = true;
  resetResult();

  const SECRETS = {
    '42':           { side: 'heads', phrase: 'HEADS. THE ANSWER WAS ALWAYS HEADS.' },
    'always heads': { side: 'heads', phrase: 'RIGGED. THE UNIVERSE COMPLIES.' },
    'always tails': { side: 'tails', phrase: 'TAILS. FATE FOLLOWS ORDERS.' },
  };
  const secret  = SECRETS[question.toLowerCase()];
  const isHeads = secret ? (secret.side === 'heads') : (Math.random() < 0.5);
  const result  = isHeads ? 'heads' : 'tails';

  dom.coin.classList.remove('coin--flipping', 'coin--landed-heads', 'coin--landed-tails');
  void dom.coin.offsetWidth;
  dom.coin.classList.add('coin--flipping');

  setTimeout(() => {
    dom.coin.classList.remove('coin--flipping');
    dom.coin.classList.add(isHeads ? 'coin--landed-heads' : 'coin--landed-tails');
    dom.coin.classList.add(isHeads ? 'coin--show-heads'   : 'coin--show-tails');

    const winner   = isHeads ? optHeads : optTails;
    const sideName = isHeads ? 'HEADS'  : 'TAILS';

    let phrase;
    if (secret) {
      phrase = secret.phrase;
    } else {
      const phrases = [
        sideName + '. ' + winner + '. THE COIN HAS DECIDED.',
        'RESULT: ' + winner + '. PROCEED ACCORDINGLY.',
        sideName + '. MAYBE YOU ALREADY KNEW.',
        winner + '. THE COIN RARELY LIES.',
        'FATE CHOSE ' + winner + '. NO FURTHER QUESTIONS.',
        sideName + '. SOME PART OF YOU FEELS RELIEF OR DREAD. THAT IS YOUR ANSWER.',
      ];
      phrase = phrases[Math.floor(Math.random() * phrases.length)];
    }

    dom.resultText.textContent  = phrase;
    dom.resultBar.classList.add('result-bar--active');
    dom.readoutSide.textContent = sideName;
    dom.readoutOpt.textContent  = winner;

    state.flips++;
    const decision = {
      id:        Date.now() + '-' + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      question,
      optHeads,
      optTails,
      result,
    };
    state.history.push(decision);
    saveToSession();
    renderFeed();

    dom.flipCounter.textContent = '[ ' + state.flips + ' DECISION' + (state.flips !== 1 ? 'S' : '') + ' SURRENDERED TO CHANCE ]';

    state.isFlipping     = false;
    dom.btnFlip.disabled = false;
    dom.btnFlip.focus();
  }, 1500);
}

dom.btnFlip.addEventListener('click', handleFlip);
dom.question.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleFlip(); });

/* =========================================
   INIT
   ========================================= */

function init() {
  dom.question.focus();
  dom.coin.classList.add('coin--landed-heads');

  try {
    const saved = sessionStorage.getItem('fate-history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.history = parsed;
        state.flips   = parsed.length;
        dom.flipCounter.textContent = '[ ' + state.flips + ' DECISION' + (state.flips !== 1 ? 'S' : '') + ' SURRENDERED TO CHANCE ]';
      }
    }
  } catch(e) {}

  renderFeed();
}

init();
