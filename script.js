'use strict';

// =============================================
// STATE
// =============================================
const state = {
  flips: 0,
  history: [],
  isFlipping: false,
  hasResult: false,
};

// Questions stored against a silent/blank flip
const SILENT_QUESTIONS = [
  'A silent question.',
  'Something unspeakable.',
  'A thought too private to type.',
  'The one you already know the answer to.',
  'An unnamed feeling.',
  'Whatever you were thinking just now.',
  'Nothing. Everything. Both.',
  'The question that brought you here.',
];

// Rotating placeholders — cycles every 4s while the field is empty and unfocused
const PLACEHOLDERS = [
  'Should I quit my job?',
  'Is this the right move?',
  'Do I send the message?',
  'Should I order the thing?',
  'Is it too late to change my mind?',
  'Do I stay or do I go?',
  'Should I say something?',
  'Is this a sign?',
  'Do I take the risk?',
  'Should I go back to sleep?',
  'Is it worth it?',
  'Do I tell them?',
  'Should I start over?',
  'Is now the right time?',
  'Do I trust my gut on this?',
];

const $ = (id) => document.getElementById(id);

const dom = {
  question:       $('question'),
  optHeads:       $('opt-heads'),
  optTails:       $('opt-tails'),
  coin:           $('coin'),
  readoutSide:    $('readout-side'),
  readoutOpt:     $('readout-option'),
  resultBar:      $('result-bar'),
  resultText:     $('result-text'),
  btnFlip:        $('btn-flip'),
  btnNewQuestion: $('btn-new-question'),
  btnFlipAgain:   $('btn-flip-again'),
  ctaFlip:        $('cta-flip'),
  ctaResult:      $('cta-result'),
  flipCounter:    $('flip-counter'),
  memFeed:        $('memory-feed'),
  histCount:      $('history-count'),
  btnClearAll:    $('btn-clear-all'),
  backdrop:       $('panel-backdrop'),
  panel:          $('detail-panel'),
  panelClose:     $('panel-close'),
  panelReflip:    $('panel-reflip'),
  panelTime:      $('panel-time'),
  panelQ:         $('panel-question'),
  panelHeads:     $('panel-heads-opt'),
  panelTails:     $('panel-tails-opt'),
  panelResult:    $('panel-result'),
  btnClearQ:      $('btn-clear-question'),
};

// =============================================
// HELPERS
// =============================================

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

// =============================================
// CTA STATE MACHINE
// Design Engineer: the button zone has two modes:
//   IDLE    → show [ FLIP COIN ]
//   RESULT  → show [ NEW QUESTION ] + [ FLIP AGAIN ]
// =============================================

function showFlipCTA() {
  dom.ctaFlip.hidden   = false;
  dom.ctaResult.hidden = true;
  state.hasResult      = false;
}

function showResultCTA() {
  dom.ctaFlip.hidden   = true;
  dom.ctaResult.hidden = false;
  state.hasResult      = true;
}

// =============================================
// CLEAR / RESET
// =============================================

