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
  const BLAZE_IDLE = '/assets/420Idle.png';
  const BLAZE_CLICKED = '/assets/420Clicked.png';
  const blazeIdlePreload = new Image();
  blazeIdlePreload.src = BLAZE_IDLE;
  
  const blazeClickedPreload = new Image();
  blazeClickedPreload.src = BLAZE_CLICKED;
  
  if (blazeIdlePreload.decode) {
    blazeIdlePreload.decode().catch(() => {});
  }
  
  if (blazeClickedPreload.decode) {
    blazeClickedPreload.decode().catch(() => {});
  }
  const STORAGE_SCORE = 'okdegenScore';
  const STORAGE_SESSION = 'okdegenSessionId';
  const STORAGE_LOCAL_BOARD = 'okdegenLocalLeaderboard';
  const STORAGE_MUTE = 'okdegenMuted';

  let score = 0;

  sessionStorage.removeItem(STORAGE_SCORE);
  sessionStorage.removeItem(STORAGE_SESSION);

  let muted = localStorage.getItem(STORAGE_MUTE) === '1';
  let pressed = false;
  let backendMode = 'checking'; // checking | live | local
  let sessionId = '';
  let sessionPromise = null;
  
  let globalTotalValue = 0;
  let pendingGlobalClicks = 0;
  let globalSyncTimer = null;
  let globalSyncInFlight = false;

  let comboCount = 0;
  let comboTimer = null;
  const COMBO_RESET_MS = 800;

  let lastAcceptedClickAt = 0;
  const MIN_CLICK_INTERVAL_MS = 80;

  const CLICK_PATTERN_WINDOW = 100;
  const CLICK_PATTERN_MAX_AVG_MS = 300;
  const CLICK_PATTERN_MAX_VARIATION = 0.05;
  
  const DEGEN_STRIKE_STORAGE = 'wethdegen-degen-strikes';
  
  let clickPatternIntervals = [];
  let degenCheckActive = false;
  
  let degenStrikeCount = Number(
    sessionStorage.getItem(DEGEN_STRIKE_STORAGE) || 0
  );

  const PERSONAL_BEST_STORAGE = 'wethdegen-personal-best';
  const HIGHEST_COMBO_STORAGE = 'wethdegen-highest-combo';
  
  let personalBest = Number(
    localStorage.getItem(PERSONAL_BEST_STORAGE) || 0
  );
  
  let highestCombo = Number(
    localStorage.getItem(HIGHEST_COMBO_STORAGE) || 0
  );

  const ACHIEVEMENTS_STORAGE = 'wethdegen-achievements';

const ACHIEVEMENTS = [
  { id: 'first-weth', name: 'First WETH', target: 1 },
  { id: 'nice', name: 'NICE!', target: 69 },
  { id: 'weth-noob', name: 'WETH Noob', target: 200 },
  { id: 'weth-blazer', name: 'WETH Blazer', target: 420 },
  { id: 'weth-rookie', name: 'WETH Rookie', target: 1000 },
  { id: 'weth-chad', name: 'WETH Chad', target: 2500 },
  { id: 'weth-lord', name: 'WETH Lord', target: 5000 },
  { id: 'weth-god', name: 'WETH GOD', target: 7500 },
  { id: 'certified-wether', name: "Certified WETH'ER", target: 10000 },
  { id: 'ultimate-wether', name: "Ultimate WETH'ER", target: 100000 }
  { id: 'certified-wether', name: "Certified WETH'ER", target: 10000 },
  { id: 'ultimate-wether', name: "Ultimate WETH'ER", target: 100000 },
  { id: 'max-wether', name: "Max WETH'ER", target: 250000 },
  { id: 'titan-wether', name: "Titan WETH'ER", target: 500000 },
  { id: 'holy-weth', name: 'Holy WETH', target: 750000 },
  { id: 'king-weth', name: 'King WETH', target: 1000000 },
  { id: 'absolute-degen', name: 'Absolute Degen', target: 6696696 }
];

  let achievementToastQueue = [];
  let achievementToastActive = false;

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

  function renderStats() {
  const personalBestStat = $('personalBestStat');
  const highestComboStat = $('highestComboStat');

  if (personalBestStat) {
    personalBestStat.textContent = personalBest.toLocaleString();
  }

  if (highestComboStat) {
    highestComboStat.textContent =
      highestCombo >= 25
        ? `x${highestCombo.toLocaleString()}`
        : 'x0';
  }
}

