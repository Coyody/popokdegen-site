(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const menuButton = $('menuButton');
  const siteMenu = $('siteMenu');
  const muteText = $('muteText');
  const scoreEl = $('score');
  const degenButton = $('degenButton');
  const degenImage = $('degenImage');
  const popBurst = $('popBurst');
  const muteButton = $('muteButton');
  const muteIcon = $('muteIcon');
  const leaderboardButton = $('leaderboardButton');
  const modalBackdrop = $('modalBackdrop');
  const leaderboardModal = $('leaderboardModal');
  const closeModal = $('closeModal');
  const refreshLeaderboard = $('refreshLeaderboard');
  const leaderboardList = $('leaderboardList');
  const emptyLeaderboard = $('emptyLeaderboard');
  const connectionBadge = $('connectionBadge');
  const scoreForm = $('scoreForm');
  const playerName = $('playerName');
  const submitButton = $('submitButton');
  const submitScoreValue = $('submitScoreValue');
  const formStatus = $('formStatus');

  const NORMAL = '/assets/normal.png';
  const CLICKED = '/assets/clicked.png';
  const STORAGE_SCORE = 'okdegenScore';
  const STORAGE_SESSION = 'okdegenSessionId';
  const STORAGE_LOCAL_BOARD = 'okdegenLocalLeaderboard';
  const STORAGE_MUTE = 'okdegenMuted';

  let score = Number.parseInt(sessionStorage.getItem(STORAGE_SCORE) || '0', 10);
  if (!Number.isFinite(score) || score < 0) score = 0;

  let muted = localStorage.getItem(STORAGE_MUTE) === '1';
  let pressed = false;
  let backendMode = 'checking'; // checking | live | local
  let sessionId = sessionStorage.getItem(STORAGE_SESSION) || '';
  let sessionPromise = null;

  const audioPool = Array.from({ length: 8 }, () => {
    const audio = new Audio('/assets/pop.mp3');
    audio.preload = 'auto';
    return audio;
  });
  let audioIndex = 0;

  function formatScore(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function renderScore() {
    scoreEl.textContent = formatScore(score);
    submitScoreValue.textContent = formatScore(score);
    sessionStorage.setItem(STORAGE_SCORE, String(score));
  }

  function renderMute() {
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'Unmute pop sound' : 'Mute pop sound');
    muteButton.title = muted ? 'Unmute sound' : 'Mute sound';
    muteIcon.textContent = muted ? '🔇' : '🔊';
    muteText.textContent = muted ? 'Sound Off' : 'Sound On';
  }

  function playPop() {
    if (muted) return;
    const audio = audioPool[audioIndex++ % audioPool.length];
    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  function animatePlusOne() {
    popBurst.classList.remove('animate');
    // Force a reflow so very fast clicks restart the animation.
    void popBurst.offsetWidth;
    popBurst.classList.add('animate');
  }

  function press() {
  if (pressed) return;
  pressed = true;

  degenButton.classList.add('is-down');
  degenImage.src = CLICKED;

  score += 1;
  renderScore();
  playPop();

  if (/^(69)+$/.test(String(score))) {
    popBurst.textContent = 'Nice!';
  } else {
    popBurst.textContent = '+1';
  }

  animatePlusOne();
}

  function release() {
    if (!pressed) return;
    pressed = false;
    degenButton.classList.remove('is-down');
    degenImage.src = NORMAL;
  }

  degenButton.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try { degenButton.setPointerCapture(event.pointerId); } catch (_) {}
    press();
  });
  degenButton.addEventListener('pointerup', release);
  degenButton.addEventListener('pointercancel', release);
  degenButton.addEventListener('lostpointercapture', release);
  degenButton.addEventListener('contextmenu', (e) => e.preventDefault());
  degenButton.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault();
      press();
    }
  });
  degenButton.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      release();
    }
  });

  muteButton.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem(STORAGE_MUTE, muted ? '1' : '0');
    renderMute();
  });
  menuButton.addEventListener('click', () => {
  const isOpen = !siteMenu.hidden;

  siteMenu.hidden = isOpen;
  menuButton.setAttribute('aria-expanded', String(!isOpen));
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.menu-wrap')) {
    siteMenu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

  function setMode(mode) {
    backendMode = mode;
    connectionBadge.className = 'badge';
    if (mode === 'live') {
      connectionBadge.textContent = 'LIVE LEADERBOARD';
      connectionBadge.classList.add('live');
    } else if (mode === 'local') {
      connectionBadge.textContent = 'LOCAL DEMO';
      connectionBadge.classList.add('local');
    } else {
      connectionBadge.textContent = 'CHECKING…';
    }
  }

  async function ensureSession() {
    if (sessionId && backendMode === 'live') return sessionId;
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' });
        if (!res.ok) throw new Error('Session API unavailable');
        const data = await res.json();
        if (!data.sessionId) throw new Error('Invalid session response');
        sessionId = data.sessionId;
        sessionStorage.setItem(STORAGE_SESSION, sessionId);
        setMode('live');
        return sessionId;
      } catch (error) {
        setMode('local');
        return '';
      } finally {
        sessionPromise = null;
      }
    })();
    return sessionPromise;
  }

  function getLocalBoard() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_LOCAL_BOARD) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalScore(name, newScore) {
    const key = name.toLowerCase();
    const board = getLocalBoard();
    const existing = board.find((entry) => entry.key === key);
    if (existing) {
      if (newScore > existing.score) {
        existing.name = name;
        existing.score = newScore;
        existing.updatedAt = Date.now();
      }
    } else {
      board.push({ key, name, score: newScore, updatedAt: Date.now() });
    }
    board.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
    localStorage.setItem(STORAGE_LOCAL_BOARD, JSON.stringify(board.slice(0, 100)));
    return board.slice(0, 10);
  }

  function renderLeaderboard(entries) {
    leaderboardList.replaceChildren();
    const clean = Array.isArray(entries) ? entries.slice(0, 10) : [];
    emptyLeaderboard.hidden = clean.length !== 0;

    clean.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';

      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;

      const name = document.createElement('span');
      name.className = 'player-name';
      name.textContent = String(entry.name || 'ANON');

      const points = document.createElement('span');
      points.className = 'player-score';
      points.textContent = formatScore(entry.score);

      li.append(rank, name, points);
      leaderboardList.append(li);
    });
  }

  async function loadLeaderboard() {
    formStatus.textContent = '';
    setMode('checking');
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('Leaderboard API unavailable');
      const data = await res.json();
      renderLeaderboard(data.entries || []);
      setMode('live');
      if (!sessionId) ensureSession();
    } catch (_) {
      renderLeaderboard(getLocalBoard().slice(0, 10));
      setMode('local');
    }
  }

  function openModal() {
    modalBackdrop.hidden = false;
    document.body.classList.add('modal-open');
    submitScoreValue.textContent = formatScore(score);
    loadLeaderboard();
    setTimeout(() => closeModal.focus(), 0);
  }

  function closeLeaderboard() {
    modalBackdrop.hidden = true;
    document.body.classList.remove('modal-open');
    leaderboardButton.focus();
  }

  leaderboardButton.addEventListener('click', openModal);
  closeModal.addEventListener('click', closeLeaderboard);
  refreshLeaderboard.addEventListener('click', loadLeaderboard);
  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) closeLeaderboard();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modalBackdrop.hidden) closeLeaderboard();
  });

  scoreForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = playerName.value.trim().replace(/\s+/g, ' ');
    formStatus.className = 'form-status';

    if (!/^[A-Za-z0-9 _.-]{1,16}$/.test(name)) {
      formStatus.textContent = 'Use 1–16 letters, numbers, spaces, _ . or -';
      formStatus.classList.add('error');
      return;
    }
    if (score < 1) {
      formStatus.textContent = 'Get at least 1 pop first.';
      formStatus.classList.add('error');
      return;
    }

    submitButton.disabled = true;
    formStatus.textContent = 'Submitting…';

    try {
      const sid = await ensureSession();
      if (backendMode === 'live' && sid) {
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, score, sessionId: sid })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not submit score');
        renderLeaderboard(data.entries || []);
        formStatus.textContent = data.improved === false ? 'Your existing high score is higher.' : 'Score submitted!';
        formStatus.classList.add('success');
      } else {
        const board = saveLocalScore(name, score);
        renderLeaderboard(board);
        formStatus.textContent = 'Saved in this browser (local demo).';
        formStatus.classList.add('success');
      }
    } catch (error) {
      formStatus.textContent = error.message || 'Could not submit score.';
      formStatus.classList.add('error');
    } finally {
      submitButton.disabled = false;
    }
  });

  renderScore();
  renderMute();
  // Start a server-side timing session early when the backend exists.
  ensureSession();
})();