// Full form clear — called by NEW QUESTION button
// Design Engineer: clears inputs, resets coin, resets result bar,
// returns focus to question field. Form looks entirely fresh.
function newQuestion() {
  dom.question.value  = '';
  dom.optHeads.value  = '';
  dom.optTails.value  = '';
  resetVisuals();
  showFlipCTA();
  dom.question.focus();
  updateClearQButton();
  // On mobile: scroll main area into view
  dom.question.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Clear question field inline button
function clearQuestionField() {
  dom.question.value = '';
  dom.question.focus();
  updateClearQButton();
}

// Show/hide the × clear button based on field content
function updateClearQButton() {
  dom.btnClearQ.hidden = dom.question.value.length === 0;
}

// BUG 1 FIX: CLEAR fires immediately — no confirm needed. Decisive.
function clearAllHistory() {
  state.history = [];
  state.flips   = 0;
  try { sessionStorage.removeItem('fate-history'); } catch(e) {}
  dom.flipCounter.textContent = '';
  resetVisuals();
  showFlipCTA();
  renderFeed();
}

dom.btnClearAll.addEventListener('click', clearAllHistory);
dom.btnNewQuestion.addEventListener('click',  newQuestion);

// =============================================
// VISUALS RESET (coin + result only, not inputs)
// =============================================

function resetVisuals() {
  dom.resultBar.classList.remove('result-bar--active');
  dom.resultText.textContent  = '';
  dom.readoutSide.textContent = '--';
  dom.readoutOpt.textContent  = '';
  dom.coin.classList.remove(
    'coin--landed-heads', 'coin--landed-tails',
    'coin--show-heads',   'coin--show-tails'
  );
}

// =============================================
// MEMORY FEED
// =============================================

function renderFeed() {
  dom.memFeed.innerHTML = '';
  dom.histCount.textContent = state.history.length;
  dom.btnClearAll.hidden = state.history.length === 0;

  if (state.history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'mem-empty mono-label';
    empty.textContent = 'NO DECISIONS YET.\nFLIP TO BEGIN.';
    dom.memFeed.appendChild(empty);
    return;
  }

  const total = state.history.length;

  state.history.slice().reverse().forEach((d, ri) => {
    const index = total - ri;
    const item  = document.createElement('div');
    item.className = 'mem-item mem-item--new';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', 'Decision ' + index + ': ' + d.question);

    if (ri >= 3 && ri < 8) item.classList.add('mem-item--aged');
    else if (ri >= 8)      item.classList.add('mem-item--ancient');

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

  setTimeout(() => {
    dom.memFeed.querySelectorAll('.mem-item--new').forEach(el => el.classList.remove('mem-item--new'));
  }, 300);
}

// =============================================
// DETAIL PANEL
// =============================================

let _panelActiveId = null;

function openPanel(id) {
  const d = state.history.find(x => x.id === id);
  if (!d) return;
  _panelActiveId = id;

  const winner = d.result === 'heads' ? d.optHeads : d.optTails;
  const side   = d.result === 'heads' ? 'HEADS' : 'TAILS';

  dom.panelTime.textContent   = formatTime(d.timestamp);
  dom.panelQ.textContent      = d.question  || 'An unspoken question.';
  dom.panelHeads.textContent  = d.optHeads  || 'HEADS';
  dom.panelTails.textContent  = d.optTails  || 'TAILS';
  dom.panelResult.textContent = side + ' \u2014 ' + (winner || side);

  dom.panel.hidden    = false;
  dom.backdrop.hidden = false;
  dom.panelClose.focus();
}

function closePanel() {
  dom.panel.hidden    = true;
  dom.backdrop.hidden = true;
  _panelActiveId      = null;
}

// REFLIP: loads past question into inputs, resets visuals so form looks fresh
// Design Engineer fix: resetVisuals() + showFlipCTA() so the form
// doesn't look pre-answered when the user loads a past question.
// BUG 3 FIX: populate fields, reset ALL visuals so form looks
// completely fresh, then close panel and scroll to the TOP of the
// interface — not just btnFlip — so the user sees the full form.
function reflipFromPanel() {
  if (!_panelActiveId) return;
  const d = state.history.find(x => x.id === _panelActiveId);
  if (!d) return;

  dom.question.value = d.question || '';
  dom.optHeads.value = d.optHeads || '';
  dom.optTails.value = d.optTails || '';

  resetVisuals();   // clears coin, result bar, readout, all accent classes
  showFlipCTA();    // shows FLIP COIN, hides NEW QUESTION / FLIP AGAIN

  closePanel();     // hides panel + backdrop, nulls _panelActiveId
  updateClearQButton();

  // Scroll to the interface section so user sees populated form + coin
  document.getElementById('interface').scrollIntoView({ behavior: 'smooth', block: 'start' });

  dom.question.focus();
  dom.question.select();
}

dom.panelClose.addEventListener('click',  closePanel);
dom.panelReflip.addEventListener('click', reflipFromPanel);
dom.backdrop.addEventListener('click',    closePanel);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.panel.hidden) closePanel();
});

// =============================================
// FLIP LOGIC
// =============================================