function updatePersonalBest() {
  if (score > personalBest) {
    personalBest = score;

    localStorage.setItem(
      PERSONAL_BEST_STORAGE,
      String(personalBest)
    );

    renderStats();
  }
}

function updateHighestCombo() {
  if (
    comboCount >= 25 &&
    comboCount > highestCombo
  ) {
    highestCombo = comboCount;

    localStorage.setItem(
      HIGHEST_COMBO_STORAGE,
      String(highestCombo)
    );

    renderStats();
  }
}

function openStats() {
  const backdrop = $('statsBackdrop');

  if (!backdrop) return;

  renderStats();

  backdrop.hidden = false;
  document.body.classList.add('modal-open');

  if (siteMenu) {
    siteMenu.hidden = true;
  }

  if (menuButton) {
    menuButton.setAttribute('aria-expanded', 'false');
  }
}

function closeStats() {
  const backdrop = $('statsBackdrop');

  if (!backdrop) return;

  backdrop.hidden = true;
  document.body.classList.remove('modal-open');
}

  function updateCombo() {
  comboCount += 1;
  updateHighestCombo();

  clearTimeout(comboTimer);

  const comboDisplay = $('comboDisplay');
  const comboValue = $('comboValue');

  if (comboCount >= 25) {
    if (comboValue) {
      comboValue.textContent = comboCount.toLocaleString();
    }

    if (comboDisplay) {
      comboDisplay.hidden = false;

      // Small pop on each new click
      comboDisplay.classList.remove('combo-pop');
      void comboDisplay.offsetWidth;
      comboDisplay.classList.add('combo-pop');
    }
  }

  comboTimer = setTimeout(() => {
    comboCount = 0;

    if (comboDisplay) {
      comboDisplay.hidden = true;
    }
  }, COMBO_RESET_MS);
}

  function queueAchievementToast(achievement) {
  achievementToastQueue.push(achievement);

  if (!achievementToastActive) {
    showNextAchievementToast();
  }
}

function showNextAchievementToast() {
  if (achievementToastQueue.length === 0) {
    achievementToastActive = false;
    return;
  }

  achievementToastActive = true;

  const achievement = achievementToastQueue.shift();

  const toast = $('achievementToast');
  const toastName = $('achievementToastName');
  const toastDescription = $('achievementToastDescription');

  if (!toast || !toastName || !toastDescription) {
    achievementToastActive = false;
    return;
  }

  toastName.textContent = achievement.name;
  toastDescription.textContent =
    `Reach ${achievement.target.toLocaleString()} WETH`;

  toast.hidden = false;

  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    toast.hidden = true;

    achievementToastActive = false;
    showNextAchievementToast();
  }, 3200);
}

  function getUnlockedAchievements() {
  try {
    return JSON.parse(
      localStorage.getItem(ACHIEVEMENTS_STORAGE) || '[]'
    );
  } catch (_) {
    return [];
  }
}

function saveUnlockedAchievements(unlocked) {
  localStorage.setItem(
    ACHIEVEMENTS_STORAGE,
    JSON.stringify(unlocked)
  );
}

