(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const menuButton = $('menuButton');
  const siteMenu = $('siteMenu');
  const soundButton = $('soundButton');
  const soundBackdrop = $('soundBackdrop');
  const closeSoundButton = $('closeSound');
  
  const musicVolumeSlider = $('musicVolume');
  const musicVolumeValue = $('musicVolumeValue');
  
  const gameVolumeSlider = $('gameVolume');
  const gameVolumeValue = $('gameVolumeValue');
  const scoreEl = $('score');
  const degenButton = $('degenButton');
  const degenImage = $('degenImage');
  const popBurst = $('popBurst');
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

  const playerStatsBackdrop =
  $('playerStatsBackdrop');

  const closePlayerStats =
    $('closePlayerStats');
  
  const playerStatsTitle =
    $('playerStatsTitle');
  
  const playerStatsBest =
    $('playerStatsBest');
  
  const playerStatsCombo =
    $('playerStatsCombo');

  const NORMAL = '/assets/normal.png';
  const CLICKED = '/assets/clicked.png';
  const BLAZE_IDLE = '/assets/420Idle.png';
  const BLAZE_CLICKED = '/assets/420Clicked.png';
  const blazeIdlePreload = new Image();
  blazeIdlePreload.src = BLAZE_IDLE;
  
  const blazeClickedPreload = new Image();
  blazeClickedPreload.src = BLAZE_CLICKED;

  /* ===== SCORECARD TEMPLATE PRELOAD ===== */

  const scorecardTemplate = new Image();
  
  scorecardTemplate.decoding = 'async';
  
  scorecardTemplate.src =
    '/assets/scorecard-template.jpg';
  
  if (scorecardTemplate.decode) {
    scorecardTemplate
      .decode()
      .catch(() => {});
  }
  
  if (blazeIdlePreload.decode) {
    blazeIdlePreload.decode().catch(() => {});
  }
  
  if (blazeClickedPreload.decode) {
    blazeClickedPreload.decode().catch(() => {});
  }
  const STORAGE_SCORE = 'okdegenScore';
  const STORAGE_SESSION = 'okdegenSessionId';
  const STORAGE_LOCAL_BOARD = 'okdegenLocalLeaderboard';
  const LEADERBOARD_NAME_STORAGE =
    'wethdegen-leaderboard-name';
  const MUSIC_VOLUME_STORAGE =
  'wethdegen-music-volume';

  const GAME_VOLUME_STORAGE =
    'wethdegen-game-volume';
  const SELECTED_DEGEN_STORAGE =
  'wethdegen-selected-degen';

  let score = 0;

  sessionStorage.removeItem(STORAGE_SCORE);
  sessionStorage.removeItem(STORAGE_SESSION);

  function loadStoredVolume(key, fallback) {
  const stored = localStorage.getItem(key);

  if (stored === null) {
    return fallback;
  }

  const value = Number(stored);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(
    100,
    Math.max(0, value)
  );
}

let musicVolume =
  loadStoredVolume(
    MUSIC_VOLUME_STORAGE,
    70
  );

let gameVolume =
  loadStoredVolume(
    GAME_VOLUME_STORAGE,
    100
  );
  let pressed = false;
  let backendMode = 'checking'; // checking | live | local
  let sessionId = '';
  let sessionPromise = null;
  
  let globalTotalValue = 0;

  let pendingServerClicks = 0;
  
  let serverBatchSeq = 1;
  let serverSyncTimer = null;
  let serverSyncInFlight = false;
  let serverAuthoritativeScore = 0;

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

  const DEGENS = [
  {
    id: 'base',
    name: 'Base Degen',
    target: 0,
    artworkReady: true,
    idle: '/assets/normal.png',
    clicked: '/assets/clicked.png',
    background: null,
    special420Idle: '/assets/420Idle.png',
    special420Clicked: '/assets/420Clicked.png'
  },
  {
  id: 'thanos',
  name: 'Thanos',
  target: 420,
  artworkReady: true,
  idle: '/assets/ThanosIdle.png',
  clicked: '/assets/ThanosClicked.png',
  background: '/assets/ThanosBackground.png',
  special420Idle: '/assets/420ThanosIdle.png',
  special420Clicked: '/assets/420ThanosClicked.png'
},
  {
    id: 'endry',
    name: 'Endry',
    target: 666,
    artworkReady: true,
    idle: '/assets/EndryIdle.png',
    clicked: '/assets/EndryClicked.png',
    background: '/assets/EndryBackground.png',
    special420Idle: '/assets/420EndryIdle.png',
    special420Clicked: '/assets/420EndryClicked.png'
  }
];

let selectedDegenId =
  localStorage.getItem(SELECTED_DEGEN_STORAGE) ||
  'base';

  const ACHIEVEMENTS_STORAGE = 'wethdegen-achievements';

const ACHIEVEMENTS = [
  { id: 'first-weth', name: 'First WETH', target: 1 },
  { id: 'nice', name: 'NICE!', target: 69 },
  { id: 'weth-noob', name: 'WETH Noob', target: 200 },
  { id: 'weth-blazer', name: 'WETH Blazer', target: 420 },
  { id: 'weth-rookie', name: 'WETH Rookie', target: 600 },
  { id: 'weth-chad', name: 'WETH Chad', target: 1000 },
  { id: 'weth-lord', name: 'WETH Lord', target: 2000 },
  { id: 'weth-god', name: 'WETH GOD', target: 3000 },
  { id: 'certified-wether', name: "Certified WETH'ER", target: 5000 },
  { id: 'ultimate-wether', name: "Ultimate WETH'ER", target: 7500 },
  { id: 'max-wether', name: "Max WETH'ER", target: 10000 },
  { id: 'titan-wether', name: "Titan WETH'ER", target: 15000 },
  { id: 'holy-weth', name: 'Holy WETH', target: 20000 },
  { id: 'king-weth', name: 'King WETH', target: 25000 },
  { id: 'absolute-degen', name: 'Absolute Degen', target: 69696 }
];

  let achievementToastQueue = [];
  let achievementToastActive = false;

  const audioPool = Array.from({ length: 8 }, () => {
    const audio = new Audio('/assets/pop.mp3');
    audio.preload = 'auto';
    return audio;
  });
  
  const endryAudioPool = Array.from({ length: 8 }, () => {
    const audio = new Audio('/assets/EndryFart.mp3');
    audio.preload = 'auto';
    return audio;
  });

  const thanosAudioPool = Array.from({ length: 8 }, () => {
    const audio = new Audio('/assets/ThanosBurp.mp3');
    audio.preload = 'auto';
    return audio;
  });
  
  let audioIndex = 0;

let musicContext = null;
let musicGainNode = null;
let musicSourceNode = null;
let musicStartPromise = null;

async function startBackgroundMusic() {
  if (musicSourceNode) {
    if (
      musicContext &&
      musicContext.state === 'suspended'
    ) {
      try {
        await musicContext.resume();
      } catch (_) {}
    }

    return;
  }

  if (musicStartPromise) {
    return musicStartPromise;
  }

  musicStartPromise = (async () => {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!musicContext) {
      musicContext =
        new AudioContextClass();
    }

    if (musicContext.state === 'suspended') {
      await musicContext.resume();
    }

    const response =
      await fetch('/assets/MenuMusic.mp3');

    if (!response.ok) {
      throw new Error(
        'Could not load background music'
      );
    }

    const audioData =
      await response.arrayBuffer();

    const musicBuffer =
      await musicContext.decodeAudioData(
        audioData
      );

    musicGainNode =
      musicContext.createGain();

    musicGainNode.gain.value =
      (musicVolume / 100) * 0.2;

    musicGainNode.connect(
      musicContext.destination
    );

    const source =
      musicContext.createBufferSource();

    source.buffer = musicBuffer;

    source.loop = true;

    source.connect(
      musicGainNode
    );

    source.start(0);

    musicSourceNode = source;
  })()
    .catch((error) => {
      console.warn(
        'Background music:',
        error
      );
    })
    .finally(() => {
      musicStartPromise = null;
    });

  return musicStartPromise;
}

