// ============================================================
//   TYPEFORGE — Core Logic
// ============================================================

/* ── State ─────────────────────────────────────────────── */
const state = {
  currentParagraph: '',
  currentIndex: 0,
  errors: 0,
  correctChars: 0,
  totalTyped: 0,
  wpm: 0,
  accuracy: 100,
  timer: null,
  timeLeft: 60,
  totalTime: 60,
  isRunning: false,
  isFinished: false,
  isFocused: false,
  difficulty: 'medium',
  mode: 'time',       // 'time' | 'words' | 'paragraph'
  timeOption: 60,     // 15, 30, 60
  paragraphCount: 0,
  totalErrors: 0,
  theme: 'dark',
  lastParagraph: '',
  startTime: null,
};

/* ── DOM Refs ───────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  input:          $('typing-input'),
  display:        $('paragraph-display'),
  wpmVal:         $('wpm-val'),
  accVal:         $('acc-val'),
  errVal:         $('err-val'),
  timerVal:       $('timer-val'),
  timerItem:      $('timer-item'),
  progressFill:   $('progress-fill'),
  focusOverlay:   $('focus-overlay'),
  typingCard:     $('typing-card'),
  modal:          $('result-modal'),
  resWpm:         $('res-wpm'),
  resAcc:         $('res-acc'),
  resErr:         $('res-err'),
  resTime:        $('res-time'),
  resWpmSub:      $('res-wpm-sub'),
  speedBadge:     $('speed-badge'),
  modalEmoji:     $('modal-emoji'),
  modalTitle:     $('modal-title'),
  modalSub:       $('modal-sub'),
  toast:          $('toast'),
  themeToggle:    $('theme-toggle'),
};

/* ── Paragraph Engine ───────────────────────────────────── */
function getNextParagraph() {
  const pool = PARAGRAPHS[state.difficulty] || PARAGRAPHS.medium;
  const filtered = pool.filter(p => p !== state.lastParagraph);
  const para = filtered[Math.floor(Math.random() * filtered.length)];
  state.lastParagraph = para;
  return para;
}

/* ── Render Characters ──────────────────────────────────── */
function renderParagraph(text) {
  els.display.innerHTML = '';
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'char pending';
    span.dataset.index = i;
    span.textContent = char;
    if (i === 0) span.classList.add('active');
    els.display.appendChild(span);
  });
}

function getCharSpans() {
  return els.display.querySelectorAll('.char');
}

/* ── Timer System ───────────────────────────────────────── */
function startTimer() {
  if (state.timer) return;
  state.startTime = Date.now();
  state.timer = setInterval(() => {
    if (state.mode === 'time') {
      state.timeLeft--;
      updateTimerDisplay();
      if (state.timeLeft <= 10) {
        els.timerItem.classList.add('warning');
      }
      if (state.timeLeft <= 0) {
        finishTest();
      }
    }
    updateWPM();
  }, 1000);
  els.typingCard.classList.add('active');
}