function renderAchievements() {
  const unlocked = getUnlockedAchievements();

  ACHIEVEMENTS.forEach((achievement) => {
    const item = document.querySelector(
      `[data-achievement="${achievement.id}"]`
    );

    if (!item) return;

    const icon = item.querySelector('.achievement-icon');
    const isUnlocked = unlocked.includes(achievement.id);

    item.classList.toggle('unlocked', isUnlocked);

    if (icon) {
      icon.textContent = isUnlocked ? '🏅' : '🔒';
    }
  });

  const count = $('achievementUnlockedCount');

  if (count) {
    count.textContent = unlocked.length;
  }
}

function checkAchievements() {
  const unlocked = getUnlockedAchievements();
  let changed = false;

  ACHIEVEMENTS.forEach((achievement) => {
    if (
      score >= achievement.target &&
      !unlocked.includes(achievement.id)
    ) {
      unlocked.push(achievement.id);
      changed = true;
      queueAchievementToast(achievement);

      const item = document.querySelector(
        `[data-achievement="${achievement.id}"]`
      );

      if (item) {
        item.classList.add('just-unlocked');

        setTimeout(() => {
          item.classList.remove('just-unlocked');
        }, 600);
      }
    }
  });

  if (changed) {
    saveUnlockedAchievements(unlocked);
  }

  renderAchievements();
}

function openAchievements() {
  const backdrop = $('achievementsBackdrop');

  if (!backdrop) return;

  renderAchievements();

  backdrop.hidden = false;
  document.body.classList.add('modal-open');

  if (typeof siteMenu !== 'undefined' && siteMenu) {
    siteMenu.hidden = true;
  }

  if (typeof menuButton !== 'undefined' && menuButton) {
    menuButton.setAttribute('aria-expanded', 'false');
  }
}

function closeAchievements() {
  const backdrop = $('achievementsBackdrop');

  if (!backdrop) return;

  backdrop.hidden = true;
  document.body.classList.remove('modal-open');
}

  async function loadGlobalTotal() {
  const globalTotal = $('globalTotal');
  if (!globalTotal) return;

  try {
    const response = await fetch('/api/global', {
      cache: 'no-store'
    });

    if (!response.ok) throw new Error('Could not load global total');

    const data = await response.json();

    globalTotalValue = Number(data.total || 0);
    globalTotal.textContent = globalTotalValue.toLocaleString();
  } catch (error) {
    console.error('Global counter load failed:', error);
  }
}

function queueGlobalClick() {
  pendingGlobalClicks += 1;
  globalTotalValue += 1;

  const globalTotal = $('globalTotal');

  if (globalTotal) {
    globalTotal.textContent = globalTotalValue.toLocaleString();
  }

  clearTimeout(globalSyncTimer);

  if (pendingGlobalClicks >= 10) {
    flushGlobalClicks();
  } else {
    globalSyncTimer = setTimeout(flushGlobalClicks, 1000);
  }
}

async function flushGlobalClicks() {
  if (globalSyncInFlight || pendingGlobalClicks === 0) return;

  globalSyncInFlight = true;

  const clicks = Math.min(pendingGlobalClicks, 100);
  pendingGlobalClicks -= clicks;

  try {
    const response = await fetch('/api/global', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ clicks })
    });

    if (!response.ok) throw new Error('Could not update global total');

    const data = await response.json();

    globalTotalValue = Number(data.total || globalTotalValue);

    const globalTotal = $('globalTotal');

    if (globalTotal) {
      globalTotal.textContent = globalTotalValue.toLocaleString();
    }
  } catch (error) {
    console.error('Global counter update failed:', error);

    pendingGlobalClicks += clicks;
  } finally {
    globalSyncInFlight = false;

    if (pendingGlobalClicks > 0) {
      clearTimeout(globalSyncTimer);
      globalSyncTimer = setTimeout(flushGlobalClicks, 1000);
    }
  }
}

  function trackClickPattern(interval) {
  if (!interval || degenCheckActive) return;

  clickPatternIntervals.push(interval);

  if (clickPatternIntervals.length > CLICK_PATTERN_WINDOW) {
    clickPatternIntervals.shift();
  }

  if (clickPatternIntervals.length < CLICK_PATTERN_WINDOW) {
    return;
  }

  const average =
    clickPatternIntervals.reduce((total, value) => total + value, 0) /
    clickPatternIntervals.length;

  const variance =
    clickPatternIntervals.reduce((total, value) => {
      return total + Math.pow(value - average, 2);
    }, 0) / clickPatternIntervals.length;

  const standardDeviation = Math.sqrt(variance);

  const variation =
    average > 0
      ? standardDeviation / average
      : 1;

  if (
    average <= CLICK_PATTERN_MAX_AVG_MS &&
    variation <= CLICK_PATTERN_MAX_VARIATION
  ) {
    triggerDegenCheck();
  }
}