function updateMusicVolume() {
  if (
    !musicContext ||
    !musicGainNode
  ) {
    return;
  }

  musicGainNode.gain.setValueAtTime(
    (musicVolume / 100) * 0.2,
    musicContext.currentTime
  );
}
  
  const wethyAudio =
    new Audio('/assets/WETHY.mp3');

  wethyAudio.preload = 'auto';
  const theresMoreAudio =
    new Audio('/assets/ButWaitTheresMore.mp3');
  
  theresMoreAudio.preload = 'auto';
  let endryAudioIndex = 0;
  let thanosAudioIndex = 0;

  function formatScore(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function renderScore() {
    scoreEl.textContent = formatScore(score);
    submitScoreValue.textContent = formatScore(score);
  }

  function renderSoundSettings() {
    if (musicVolumeSlider) {
      musicVolumeSlider.value =
        String(musicVolume);
    }
  
    if (musicVolumeValue) {
      musicVolumeValue.textContent =
        String(musicVolume);
    }
  
    if (gameVolumeSlider) {
      gameVolumeSlider.value =
        String(gameVolume);
    }
  
    if (gameVolumeValue) {
      gameVolumeValue.textContent =
        String(gameVolume);
    }
  }

  function playPop() {
    if (gameVolume <= 0) return;
  
    const selectedDegen =
      getSelectedDegen();
  
    let audio;
  
    if (selectedDegen.id === 'endry') {
      audio =
        endryAudioPool[
          endryAudioIndex++ %
          endryAudioPool.length
        ];
    } else if (selectedDegen.id === 'thanos') {
      audio =
        thanosAudioPool[
          thanosAudioIndex++ %
          thanosAudioPool.length
        ];
    } else {
      audio =
        audioPool[
          audioIndex++ %
          audioPool.length
        ];
    }
  
    try {
      audio.currentTime = 0;
  
      if (selectedDegen.id === 'endry') {
        audio.volume =
          (gameVolume / 100) * 0.9;
      } else {
        audio.volume =
          gameVolume / 100;
      }
  
      const p = audio.play();
  
      if (
        p &&
        typeof p.catch === 'function'
      ) {
        p.catch(() => {});
      }
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

  function showWethyEvent() {
  const wethy = $('wethyEvent');

  if (!wethy) return;

  /* Play WETHY sound */
  if (gameVolume > 0) {
    try {
      wethyAudio.currentTime = 0;

      wethyAudio.volume =
        gameVolume / 100;

      const playPromise =
        wethyAudio.play();

      if (
        playPromise &&
        typeof playPromise.catch === 'function'
      ) {
        playPromise.catch(() => {});
      }
    } catch (_) {}
  }

  /* Restart WETHY animation */
  wethy.classList.remove('show');

  void wethy.offsetWidth;

  wethy.classList.add('show');

  clearTimeout(
    showWethyEvent.hideTimer
  );

  showWethyEvent.hideTimer =
    setTimeout(() => {
      wethy.classList.remove('show');
    }, 3400);
}

  function showTheresMoreEvent() {
  const theresMore =
    $('theresMoreEvent');

  if (!theresMore) return;

  /* Play But Wait, There's More sound */
  if (gameVolume > 0) {
    try {
      theresMoreAudio.currentTime = 0;

      theresMoreAudio.volume =
        gameVolume / 100;

      const playPromise =
        theresMoreAudio.play();

      if (
        playPromise &&
        typeof playPromise.catch === 'function'
      ) {
        playPromise.catch(() => {});
      }
    } catch (_) {}
  }

  /* Restart popup animation */
  theresMore.classList.remove('show');

  void theresMore.offsetWidth;

  theresMore.classList.add('show');

  clearTimeout(
    showTheresMoreEvent.hideTimer
  );

  showTheresMoreEvent.hideTimer =
    setTimeout(() => {
      theresMore.classList.remove('show');
    }, 4200);
}

function updatePersonalBest() {
  if (score > personalBest) {
    const previousBest = personalBest;

    personalBest = score;

    localStorage.setItem(
      PERSONAL_BEST_STORAGE,
      String(personalBest)
    );

    renderStats();
    renderDegens();

    checkDegenUnlocks(
      previousBest,
      personalBest
    );

    scheduleLeaderboardProfileSync();
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

    scheduleLeaderboardProfileSync();
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

  function getDegenById(id) {
  return (
    DEGENS.find((degen) => degen.id === id) ||
    DEGENS[0]
  );
}

function isDegenUnlocked(degen) {
  return (
    degen.target === 0 ||
    personalBest >= degen.target
  );
}

function getSelectedDegen() {
  let degen = getDegenById(selectedDegenId);

  if (
    !degen.artworkReady ||
    !isDegenUnlocked(degen)
  ) {
    selectedDegenId = 'base';

    localStorage.setItem(
      SELECTED_DEGEN_STORAGE,
      selectedDegenId
    );

    degen = getDegenById('base');
  }

  return degen;
}

  function getSelectedDegen420Art() {
  const degen = getSelectedDegen();

  return {
    idle:
      degen.special420Idle || BLAZE_IDLE,
    clicked:
      degen.special420Clicked || BLAZE_CLICKED
  };
}

function applySelectedDegen() {
  const degen = getSelectedDegen();
    degenButton.dataset.degen = degen.id;
    degenImage.dataset.degen = degen.id;

  /*
   * Preserve the 420 Blaze It artwork when
   * the current score is exactly 420.
   */
  if (score === 420) {
    const special420 =
      getSelectedDegen420Art();
  
    degenImage.src =
      special420.idle;
  
    degenImage.classList.add(
      'blaze-image'
    );
  } else {
    degenImage.src = degen.idle;
    degenImage.classList.remove(
      'blaze-image'
    );
  }

  /*
   * Base Degen uses the normal stylesheet
   * background. Other Degens can provide
   * their own full-screen background.
   */
  if (degen.id === 'base') {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundColor = '';
  
    document.documentElement.style.backgroundColor = '';
  } else if (degen.background) {
    document.body.style.backgroundImage =
      `url("${degen.background}")`;
  
    document.body.style.backgroundSize =
      'cover';
  
    document.body.style.backgroundRepeat =
      'no-repeat';
  
    document.body.style.backgroundPosition =
      'center bottom';
  
    document.body.style.backgroundColor =
      '#7f9c9d';
  
    document.documentElement.style.backgroundColor =
      '#7f9c9d';
  }
  }

  function renderDegens() {
  const activeDegen = getSelectedDegen();

  DEGENS.forEach((degen) => {
    const card = document.querySelector(
      `[data-degen="${degen.id}"]`
    );

    if (!card) return;

    const requirement = card.querySelector(
      '[data-degen-requirement]'
    );

    const button = card.querySelector(
      '[data-select-degen]'
    );

    const progressText = card.querySelector(
      '[data-degen-progress-text]'
    );

    const progressFill = card.querySelector(
      '[data-degen-progress-fill]'
    );

    const isUnlocked =
      isDegenUnlocked(degen);

    const isSelected =
      activeDegen.id === degen.id;

    card.classList.toggle(
      'locked',
      !isUnlocked
    );

    card.classList.toggle(
      'unlocked',
      isUnlocked
    );

    card.classList.toggle(
      'selected',
      isSelected
    );

    if (requirement) {
      if (isUnlocked) {
        requirement.textContent =
          '✅ UNLOCKED';
      } else {
        requirement.textContent =
          `🔒 ${degen.target.toLocaleString()} CLICKS`;
      }
    }

    if (
      progressText &&
      progressFill &&
      degen.target > 0
    ) {
      const progressValue =
        Math.min(
          personalBest,
          degen.target
        );

      const progressPercent =
        Math.min(
          100,
          Math.floor(
            (progressValue / degen.target) *
              100
          )
        );

      progressText.textContent =
        `${progressValue.toLocaleString()} / ${degen.target.toLocaleString()} WETHS`;

      progressFill.style.width =
        `${progressPercent}%`;
    }

    if (button) {
      if (!isUnlocked) {
        button.disabled = true;
        button.textContent = 'LOCKED';
      } else if (!degen.artworkReady) {
        button.disabled = true;
        button.textContent =
          'ART COMING SOON';
      } else {
        button.disabled = false;

        button.textContent =
          isSelected
            ? 'SELECTED'
            : 'SELECT';
      }
    }
  });
}

function openDegens() {
  const backdrop = $('degensBackdrop');

  if (!backdrop) return;

  renderDegens();

  const status = $('degensStatus');

  if (status) {
    status.textContent = '';
  }

  backdrop.hidden = false;
  document.body.classList.add('modal-open');

  if (siteMenu) {
    siteMenu.hidden = true;
  }

  if (menuButton) {
    menuButton.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  const closeButton = $('closeDegens');

  if (closeButton) {
    setTimeout(() => {
      closeButton.focus();
    }, 0);
  }
}

function closeDegens() {
  const backdrop = $('degensBackdrop');

  if (!backdrop) return;

  backdrop.hidden = true;
  document.body.classList.remove('modal-open');

  const button = $('degensButton');

  if (button) {
    button.focus();
  }
}

  function checkDegenUnlocks(previousBest, newBest) {
  DEGENS.forEach((degen) => {
    if (degen.target <= 0) return;

    const crossedTarget =
      previousBest < degen.target &&
      newBest >= degen.target;

    if (crossedTarget) {
      showDegenUnlockToast(degen);
    }
  });
}

function showDegenUnlockToast(degen) {
  const toast = $('degenUnlockToast');
  const name = $('degenUnlockName');
  const description = $('degenUnlockDescription');

  if (!toast || !name || !description) {
    return;
  }

  name.textContent =
    degen.name.toUpperCase();

  description.textContent =
    `${degen.target.toLocaleString()} WETHS REACHED — Check the Degens menu!`;

  toast.hidden = false;

  toast.classList.remove('show');

  // Restart animation cleanly.
  void toast.offsetWidth;

  toast.classList.add('show');

  clearTimeout(
    showDegenUnlockToast.hideTimer
  );

  showDegenUnlockToast.hideTimer =
    setTimeout(() => {
      toast.classList.remove('show');
      toast.hidden = true;
    }, 3500);
}

  function updateCombo() {
  comboCount += 1;
  updateHighestCombo();

      if (
        comboCount > 0 &&
        comboCount % 175 === 0
      ) {
        showTheresMoreEvent();
      }

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

  function queueServerClick() {
  pendingServerClicks += 1;

  clearTimeout(serverSyncTimer);

  if (pendingServerClicks >= 10) {
    flushServerClicks();
  } else {
    serverSyncTimer = setTimeout(
      flushServerClicks,
      700
    );
  }
}

async function flushServerClicks() {
  if (
    serverSyncInFlight ||
    pendingServerClicks === 0
  ) {
    return;
  }

  serverSyncInFlight = true;

  const clicks = Math.min(
    pendingServerClicks,
    10
  );

  /*
    Remember exactly which sequence number
    THIS request is sending.
  */
  const sentSeq = serverBatchSeq;

  pendingServerClicks -= clicks;

  try {
    const sid = await ensureSession();

    if (!sid || backendMode !== 'live') {
      pendingServerClicks += clicks;
      return;
    }

    const response = await fetch('/api/clicks', {
      method: 'POST',

      headers: {
        'content-type': 'application/json'
      },

      body: JSON.stringify({
        sessionId: sid,
        clicks,
        seq: sentSeq
      })
    });

    const data = await response
      .json()
      .catch(() => ({}));

    /*
      Special retry protection.

      Example:

      Browser sends:
        batch #7, +10 clicks

      Cloudflare accepts it, but the response
      gets lost because of a network problem.

      Browser retries batch #7.

      Cloudflare says:
        "I already expect batch #8."

      That means batch #7 was already consumed,
      so we MUST NOT add those 10 clicks back
      to pendingServerClicks.
    */
    if (response.status === 409) {
      const expectedSeq =
        Number(data.expectedSeq);

      const reportedServerScore =
        Number(data.serverScore);

      if (
        Number.isInteger(expectedSeq) &&
        expectedSeq > sentSeq
      ) {
        serverBatchSeq = expectedSeq;

        if (Number.isFinite(reportedServerScore)) {
          serverAuthoritativeScore =
            reportedServerScore;
        }

        /*
          IMPORTANT:
          Do NOT put "clicks" back into
          pendingServerClicks here.

          The server has already moved beyond
          this sequence number.
        */
        return;
      }

      if (Number.isInteger(expectedSeq)) {
        serverBatchSeq = expectedSeq;
      }

      pendingServerClicks += clicks;

      throw new Error(
        data.error || 'Server click sequence mismatch'
      );
    }

    if (!response.ok) {
      pendingServerClicks += clicks;

      throw new Error(
        data.error || 'Server click sync failed'
      );
    }

    serverAuthoritativeScore =
      Number(data.serverScore || 0);

    if (Number.isFinite(Number(data.globalTotal))) {
      globalTotalValue =
        Number(data.globalTotal);

      const globalTotal = $('globalTotal');

      if (globalTotal) {
        globalTotal.textContent =
          globalTotalValue.toLocaleString();
      }
    }

    serverBatchSeq =
      Number(
        data.nextSeq ||
        sentSeq + 1
      );

  } catch (error) {
    console.warn(
      'Server click sync:',
      error.message || error
    );

  } finally {
    serverSyncInFlight = false;

    if (pendingServerClicks > 0) {
      clearTimeout(serverSyncTimer);

      serverSyncTimer = setTimeout(
        flushServerClicks,
        700
      );
    }
  }
}

  async function syncServerScoreBeforeSubmit() {
  clearTimeout(serverSyncTimer);

  const timeoutAt = Date.now() + 6000;

  while (
    pendingServerClicks > 0 ||
    serverSyncInFlight
  ) {
    if (
      !serverSyncInFlight &&
      pendingServerClicks > 0
    ) {
      await flushServerClicks();
    }

    if (
      pendingServerClicks === 0 &&
      !serverSyncInFlight
    ) {
      break;
    }

    if (Date.now() > timeoutAt) {
      throw new Error(
        'Could not verify your latest clicks. Wait a moment and try again.'
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 75)
    );
  }

  return serverAuthoritativeScore;
}

  /* ===== AUTOMATIC LEADERBOARD PROFILE SYNC ===== */

  let leaderboardProfileSyncTimer = null;
  let leaderboardProfileSyncInFlight = false;
  
  function scheduleLeaderboardProfileSync() {
    const savedName =
      localStorage.getItem(
        LEADERBOARD_NAME_STORAGE
      );
  
    if (
      !savedName ||
      score < 1
    ) {
      return;
    }
  
    clearTimeout(
      leaderboardProfileSyncTimer
    );
  
    leaderboardProfileSyncTimer =
      setTimeout(
        syncLeaderboardProfile,
        2600
      );
  }
  
  async function syncLeaderboardProfile() {
    if (leaderboardProfileSyncInFlight) {
      scheduleLeaderboardProfileSync();
      return;
    }
  
    const savedName =
      localStorage.getItem(
        LEADERBOARD_NAME_STORAGE
      );
  
    if (
      !savedName ||
      score < 1
    ) {
      return;
    }
  
    leaderboardProfileSyncInFlight = true;
  
    try {
      const sid = await ensureSession();
  
      if (
        !sid ||
        backendMode !== 'live'
      ) {
        return;
      }
  
      await syncServerScoreBeforeSubmit();
  
      const res = await fetch(
        '/api/submit',
        {
          method: 'POST',
  
          headers: {
            'content-type':
              'application/json'
          },
  
          body: JSON.stringify({
            name: savedName,
            sessionId: sid,
            highestCombo
          })
        }
      );
  
      const data =
        await res.json().catch(
          () => ({})
        );
  
      if (!res.ok) {
        return;
      }
  
      if (
        Array.isArray(data.entries)
      ) {
        renderLeaderboard(
          data.entries
        );
      }
  
    } catch (_) {
      /* Silent automatic sync */
    } finally {
      leaderboardProfileSyncInFlight =
        false;
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
  
  if (
    score > 0 &&
    score % 200 === 0
  ) {
    showWethyEvent();
  }
  
  queueServerClick();
  checkAchievements();
  updateCombo();

  /* Special clicked artwork only when score hits exactly 420 */
if (score === 420) {
  const special420 =
    getSelectedDegen420Art();

  degenImage.src =
    special420.clicked;

  degenImage.classList.add(
    'blaze-image'
  );
} else {
  const selectedDegen =
    getSelectedDegen();

  degenImage.src =
    selectedDegen.clicked;

  degenImage.classList.remove(
    'blaze-image'
  );
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
    const special420 =
      getSelectedDegen420Art();
  
    degenImage.src =
      special420.idle;
  
    degenImage.classList.add(
      'blaze-image'
    );
  } else {
    const selectedDegen =
      getSelectedDegen();
  
    degenImage.src =
      selectedDegen.idle;
  
    degenImage.classList.remove(
      'blaze-image'
    );
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

  function openSound() {
  if (!soundBackdrop) return;

  renderSoundSettings();

  soundBackdrop.hidden = false;

  document.body.classList.add(
    'modal-open'
  );

  if (siteMenu) {
    siteMenu.hidden = true;
  }

  if (menuButton) {
    menuButton.setAttribute(
      'aria-expanded',
      'false'
    );
  }
}

function closeSound() {
  if (!soundBackdrop) return;

  soundBackdrop.hidden = true;

  document.body.classList.remove(
    'modal-open'
  );

  soundButton?.focus();
}

soundButton?.addEventListener(
  'click',
  openSound
);

closeSoundButton?.addEventListener(
  'click',
  closeSound
);

soundBackdrop?.addEventListener(
  'click',
  (event) => {
    if (event.target === soundBackdrop) {
      closeSound();
    }
  }
);

musicVolumeSlider?.addEventListener(
  'input',
  () => {
    musicVolume =
      Number(musicVolumeSlider.value);

    localStorage.setItem(
      MUSIC_VOLUME_STORAGE,
      String(musicVolume)
    );

    if (musicVolumeValue) {
      musicVolumeValue.textContent =
        String(musicVolume);
    }

    updateMusicVolume();

    startBackgroundMusic();
  }
);

gameVolumeSlider?.addEventListener(
  'input',
  () => {
    gameVolume =
      Number(gameVolumeSlider.value);

    localStorage.setItem(
      GAME_VOLUME_STORAGE,
      String(gameVolume)
    );

    if (gameVolumeValue) {
      gameVolumeValue.textContent =
        String(gameVolume);
    }
  }
);

function unlockBackgroundMusic() {
  startBackgroundMusic();
}

/* Desktop */
document.addEventListener(
  'mousedown',
  unlockBackgroundMusic,
  {
    once: true,
    capture: true
  }
);

/* Mobile / iPhone / iPad */
document.addEventListener(
  'touchend',
  unlockBackgroundMusic,
  {
    once: true,
    capture: true
  }
);

document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key === 'Escape' &&
      soundBackdrop &&
      !soundBackdrop.hidden
    ) {
      closeSound();
    }
  }
);

document.addEventListener(
  'keydown',
  unlockBackgroundMusic,
  {
    once: true,
    capture: true
  }
);
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

      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'player-name player-name-button';
      name.textContent = String(entry.name || 'ANON');
      
      name.dataset.playerName =
        String(entry.name || 'ANON');
      
      name.dataset.playerScore =
        String(Number(entry.score || 0));
      
      name.dataset.playerCombo =
        String(Number(entry.highestCombo || 0));

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

  function openPlayerStats(button) {
    if (
      !playerStatsBackdrop ||
      !button
    ) {
      return;
    }
  
    const name =
      button.dataset.playerName ||
      'PLAYER';
  
    const best =
      Number(
        button.dataset.playerScore || 0
      );
  
    const combo =
      Number(
        button.dataset.playerCombo || 0
      );
  
    if (playerStatsTitle) {
      playerStatsTitle.textContent = name;
    }
  
    if (playerStatsBest) {
      playerStatsBest.textContent =
        best.toLocaleString();
    }
  
    if (playerStatsCombo) {
      playerStatsCombo.textContent =
        `x${combo.toLocaleString()}`;
    }
  
    modalBackdrop.hidden = true;
  
    playerStatsBackdrop.hidden = false;
  
    document.body.classList.add(
      'modal-open'
    );
  }
  
  function closePlayerStatsModal() {
    if (!playerStatsBackdrop) return;
  
    playerStatsBackdrop.hidden = true;
  
    /*
      Return to the leaderboard after
      closing a player's stats.
    */
    modalBackdrop.hidden = false;
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

  leaderboardList.addEventListener(
    'click',
    (event) => {
      const button =
        event.target.closest(
          '.player-name-button'
        );
  
      if (!button) return;
  
      openPlayerStats(button);
    }
  );
  
  closePlayerStats?.addEventListener(
    'click',
    closePlayerStatsModal
  );
  
  playerStatsBackdrop?.addEventListener(
    'click',
    (event) => {
      if (
        event.target ===
        playerStatsBackdrop
      ) {
        closePlayerStatsModal();
      }
    }
  );

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

  const degensButton = $('degensButton');
const closeDegensButton = $('closeDegens');
const degensBackdrop = $('degensBackdrop');

degensButton?.addEventListener(
  'click',
  openDegens
);

closeDegensButton?.addEventListener(
  'click',
  closeDegens
);

degensBackdrop?.addEventListener(
  'click',
  (event) => {
    if (event.target === degensBackdrop) {
      closeDegens();
    }
  }
);

document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key === 'Escape' &&
      degensBackdrop &&
      !degensBackdrop.hidden
    ) {
      closeDegens();
    }
  }
);

  document
  .querySelectorAll('[data-select-degen]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      const degenId =
        button.dataset.selectDegen;

      const degen =
        getDegenById(degenId);

      const status =
        $('degensStatus');

      if (
        !isDegenUnlocked(degen) ||
        !degen.artworkReady
      ) {
        return;
      }

      selectedDegenId = degen.id;

      localStorage.setItem(
        SELECTED_DEGEN_STORAGE,
        selectedDegenId
      );

      applySelectedDegen();
      renderDegens();

      if (status) {
        status.textContent =
          `${degen.name} selected!`;
      }
    });
  });

const degenCheckButton = $('degenCheckButton');

degenCheckButton?.addEventListener('click', (event) => {
  if (!event.isTrusted) return;

  event.preventDefault();
  passDegenCheck();
});

/* ===== X SCORECARD GENERATOR ===== */

function dataUrlToFile(
  dataUrl,
  filename
) {
  const parts =
    dataUrl.split(',');

  const header =
    parts[0] || '';

  const base64 =
    parts[1] || '';

  const mimeMatch =
    header.match(
      /data:(.*?);base64/
    );

  const mime =
    mimeMatch
      ? mimeMatch[1]
      : 'image/png';

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i += 1
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return new File(
    [bytes],
    filename,
    {
      type: mime
    }
  );
}

function createScorecardFile() {
  if (
    !scorecardTemplate.complete ||
    scorecardTemplate.naturalWidth === 0
  ) {
    throw new Error(
      'Scorecard template is still loading.'
    );
  }

  const canvas =
    document.createElement(
      'canvas'
    );

  canvas.width = 1200;
  canvas.height = 630;

  const ctx =
    canvas.getContext('2d');

  if (!ctx) {
    throw new Error(
      'Could not create scorecard.'
    );
  }

  ctx.drawImage(
    scorecardTemplate,
    0,
    0,
    1200,
    630
  );

  const scoreText =
    Number(score).toLocaleString(
      'en-US'
    );

  let fontSize = 110;

  do {
    ctx.font =
      `900 ${fontSize}px ` +
      `"Arial Black", Arial, sans-serif`;

    if (
      ctx.measureText(
        scoreText
      ).width <= 500
    ) {
      break;
    }

    fontSize -= 4;

  } while (fontSize > 56);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#080808';
  ctx.lineWidth = 14;

  ctx.fillStyle = '#ffe600';

  ctx.strokeText(
    scoreText,
    830,
    335
  );

  ctx.fillText(
    scoreText,
    830,
    335
  );

  const dataUrl =
    canvas.toDataURL(
      'image/png'
    );

  return dataUrlToFile(
    dataUrl,
    `wethdegen-${score}.png`
  );
}  

const shareScoreButton = $('shareScoreButton');

shareScoreButton?.addEventListener(
  'click',
  async () => {
    const shareText =
      `I just WETH'd ${score.toLocaleString()} times on WETHDEGEN 🔥\n\nCan you beat me?\n\nhttps://wethdegen.xyz`;

    try {
      const scorecard =
        createScorecardFile();

      /*
        Try native file sharing first.
        Do NOT require navigator.canShare,
        because some mobile browsers support
        sharing files without exposing canShare().
      */
      if (navigator.share) {
        try {
          await navigator.share({
            files: [scorecard]
          });

          return;
        } catch (shareError) {
          /*
            User manually closed the share sheet.
          */
          if (
            shareError &&
            shareError.name === 'AbortError'
          ) {
            return;
          }

          /*
            If this browser does not support
            sharing a generated file, continue
            to the desktop fallback below.
          */
          console.warn(
            'Native image share unavailable:',
            shareError
          );
        }
      }

      /*
        Fallback:
        save scorecard + open X composer.
      */
      const imageUrl =
        URL.createObjectURL(scorecard);

      const download =
        document.createElement('a');

      download.href = imageUrl;

      download.download =
        `wethdegen-${score}.png`;

      document.body.appendChild(
        download
      );

      download.click();
      download.remove();

      setTimeout(() => {
        URL.revokeObjectURL(
          imageUrl
        );
      }, 1500);

      const xText =
        `I just WETH'd ${score.toLocaleString()} times on WETHDEGEN 🔥\n\nCan you beat me?`;

      const shareUrl =
        `https://x.com/intent/tweet?text=${encodeURIComponent(xText)}` +
        `&url=${encodeURIComponent('https://wethdegen.xyz')}`;

      window.open(
        shareUrl,
        '_blank',
        'noopener,noreferrer'
      );

    } catch (error) {
      console.error(
        'Scorecard sharing failed:',
        error
      );

      const xText =
        `I just WETH'd ${score.toLocaleString()} times on WETHDEGEN 🔥\n\nCan you beat me?`;

      const shareUrl =
        `https://x.com/intent/tweet?text=${encodeURIComponent(xText)}` +
        `&url=${encodeURIComponent('https://wethdegen.xyz')}`;

      window.open(
        shareUrl,
        '_blank',
        'noopener,noreferrer'
      );
    }
  }
);
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
      formStatus.textContent = 'Get at least 1 WETH first.';
      formStatus.classList.add('error');
      return;
    }

    submitButton.disabled = true;
    formStatus.textContent = 'Submitting…';

    try {
      const sid = await ensureSession();

      if (backendMode === 'live' && sid) {
        formStatus.textContent = 'Verifying clicks…';
      
        await syncServerScoreBeforeSubmit();
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name,
            sessionId: sid,
            highestCombo
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not submit score');
        localStorage.setItem(
          LEADERBOARD_NAME_STORAGE,
          name
        );
        renderLeaderboard(data.entries || []);
        serverAuthoritativeScore =
          Number(data.score || serverAuthoritativeScore);
        formStatus.textContent =
          data.improved === false
            ? `Verified score: ${Number(data.score || 0).toLocaleString()}. Your existing high score is higher.`
            : `Verified score submitted: ${Number(data.score || 0).toLocaleString()} WETH'D!`;
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
  renderSoundSettings();
  loadGlobalTotal();
  renderAchievements();
  checkAchievements();
  renderStats();
  applySelectedDegen();
  renderDegens();

// Start a server-side timing session early when the backend exists.
ensureSession();
})();