function updateTimerDisplay() {
  if (state.mode === 'time') {
    els.timerVal.textContent = state.timeLeft;
  } else {
    const elapsed = Math.floor((Date.now() - (state.startTime || Date.now())) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    els.timerVal.textContent = mins > 0
      ? `${mins}:${String(secs).padStart(2,'0')}`
      : elapsed;
  }
}

function stopTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

/* ── WPM Calculation ────────────────────────────────────── */
function updateWPM() {
  if (!state.startTime) return;
  const elapsed = (Date.now() - state.startTime) / 60000;
  if (elapsed === 0) return;
  // Standard: WPM = (correct chars / 5) / minutes
  state.wpm = Math.round(state.correctChars / 5 / elapsed);
  state.accuracy = state.totalTyped > 0
    ? Math.round(((state.totalTyped - state.totalErrors) / state.totalTyped) * 100)
    : 100;
  els.wpmVal.textContent = state.wpm;
  els.accVal.textContent = state.accuracy + '%';
  els.errVal.textContent = state.totalErrors;
}

/* ── Progress ───────────────────────────────────────────── */
function updateProgress() {
  const pct = (state.currentIndex / state.currentParagraph.length) * 100;
  els.progressFill.style.width = pct + '%';
}

/* ── Typing Engine ──────────────────────────────────────── */
function handleInput(e) {
  if (state.isFinished) return;

  // Start timer on first key
  if (!state.isRunning) {
    state.isRunning = true;
    state.startTime = Date.now();
    startTimer();
  }

  const typed = els.input.value;
  const spans = getCharSpans();

  // Handle backspace (input value shorter)
  if (typed.length < state.currentIndex) {
    const removed = state.currentIndex - typed.length;
    for (let i = 0; i < removed; i++) {
      const idx = state.currentIndex - 1 - i;
      if (idx >= 0 && spans[idx]) {
        spans[idx].classList.remove('correct', 'wrong', 'active');
        spans[idx].classList.add('pending');
      }
    }
    state.currentIndex = typed.length;
    if (spans[state.currentIndex]) {
      spans[state.currentIndex].classList.add('active');
    }
    updateProgress();
    return;
  }

  // Process newly typed chars
  const newChar = typed[typed.length - 1];
  const expected = state.currentParagraph[state.currentIndex];
  const span = spans[state.currentIndex];

  if (!span) return;

  state.totalTyped++;

  if (newChar === expected) {
    span.classList.remove('pending', 'active', 'wrong');
    span.classList.add('correct');
    state.correctChars++;
  } else {
    span.classList.remove('pending', 'active', 'correct');
    span.classList.add('wrong');
    state.totalErrors++;
    // Shake card on error
    els.typingCard.style.animation = 'none';
    requestAnimationFrame(() => {
      els.typingCard.style.animation = '';
    });
  }

  state.currentIndex++;

  // Update cursor
  if (spans[state.currentIndex]) {
    spans[state.currentIndex].classList.add('active');
  }

  updateProgress();
  updateWPM();

  // Auto-scroll to keep active char visible
  if (spans[state.currentIndex]) {
    spans[state.currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // Paragraph complete
  if (state.currentIndex >= state.currentParagraph.length) {
    if (state.mode === 'paragraph') {
      finishTest();
    } else {
      loadNextParagraph();
    }
  }
}

function loadNextParagraph() {
  state.paragraphCount++;
  state.currentParagraph = getNextParagraph();
  state.currentIndex = 0;
  renderParagraph(state.currentParagraph);
  els.input.value = '';

  // Flash transition
  els.display.style.opacity = '0';
  requestAnimationFrame(() => {
    els.display.style.transition = 'opacity 0.25s';
    els.display.style.opacity = '1';
    setTimeout(() => { els.display.style.transition = ''; }, 300);
  });
}

/* ── Finish Test ────────────────────────────────────────── */
function finishTest() {
  if (state.isFinished) return;
  state.isFinished = true;
  stopTimer();
  updateWPM();

  const elapsed = state.startTime
    ? Math.round((Date.now() - state.startTime) / 1000)
    : state.totalTime;

  showResultModal(state.wpm, state.accuracy, state.totalErrors, elapsed);
}

/* ── Result Modal ───────────────────────────────────────── */
function showResultModal(wpm, acc, errors, elapsed) {
  const badge = getSpeedBadge(wpm);
  const emoji = getResultEmoji(wpm);

  els.resWpm.textContent = wpm;
  els.resAcc.textContent = acc + '%';
  els.resErr.textContent = errors;
  els.resTime.textContent = formatTime(elapsed);
  els.resWpmSub.textContent = badge.label;

  els.speedBadge.textContent = badge.level;
  els.speedBadge.className = `speed-badge ${badge.cls}`;

  els.modalEmoji.textContent = emoji;
  els.modalTitle.textContent = getResultTitle(wpm);
  els.modalSub.textContent = getResultSub(wpm, acc);

  // Color accuracy
  els.resAcc.className = '';
  if (acc >= 95) els.resAcc.classList.add('good');
  else if (acc < 85) els.resAcc.classList.add('bad');

  // Color errors
  els.resErr.className = '';
  if (errors === 0) els.resErr.classList.add('good');
  else if (errors > 10) els.resErr.classList.add('bad');

  els.modal.classList.add('visible');
}

function getSpeedBadge(wpm) {
  if (wpm < 20) return { level: 'Beginner', label: 'Keep practicing!', cls: 'beginner' };
  if (wpm < 40) return { level: 'Average', label: 'You\'re improving!', cls: 'average' };
  if (wpm < 60) return { level: 'Good', label: 'Above average!', cls: 'good' };
  if (wpm < 80) return { level: 'Fast', label: 'Impressive speed!', cls: 'fast' };
  return { level: 'Excellent', label: 'Top tier typist!', cls: 'excellent' };
}

function getResultEmoji(wpm) {
  if (wpm < 20) return '🌱';
  if (wpm < 40) return '🚀';
  if (wpm < 60) return '⚡';
  if (wpm < 80) return '🔥';
  return '💎';
}

function getResultTitle(wpm) {
  if (wpm < 20) return 'Good Start!';
  if (wpm < 40) return 'Nice Work!';
  if (wpm < 60) return 'Well Done!';
  if (wpm < 80) return 'Impressive!';
  return 'Outstanding!';
}

function getResultSub(wpm, acc) {
  if (acc < 85) return 'Focus on accuracy before speed — precision first!';
  if (wpm < 30) return 'Regular practice will boost your speed significantly.';
  if (wpm < 60) return 'You\'re on the right track. Keep going!';
  return 'Excellent performance! You\'re a skilled typist.';
}

function formatTime(seconds) {
  if (seconds < 60) return seconds + 's';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/* ── Reset / Init ───────────────────────────────────────── */
function resetTest() {
  stopTimer();
  els.modal.classList.remove('visible');

  Object.assign(state, {
    currentParagraph: getNextParagraph(),
    currentIndex: 0,
    errors: 0,
    correctChars: 0,
    totalTyped: 0,
    wpm: 0,
    accuracy: 100,
    timeLeft: state.timeOption,
    isRunning: false,
    isFinished: false,
    paragraphCount: 0,
    totalErrors: 0,
    startTime: null,
  });

  renderParagraph(state.currentParagraph);
  els.input.value = '';

  els.wpmVal.textContent = '0';
  els.accVal.textContent = '100%';
  els.errVal.textContent = '0';
  els.timerVal.textContent = state.mode === 'time' ? state.timeOption : '0';
  els.timerItem.classList.remove('warning');
  els.progressFill.style.width = '0%';
  els.typingCard.classList.remove('active');

  // Show focus overlay if not focused
  if (!state.isFocused) {
    els.focusOverlay.classList.remove('hidden');
  }

  els.input.focus();
}

/* ── Focus Handling ─────────────────────────────────────── */
function gainFocus() {
  state.isFocused = true;
  els.focusOverlay.classList.add('hidden');
  els.input.focus();
}

function loseFocus() {
  if (state.isRunning && !state.isFinished) {
    state.isFocused = false;
    stopTimer();
    els.focusOverlay.classList.remove('hidden');
  }
}

/* ── Control Buttons ────────────────────────────────────── */
function setTime(t) {
  state.timeOption = t;
  state.totalTime = t;
  state.mode = 'time';
  $$('.ctrl-btn[data-time]').forEach(b => b.classList.remove('active'));
  $$('.ctrl-btn[data-mode]').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-time="${t}"]`)?.classList.add('active');
  updateModeLabel();
  resetTest();
}

function setMode(m) {
  state.mode = m;
  if (m === 'paragraph') {
    state.timeOption = 0;
    $$('.ctrl-btn[data-time]').forEach(b => b.classList.remove('active'));
  }
  $$('.ctrl-btn[data-mode]').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-mode="${m}"]`)?.classList.add('active');
  updateModeLabel();
  resetTest();
}

function setDifficulty(d) {
  state.difficulty = d;
  $$('.ctrl-btn[data-diff]').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-diff="${d}"]`)?.classList.add('active');
  resetTest();
}

function updateModeLabel() {
  if (state.mode === 'time') {
    els.timerVal.textContent = state.timeOption;
  } else {
    els.timerVal.textContent = '0';
  }
}

/* ── Theme Toggle ───────────────────────────────────────── */
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme === 'light' ? 'light' : '');
  els.themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('tf-theme', state.theme);
}

/* ── Toast ──────────────────────────────────────────────── */
function showToast(msg, icon = 'ℹ️') {
  els.toast.innerHTML = `<span>${icon}</span> ${msg}`;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2800);
}

/* ── Keyboard shortcuts ─────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (els.modal.classList.contains('visible')) {
      els.modal.classList.remove('visible');
    }
  }
  if (e.ctrlKey && e.key === 'Enter') {
    resetTest();
  }
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    resetTest();
  }
});

/* ── Event Listeners ────────────────────────────────────── */
els.input.addEventListener('input', handleInput);
els.input.addEventListener('blur', loseFocus);
els.focusOverlay.addEventListener('click', gainFocus);
els.typingCard.addEventListener('click', gainFocus);
els.themeToggle.addEventListener('click', toggleTheme);

// Control buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.ctrl-btn');
  if (!btn) return;

  if (btn.dataset.time) setTime(Number(btn.dataset.time));
  if (btn.dataset.mode) setMode(btn.dataset.mode);
  if (btn.dataset.diff) setDifficulty(btn.dataset.diff);
});

// Reset buttons
document.querySelectorAll('[data-action="reset"]').forEach(el => {
  el.addEventListener('click', resetTest);
});

// Next test from modal
const nextBtn = $('next-btn');
if (nextBtn) nextBtn.addEventListener('click', () => {
  els.modal.classList.remove('visible');
  setTimeout(resetTest, 200);
});

/* ── Init ───────────────────────────────────────────────── */
function init() {
  // Load saved theme
  const savedTheme = localStorage.getItem('tf-theme') || 'dark';
  state.theme = savedTheme;
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    els.themeToggle.textContent = '☀️';
  } else {
    els.themeToggle.textContent = '🌙';
  }

  // Load first paragraph
  state.currentParagraph = getNextParagraph();
  state.timeLeft = state.timeOption;
  renderParagraph(state.currentParagraph);
  els.timerVal.textContent = state.timeOption;

  // Show toast welcome
  setTimeout(() => showToast('Click the box to start typing!', '⌨️'), 1000);
}

// Wait for DOM
document.addEventListener('DOMContentLoaded', init);