function triggerDegenCheck() {
  if (degenCheckActive) return;

  degenCheckActive = true;
  clickPatternIntervals = [];

  degenStrikeCount += 1;

  sessionStorage.setItem(
    DEGEN_STRIKE_STORAGE,
    String(degenStrikeCount)
  );

  const backdrop = $('degenCheckBackdrop');
  const question = document.querySelector('.degen-check-question');
  const buttonText = document.querySelector('.degen-check-text');

  if (!backdrop || !question || !buttonText) return;

  if (degenStrikeCount === 1) {
    question.textContent =
      'Are you using an auto clicker Degen? 😉';

    buttonText.textContent =
      'Click Here if No';
  }

  else if (degenStrikeCount === 2) {
    question.textContent =
      'Tsk Tsk Degen, You should stop using that auto clicker. Last Warning. 😈';

    buttonText.textContent =
      'Click Here to Continue';
  }

  else {
    question.textContent =
      'You know, I thought you were better than this Degen... 😢';

    buttonText.textContent =
      'Click Here';
  }

  backdrop.hidden = false;
}

async function punishAutoClicker() {
  // Save this before clearing sessionStorage.
  const offendingSessionId = sessionId;

  // Remove the offending leaderboard entry first.
  if (offendingSessionId) {
    try {
      await fetch('/api/punish', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: offendingSessionId
        })
      });
    } catch (error) {
      console.error(
        'Could not remove leaderboard score:',
        error
      );
    }
  }

  // Reset persistent personal stats.
  localStorage.removeItem(PERSONAL_BEST_STORAGE);
  localStorage.removeItem(HIGHEST_COMBO_STORAGE);
  localStorage.removeItem(ACHIEVEMENTS_STORAGE);

  // Reset strikes.
  sessionStorage.removeItem(DEGEN_STRIKE_STORAGE);

  // Reset game/session data.
  sessionStorage.removeItem(STORAGE_SCORE);
  sessionStorage.removeItem(STORAGE_SESSION);

  personalBest = 0;
  highestCombo = 0;
  comboCount = 0;
  score = 0;
  sessionId = '';

  // Refresh into a completely new run.
  window.location.reload();
}  