function handleFlip() {
  if (state.isFlipping) { shake(dom.btnFlip); return; }

  const question = dom.question.value.trim();
  const optHeads = dom.optHeads.value.trim() || 'HEADS';
  const optTails = dom.optTails.value.trim() || 'TAILS';

  // No question? Fine. The coin doesn't need context to be decisive.
  const questionless = !question;
  const displayQuestion = question || SILENT_QUESTIONS[Math.floor(Math.random() * SILENT_QUESTIONS.length)];

  state.isFlipping     = true;
  dom.btnFlip.disabled = true;
  resetVisuals();
  showFlipCTA();   // ensure we're in flip state during animation

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
    } else if (questionless) {
      // No question asked — the coin flips into the void
      const silentPhrases = [
        sideName + '. SOMETIMES THAT IS ALL YOU NEED.',
        sideName + '. NO CONTEXT REQUIRED.',
        'THE COIN DOES NOT NEED TO KNOW WHY.',
        sideName + '. THE UNIVERSE SHRUGS AND MOVES ON.',
        'JUST ' + sideName + '. INTERPRET AS NEEDED.',
        sideName + '. EVEN WITHOUT A QUESTION, AN ANSWER.',
        'THE COIN SPEAKS. THE REST IS YOUR PROBLEM.',
        sideName + '. SOME THINGS DON\'T NEED FRAMING.',
      ];
      phrase = silentPhrases[Math.floor(Math.random() * silentPhrases.length)];
    } else {
      const phrases = [
        sideName + '. ' + winner + '. THE COIN HAS DECIDED.',
        'RESULT: ' + winner + '. PROCEED ACCORDINGLY.',
        sideName + '. MAYBE YOU ALREADY KNEW.',
        winner + '. THE COIN RARELY LIES.',
        'FATE CHOSE ' + winner + '. NO FURTHER QUESTIONS.',
        sideName + '. SOME PART OF YOU FEELS RELIEF OR DREAD. THAT IS YOUR ANSWER.',
        winner + '. THE COIN HAD NO DOUBTS.',
        'THE ANSWER IS ' + winner + '. STOP OVERTHINKING.',
      ];
      phrase = phrases[Math.floor(Math.random() * phrases.length)];
    }

    dom.resultText.textContent  = phrase;
    dom.resultBar.classList.add('result-bar--active');
    dom.readoutSide.textContent = sideName;
    dom.readoutOpt.textContent  = winner;

    // Swap CTA to post-result state
    showResultCTA();
    dom.btnNewQuestion.focus();

    // Scroll result into view on mobile
    dom.resultBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    state.flips++;
    const decision = {
      id:        Date.now() + '-' + Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      question:  displayQuestion,
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
  }, 1500);
}

// BUG 2 FIX: call handleFlip synchronously — no timeout.
// The 80ms gap was causing a window where both CTA states were briefly
// visible simultaneously, showing 3 buttons at once.
function handleFlipAgain() {
  showFlipCTA();
  handleFlip();
}

// Event bindings
dom.btnFlip.addEventListener('click',     handleFlip);
dom.btnFlipAgain.addEventListener('click', handleFlipAgain);

const enterKey = (e) => { if (e.key === 'Enter') handleFlip(); };
dom.question.addEventListener('keydown',  enterKey);
dom.optHeads.addEventListener('keydown',  enterKey);
dom.optTails.addEventListener('keydown',  enterKey);

// Inline clear button for question field
dom.btnClearQ.addEventListener('click', clearQuestionField);
dom.question.addEventListener('input',  updateClearQButton);

// =============================================
// INIT
// =============================================

function init() {
  dom.question.focus();
  showFlipCTA();

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
  updateClearQButton();
  startPlaceholderCycle();
}

// Rotate placeholder text while the question field is empty and not focused.
// Pauses when user is typing. Resumes when they clear the field.
function startPlaceholderCycle() {
  let idx = 0;
  let paused = false;

  dom.question.addEventListener('focus', () => { paused = true; });
  dom.question.addEventListener('blur',  () => {
    if (!dom.question.value) paused = false;
  });
  dom.question.addEventListener('input', () => {
    paused = dom.question.value.length > 0;
  });

  setInterval(() => {
    if (paused || dom.question.value) return;
    idx = (idx + 1) % PLACEHOLDERS.length;
    dom.question.placeholder = PLACEHOLDERS[idx];
  }, 3200);
}

init();