async function passDegenCheck() {
  const backdrop = $('degenCheckBackdrop');

  if (backdrop) {
    backdrop.hidden = true;
  }

  // Third strike = punishment
  if (degenStrikeCount >= 3) {
    await punishAutoClicker();
    return;
  }

  // First / second strike = allow them to continue
  degenCheckActive = false;
  clickPatternIntervals = [];
  lastAcceptedClickAt = 0;
}

  function press(event) {
  if (event && !event.isTrusted) return;

  if (degenCheckActive) return;

  const now = performance.now();

  const clickInterval =
    lastAcceptedClickAt
      ? now - lastAcceptedClickAt
      : null;

  if (
    lastAcceptedClickAt &&
    clickInterval < MIN_CLICK_INTERVAL_MS
  ) {
    return;
  }

  lastAcceptedClickAt = now;

  trackClickPattern(clickInterval);
    
  if (pressed) return;
  pressed = true;

  degenButton.classList.add('is-down');

  score += 1;
  renderScore();
  updatePersonalBest();
  queueGlobalClick();
  checkAchievements();
  updateCombo();

  /* Special clicked artwork only when score hits exactly 420 */
  if (score === 420) {
  degenImage.src = BLAZE_CLICKED;
  degenImage.classList.add('blaze-image');
} else {
  degenImage.src = CLICKED;
  degenImage.classList.remove('blaze-image');
}

  playPop();

  const isNice = /^(69)+$/.test(String(score));
  const isBlaze = score === 420;

  popBurst.classList.remove('nice', 'blaze');

  if (isBlaze) {
    popBurst.textContent = 'Blaze It!';
    popBurst.classList.add('blaze');
  } else if (isNice) {
    popBurst.textContent = 'Nice!';
    popBurst.classList.add('nice');
  } else {
    popBurst.textContent = '+1';
  }

  animatePlusOne();
}

  function release() {
  if (!pressed) return;
  pressed = false;

  degenButton.classList.remove('is-down');

  if (score === 420) {
  degenImage.src = BLAZE_IDLE;
  degenImage.classList.add('blaze-image');
} else {
  degenImage.src = NORMAL;
  degenImage.classList.remove('blaze-image');
}
}

  degenButton.addEventListener('pointerdown', (event) => {
    if (!event.isTrusted) return;
    if (event.pointerType === 'touch' && !event.isPrimary) return;
    
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    
    event.preventDefault();
    
    try { degenButton.setPointerCapture(event.pointerId); } catch (_) {}
    
    press(event);
  });
  degenButton.addEventListener('pointerup', release);
  degenButton.addEventListener('pointercancel', release);
  degenButton.addEventListener('lostpointercapture', release);
  degenButton.addEventListener('contextmenu', (e) => e.preventDefault());
  degenButton.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault();
      press(event);
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
    loadGlobalTotal();
    setTimeout(() => closeModal.focus(), 0);
  }

  function closeLeaderboard() {
    modalBackdrop.hidden = true;
    document.body.classList.remove('modal-open');
    leaderboardButton.focus();
  }

  leaderboardButton.addEventListener('click', openModal);
closeModal.addEventListener('click', closeLeaderboard);

  const achievementsButton = $('achievementsButton');
  const closeAchievementsButton = $('closeAchievements');
  const achievementsBackdrop = $('achievementsBackdrop');
  
  achievementsButton?.addEventListener('click', openAchievements);
  
  closeAchievementsButton?.addEventListener(
    'click',
    closeAchievements
  );
  
  achievementsBackdrop?.addEventListener('click', (event) => {
    if (event.target === achievementsBackdrop) {
      closeAchievements();
    }
  });

refreshLeaderboard.addEventListener('click', () => {
  loadLeaderboard();
  loadGlobalTotal();
});

const statsButton = $('statsButton');
const closeStatsButton = $('closeStats');
const statsBackdrop = $('statsBackdrop');

statsButton?.addEventListener('click', openStats);

closeStatsButton?.addEventListener(
  'click',
  closeStats
);

statsBackdrop?.addEventListener('click', (event) => {
  if (event.target === statsBackdrop) {
    closeStats();
  }
});

const degenCheckButton = $('degenCheckButton');

degenCheckButton?.addEventListener('click', (event) => {
  if (!event.isTrusted) return;

  event.preventDefault();
  passDegenCheck();
});

const shareScoreButton = $('shareScoreButton');

shareScoreButton?.addEventListener('click', () => {
  const shareText =
    `I just WETH'd ${score.toLocaleString()} times on WETHDEGEN 🔥\n\nCan you beat me?`;

  const shareUrl =
    `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}` +
    `&url=${encodeURIComponent(window.location.origin)}`;

  window.open(shareUrl, '_blank');
});
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
  loadGlobalTotal();
  renderAchievements();
  checkAchievements();
  renderStats();

// Start a server-side timing session early when the backend exists.
ensureSession();
})();
