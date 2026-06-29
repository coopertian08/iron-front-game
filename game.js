(() => {
  "use strict";

  const canvas = document.querySelector("#battlefield");
  const ctx = canvas.getContext("2d");
  const minimap = document.querySelector("#minimap");
  const mctx = minimap.getContext("2d");
  const viewport = document.querySelector("#battlefield-viewport");

  const W = canvas.width;
  const LANES = [260, 600, 940];
  const MAX_HQ_HP = 2000;
  const CP_MAX = 20;
  const CP_INTERVAL = .9;
  const WAREHOUSE_CP_INTERVAL = 5;
  const GAME_VERSION = "2.0.0";
  const CAREER_KEY = "ironFrontCareer";
  const LEGACY_CAREER_KEYS = ["ironFrontCareerV1"];
  const DIFFICULTY_SCORE = { novice: 1, easy: 2, normal: 3, hard: 4, hell: 5 };

  const MAPS = {
    classic: { name: "经典桥战", height: 2400, river: true, riverTop: 1100, riverBottom: 1300, bridges: [285, 615], bridgeWidth: 116, enemyHQ: 120, playerHQ: 2280, enemySpawn: 245, playerSpawn: 2155 },
    single: { name: "单桥决战", height: 2600, river: true, riverTop: 1120, riverBottom: 1480, bridges: [450], bridgeWidth: 128, enemyHQ: 120, playerHQ: 2480, enemySpawn: 245, playerSpawn: 2355 },
    plains: { name: "平原战", height: 2200, river: false, riverTop: 1040, riverBottom: 1160, bridges: [], bridgeWidth: 0, enemyHQ: 110, playerHQ: 2090, enemySpawn: 235, playerSpawn: 1965 },
    large: { name: "大地图", height: 3400, river: true, riverTop: 1600, riverBottom: 1810, bridges: [250, 650], bridgeWidth: 120, enemyHQ: 120, playerHQ: 3280, enemySpawn: 245, playerSpawn: 3155 }
  };

  let selectedMap = "classic";
  let H = MAPS.classic.height;
  let HAS_RIVER = MAPS.classic.river;
  let RIVER_TOP = MAPS.classic.riverTop;
  let RIVER_BOTTOM = MAPS.classic.riverBottom;
  let BRIDGES = [...MAPS.classic.bridges];
  let BRIDGE_WIDTH = MAPS.classic.bridgeWidth;
  let PLAYER_HQ_Y = MAPS.classic.playerHQ;
  let ENEMY_HQ_Y = MAPS.classic.enemyHQ;
  let PLAYER_SPAWN_Y = MAPS.classic.playerSpawn;
  let ENEMY_SPAWN_Y = MAPS.classic.enemySpawn;

  const DIFFICULTIES = {
    novice: { name: "新手级", enemyCPInterval: 2.7, startCP: 5, firstWave: 3.5, cooldownMin: 3.6, cooldownMax: 5.2, saveChance: .58, burstChance: 0, aggression: .38 },
    easy: { name: "简单级", enemyCPInterval: 2.2, startCP: 6, firstWave: 2.9, cooldownMin: 2.8, cooldownMax: 4.1, saveChance: .66, burstChance: .01, aggression: .48 },
    normal: { name: "普通级", enemyCPInterval: 1.7, startCP: 7, firstWave: 2.2, cooldownMin: 2.05, cooldownMax: 3.25, saveChance: .73, burstChance: .04, aggression: .6 },
    hard: { name: "困难级", enemyCPInterval: 1.15, startCP: 9, firstWave: 1.65, cooldownMin: 1.35, cooldownMax: 2.15, saveChance: .78, burstChance: .12, aggression: .74 },
    hell: { name: "地狱级", enemyCPInterval: .78, startCP: 10, firstWave: 1.1, cooldownMin: .92, cooldownMax: 1.55, saveChance: .82, burstChance: .25, aggression: .9 }
  };

  const TYPES = {
    light: {
      name: "轻型坦克", cost: 3, hp: 115, damage: 16, speed: 58,
      range: 137, fireRate: .72, size: 34, shellSpeed: 610, color: "#99ad55"
    },
    medium: {
      name: "中型坦克", cost: 5, hp: 190, damage: 29, speed: 42,
      range: 151, fireRate: .94, size: 39, shellSpeed: 565, color: "#869849"
    },
    heavy: {
      name: "重型坦克", cost: 7, hp: 285, damage: 43, speed: 29,
      range: 165, fireRate: 1.24, size: 43, shellSpeed: 520, color: "#75833f"
    },
    artillery: {
      name: "野战炮", cost: 6, hp: 92, damage: 58, speed: 23,
      range: 410, fireRate: 2.55, size: 36, shellSpeed: 390, color: "#8c8450"
    },
    rocket: {
      name: "火箭炮", cost: 15, hp: 108, damage: 17, speed: 25,
      range: 420, fireRate: 7.5, size: 40, shellSpeed: 470, color: "#777e50",
      rocket: true, salvoCount: 8, salvoDelay: .11
    },
    helicopter: {
      name: "武装直升机", cost: 8, hp: 155, damage: 8, speed: 82,
      range: 185, fireRate: .17, size: 33, shellSpeed: 920, color: "#758e58",
      air: true, bullet: true
    },
    apc: {
      name: "步兵装甲车", cost: 6, hp: 175, damage: 6, speed: 47,
      range: 126, fireRate: .28, size: 38, shellSpeed: 880, color: "#7e9569",
      bullet: true
    },
    infantry: {
      name: "机枪步兵", cost: 0, hp: 52, damage: 5, speed: 35,
      range: 118, fireRate: .24, size: 16, shellSpeed: 930, color: "#8fa374",
      bullet: true, infantry: true
    }
  };
  const DEPLOYABLE_TYPES = ["light", "medium", "heavy", "artillery", "rocket", "helicopter", "apc"];
  const FORTIFICATION_TYPES = {
    obstacle: { name: "拒马", cost: 4, hp: 280, buildTime: 3, size: 42 },
    bunker: { name: "机枪堡垒", cost: 9, hp: 560, buildTime: 6, size: 48, range: 305, damage: 7, fireRate: .2 }
  };

  const el = {
    homeScreen: document.querySelector("#home-screen"),
    enterCommandButton: document.querySelector("#enter-command"),
    gameVersion: document.querySelector("#game-version"),
    startScreen: document.querySelector("#start-screen"),
    startButton: document.querySelector("#start-button"),
    resultScreen: document.querySelector("#result-screen"),
    resultPanel: document.querySelector(".result-panel"),
    resultKicker: document.querySelector("#result-kicker"),
    resultTitle: document.querySelector("#result-title"),
    resultCopy: document.querySelector("#result-copy"),
    resultTime: document.querySelector("#result-time"),
    resultDeployed: document.querySelector("#result-deployed"),
    resultKills: document.querySelector("#result-kills"),
    restartButton: document.querySelector("#restart-button"),
    resultMenuButton: document.querySelector("#result-menu-button"),
    returnMenuButton: document.querySelector("#return-menu"),
    careerWins: document.querySelector("#career-wins"),
    careerScore: document.querySelector("#career-score"),
    careerLosses: document.querySelector("#career-losses"),
    careerTotal: document.querySelector("#career-total"),
    careerRate: document.querySelector("#career-rate"),
    homeCareerWins: document.querySelector("#home-career-wins"),
    homeCareerScore: document.querySelector("#home-career-score"),
    homeCareerLosses: document.querySelector("#home-career-losses"),
    homeCareerTotal: document.querySelector("#home-career-total"),
    homeCareerRate: document.querySelector("#home-career-rate"),
    battleIntro: document.querySelector("#battle-intro"),
    cockpitOverlay: document.querySelector("#cockpit-overlay"),
    cockpitUnit: document.querySelector("#cockpit-unit"),
    cockpitWeapon: document.querySelector("#cockpit-weapon"),
    cockpitReload: document.querySelector("#cockpit-reload"),
    destructionPrompt: document.querySelector("#destruction-prompt"),
    cpValue: document.querySelector("#cp-value"),
    cpPips: document.querySelector("#cp-pips"),
    battleTime: document.querySelector("#battle-time"),
    playerHqBar: document.querySelector("#player-hq-bar"),
    enemyHqBar: document.querySelector("#enemy-hq-bar"),
    playerHqHp: document.querySelector("#player-hq-hp"),
    enemyHqHp: document.querySelector("#enemy-hq-hp"),
    allyCount: document.querySelector("#ally-count"),
    enemyCount: document.querySelector("#enemy-count"),
    eventLog: document.querySelector("#event-log"),
    pauseButton: document.querySelector("#pause-toggle"),
    soundButton: document.querySelector("#sound-toggle"),
    focusButton: document.querySelector("#focus-action"),
    minimapCamera: document.querySelector("#minimap-camera"),
    dragHint: document.querySelector("#drag-hint"),
    toast: document.querySelector("#toast"),
    difficultyButtons: [...document.querySelectorAll("[data-difficulty]")],
    mapButtons: [...document.querySelectorAll("[data-map]")],
    orderButtons: [...document.querySelectorAll("[data-order]")],
    manualStatus: document.querySelector("#manual-status"),
    warehouseStatus: document.querySelector("#warehouse-status"),
    mapTip: document.querySelector("#map-tip"),
    fortificationCards: [...document.querySelectorAll("[data-fortification]")],
    unitCards: [...document.querySelectorAll(".unit-card")],
    laneButtons: [...document.querySelectorAll(".lane-buttons button")]
  };

  let state;
  let lastTime = performance.now();
  let lastHudUpdate = 0;
  let audioContext = null;
  let toastTimeout = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartScrollLeft = 0;
  let dragStartScroll = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerMoved = false;
  let pointerStartedOnCanvas = false;
  let unitId = 0;
  let fortificationId = 0;
  let selectedDifficulty = "normal";
  const manualKeys = new Set();
  const cameraKeys = new Set();
  const manualTapExpiry = new Map();
  let fortificationDrag = null;
  let introTimeouts = [];
  let career = loadCareer();

  function loadCareer() {
    try {
      let raw = localStorage.getItem(CAREER_KEY);
      if (!raw) {
        for (const legacyKey of LEGACY_CAREER_KEYS) {
          raw = localStorage.getItem(legacyKey);
          if (raw) break;
        }
      }
      const saved = JSON.parse(raw || "{}");
      const migrated = {
        wins: Math.max(0, Number.parseInt(saved.wins, 10) || 0),
        losses: Math.max(0, Number.parseInt(saved.losses, 10) || 0),
        score: Math.max(0, Number.parseInt(saved.score, 10) || 0)
      };
      localStorage.setItem(CAREER_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      return { wins: 0, losses: 0, score: 0 };
    }
  }

  function updateCareerBoard() {
    const total = career.wins + career.losses;
    el.careerWins.textContent = career.wins;
    el.careerScore.textContent = career.score;
    el.careerLosses.textContent = career.losses;
    el.careerTotal.textContent = total;
    el.careerRate.textContent = total ? `${Math.round(career.wins / total * 100)}%` : "--";
    el.homeCareerWins.textContent = career.wins;
    el.homeCareerScore.textContent = career.score;
    el.homeCareerLosses.textContent = career.losses;
    el.homeCareerTotal.textContent = total;
    el.homeCareerRate.textContent = total ? `${Math.round(career.wins / total * 100)}%` : "--";
    el.gameVersion.textContent = GAME_VERSION;
  }

  function recordBattleResult(playerWon) {
    if (playerWon) {
      career.wins++;
      career.score += DIFFICULTY_SCORE[state.difficulty] ?? 0;
    } else {
      career.losses++;
    }
    localStorage.setItem(CAREER_KEY, JSON.stringify(career));
    updateCareerBoard();
  }

  for (let i = 0; i < CP_MAX; i++) {
    const pip = document.createElement("i");
    el.cpPips.appendChild(pip);
  }

  function createHQ(team, y) {
    const forwardAngle = team === "player" ? -Math.PI / 2 : Math.PI / 2;
    const cannonY = team === "player" ? -34 : 34;
    const towerY = team === "player" ? y - 150 : y + 150;
    const warehouseX = team === "player" ? W / 2 - 225 : W / 2 + 225;
    return {
      team,
      x: W / 2,
      y,
      hp: MAX_HQ_HP,
      maxHp: MAX_HQ_HP,
      destroyProgress: 0,
      flash: 0,
      cannons: [-104, 104].map((offsetX, index) => ({
        index,
        offsetX,
        offsetY: cannonY,
        reload: index * .35,
        recoil: 0,
        flash: 0,
        angle: forwardAngle,
        targetId: null,
        shots: 0
      })),
      machineGuns: [-132, 132].map((offsetX, index) => ({
        id: `${team}-mg-${index}`,
        kind: "tower",
        type: "mgTower",
        team,
        index,
        x: W / 2 + offsetX,
        y: towerY,
        hp: 320,
        maxHp: 320,
        reload: index * .12,
        angle: forwardAngle,
        flash: 0,
        hitFlash: 0,
        targetId: null,
        shots: 0,
        dead: false
      })),
      warehouse: {
        id: `${team}-warehouse`,
        kind: "warehouse",
        type: "warehouse",
        team,
        x: warehouseX,
        y: y + (team === "player" ? -8 : 8),
        hp: 480,
        maxHp: 480,
        hitFlash: 0,
        dead: false
      }
    };
  }

  function configureMap(key = selectedMap) {
    const map = MAPS[key] ?? MAPS.classic;
    selectedMap = key in MAPS ? key : "classic";
    H = map.height;
    HAS_RIVER = map.river;
    RIVER_TOP = map.riverTop;
    RIVER_BOTTOM = map.riverBottom;
    BRIDGES = map.bridges.map(x => x / 900 * W);
    BRIDGE_WIDTH = map.bridgeWidth;
    PLAYER_HQ_Y = map.playerHQ;
    ENEMY_HQ_Y = map.enemyHQ;
    PLAYER_SPAWN_Y = map.playerSpawn;
    ENEMY_SPAWN_Y = map.enemySpawn;
    canvas.height = H;
  }

  function createState() {
    const difficulty = DIFFICULTIES[selectedDifficulty];
    return {
      started: false,
      running: false,
      paused: false,
      ended: false,
      introActive: false,
      destroying: false,
      destructionWon: null,
      destructionTime: 0,
      destructionBurst: 0,
      destructionReady: false,
      resultRecorded: false,
      sound: true,
      selected: "light",
      playerCP: 7,
      playerCPProgress: 0,
      playerWarehouseProgress: 0,
      enemyCP: difficulty.startCP,
      enemyCPProgress: 0,
      enemyWarehouseProgress: 0,
      difficulty: selectedDifficulty,
      map: selectedMap,
      battleOrder: "attack",
      selectedUnitId: null,
      cockpitMode: false,
      manualFire: false,
      manualAimPulse: 0,
      manualDodges: 0,
      aiCooldown: difficulty.firstWave,
      aiFortificationCooldown: 10,
      aiFortificationsBuilt: 0,
      aiHistory: [],
      aiSpawned: 0,
      time: 0,
      deployed: 0,
      kills: 0,
      units: [],
      fortifications: [],
      obstacles: createMapObstacles(),
      placementPreview: null,
      projectiles: [],
      particles: [],
      floaters: [],
      wrecks: [],
      playerHQ: createHQ("player", PLAYER_HQ_Y),
      enemyHQ: createHQ("enemy", ENEMY_HQ_Y),
      log: [],
      shake: 0
    };
  }

  function resetGame() {
    clearIntroSequence();
    configureMap(selectedMap);
    background.width = W;
    background.height = H;
    buildBackground();
    state = createState();
    unitId = 0;
    fortificationId = 0;
    cancelFortificationDrag();
    el.eventLog.innerHTML = "";
    el.resultScreen.classList.remove("active");
    el.battleIntro.classList.remove("active", "leaving");
    el.destructionPrompt.classList.remove("active");
    document.body.classList.add("menu-open");
    document.body.classList.remove("paused");
    el.pauseButton.classList.remove("active");
    manualKeys.clear();
    manualTapExpiry.clear();
    viewport.classList.remove("manual-active");
    el.orderButtons.forEach(button => {
      const active = button.dataset.order === "attack";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    el.difficultyButtons.forEach(button => {
      const active = button.dataset.difficulty === selectedDifficulty;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    el.mapButtons.forEach(button => {
      const active = button.dataset.map === selectedMap;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    addLog("装甲部队已进入待命状态", "ally");
    addLog("侦测到敌军总部与三条推进路线", "enemy");
    addLog("中央河流禁止涉渡，装甲部队将自动选择左右桥梁", "ally");
    addLog("双方总部双炮台自动防御系统已上线", "ally");
    addLog("基地机枪塔已上线：自动拦截地面与空中目标", "ally");
    addLog(`战场地图：${MAPS[selectedMap].name}`, "ally");
    el.mapTip.innerHTML = !HAS_RIVER ? "<span>◇</span>平原地形无河流阻挡" : BRIDGES.length === 1 ? "<span>≈</span>宽河仅可经中央单桥通过" : "<span>≈</span>中央河流仅可经双桥通过";
    selectUnit("light");
    updateManualStatus();
    updateHud(true);
    const focusPlayerBase = () => {
      viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight;
      el.dragHint.classList.remove("hidden");
      updateCameraBox();
    };
    requestAnimationFrame(() => requestAnimationFrame(focusPlayerBase));
    setTimeout(focusPlayerBase, 120);
  }

  function selectDifficulty(key) {
    if (!DIFFICULTIES[key] || state.started) return;
    selectedDifficulty = key;
    const profile = DIFFICULTIES[key];
    state.difficulty = key;
    state.enemyCP = profile.startCP;
    state.enemyCPProgress = 0;
    state.aiCooldown = profile.firstWave;
    el.difficultyButtons.forEach(button => {
      const active = button.dataset.difficulty === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function selectMap(key) {
    if (!MAPS[key] || state.started) return;
    selectedMap = key;
    resetGame();
  }

  const ORDER_COPY = {
    attack: { name: "进攻", log: "全军进攻：所有单位向敌军总部推进" },
    bridgeDefense: { name: "防守", log: "桥后防守：部队正在撤至两座桥梁后方" },
    baseDefense: { name: "全境防守", log: "全境防守：所有单位立即回防总部" }
  };

  function setBattleOrder(order) {
    if (!ORDER_COPY[order]) return;
    state.battleOrder = order;
    clearManualSelection(true);
    if (order === "attack") {
      for (const unit of state.units) {
        if (unit.team !== "player" || unit.air) continue;
        unit.bridge = chooseBridge("player", unit.lane);
        unit.pathStage = !HAS_RIVER ? 2 : unit.y > RIVER_BOTTOM ? 0 : unit.y < RIVER_TOP ? 2 : 1;
      }
    }
    el.orderButtons.forEach(button => {
      const active = button.dataset.order === order;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (state.started) {
      addLog(ORDER_COPY[order].log, order === "baseDefense" ? "enemy" : "ally");
      toast(ORDER_COPY[order].log, false, 2100);
    }
  }

  function getSelectedUnit() {
    return state.units.find(unit => unit.id === state.selectedUnitId && unit.team === "player" && !unit.dead) ?? null;
  }

  function clearManualSelection(silent = false) {
    const hadSelection = state.selectedUnitId !== null;
    state.selectedUnitId = null;
    state.cockpitMode = false;
    state.manualFire = false;
    manualKeys.clear();
    manualTapExpiry.clear();
    viewport.classList.remove("manual-active");
    viewport.classList.remove("cockpit-active");
    updateManualStatus();
    if (hadSelection && !silent) toast("已交还自动指挥");
  }

  function selectManualUnit(unit) {
    if (!unit || unit.team !== "player" || unit.dead) {
      clearManualSelection();
      return;
    }
    state.selectedUnitId = unit.id;
    state.cockpitMode = true;
    state.manualFire = false;
    manualKeys.clear();
    manualTapExpiry.clear();
    viewport.classList.add("manual-active");
    viewport.classList.add("cockpit-active");
    updateManualStatus();
    focusUnit(unit, true);
    toast(`进入${TYPES[unit.type].name}驾驶视角：WASD驾驶，按住左键开火`, false, 2600);
  }

  function updateManualStatus() {
    const unit = state ? getSelectedUnit() : null;
    el.manualStatus.classList.toggle("selected", Boolean(unit));
    if (unit) {
      el.manualStatus.innerHTML = `<b>驾驶模式：${TYPES[unit.type].name}</b><span>WASD 驾驶 · 左键开火 · ESC 退出 · F 跟随战线</span>`;
    } else {
      el.manualStatus.innerHTML = "<b>自由操控</b><span>拖动或 WASD 移动地图 · 点击我方单位进入驾驶视角 · F 跟随前线</span>";
    }
  }

  function clearIntroSequence() {
    for (const timeout of introTimeouts) clearTimeout(timeout);
    introTimeouts = [];
  }

  function enterCommandCenter() {
    el.homeScreen.classList.remove("active");
    el.startScreen.classList.add("active");
    updateCareerBoard();
  }

  function showHomeMenu() {
    el.startScreen.classList.remove("active");
    el.resultScreen.classList.remove("active");
    el.homeScreen.classList.add("active");
    document.body.classList.add("menu-open");
    updateCareerBoard();
  }

  function startBattleIntro() {
    clearIntroSequence();
    state.introActive = true;
    state.running = false;
    el.battleIntro.classList.remove("leaving");
    requestAnimationFrame(() => el.battleIntro.classList.add("active"));
    introTimeouts.push(setTimeout(() => {
      el.battleIntro.classList.add("leaving");
    }, 3200));
    introTimeouts.push(setTimeout(() => {
      el.battleIntro.classList.remove("active", "leaving");
      state.introActive = false;
      state.running = true;
      addLog("前线报告完毕：战斗正式开始", "ally");
      toast("选择单位并从 A / B / C 路线部署", false, 2600);
    }, 4300));
  }

  function beginGame() {
    if (state.started) return;
    state.started = true;
    state.running = false;
    document.body.classList.remove("menu-open");
    addLog(`战斗难度：${DIFFICULTIES[state.difficulty].name}`, state.difficulty === "hell" ? "enemy" : "ally");
    el.startScreen.classList.remove("active");
    initAudio();
    sound("start");
    addLog("前线传令兵正在汇报战况", "ally");
    startBattleIntro();
  }

  function initAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext?.state === "suspended") audioContext.resume();
  }

  function sound(type) {
    if (!state.sound || !audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(.0001, now);

    if (type === "shot") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(105, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + .09);
      gain.gain.exponentialRampToValueAtTime(.035, now + .007);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .12);
      osc.start(now); osc.stop(now + .13);
    } else if (type === "deploy") {
      osc.type = "square";
      osc.frequency.setValueAtTime(230, now);
      osc.frequency.setValueAtTime(350, now + .07);
      gain.gain.exponentialRampToValueAtTime(.025, now + .01);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
      osc.start(now); osc.stop(now + .17);
    } else if (type === "impact") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(76, now);
      osc.frequency.exponentialRampToValueAtTime(31, now + .12);
      gain.gain.exponentialRampToValueAtTime(.045, now + .005);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .18);
      osc.start(now); osc.stop(now + .19);
    } else if (type === "start") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + .38);
      gain.gain.exponentialRampToValueAtTime(.035, now + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .48);
      osc.start(now); osc.stop(now + .5);
    }
  }

  function selectUnit(type) {
    state.selected = type;
    el.unitCards.forEach(card => card.classList.toggle("selected", card.dataset.unit === type));
  }

  function chooseBridge(team, lane) {
    if (BRIDGES.length === 1) return 0;
    if (!HAS_RIVER) return null;
    if (lane === 0) return 0;
    if (lane === 2) return 1;
    const traffic = [0, 1].map(bridge => state.units.filter(unit => unit.team === team && unit.bridge === bridge && !unit.dead && unit.pathStage < 2).length);
    return traffic[0] <= traffic[1] ? 0 : 1;
  }

  function deploy(team, type, lane, quiet = false) {
    const stats = TYPES[type];
    const cpKey = team === "player" ? "playerCP" : "enemyCP";
    if (state[cpKey] < stats.cost) {
      if (team === "player") toast(`指挥点不足：${stats.name}需要 ${stats.cost} 点`, true);
      return false;
    }

    state[cpKey] -= stats.cost;
    const xJitter = (Math.random() - .5) * 16;
    const heading = team === "player" ? 0 : Math.PI;
    const isAir = stats.air === true;
    const bridge = isAir || !HAS_RIVER ? null : chooseBridge(team, lane);
    state.units.push({
      id: ++unitId,
      team,
      type,
      lane,
      bridge,
      pathStage: isAir || !HAS_RIVER ? 2 : 0,
      air: isAir,
      x: LANES[lane] + xJitter,
      y: team === "player" ? PLAYER_SPAWN_Y : ENEMY_SPAWN_Y,
      hp: stats.hp,
      maxHp: stats.hp,
      reload: Math.random() * .3,
      flash: 0,
      hitFlash: 0,
      recoil: 0,
      shots: 0,
      heading,
      turretAngle: heading,
      aaAngle: heading,
      aaGuns: type === "heavy" ? [{ side: -1, reload: 0, flash: 0, shots: 0 }, { side: 1, reload: .14, flash: 0, shots: 0 }] : [],
      rotorAngle: Math.random() * Math.PI * 2,
      hoverPhase: Math.random() * Math.PI * 2,
      infantryReleased: type !== "apc",
      unloadTimer: 0,
      doorOpen: 0,
      moving: false,
      dustTimer: Math.random() * .2,
      dead: false,
      distance: 0
    });

    createDeployEffect(LANES[lane], team === "player" ? PLAYER_SPAWN_Y : ENEMY_SPAWN_Y, team);
    if (team === "player") {
      state.deployed++;
      sound("deploy");
      if (!quiet) addLog(`我方${stats.name}已部署至${laneName(lane)}`, "ally");
    } else if (!quiet) {
      addLog(`敌军${stats.name}出现在${laneName(lane)}`, "enemy");
    }
    updateHud(true);
    return true;
  }

  function laneName(lane) {
    return ["左翼", "中路", "右翼"][lane];
  }

  function getEnemyFortifications(team) {
    return state.fortifications.filter(fortification => fortification.team !== team && !fortification.dead);
  }

  function validateFortificationPlacement(type, x, y, team = "player") {
    const stats = FORTIFICATION_TYPES[type];
    if (!stats) return { valid: false, reason: "未知工事" };
    if (x < 75 || x > W - 75 || y < 150 || y > H - 150) return { valid: false, reason: "超出可建造区域" };
    if (HAS_RIVER && y > RIVER_TOP - 28 && y < RIVER_BOTTOM + 28) return { valid: false, reason: "河道与桥面无法施工" };
    const nearbyUnits = state.units.filter(unit => unit.team === team && !unit.dead && !unit.air);
    const nearestUnit = nearbyUnits.reduce((nearest, unit) => Math.min(nearest, Math.hypot(unit.x - x, unit.y - y)), Infinity);
    if (nearestUnit > 230) return { valid: false, reason: "只能在己方地面部队附近建造" };
    if (nearestUnit < 46) return { valid: false, reason: "请避开单位当前位置" };
    if (state.fortifications.some(fortification => !fortification.dead && Math.hypot(fortification.x - x, fortification.y - y) < fortification.size + stats.size + 18)) return { valid: false, reason: "工事之间距离过近" };
    const hq = team === "player" ? state.playerHQ : state.enemyHQ;
    if (Math.hypot(hq.x - x, hq.y - y) < 145) return { valid: false, reason: "请避开总部主体" };
    if (!hq.warehouse.dead && Math.hypot(hq.warehouse.x - x, hq.warehouse.y - y) < 74) return { valid: false, reason: "请避开补给仓库" };
    if (hq.machineGuns.some(tower => !tower.dead && Math.hypot(tower.x - x, tower.y - y) < 72)) return { valid: false, reason: "请避开基地炮塔" };
    return { valid: true, reason: "可建造" };
  }

  function placeFortification(type, x, y) {
    return createFortification("player", type, x, y);
  }

  function createFortification(team, type, x, y) {
    const stats = FORTIFICATION_TYPES[type];
    if (!stats || !state.started || state.paused || state.ended) return false;
    const cpKey = team === "player" ? "playerCP" : "enemyCP";
    if (state[cpKey] < stats.cost) {
      if (team === "player") toast(`指挥点不足：${stats.name}需要 ${stats.cost} 点`, true);
      return false;
    }
    const placement = validateFortificationPlacement(type, x, y, team);
    if (!placement.valid) {
      if (team === "player") toast(placement.reason, true);
      return false;
    }
    state[cpKey] -= stats.cost;
    state.fortifications.push({
      id: `fort-${++fortificationId}`,
      kind: "fortification",
      type,
      team,
      x,
      y,
      size: stats.size,
      hp: stats.hp,
      maxHp: stats.hp,
      buildTime: stats.buildTime,
      buildProgress: 0,
      buildFxTimer: 0,
      completed: false,
      reload: 0,
      angle: team === "player" ? -Math.PI / 2 : Math.PI / 2,
      flash: 0,
      hitFlash: 0,
      targetId: null,
      shots: 0,
      dead: false
    });
    if (team === "enemy") state.aiFortificationsBuilt++;
    createDeployEffect(x, y, team);
    addLog(team === "player" ? `${stats.name}开始施工，预计 ${stats.buildTime} 秒完成` : `敌军开始构筑${stats.name}`, team === "player" ? "ally" : "enemy");
    if (team === "player") toast(`${stats.name}施工开始`, false, 1600);
    updateHud(true);
    return true;
  }

  function updateFortifications(dt) {
    for (const fortification of state.fortifications) {
      if (fortification.dead) continue;
      fortification.hitFlash = Math.max(0, fortification.hitFlash - dt * 7);
      fortification.flash = Math.max(0, fortification.flash - dt * 11);
      if (!fortification.completed) {
        fortification.buildProgress = Math.min(fortification.buildTime, fortification.buildProgress + dt);
        fortification.buildFxTimer -= dt;
        if (fortification.buildFxTimer <= 0) {
          createConstructionEffect(fortification);
          fortification.buildFxTimer = .1 + Math.random() * .08;
        }
        if (fortification.buildProgress >= fortification.buildTime) {
          fortification.completed = true;
          fortification.hp = fortification.maxHp;
          createDeployEffect(fortification.x, fortification.y, fortification.team);
          addLog(`${fortification.team === "player" ? "我方" : "敌军"}${FORTIFICATION_TYPES[fortification.type].name}施工完成`, fortification.team === "player" ? "ally" : "enemy");
        }
        continue;
      }
      if (fortification.type !== "bunker") continue;
      const stats = FORTIFICATION_TYPES.bunker;
      fortification.reload -= dt;
      let target = null;
      let distance = Infinity;
      for (const unit of state.units) {
        if (unit.dead || unit.team === fortification.team) continue;
        const currentDistance = Math.hypot(unit.x - fortification.x, unit.y - fortification.y);
        if (currentDistance <= stats.range && currentDistance < distance) {
          target = unit;
          distance = currentDistance;
        }
      }
      fortification.targetId = target?.id ?? null;
      const desiredAngle = target ? Math.atan2(target.y - fortification.y, target.x - fortification.x) : -Math.PI / 2;
      fortification.angle = rotateToward(fortification.angle, desiredAngle, dt * 5.8);
      if (target && fortification.reload <= 0 && Math.abs(angleDelta(fortification.angle, desiredAngle)) < .14) {
        fireMachineGun({
          x: fortification.x + Math.cos(fortification.angle) * 30,
          y: fortification.y + Math.sin(fortification.angle) * 30,
          team: fortification.team,
          sourceType: "bunkerMG"
        }, target, stats.damage, 980);
        fortification.reload = stats.fireRate;
        fortification.flash = 1;
        fortification.shots++;
      }
    }
  }

  function createConstructionEffect(fortification) {
    const progress = fortification.buildProgress / fortification.buildTime;
    const angle = Math.random() * Math.PI * 2;
    state.particles.push({
      x: fortification.x + Math.cos(angle) * fortification.size * .55,
      y: fortification.y + Math.sin(angle) * fortification.size * .4,
      vx: (Math.random() - .5) * 28,
      vy: -18 - Math.random() * 30,
      size: 1.5 + Math.random() * 2.2,
      color: Math.random() < .55 ? "#ffe49a" : "#b38b58",
      life: .18 + Math.random() * .22,
      maxLife: .4,
      streak: progress > .35
    });
    if (Math.random() < .35) {
      state.particles.push({ x: fortification.x + (Math.random() - .5) * fortification.size, y: fortification.y + 14, vx: (Math.random() - .5) * 9, vy: -4, size: 4 + Math.random() * 5, color: "#756b58", life: .35, maxLife: .35, smoke: true });
    }
  }

  function update(dt) {
    if (!state.running || state.paused || state.ended) return;
    state.time += dt;
    state.manualAimPulse = Math.max(0, state.manualAimPulse - dt * 2.4);
    if (state.destroying) {
      updateHQDestruction(dt);
      return;
    }
    state.playerCPProgress += dt;
    state.enemyCPProgress += dt;
    const aiProfile = DIFFICULTIES[state.difficulty];

    while (state.playerCPProgress >= CP_INTERVAL) {
      state.playerCPProgress -= CP_INTERVAL;
      if (state.playerCP < CP_MAX) state.playerCP++;
    }
    while (state.enemyCPProgress >= aiProfile.enemyCPInterval) {
      state.enemyCPProgress -= aiProfile.enemyCPInterval;
      if (state.enemyCP < CP_MAX) state.enemyCP++;
    }
    if (!state.playerHQ.warehouse.dead) {
      state.playerWarehouseProgress += dt;
      while (state.playerWarehouseProgress >= WAREHOUSE_CP_INTERVAL) {
        state.playerWarehouseProgress -= WAREHOUSE_CP_INTERVAL;
        if (state.playerCP < CP_MAX) state.playerCP++;
      }
    }
    if (!state.enemyHQ.warehouse.dead) {
      state.enemyWarehouseProgress += dt;
      while (state.enemyWarehouseProgress >= WAREHOUSE_CP_INTERVAL) {
        state.enemyWarehouseProgress -= WAREHOUSE_CP_INTERVAL;
        if (state.enemyCP < CP_MAX) state.enemyCP++;
      }
    }

    state.aiCooldown -= dt;
    if (state.aiCooldown <= 0) {
      runAI();
      state.aiCooldown = aiProfile.cooldownMin + Math.random() * (aiProfile.cooldownMax - aiProfile.cooldownMin);
    }
    state.aiFortificationCooldown -= dt;
    if (state.aiFortificationCooldown <= 0) {
      runAIFortification();
      const intervals = { novice: [18, 25], easy: [14, 20], normal: [10, 16], hard: [7, 12], hell: [5, 9] };
      const [minimum, maximum] = intervals[state.difficulty];
      state.aiFortificationCooldown = minimum + Math.random() * (maximum - minimum);
    }

    updateHQ(state.playerHQ, dt);
    updateHQ(state.enemyHQ, dt);
    updateMachineGunTowers(state.playerHQ, dt);
    updateMachineGunTowers(state.enemyHQ, dt);
    updateFortifications(dt);
    updateMapObstacles(dt);
    for (const unit of state.units) {
      updateUnit(unit, dt);
      resolveUnitObstacleCollision(unit);
    }
    manualFireControl(getSelectedUnit());
    updateCameraControl(dt);
    for (const projectile of state.projectiles) updateProjectile(projectile, dt);
    for (const particle of state.particles) updateParticle(particle, dt);
    for (const floater of state.floaters) {
      floater.life -= dt;
      floater.y -= 22 * dt;
    }
    for (const wreck of state.wrecks) wreck.life -= dt;

    state.projectiles = state.projectiles.filter(p => !p.done);
    state.particles = state.particles.filter(p => p.life > 0);
    state.floaters = state.floaters.filter(f => f.life > 0);
    state.wrecks = state.wrecks.filter(w => w.life > 0);
    state.units = state.units.filter(u => !u.dead);
    if (state.selectedUnitId !== null && !getSelectedUnit()) clearManualSelection(true);
    state.shake = Math.max(0, state.shake - dt * 12);

    if (state.enemyHQ.hp <= 0) beginHQDestruction(true);
    else if (state.playerHQ.hp <= 0) beginHQDestruction(false);
  }

  function runAI() {
    const profile = DIFFICULTIES[state.difficulty];
    if (state.enemyCP < TYPES.light.cost) return;
    const hasEnemyBunker = state.fortifications.some(fortification => fortification.team === "enemy" && fortification.type === "bunker" && !fortification.dead);
    if (state.time > 6 && !hasEnemyBunker && state.aiFortificationCooldown < 5 && state.enemyCP < FORTIFICATION_TYPES.bunker.cost) return;

    const attempts = Math.random() < profile.burstChance ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const type = chooseAIUnit(profile);
      if (!type) break;
      const lane = chooseAILane(type, profile);
      if (!deploy("enemy", type, lane, false)) break;
      state.aiHistory.push(type);
      if (state.aiHistory.length > 5) state.aiHistory.shift();
      state.aiSpawned++;
      if (state.enemyCP < TYPES.light.cost) break;
    }
  }

  function runAIFortification() {
    const limits = { novice: 2, easy: 3, normal: 4, hard: 6, hell: 8 };
    const active = state.fortifications.filter(fortification => fortification.team === "enemy" && !fortification.dead);
    if (active.length >= limits[state.difficulty]) return false;
    const builders = state.units
      .filter(unit => unit.team === "enemy" && !unit.dead && !unit.air)
      .sort((a, b) => b.y - a.y);
    if (!builders.length || state.enemyCP < FORTIFICATION_TYPES.obstacle.cost) return false;
    const needsRocket = state.time >= 24 && !state.units.some(unit => unit.team === "enemy" && unit.type === "rocket" && !unit.dead);
    if (needsRocket && state.enemyCP < TYPES.rocket.cost) return false;
    const hasBunker = active.some(fortification => fortification.type === "bunker");
    const preferBunker = !hasBunker || state.aiFortificationsBuilt % 3 !== 2;
    const type = state.enemyCP >= FORTIFICATION_TYPES.bunker.cost && preferBunker ? "bunker" : "obstacle";
    for (const builder of builders.slice(0, 4)) {
      const candidates = [
        [builder.x, builder.y + 105],
        [builder.x - 68, builder.y + 82],
        [builder.x + 68, builder.y + 82],
        [LANES[builder.lane ?? 1], builder.y + 135]
      ];
      for (const [rawX, rawY] of candidates) {
        const x = Math.max(80, Math.min(W - 80, rawX));
        let y = Math.max(165, Math.min(H - 165, rawY));
        if (HAS_RIVER && y > RIVER_TOP - 28 && y < RIVER_BOTTOM + 28) y = RIVER_TOP - 52;
        if (validateFortificationPlacement(type, x, y, "enemy").valid) return createFortification("enemy", type, x, y);
      }
    }
    return false;
  }

  function chooseAIUnit(profile) {
    const affordable = DEPLOYABLE_TYPES.filter(type => TYPES[type].cost <= state.enemyCP);
    if (!affordable.length) return null;

    const own = Object.fromEntries(Object.keys(TYPES).map(type => [type, state.units.filter(unit => unit.team === "enemy" && unit.type === type).length]));
    const playerAir = state.units.filter(unit => unit.team === "player" && unit.air).length;
    const playerGround = state.units.filter(unit => unit.team === "player" && !unit.air).length;
    const playerHeavy = state.units.filter(unit => unit.team === "player" && unit.type === "heavy").length;

    // 进入中盘后强制组建火箭炮支援，资源不足时暂停出兵并攒到 15 CP。
    if (state.time >= 24 && own.rocket === 0) {
      if (state.enemyCP < TYPES.rocket.cost) return null;
      return "rocket";
    }

    // 先建立一支完整的合成编队；缺少关键兵种时，AI 会主动攒点补位。
    const doctrine = playerAir > 0 && !own.heavy
      ? [{ type: "heavy", unlock: 0 }]
      : [
          { type: "medium", unlock: 0 },
          { type: "light", unlock: 2.5 },
          { type: "apc", unlock: 6 },
          { type: "artillery", unlock: 10 },
          { type: "heavy", unlock: 14 },
          { type: "helicopter", unlock: 19 },
          { type: "rocket", unlock: 24 }
        ];
    const missingRole = doctrine.find(role => state.time >= role.unlock && own[role.type] === 0);
    if (missingRole) {
      if (state.enemyCP < TYPES[missingRole.type].cost) return null;
      return missingRole.type;
    }

    // 不在刚攒到 3 点时无脑消耗，让 AI 有机会组织中型、重型和支援单位。
    if (affordable.length === 1 && affordable[0] === "light" && Math.random() < profile.saveChance) return null;

    const weights = { light: 1.05, medium: 1.7, heavy: 1.2, artillery: 1.12, rocket: .78, helicopter: .98, apc: 1.25 };

    if (!own.medium) weights.medium *= 1.45;
    if (!own.heavy && state.time > 5) weights.heavy *= 1.5;
    if (!own.artillery && state.time > 7) weights.artillery *= 1.75;
    if (!own.rocket && state.time > 20) weights.rocket *= 1.8;
    if (!own.helicopter && state.time > 10) weights.helicopter *= 1.45;
    if (!own.apc && state.time > 5) weights.apc *= 1.65;
    if (playerAir > 0) weights.heavy += 2.8 + playerAir * .55;
    if (playerHeavy > 0) { weights.artillery += playerHeavy * 1.15; weights.helicopter += playerHeavy * .65; }
    if (playerGround > 3) { weights.artillery += 1.25; weights.heavy += .7; }
    if (playerGround > 5) weights.rocket += 1.4;
    if (own.artillery > Math.max(1, (own.light + own.medium + own.heavy) / 3)) weights.artillery *= .35;
    if (own.rocket > 1) weights.rocket *= .3;
    if (own.helicopter > 2) weights.helicopter *= .4;
    if (own.apc > 2) weights.apc *= .45;

    const last = state.aiHistory[state.aiHistory.length - 1];
    const previous = state.aiHistory[state.aiHistory.length - 2];
    if (last) weights[last] *= .34;
    if (last && last === previous) weights[last] *= .18;

    const pool = affordable.map(type => ({ type, weight: Math.max(.03, weights[type]) }));
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of pool) {
      roll -= item.weight;
      if (roll <= 0) return item.type;
    }
    return pool[pool.length - 1].type;
  }

  function chooseAILane(type, profile) {
    const threat = [0, 1, 2].map(lane => state.units
      .filter(unit => unit.team === "player" && unit.lane === lane && !unit.dead)
      .reduce((score, unit) => score + 1 + (H - unit.y) / H * 1.4, 0));
    const support = [0, 1, 2].map(lane => state.units
      .filter(unit => unit.team === "enemy" && unit.lane === lane && !unit.dead && unit.type !== "artillery" && unit.type !== "rocket")
      .reduce((score, unit) => score + (unit.type === "heavy" ? 1.6 : unit.type === "medium" ? 1.25 : 1), 0));

    const scores = threat.map((value, lane) => {
      const formationBonus = type === "artillery" || type === "rocket" ? support[lane] * 1.15 : support[lane] * .25;
      const pressureBonus = type === "helicopter" ? value * .85 : value * 1.3;
      return pressureBonus + formationBonus + Math.random() * 1.25;
    });
    if (Math.random() > profile.aggression || Math.max(...scores) < 1.2) return Math.floor(Math.random() * 3);
    return scores.indexOf(Math.max(...scores));
  }

  function updateAPCDeployment(unit, dt) {
    if (unit.type !== "apc" || unit.infantryReleased) return false;
    if (unit.unloadTimer > 0) {
      unit.unloadTimer -= dt;
      unit.doorOpen = Math.min(1, unit.doorOpen + dt * 2.6);
      if (unit.unloadTimer <= 0) {
        unit.infantryReleased = true;
        unit.doorOpen = 1;
        spawnInfantry(unit, -1);
        spawnInfantry(unit, 1);
        addLog(`${unit.team === "player" ? "我方" : "敌军"}装甲车已释放两名机枪步兵`, unit.team === "player" ? "ally" : "enemy");
      }
      return true;
    }

    const closestEnemy = state.units
      .filter(other => other.team !== unit.team && !other.dead)
      .reduce((closest, other) => Math.min(closest, Math.hypot(other.x - unit.x, other.y - unit.y)), Infinity);
    const reachedFront = HAS_RIVER
      ? (unit.team === "player" ? unit.y < RIVER_TOP - 70 : unit.y > RIVER_BOTTOM + 70)
      : (unit.team === "player" ? unit.y < H * .56 : unit.y > H * .44);
    if (closestEnemy < 350 || reachedFront) {
      unit.unloadTimer = .82;
      unit.doorOpen = .06;
      return true;
    }
    return false;
  }

  function spawnInfantry(carrier, side) {
    const stats = TYPES.infantry;
    const debugDurability = carrier.maxHp > 10000 ? 99999 : stats.hp;
    const rearX = carrier.x - Math.sin(carrier.heading) * (TYPES.apc.size * .72);
    const rearY = carrier.y + Math.cos(carrier.heading) * (TYPES.apc.size * .72);
    const sideX = Math.cos(carrier.heading) * side * 18;
    const sideY = Math.sin(carrier.heading) * side * 18;
    const infantry = {
      id: ++unitId,
      team: carrier.team,
      type: "infantry",
      lane: carrier.lane,
      bridge: carrier.bridge,
      pathStage: carrier.pathStage,
      air: false,
      x: rearX + sideX,
      y: rearY + sideY,
      hp: debugDurability,
      maxHp: debugDurability,
      reload: .12 + Math.random() * .18,
      flash: 0,
      hitFlash: 0,
      recoil: 0,
      shots: 0,
      heading: carrier.heading,
      turretAngle: carrier.heading,
      aaAngle: carrier.heading,
      aaGuns: [],
      rotorAngle: 0,
      hoverPhase: 0,
      infantryReleased: true,
      unloadTimer: 0,
      doorOpen: 0,
      carrierId: carrier.id,
      moving: false,
      dustTimer: Math.random() * .15,
      dead: false,
      distance: 0
    };
    state.units.push(infantry);
    createDeployEffect(infantry.x, infantry.y, infantry.team);
  }

  function updateUnit(unit, dt) {
    if (unit.type === "helicopter") {
      updateHelicopter(unit, dt);
      return;
    }
    const stats = TYPES[unit.type];
    const unloading = updateAPCDeployment(unit, dt);
    unit.reload -= dt;
    updateRocketSalvo(unit, dt);
    unit.flash = Math.max(0, unit.flash - dt * 8);
    unit.hitFlash = Math.max(0, unit.hitFlash - dt * 7);
    unit.recoil = Math.max(0, unit.recoil - dt * 4.8);
    if (unit.type === "heavy") updateHeavyAA(unit, dt);

    const enemies = state.units.filter(other => other.team !== unit.team && !other.dead && other.type !== "helicopter");
    let target = null;
    let targetDistance = Infinity;
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y) - (stats.size + TYPES[enemy.type].size) * .45;
      if (dist < targetDistance) { target = enemy; targetDistance = dist; }
    }
    for (const fortification of getEnemyFortifications(unit.team)) {
      const dist = Math.hypot(fortification.x - unit.x, fortification.y - unit.y) - (stats.size + fortification.size) * .42;
      if (dist < targetDistance) { target = fortification; targetDistance = dist; }
    }

    const warehouse = getEnemyWarehouse(unit.team);
    const warehouseDistance = warehouse.dead ? Infinity : Math.hypot(warehouse.x - unit.x, warehouse.y - unit.y) - (stats.size + 34) * .42;
    const prioritizeWarehouse = warehouseDistance < 520;
    if (prioritizeWarehouse) {
      target = warehouse;
      targetDistance = warehouseDistance;
    } else {
      for (const tower of getEnemyTowers(unit.team)) {
        if (tower.dead) continue;
        const dist = Math.hypot(tower.x - unit.x, tower.y - unit.y) - (stats.size + 28) * .45;
        if (dist < targetDistance) { target = tower; targetDistance = dist; }
      }

      const targetHQ = unit.team === "player" ? state.enemyHQ : state.playerHQ;
      const horizontalGap = Math.max(0, Math.abs(targetHQ.x - unit.x) - 165);
      const hqDist = Math.hypot(horizontalGap, targetHQ.y - unit.y) - 58;
      if (hqDist < targetDistance) { target = targetHQ; targetDistance = hqDist; }
    }

    const targetX = target?.x ?? unit.x;
    const targetY = target?.y ?? unit.y;
    unit.currentTarget = target?.kind ?? target?.type ?? null;
    const desiredTurretAngle = target ? headingTo(unit.x, unit.y, targetX, targetY) : unit.heading;
    if (target && targetDistance < stats.range * 2.15) {
      unit.turretAngle = rotateToward(unit.turretAngle, desiredTurretAngle, dt * (unit.type === "heavy" ? 2.15 : 3.2));
    } else {
      unit.turretAngle = rotateToward(unit.turretAngle, unit.heading, dt * 2.4);
    }

    if (unloading) {
      unit.moving = false;
      if (target && targetDistance <= stats.range && unit.reload <= 0 && Math.abs(angleDelta(unit.turretAngle, desiredTurretAngle)) < .16) {
        fireUnitWeapon(unit, target);
      }
      return;
    }

    if (isManuallyControlled(unit)) {
      updateManualMovement(unit, dt);
      if (target && targetDistance <= stats.range && unit.reload <= 0 && Math.abs(angleDelta(unit.turretAngle, desiredTurretAngle)) < .14) {
        fireUnitWeapon(unit, target);
      }
      return;
    }

    const orderWaypoint = unit.team === "player" && state.battleOrder !== "attack" ? getDefenseWaypoint(unit) : null;
    const mustFollowOrder = orderWaypoint && Math.hypot(orderWaypoint.x - unit.x, orderWaypoint.y - unit.y) > 38;
    if (target && targetDistance <= stats.range && !mustFollowOrder) {
      unit.moving = false;
      if (unit.reload <= 0 && Math.abs(angleDelta(unit.turretAngle, desiredTurretAngle)) < .14) {
        fireUnitWeapon(unit, target);
      }
    } else {
      let waypoint = target?.kind === "warehouse" && targetDistance < 520 ? { x: target.x, y: target.y } : getRouteWaypoint(unit);
      let dx = waypoint.x - unit.x;
      let dy = waypoint.y - unit.y;
      let waypointDistance = Math.hypot(dx, dy);
      if (waypointDistance < 24 && unit.pathStage < 2) {
        unit.pathStage++;
        waypoint = target?.kind === "warehouse" && targetDistance < 520 ? { x: target.x, y: target.y } : getRouteWaypoint(unit);
        dx = waypoint.x - unit.x;
        dy = waypoint.y - unit.y;
        waypointDistance = Math.hypot(dx, dy);
      }

      let directionX = waypointDistance > 0 ? dx / waypointDistance : 0;
      let directionY = waypointDistance > 0 ? dy / waypointDistance : 0;
      const separation = getSeparationVector(unit);
      const bridgeZone = HAS_RIVER && unit.y > RIVER_TOP - 95 && unit.y < RIVER_BOTTOM + 95;
      const separationWeight = bridgeZone ? .38 : 1.45;
      directionX += separation.x * separationWeight;
      directionY += separation.y * separationWeight;
      const steeredLength = Math.max(.001, Math.hypot(directionX, directionY));
      directionX /= steeredLength;
      directionY /= steeredLength;
      const desiredHeading = headingTo(unit.x, unit.y, unit.x + directionX, unit.y + directionY);
      unit.heading = rotateToward(unit.heading, desiredHeading, dt * (unit.type === "heavy" ? 1.7 : 2.6));

      let moveSpeed = stats.speed * (unit.debugSpeed ?? 1);
      const friendAhead = state.units.some(friend => {
        if (friend === unit || friend.dead || friend.team !== unit.team || friend.air !== unit.air) return false;
        const fx = friend.x - unit.x;
        const fy = friend.y - unit.y;
        const ahead = fx * directionX + fy * directionY;
        return ahead > 0 && Math.hypot(fx, fy) < (stats.size + TYPES[friend.type].size) * .92;
      });
      if (friendAhead) moveSpeed *= .38;
      const blockingObstacle = getEnemyFortifications(unit.team).find(fortification => fortification.type === "obstacle" && fortification.completed && Math.hypot(fortification.x - unit.x, fortification.y - unit.y) < fortification.size + stats.size + 18);
      if (blockingObstacle) moveSpeed *= .12;

      const turnAlignment = Math.max(.28, (Math.cos(angleDelta(unit.heading, desiredHeading)) + 1) / 2);
      moveSpeed *= turnAlignment;
      const oldX = unit.x;
      const oldY = unit.y;
      let nextX = unit.x + directionX * moveSpeed * dt;
      let nextY = unit.y + directionY * moveSpeed * dt;

      if (HAS_RIVER && nextY > RIVER_TOP && nextY < RIVER_BOTTOM && !isBridgeSurface(nextX, stats.size * .7)) {
        nextY = unit.y;
      }

      unit.x = Math.max(70, Math.min(W - 70, nextX));
      unit.y = Math.max(110, Math.min(H - 110, nextY));
      const travelled = Math.hypot(unit.x - oldX, unit.y - oldY);
      unit.distance += travelled;
      unit.moving = travelled > .08;

      if (!target || targetDistance >= stats.range * 2.15) {
        unit.turretAngle = rotateToward(unit.turretAngle, unit.heading, dt * 2.5);
      }

      unit.dustTimer -= dt;
      if (unit.moving && unit.dustTimer <= 0 && !(HAS_RIVER && unit.y > RIVER_TOP && unit.y < RIVER_BOTTOM)) {
        createTrackDust(unit);
        unit.dustTimer = .12 + Math.random() * .1;
      }
    }
  }

  function getSeparationVector(unit) {
    let separationX = 0;
    let separationY = 0;
    let neighbors = 0;
    const ownSize = TYPES[unit.type].size;
    for (const friend of state.units) {
      if (friend === unit || friend.dead || friend.team !== unit.team || friend.air !== unit.air) continue;
      let dx = unit.x - friend.x;
      let dy = unit.y - friend.y;
      let distance = Math.hypot(dx, dy);
      const desiredDistance = (ownSize + TYPES[friend.type].size) * 1.22 + (unit.air ? 12 : 20);
      if (distance >= desiredDistance) continue;
      if (distance < .5) {
        const angle = (unit.id * 2.399 + friend.id) % (Math.PI * 2);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        distance = 1;
      }
      const strength = (desiredDistance - distance) / desiredDistance;
      separationX += dx / distance * strength;
      separationY += dy / distance * strength;
      neighbors++;
    }
    if (!neighbors) return { x: 0, y: 0 };
    const magnitude = Math.max(1, Math.hypot(separationX, separationY));
    return { x: separationX / magnitude, y: separationY / magnitude };
  }

  function getEnemyHQ(team) {
    return team === "player" ? state.enemyHQ : state.playerHQ;
  }

  function getEnemyTowers(team) {
    return getEnemyHQ(team).machineGuns;
  }

  function getEnemyWarehouse(team) {
    return getEnemyHQ(team).warehouse;
  }

  function updateHelicopter(unit, dt) {
    const stats = TYPES.helicopter;
    unit.reload -= dt;
    unit.flash = Math.max(0, unit.flash - dt * 11);
    unit.hitFlash = Math.max(0, unit.hitFlash - dt * 7);
    unit.recoil = Math.max(0, unit.recoil - dt * 7);
    unit.rotorAngle += dt * 19;
    unit.hoverPhase += dt * 3.2;

    let target = null;
    let targetDistance = Infinity;
    if (!unit.ignoreCombat) {
      for (const enemy of state.units) {
        if (enemy.dead || enemy.team === unit.team) continue;
        const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y) - (stats.size + TYPES[enemy.type].size) * .38;
        if (dist < targetDistance) { target = enemy; targetDistance = dist; }
      }
      for (const fortification of getEnemyFortifications(unit.team)) {
        const dist = Math.hypot(fortification.x - unit.x, fortification.y - unit.y) - fortification.size * .4;
        if (dist < targetDistance) { target = fortification; targetDistance = dist; }
      }
      const warehouse = getEnemyWarehouse(unit.team);
      const warehouseDistance = warehouse.dead ? Infinity : Math.hypot(warehouse.x - unit.x, warehouse.y - unit.y) - 34;
      if (warehouseDistance < 560) {
        target = warehouse;
        targetDistance = warehouseDistance;
      } else {
        for (const tower of getEnemyTowers(unit.team)) {
          if (tower.dead) continue;
          const dist = Math.hypot(tower.x - unit.x, tower.y - unit.y) - 30;
          if (dist < targetDistance) { target = tower; targetDistance = dist; }
        }
        const targetHQ = getEnemyHQ(unit.team);
        const horizontalGap = Math.max(0, Math.abs(targetHQ.x - unit.x) - 165);
        const hqDist = Math.hypot(horizontalGap, targetHQ.y - unit.y) - 58;
        if (hqDist < targetDistance) { target = targetHQ; targetDistance = hqDist; }
      }
    }

    const desiredGunAngle = target ? headingTo(unit.x, unit.y, target.x ?? W / 2, target.y) : unit.heading;
    unit.currentTarget = target?.kind ?? target?.type ?? null;
    unit.turretAngle = rotateToward(unit.turretAngle, desiredGunAngle, dt * 4.8);

    if (isManuallyControlled(unit)) {
      updateManualMovement(unit, dt);
      if (target && targetDistance <= stats.range && unit.reload <= 0 && Math.abs(angleDelta(unit.turretAngle, desiredGunAngle)) < .16) {
        fireUnitWeapon(unit, target);
      }
      return;
    }

    const defenseWaypoint = unit.team === "player" && state.battleOrder !== "attack" ? getDefenseWaypoint(unit) : null;
    const mustFollowOrder = defenseWaypoint && Math.hypot(defenseWaypoint.x - unit.x, defenseWaypoint.y - unit.y) > 34;
    if (target && targetDistance <= stats.range && !mustFollowOrder) {
      unit.moving = false;
      if (unit.reload <= 0 && Math.abs(angleDelta(unit.turretAngle, desiredGunAngle)) < .16) {
        fireUnitWeapon(unit, target);
      }
      return;
    }

    if (defenseWaypoint) {
      const dx = defenseWaypoint.x - unit.x;
      const dy = defenseWaypoint.y - unit.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 14) {
        unit.moving = false;
        return;
      }
      const oldX = unit.x;
      const oldY = unit.y;
      const speed = stats.speed;
      unit.x += dx / distance * speed * dt;
      unit.y += dy / distance * speed * dt;
      unit.x = Math.max(65, Math.min(W - 65, unit.x));
      unit.y = Math.max(100, Math.min(H - 100, unit.y));
      unit.heading = rotateToward(unit.heading, headingTo(oldX, oldY, defenseWaypoint.x, defenseWaypoint.y), dt * 3.8);
      unit.moving = Math.hypot(unit.x - oldX, unit.y - oldY) > .08;
      unit.distance += Math.hypot(unit.x - oldX, unit.y - oldY);
      return;
    }

    if (target?.kind === "warehouse" && targetDistance < 560) {
      const dx = target.x - unit.x;
      const dy = target.y - unit.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const oldX = unit.x;
      const oldY = unit.y;
      unit.x += dx / distance * stats.speed * dt;
      unit.y += dy / distance * stats.speed * dt;
      unit.heading = rotateToward(unit.heading, headingTo(oldX, oldY, target.x, target.y), dt * 4);
      unit.moving = true;
      unit.distance += Math.hypot(unit.x - oldX, unit.y - oldY);
      return;
    }

    const direction = unit.team === "player" ? -1 : 1;
    const desiredX = LANES[unit.lane] + (unit.id % 3 - 1) * 52;
    const oldX = unit.x;
    const oldY = unit.y;
    const speed = stats.speed * (unit.debugSpeed ?? 1);
    unit.x += Math.max(-speed * .35 * dt, Math.min(speed * .35 * dt, desiredX - unit.x));
    unit.y += direction * speed * dt;
    unit.y = Math.max(105, Math.min(H - 105, unit.y));
    unit.heading = rotateToward(unit.heading, direction < 0 ? 0 : Math.PI, dt * 3.2);
    unit.moving = Math.hypot(unit.x - oldX, unit.y - oldY) > .08;
    unit.distance += Math.hypot(unit.x - oldX, unit.y - oldY);
  }

  function updateHeavyAA(unit, dt) {
    for (const gun of unit.aaGuns) {
      gun.reload -= dt;
      gun.flash = Math.max(0, gun.flash - dt * 10);
    }
    let target = null;
    let distance = Infinity;
    for (const enemy of state.units) {
      if (enemy.dead || enemy.team === unit.team || enemy.type !== "helicopter") continue;
      const d = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
      if (d < 315 && d < distance) { target = enemy; distance = d; }
    }
    if (!target) {
      unit.aaAngle = rotateToward(unit.aaAngle, unit.heading, dt * 2.8);
      return;
    }

    const desiredAngle = headingTo(unit.x, unit.y, target.x, target.y);
    unit.aaAngle = rotateToward(unit.aaAngle, desiredAngle, dt * 5.5);
    if (Math.abs(angleDelta(unit.aaAngle, desiredAngle)) > .16) return;
    const size = TYPES.heavy.size;
    for (const gun of unit.aaGuns) {
      if (gun.reload > 0) continue;
      const baseX = unit.x + Math.cos(unit.heading) * gun.side * size * .34;
      const baseY = unit.y + Math.sin(unit.heading) * gun.side * size * .34;
      fireMachineGun({
        x: baseX + Math.sin(unit.aaAngle) * 22,
        y: baseY - Math.cos(unit.aaAngle) * 22,
        team: unit.team,
        sourceType: "heavyAA"
      }, target, 6, 1040);
      gun.reload = .23 + (gun.side > 0 ? .035 : 0);
      gun.flash = 1;
      gun.shots++;
    }
  }

  function updateMachineGunTowers(hq, dt) {
    const defaultAngle = hq.team === "player" ? -Math.PI / 2 : Math.PI / 2;
    for (const tower of hq.machineGuns) {
      tower.reload -= dt;
      tower.flash = Math.max(0, tower.flash - dt * 11);
      tower.hitFlash = Math.max(0, tower.hitFlash - dt * 7);
      if (tower.dead) { tower.targetId = null; continue; }
      let target = null;
      let distance = Infinity;
      for (const unit of state.units) {
        if (unit.dead || unit.team === hq.team) continue;
        const d = Math.hypot(unit.x - tower.x, unit.y - tower.y);
        if (d < 365 && d < distance) { target = unit; distance = d; }
      }
      tower.targetId = target?.id ?? null;
      const desiredAngle = target ? Math.atan2(target.y - tower.y, target.x - tower.x) : defaultAngle;
      tower.angle = rotateToward(tower.angle, desiredAngle, dt * 6.2);
      if (target && tower.reload <= 0 && Math.abs(angleDelta(tower.angle, desiredAngle)) < .14) {
        fireMachineGun({
          x: tower.x + Math.cos(tower.angle) * 34,
          y: tower.y + Math.sin(tower.angle) * 34,
          team: tower.team,
          sourceType: "baseMG"
        }, target, 7, 980);
        tower.reload = .2 + tower.index * .025;
        tower.flash = 1;
        tower.shots++;
      }
    }
  }

  function fireMachineGun(source, target, damage, speed) {
    const tx = target.x ?? W / 2;
    const ty = target.y;
    const dist = Math.hypot(tx - source.x, ty - source.y);
    state.projectiles.push({
      x: source.x,
      y: source.y,
      startX: source.x,
      startY: source.y,
      target,
      tx,
      ty,
      team: source.team,
      sourceType: source.sourceType,
      damage,
      life: 0,
      duration: Math.max(.05, dist / speed),
      heavy: false,
      bullet: true,
      artillery: false,
      arcHeight: 0,
      progress: 0,
      trailClock: 0,
      done: false
    });
    if (Math.random() < .12) sound("shot");
  }

  function getRouteWaypoint(unit) {
    if (unit.team === "player" && state.battleOrder !== "attack") return getDefenseWaypoint(unit);
    if (!HAS_RIVER) return { x: LANES[unit.lane], y: unit.team === "player" ? 155 : H - 155 };
    const bridgeX = BRIDGES[unit.bridge];
    if (unit.team === "player") {
      if (unit.pathStage === 0) return { x: bridgeX, y: RIVER_BOTTOM + 70 };
      if (unit.pathStage === 1) return { x: bridgeX, y: RIVER_TOP - 70 };
      return { x: LANES[unit.lane], y: 190 };
    }
    if (unit.pathStage === 0) return { x: bridgeX, y: RIVER_TOP - 70 };
    if (unit.pathStage === 1) return { x: bridgeX, y: RIVER_BOTTOM + 70 };
    return { x: LANES[unit.lane], y: H - 190 };
  }

  function getDefenseWaypoint(unit) {
    const slot = unit.id % 9;
    const column = slot % 3;
    const row = Math.floor(slot / 3);
    if (state.battleOrder === "bridgeDefense") {
      if (!HAS_RIVER) return { x: LANES[unit.lane] + (column - 1) * 42, y: H / 2 + 170 + row * 48 };
      if (unit.air) return { x: LANES[unit.lane] + (column - 1) * 46, y: RIVER_BOTTOM + 145 + row * 44 };
      const bridge = unit.bridge ?? chooseBridge("player", unit.lane);
      unit.bridge = bridge;
      return { x: BRIDGES[bridge] + (column - 1) * 34, y: RIVER_BOTTOM + 92 + row * 52 };
    }
    if (state.battleOrder === "baseDefense") {
      const baseColumns = [420, 600, 780];
      return { x: baseColumns[column], y: unit.air ? PLAYER_HQ_Y - 445 + row * 45 : PLAYER_HQ_Y - 370 + row * 62 };
    }
    return null;
  }

  function isManuallyControlled(unit) {
    return unit.team === "player" && state.selectedUnitId === unit.id;
  }

  function updateManualMovement(unit, dt) {
    const keyActive = code => manualKeys.has(code) || (manualTapExpiry.get(code) ?? 0) > state.time;
    const horizontal = (keyActive("KeyD") ? 1 : 0) - (keyActive("KeyA") ? 1 : 0);
    const vertical = (keyActive("KeyS") ? 1 : 0) - (keyActive("KeyW") ? 1 : 0);
    if (!horizontal && !vertical) {
      unit.moving = false;
      return;
    }

    const magnitude = Math.hypot(horizontal, vertical);
    const directionX = horizontal / magnitude;
    const directionY = vertical / magnitude;
    const stats = TYPES[unit.type];
    const speed = stats.speed * (unit.air ? 1.18 : 1.22);
    const oldX = unit.x;
    const oldY = unit.y;
    const desiredHeading = headingTo(unit.x, unit.y, unit.x + directionX, unit.y + directionY);
    unit.heading = rotateToward(unit.heading, desiredHeading, dt * (unit.type === "heavy" ? 4.5 : 6.5));

    let nextX = unit.x + directionX * speed * dt;
    let nextY = unit.y + directionY * speed * dt;
    if (HAS_RIVER && !unit.air && nextY > RIVER_TOP && nextY < RIVER_BOTTOM && !isBridgeSurface(nextX, stats.size * .65)) {
      nextY = unit.y;
    }
    unit.x = Math.max(65, Math.min(W - 65, nextX));
    unit.y = Math.max(100, Math.min(H - 100, nextY));
    const travelled = Math.hypot(unit.x - oldX, unit.y - oldY);
    unit.distance += travelled;
    unit.moving = travelled > .08;

    unit.dustTimer -= dt;
    if (!unit.air && unit.moving && unit.dustTimer <= 0 && !(HAS_RIVER && unit.y > RIVER_TOP && unit.y < RIVER_BOTTOM)) {
      createTrackDust(unit);
      unit.dustTimer = .08 + Math.random() * .06;
    }
    if (state.cockpitMode) {
      unit.turretAngle = rotateToward(unit.turretAngle, unit.heading, dt * 7);
      unit.aaAngle = rotateToward(unit.aaAngle, unit.heading, dt * 7);
      focusUnit(unit);
    }
  }

  function updateMapObstacles(dt) {
    for (const obstacle of state.obstacles) {
      if (obstacle.dead) continue;
      obstacle.hitFlash = Math.max(0, obstacle.hitFlash - dt * 5);
    }
  }

  function resolveUnitObstacleCollision(unit) {
    if (unit.dead || unit.air) return;
    const size = TYPES[unit.type].size * .58;
    for (const obstacle of state.obstacles) {
      if (obstacle.dead) continue;
      const dx = unit.x - obstacle.x;
      const dy = unit.y - obstacle.y;
      const distance = Math.max(.01, Math.hypot(dx, dy));
      const minimum = size + obstacle.size * .58;
      if (distance >= minimum) continue;
      const push = minimum - distance;
      unit.x += dx / distance * push;
      unit.y += dy / distance * push;
      unit.x = Math.max(65, Math.min(W - 65, unit.x));
      unit.y = Math.max(100, Math.min(H - 100, unit.y));
      unit.moving = false;
    }
  }

  function updateCameraControl(dt) {
    const selected = getSelectedUnit();
    if (selected && state.cockpitMode) {
      focusUnit(selected);
      return;
    }
    if (!state.started) return;
    const speed = 620 * dt;
    const dx = (cameraKeys.has("KeyD") ? 1 : 0) - (cameraKeys.has("KeyA") ? 1 : 0);
    const dy = (cameraKeys.has("KeyS") ? 1 : 0) - (cameraKeys.has("KeyW") ? 1 : 0);
    if (!dx && !dy) return;
    viewport.scrollLeft += dx * speed;
    viewport.scrollTop += dy * speed;
    el.dragHint.classList.add("hidden");
    updateCameraBox();
  }

  function focusUnit(unit, instant = false) {
    if (!unit) return;
    const xRatio = unit.x / W;
    const yRatio = unit.y / H;
    const top = yRatio * canvas.clientHeight - viewport.clientHeight * .52;
    const left = xRatio * canvas.clientWidth - viewport.clientWidth * .5;
    viewport.scrollTo({ top: Math.max(0, top), left: Math.max(0, left), behavior: instant ? "auto" : "smooth" });
    updateCameraBox();
  }

  function manualFireControl(unit) {
    if (!state.cockpitMode || !state.manualFire || !unit || unit.dead) return;
    const stats = TYPES[unit.type];
    if (unit.reload > 0) return;
    const target = findManualAimTarget(unit);
    if (!target) {
      state.manualAimPulse = .15;
      unit.reload = Math.min(stats.fireRate, stats.bullet ? .12 : .28);
      return;
    }
    unit.turretAngle = unit.heading;
    fireUnitWeapon(unit, target);
    state.manualAimPulse = .32;
  }

  function findManualAimTarget(unit) {
    const stats = TYPES[unit.type];
    const range = Math.max(stats.range, unit.type === "rocket" ? 430 : unit.air ? 240 : 210);
    const candidates = [];
    for (const enemy of state.units) if (!enemy.dead && enemy.team !== unit.team) candidates.push(enemy);
    for (const fortification of state.fortifications) if (!fortification.dead && fortification.team !== unit.team && fortification.completed) candidates.push(fortification);
    const enemyHQ = unit.team === "player" ? state.enemyHQ : state.playerHQ;
    candidates.push(enemyHQ, enemyHQ.warehouse, ...enemyHQ.machineGuns.filter(tower => !tower.dead));
    for (const obstacle of state.obstacles) if (!obstacle.dead && obstacle.destructible) candidates.push(obstacle);
    const facing = unit.heading - Math.PI / 2;
    let best = null;
    let bestScore = Infinity;
    for (const target of candidates) {
      const tx = target.x ?? W / 2;
      const ty = target.y;
      const dx = tx - unit.x;
      const dy = ty - unit.y;
      const distance = Math.hypot(dx, dy);
      if (distance > range) continue;
      const angle = Math.atan2(dy, dx);
      const delta = Math.abs(angleDelta(facing, angle));
      if (delta > .55) continue;
      const score = distance + delta * 210;
      if (score < bestScore) { best = target; bestScore = score; }
    }
    return best;
  }

  function isBridgeSurface(x, margin = 0) {
    if (!HAS_RIVER) return true;
    return BRIDGES.some(bridgeX => Math.abs(x - bridgeX) <= BRIDGE_WIDTH / 2 - margin);
  }

  function headingTo(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX) + Math.PI / 2;
  }

  function createTrackDust(unit) {
    const backX = unit.x - Math.sin(unit.heading) * TYPES[unit.type].size * .52;
    const backY = unit.y + Math.cos(unit.heading) * TYPES[unit.type].size * .52;
    state.particles.push({
      x: backX + (Math.random() - .5) * 18,
      y: backY + (Math.random() - .5) * 12,
      vx: (Math.random() - .5) * 12,
      vy: (Math.random() - .5) * 12,
      size: 3 + Math.random() * 5,
      color: "#77715c",
      life: .28 + Math.random() * .24,
      maxLife: .52,
      smoke: true
    });
  }

  function updateHQ(hq, dt) {
    hq.flash = Math.max(0, hq.flash - dt * 5);
    hq.warehouse.hitFlash = Math.max(0, hq.warehouse.hitFlash - dt * 7);
    const forwardAngle = hq.team === "player" ? -Math.PI / 2 : Math.PI / 2;

    for (const cannon of hq.cannons) {
      cannon.reload -= dt;
      cannon.recoil = Math.max(0, cannon.recoil - dt * 4.6);
      cannon.flash = Math.max(0, cannon.flash - dt * 7);
      if (hq.hp <= 0) { cannon.targetId = null; continue; }

      const cannonX = hq.x + cannon.offsetX;
      const cannonY = hq.y + cannon.offsetY;
      let closest = null;
      let distance = Infinity;
      for (const unit of state.units) {
        if (unit.dead || unit.team === hq.team || unit.type === "helicopter") continue;
        const d = Math.hypot(unit.x - cannonX, unit.y - cannonY);
        if (d < 335 && d < distance) { closest = unit; distance = d; }
      }

      cannon.targetId = closest?.id ?? null;
      const desiredAngle = closest ? Math.atan2(closest.y - cannonY, closest.x - cannonX) : forwardAngle;
      cannon.angle = rotateToward(cannon.angle, desiredAngle, dt * 3.8);

      if (closest && cannon.reload <= 0 && Math.abs(angleDelta(cannon.angle, desiredAngle)) < .12) {
        const muzzleDistance = 48 - cannon.recoil * 7;
        const source = {
          x: cannonX + Math.cos(cannon.angle) * muzzleDistance,
          y: cannonY + Math.sin(cannon.angle) * muzzleDistance,
          team: hq.team,
          hq: true
        };
        fire(source, closest, 23, 720);
        cannon.reload = .92 + cannon.index * .08;
        cannon.recoil = 1;
        cannon.flash = 1;
        cannon.shots++;
      }
    }
  }

  function angleDelta(current, target) {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
  }

  function rotateToward(current, target, maxStep) {
    const delta = angleDelta(current, target);
    return current + Math.max(-maxStep, Math.min(maxStep, delta));
  }

  function fireUnitWeapon(unit, target) {
    const stats = TYPES[unit.type];
    if (unit.type === "rocket") {
      if (!unit.rocketSalvo) unit.rocketSalvo = { target, remaining: stats.salvoCount, timer: 0, index: 0 };
    } else {
      fire(unit, target);
    }
    unit.reload = stats.fireRate;
  }

  function updateRocketSalvo(unit, dt) {
    const salvo = unit.rocketSalvo;
    if (!salvo) return;
    salvo.timer -= dt;
    while (salvo.remaining > 0 && salvo.timer <= 0) {
      fireRocket(unit, salvo.target, salvo.index++);
      salvo.remaining--;
      salvo.timer += TYPES.rocket.salvoDelay;
    }
    if (salvo.remaining <= 0) unit.rocketSalvo = null;
  }

  function fireRocket(source, target, index) {
    const stats = TYPES.rocket;
    const liveTarget = target && !target.dead && target.hp > 0;
    const tx = (liveTarget ? target.x : target?.x ?? source.x) + (Math.random() - .5) * 18;
    const ty = (liveTarget ? target.y : target?.y ?? source.y) + (Math.random() - .5) * 18;
    const rackSide = index % 2 ? 1 : -1;
    const rackRow = Math.floor(index / 2) - 1.5;
    const startX = source.x + Math.sin(source.turretAngle) * 30 + Math.cos(source.turretAngle) * rackSide * 8;
    const startY = source.y - Math.cos(source.turretAngle) * 30 + Math.sin(source.turretAngle) * rackSide * 8 + rackRow * 2;
    const dist = Math.hypot(tx - startX, ty - startY);
    state.projectiles.push({
      x: startX, y: startY, startX, startY, target, tx, ty,
      team: source.team, sourceType: "rocket", damage: stats.damage,
      life: 0, duration: Math.max(.12, dist / stats.shellSpeed),
      heavy: true, bullet: false, artillery: false, rocket: true,
      arcHeight: Math.min(115, 42 + dist * .16), progress: 0, trailClock: 0, done: false
    });
    source.recoil = 1;
    source.flash = 1;
    source.shots = (source.shots ?? 0) + 1;
    if (index % 2 === 0) sound("shot");
  }

  function fire(source, target, damageOverride, speedOverride) {
    const stats = source.type ? TYPES[source.type] : null;
    const damage = damageOverride ?? stats.damage;
    const speed = speedOverride ?? stats.shellSpeed;
    const tx = target.x ?? W / 2;
    const ty = target.y;
    const dist = Math.hypot(tx - source.x, ty - source.y);
    let startX = source.x;
    let startY = source.y;
    if (source.type) {
      const barrelLength = stats.size * (source.type === "artillery" ? 1.82 : source.type === "heavy" ? 1.38 : source.type === "medium" ? 1.28 : 1.18);
      startX += Math.sin(source.turretAngle) * barrelLength;
      startY -= Math.cos(source.turretAngle) * barrelLength;
    }
    state.projectiles.push({
      x: startX,
      y: startY,
      startX,
      startY,
      target,
      tx,
      ty,
      team: source.team,
      sourceType: source.type ?? (source.hq ? "hqCannon" : "shell"),
      damage,
      life: 0,
      duration: Math.max(.08, dist / speed),
      heavy: source.type === "heavy" || source.type === "artillery" || source.hq,
      bullet: stats?.bullet === true,
      artillery: source.type === "artillery",
      arcHeight: source.type === "artillery" ? Math.min(175, 55 + dist * .24) : 0,
      progress: 0,
      trailClock: 0,
      done: false
    });
    if (source.type) {
      source.recoil = 1;
      source.flash = 1;
      source.shots = (source.shots ?? 0) + 1;
    }
    if (Math.random() < .38) sound("shot");
  }

  function updateProjectile(p, dt) {
    p.life += dt;
    const t = Math.min(1, p.life / p.duration);
    p.progress = t;
    const targetAlive = p.target && !p.target.dead && p.target.hp > 0;
    const eased = 1 - Math.pow(1 - t, 2);
    p.x = p.startX + (p.tx - p.startX) * eased;
    p.y = p.startY + (p.ty - p.startY) * eased - Math.sin(Math.PI * t) * p.arcHeight;
    p.trailClock -= dt;
    if (t < 1 && p.trailClock <= 0) {
      createProjectileTrail(p);
      p.trailClock = p.bullet ? .045 : p.artillery ? .022 : .032;
    }
    if (t >= 1) {
      p.done = true;
      if (p.bullet) createBulletImpact(p.x, p.y, p.team);
      else createExplosion(p.x, p.y, p.artillery ? 1.55 : p.heavy ? 1.1 : .72, p.team);
      if (targetAlive && projectileHitsTarget(p, p.target)) {
        damageTarget(p.target, p.damage, p.team);
      } else if (targetAlive && p.target.team === "player" && p.target.id === state.selectedUnitId && p.team === "enemy") {
        registerManualDodge(p.target);
      }
    }
  }

  function projectileHitsTarget(projectile, target) {
    const targetX = target.x ?? W / 2;
    const targetY = target.y;
    if (target.maxHp === MAX_HQ_HP) return Math.abs(targetX - projectile.tx) <= 165 && Math.abs(targetY - projectile.ty) <= 72;
    if (target.kind === "tower") return Math.hypot(targetX - projectile.tx, targetY - projectile.ty) <= 29;
    if (target.kind === "warehouse") return Math.abs(targetX - projectile.tx) <= 48 && Math.abs(targetY - projectile.ty) <= 38;
    if (target.kind === "fortification") return Math.hypot(targetX - projectile.tx, targetY - projectile.ty) <= target.size * .72;
    if (target.kind === "obstacleMap") return Math.hypot(targetX - projectile.tx, targetY - projectile.ty) <= target.size * .72;
    const size = TYPES[target.type]?.size ?? 30;
    const hitRadius = Math.max(10, size * (projectile.bullet ? .36 : .4));
    return Math.hypot(targetX - projectile.tx, targetY - projectile.ty) <= hitRadius;
  }

  function registerManualDodge(unit) {
    state.manualDodges++;
    state.floaters.push({ x: unit.x, y: unit.y - 34, text: "闪避!", team: "player", life: .8, maxLife: .8 });
    state.particles.push({ x: unit.x, y: unit.y, vx: 0, vy: 0, size: TYPES[unit.type].size * .7, color: "#79e0f2", life: .32, maxLife: .32, ring: true, ringWidth: 2 });
  }

  function createProjectileTrail(projectile) {
    const friendly = projectile.team === "player";
    const smoke = !projectile.bullet;
    state.particles.push({
      x: projectile.x + (Math.random() - .5) * (projectile.artillery ? 4 : 2),
      y: projectile.y + (Math.random() - .5) * (projectile.artillery ? 4 : 2),
      vx: (Math.random() - .5) * 9,
      vy: (Math.random() - .5) * 9,
      size: projectile.bullet ? 1.1 : projectile.artillery ? 4.5 + Math.random() * 3 : 2.2 + Math.random() * 2,
      color: projectile.bullet ? (friendly ? "#efff9d" : "#ff9a82") : projectile.artillery ? "#5f5746" : "#8c8065",
      life: projectile.bullet ? .1 : .24 + Math.random() * .18,
      maxLife: projectile.bullet ? .1 : .42,
      smoke,
      trail: true
    });
    if (projectile.artillery && Math.random() < .7) {
      state.particles.push({
        x: projectile.x, y: projectile.y,
        vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14,
        size: 1.2 + Math.random() * 1.5,
        color: friendly ? "#f2f79b" : "#ff8269",
        life: .12 + Math.random() * .12, maxLife: .24,
        streak: true
      });
    }
  }

  function damageTarget(target, amount, attackingTeam) {
    if (target.kind === "obstacleMap") {
      if (!target.destructible) {
        target.hitFlash = 1;
        createBulletImpact(target.x, target.y, attackingTeam);
        return;
      }
      target.hp = Math.max(0, target.hp - amount);
      target.hitFlash = 1;
      state.floaters.push({ x: target.x, y: target.y - 25, text: `-${amount}`, team: attackingTeam, life: .7, maxLife: .7 });
      if (target.hp <= 0 && !target.dead) {
        target.dead = true;
        createExplosion(target.x, target.y, target.type === "ruin" ? 1.05 : .75, attackingTeam);
        addLog(`${target.type === "sandbag" ? "沙袋掩体" : "废墟掩体"}被摧毁`, attackingTeam === "player" ? "ally" : "enemy");
        state.shake = Math.max(state.shake, 2.5);
      }
      return;
    }
    target.hp = Math.max(0, target.hp - amount);
    target.hitFlash = 1;
    state.floaters.push({ x: target.x ?? W / 2, y: target.y - 25, text: `-${amount}`, team: attackingTeam, life: .7, maxLife: .7 });
    if (target.kind === "tower") {
      if (target.hp <= 0 && !target.dead) {
        target.dead = true;
        createExplosion(target.x, target.y, 1.55, attackingTeam);
        if (attackingTeam === "player") state.kills++;
        addLog(`${target.team === "enemy" ? "敌军" : "我方"}机枪塔被摧毁`, target.team === "enemy" ? "ally" : "enemy");
        state.shake = Math.max(state.shake, 4);
        sound("impact");
      }
      return;
    }
    if (target.kind === "warehouse") {
      if (target.hp <= 0 && !target.dead) {
        target.dead = true;
        createExplosion(target.x, target.y, 1.9, attackingTeam);
        if (attackingTeam === "player") state.kills++;
        addLog(`${target.team === "enemy" ? "敌军" : "我方"}补给仓库被摧毁，额外指挥点供应中断`, target.team === "enemy" ? "ally" : "enemy");
        state.shake = Math.max(state.shake, 5);
        sound("impact");
      }
      return;
    }
    if (target.kind === "fortification") {
      if (target.hp <= 0 && !target.dead) {
        target.dead = true;
        createExplosion(target.x, target.y, target.type === "bunker" ? 1.45 : .9, attackingTeam);
        if (attackingTeam === "player") state.kills++;
        addLog(`${target.team === "enemy" ? "敌军" : "我方"}${FORTIFICATION_TYPES[target.type].name}被摧毁`, target.team === "enemy" ? "ally" : "enemy");
        state.shake = Math.max(state.shake, target.type === "bunker" ? 4 : 2.5);
        sound("impact");
      }
      return;
    }
    if (target.maxHp === MAX_HQ_HP) target.flash = 1;
    if (target.hp <= 0 && target.maxHp !== MAX_HQ_HP && !target.dead) {
      target.dead = true;
      createExplosion(target.x, target.y, target.type === "heavy" ? 1.75 : target.type === "helicopter" ? 1.6 : target.type === "apc" ? 1.45 : target.type === "artillery" ? 1.4 : target.type === "infantry" ? .65 : 1.25, attackingTeam);
      const wreckLife = target.type === "infantry" ? 6 : 11;
      state.wrecks.push({ x: target.x, y: target.y, type: target.type, team: target.team, life: wreckLife, maxLife: wreckLife, rotation: (target.heading ?? 0) + (Math.random() - .5) * .18 });
      if (attackingTeam === "player") state.kills++;
      if (Math.random() < .55) addLog(`${target.team === "enemy" ? "敌军" : "我方"}${TYPES[target.type].name}被摧毁`, target.team === "enemy" ? "ally" : "enemy");
      state.shake = Math.max(state.shake, target.type === "heavy" || target.type === "helicopter" ? 5 : 3);
      sound("impact");
    }
  }

  function createDeployEffect(x, y, team) {
    for (let i = 0; i < 15; i++) {
      state.particles.push({
        x: x + (Math.random() - .5) * 38,
        y: y + (Math.random() - .5) * 25,
        vx: (Math.random() - .5) * 18,
        vy: -8 - Math.random() * 28,
        size: 4 + Math.random() * 11,
        color: team === "player" ? "#cde86b" : "#f15b4c",
        life: .55 + Math.random() * .35,
        maxLife: .9,
        smoke: true
      });
    }
  }

  function createExplosion(x, y, scale, team) {
    const friendly = team === "player";
    state.particles.push({ x, y, vx: 0, vy: 0, size: 28 * scale, color: "#fff5c9", life: .13, maxLife: .13, flash: true });
    state.particles.push({ x, y, vx: 0, vy: 0, size: 15 * scale, color: friendly ? "#e7f28c" : "#ff7c67", life: .24, maxLife: .24, ring: true, ringWidth: 5 });
    state.particles.push({ x, y, vx: 0, vy: 0, size: 9 * scale, color: "#f2a34a", life: .42, maxLife: .42, ring: true, ringWidth: 3 });

    for (let i = 0; i < 22 * scale; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (35 + Math.random() * 130) * scale;
      const smoke = Math.random() < .32;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: (smoke ? 5 + Math.random() * 8 : 1.5 + Math.random() * 4.5) * scale,
        color: smoke ? (Math.random() < .5 ? "#4c5047" : "#6e6757") : Math.random() < .45 ? "#fff0a6" : Math.random() < .76 ? "#f28a3e" : "#cf4e31",
        life: smoke ? .65 + Math.random() * .75 : .28 + Math.random() * .55,
        maxLife: smoke ? 1.4 : .83,
        smoke,
        streak: !smoke && Math.random() < .62,
        gravity: smoke ? -5 : 58
      });
    }
    for (let i = 0; i < Math.ceil(7 * scale); i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 42 + Math.random() * 105 * scale;
      state.particles.push({
        x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 25,
        size: 1.5 + Math.random() * 2.4, color: "#302d27",
        life: .55 + Math.random() * .45, maxLife: 1,
        gravity: 120, debris: true
      });
    }
  }

  function createBulletImpact(x, y, team) {
    const color = team === "player" ? "#effa9a" : "#ff9b82";
    state.particles.push({ x, y, vx: 0, vy: 0, size: 8, color: "#fff8d7", life: .08, maxLife: .08, flash: true });
    state.particles.push({ x, y, vx: 0, vy: 0, size: 4, color, life: .16, maxLife: .16, ring: true, ringWidth: 2 });
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * (40 + Math.random() * 85),
        vy: Math.sin(angle) * (40 + Math.random() * 85),
        size: 1 + Math.random() * 2,
        color,
        life: .1 + Math.random() * .2,
        maxLife: .3,
        streak: true,
        gravity: 45
      });
    }
  }

  function updateParticle(p, dt) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.gravity) p.vy += p.gravity * dt;
    p.vx *= Math.pow(.12, dt);
    p.vy *= Math.pow(.12, dt);
    if (p.smoke) p.size += dt * (p.trail ? 5 : 10);
  }

  function beginHQDestruction(playerWon) {
    if (state.destroying || state.ended) return;
    state.destroying = true;
    state.destructionWon = playerWon;
    state.destructionTime = 0;
    state.destructionBurst = 0;
    state.destructionReady = false;
    state.projectiles = [];
    clearManualSelection(true);
    const hq = playerWon ? state.enemyHQ : state.playerHQ;
    hq.hp = 0;
    hq.destroyProgress = 0;
    if (!state.resultRecorded) {
      recordBattleResult(playerWon);
      state.resultRecorded = true;
    }
    const targetScroll = hq.y / H * canvas.clientHeight - viewport.clientHeight * .5;
    viewport.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
    addLog(`${playerWon ? "敌军" : "我方"}总部结构失稳，弹药库发生连锁爆炸`, playerWon ? "ally" : "enemy");
    createExplosion(hq.x, hq.y, 2.8, playerWon ? "player" : "enemy");
    state.shake = 16;
    sound("impact");
  }

  function updateHQDestruction(dt) {
    state.destructionTime += dt;
    const hq = state.destructionWon ? state.enemyHQ : state.playerHQ;
    hq.destroyProgress = Math.min(1, state.destructionTime / 3.25);
    while (state.destructionBurst < 9 && state.destructionTime >= .28 + state.destructionBurst * .34) {
      const burst = state.destructionBurst++;
      const angle = burst * 2.17 + Math.random() * .5;
      const radius = 28 + (burst % 4) * 32;
      const x = hq.x + Math.cos(angle) * radius;
      const y = hq.y + Math.sin(angle) * radius * .42;
      createExplosion(x, y, 1.4 + burst * .16, state.destructionWon ? "player" : "enemy");
      state.shake = Math.max(state.shake, 9 + burst * .8);
      sound("impact");
    }
    for (const particle of state.particles) updateParticle(particle, dt);
    for (const floater of state.floaters) { floater.life -= dt; floater.y -= 22 * dt; }
    for (const wreck of state.wrecks) wreck.life -= dt;
    state.particles = state.particles.filter(particle => particle.life > 0);
    state.floaters = state.floaters.filter(floater => floater.life > 0);
    state.wrecks = state.wrecks.filter(wreck => wreck.life > 0);
    state.shake = Math.max(0, state.shake - dt * 8);
    if (state.destructionTime >= 3.65 && !state.destructionReady) {
      state.destructionReady = true;
      el.destructionPrompt.classList.add("active");
    }
  }

  function revealBattleResult() {
    if (!state.destructionReady || state.ended) return;
    finish(state.destructionWon);
  }

  function finish(playerWon) {
    if (state.ended) return;
    state.ended = true;
    state.running = false;
    el.destructionPrompt.classList.remove("active");
    el.resultPanel.classList.toggle("defeat", !playerWon);
    el.resultKicker.textContent = playerWon ? "MISSION COMPLETE" : "MISSION FAILED";
    el.resultTitle.textContent = playerWon ? "战斗胜利" : "防线失守";
    const earnedScore = DIFFICULTY_SCORE[state.difficulty] ?? 0;
    el.resultCopy.textContent = playerWon ? `敌军总部已在连锁爆炸中化为废墟，战区控制权已夺取。本局难度积分 +${earnedScore}。` : "我方总部已被彻底摧毁。调整部署节奏，再次夺回战场，本局不增加积分。";
    el.resultTime.textContent = formatTime(state.time);
    el.resultDeployed.textContent = state.deployed;
    el.resultKills.textContent = state.kills;
    el.resultScreen.classList.add("active");
  }

  function returnToMainMenu() {
    resetGame();
    showHomeMenu();
  }

  const background = document.createElement("canvas");
  background.width = W;
  background.height = H;
  const bg = background.getContext("2d");

  function seededRandom(seed) {
    let value = seed % 2147483647;
    return () => ((value = value * 16807 % 2147483647) - 1) / 2147483646;
  }

  function createMapObstacles() {
    const random = seededRandom(31247 + H + (HAS_RIVER ? 17 : 3) + BRIDGES.length * 31);
    const obstacles = [];
    const safeFromBase = y => y > 370 && y < H - 370;
    for (let i = 0; i < 34; i++) {
      const lane = LANES[Math.floor(random() * LANES.length)];
      const side = random() < .5 ? -1 : 1;
      let x = lane + side * (84 + random() * 150) + (random() - .5) * 44;
      let y = 390 + random() * (H - 780);
      if (HAS_RIVER && y > RIVER_TOP - 110 && y < RIVER_BOTTOM + 110) {
        y += y < (RIVER_TOP + RIVER_BOTTOM) / 2 ? -150 : 150;
      }
      x = Math.max(90, Math.min(W - 90, x));
      y = Math.max(220, Math.min(H - 220, y));
      if (!safeFromBase(y)) continue;
      const destructible = random() < .56;
      const hp = destructible ? 150 + Math.round(random() * 170) : Infinity;
      obstacles.push({
        id: `obs-${i}`,
        kind: "obstacleMap",
        type: destructible ? (random() < .5 ? "sandbag" : "ruin") : (random() < .5 ? "rock" : "concrete"),
        x,
        y,
        size: 34 + random() * 32,
        hp,
        maxHp: hp,
        destructible,
        rotation: random() * Math.PI,
        hitFlash: 0,
        dead: false
      });
    }
    return obstacles;
  }

  function drawSoftShadow(g, x, y, rx, ry, alpha = .38) {
    g.save();
    g.fillStyle = `rgba(0,0,0,${alpha})`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawIsoBlock(g, x, y, width, height, depth, topColor, sideColor, frontColor, stroke = "rgba(12,17,13,.72)") {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    g.save();
    drawSoftShadow(g, x + depth * .25, bottom + depth * .62, width * .62, depth * .95, .34);
    g.fillStyle = sideColor;
    g.beginPath();
    g.moveTo(right, top);
    g.lineTo(right + depth, top + depth * .55);
    g.lineTo(right + depth, bottom + depth * .55);
    g.lineTo(right, bottom);
    g.closePath();
    g.fill();
    g.fillStyle = frontColor;
    g.beginPath();
    g.moveTo(left, bottom);
    g.lineTo(right, bottom);
    g.lineTo(right + depth, bottom + depth * .55);
    g.lineTo(left + depth, bottom + depth * .55);
    g.closePath();
    g.fill();
    g.fillStyle = topColor;
    g.fillRect(left, top, width, height);
    g.strokeStyle = stroke;
    g.lineWidth = 2;
    g.strokeRect(left, top, width, height);
    g.restore();
  }

  function buildBackground() {
    const random = seededRandom(8742);
    const gradient = bg.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#3a3629");
    gradient.addColorStop(.45, "#343d2e");
    gradient.addColorStop(1, "#2a352c");
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, W, H);

    bg.save();
    bg.globalAlpha = .5;
    for (let y = -80; y < H + 180; y += 135) {
      const shade = bg.createLinearGradient(0, y, W, y + 95);
      shade.addColorStop(0, "rgba(255,238,188,.04)");
      shade.addColorStop(.5, "rgba(34,24,16,.08)");
      shade.addColorStop(1, "rgba(0,0,0,0)");
      bg.fillStyle = shade;
      bg.beginPath();
      bg.moveTo(0, y + 40);
      bg.bezierCurveTo(W * .25, y - 18, W * .68, y + 108, W, y + 24);
      bg.lineTo(W, y + 105);
      bg.bezierCurveTo(W * .62, y + 170, W * .28, y + 42, 0, y + 116);
      bg.closePath();
      bg.fill();
    }
    bg.restore();

    bg.fillStyle = "rgba(102,127,84,.10)";
    for (let i = 0; i < 38; i++) {
      const x = random() * W, y = random() * H, rx = 60 + random() * 150, ry = 35 + random() * 110;
      bg.beginPath(); bg.ellipse(x, y, rx, ry, random() * Math.PI, 0, Math.PI * 2); bg.fill();
    }

    for (const laneX of LANES) {
      const road = bg.createLinearGradient(laneX - 74, 0, laneX + 74, 0);
      road.addColorStop(0, "rgba(14,18,15,.36)");
      road.addColorStop(.18, "rgba(86,80,58,.22)");
      road.addColorStop(.5, "rgba(126,116,80,.18)");
      road.addColorStop(.82, "rgba(31,37,29,.28)");
      road.addColorStop(1, "rgba(10,14,12,.34)");
      bg.fillStyle = road;
      bg.fillRect(laneX - 76, 0, 152, H);
      bg.fillStyle = "rgba(199,184,126,.08)";
      bg.fillRect(laneX - 46, 0, 92, H);
      bg.strokeStyle = "rgba(216,226,191,.13)";
      bg.lineWidth = 2;
      bg.setLineDash([18, 23]);
      bg.beginPath(); bg.moveTo(laneX, 0); bg.lineTo(laneX, H); bg.stroke();
      bg.setLineDash([]);
    }

    bg.strokeStyle = "rgba(20,27,22,.32)";
    bg.lineWidth = 4;
    for (let i = 0; i < 25; i++) {
      const y = 250 + i * 83 + random() * 25;
      bg.beginPath(); bg.moveTo(0, y); bg.bezierCurveTo(W * .3, y - 45, W * .7, y + 45, W, y - 8); bg.stroke();
    }

    for (let i = 0; i < 145; i++) {
      const x = random() * W, y = 170 + random() * (H - 340);
      if (LANES.some(l => Math.abs(l - x) < 86)) continue;
      const radius = 5 + random() * 12;
      bg.fillStyle = `rgba(${38 + random() * 18}, ${58 + random() * 27}, ${37 + random() * 15}, .85)`;
      bg.beginPath(); bg.arc(x, y, radius, 0, Math.PI * 2); bg.fill();
      bg.fillStyle = "rgba(13,19,15,.35)"; bg.beginPath(); bg.arc(x + 4, y + 5, radius * .75, 0, Math.PI * 2); bg.fill();
    }

    bg.strokeStyle = "rgba(73,61,43,.32)";
    bg.lineWidth = 7;
    bg.lineCap = "round";
    for (let i = 0; i < 11; i++) {
      const y = 430 + random() * (H - 860);
      const startX = random() < .5 ? 18 : W - 18;
      const endX = startX < W / 2 ? 180 + random() * 95 : W - 180 - random() * 95;
      bg.beginPath();
      bg.moveTo(startX, y);
      bg.bezierCurveTo(endX, y - 50 - random() * 50, endX, y + 48 + random() * 40, startX, y + 108);
      bg.stroke();
      bg.strokeStyle = "rgba(12,16,13,.24)";
      bg.lineWidth = 2;
      bg.stroke();
      bg.strokeStyle = "rgba(73,61,43,.32)";
      bg.lineWidth = 7;
    }

    for (let i = 0; i < 34; i++) {
      const x = 55 + random() * (W - 110);
      const y = 320 + random() * (H - 640);
      if (HAS_RIVER && y > RIVER_TOP - 40 && y < RIVER_BOTTOM + 40) continue;
      const radius = 9 + random() * 17;
      const crater = bg.createRadialGradient(x - radius * .25, y - radius * .28, 1, x, y, radius);
      crater.addColorStop(0, "rgba(17,19,15,.9)");
      crater.addColorStop(.55, "rgba(46,43,32,.72)");
      crater.addColorStop(.78, "rgba(104,92,61,.26)");
      crater.addColorStop(1, "rgba(20,26,20,0)");
      bg.fillStyle = crater; bg.beginPath(); bg.ellipse(x, y, radius, radius * .7, random() * Math.PI, 0, Math.PI * 2); bg.fill();
    }
    bg.strokeStyle = "rgba(25,28,22,.26)";
    bg.lineWidth = 4;
    for (let i = 0; i < 18; i++) {
      const x = LANES[Math.floor(random() * LANES.length)] + (random() - .5) * 74;
      const y = 330 + random() * (H - 660);
      bg.beginPath(); bg.moveTo(x - 9, y - 38); bg.quadraticCurveTo(x - 15, y, x - 8, y + 38); bg.stroke();
      bg.beginPath(); bg.moveTo(x + 9, y - 38); bg.quadraticCurveTo(x + 15, y, x + 8, y + 38); bg.stroke();
    }

    if (HAS_RIVER) drawRiverAndBridges(bg);

    bg.fillStyle = "rgba(145,55,46,.11)";
    bg.fillRect(0, 0, W, 300);
    bg.fillStyle = "rgba(169,198,85,.09)";
    bg.fillRect(0, H - 300, W, 300);
    bg.strokeStyle = "rgba(241,91,76,.32)"; bg.setLineDash([8, 10]);
    bg.beginPath(); bg.moveTo(0, 300); bg.lineTo(W, 300); bg.stroke();
    bg.strokeStyle = "rgba(205,232,107,.28)";
    bg.beginPath(); bg.moveTo(0, H - 300); bg.lineTo(W, H - 300); bg.stroke(); bg.setLineDash([]);

    bg.font = "700 12px Rajdhani, sans-serif";
    bg.letterSpacing = "4px";
    bg.fillStyle = "rgba(255,115,102,.42)"; bg.fillText("ENEMY DEPLOYMENT ZONE", 34, 286);
    bg.fillStyle = "rgba(205,232,107,.38)"; bg.fillText("ALLIED DEPLOYMENT ZONE", 34, H - 280);
  }

  function drawRiverAndBridges(g) {
    if (!HAS_RIVER) return;
    g.save();

    g.fillStyle = "rgba(13,19,18,.5)";
    g.fillRect(0, RIVER_TOP - 24, W, RIVER_BOTTOM - RIVER_TOP + 48);
    const water = g.createLinearGradient(0, RIVER_TOP, 0, RIVER_BOTTOM);
    water.addColorStop(0, "#173337");
    water.addColorStop(.18, "#255d63");
    water.addColorStop(.5, "#2e747a");
    water.addColorStop(.82, "#1e555c");
    water.addColorStop(1, "#102d32");
    g.fillStyle = water;
    g.fillRect(0, RIVER_TOP, W, RIVER_BOTTOM - RIVER_TOP);

    const bank = g.createLinearGradient(0, RIVER_TOP - 28, 0, RIVER_TOP + 24);
    bank.addColorStop(0, "#56533d");
    bank.addColorStop(.45, "#787358");
    bank.addColorStop(1, "rgba(40,62,54,.2)");
    g.fillStyle = bank;
    g.fillRect(0, RIVER_TOP - 24, W, 38);
    g.fillStyle = "rgba(20,13,8,.34)";
    g.fillRect(0, RIVER_TOP + 8, W, 13);
    g.save();
    g.translate(0, RIVER_BOTTOM);
    g.scale(1, -1);
    g.fillStyle = bank;
    g.fillRect(0, -24, W, 38);
    g.fillStyle = "rgba(20,13,8,.34)";
    g.fillRect(0, 8, W, 13);
    g.restore();

    g.lineWidth = 2;
    for (let row = 0; row < 7; row++) {
      const baseY = RIVER_TOP + 22 + row * 26;
      g.strokeStyle = row % 2 ? "rgba(150,211,209,.16)" : "rgba(10,43,47,.28)";
      g.beginPath();
      for (let x = -20; x <= W + 20; x += 28) {
        const y = baseY + Math.sin(x * .028 + row * 1.7) * 5;
        if (x === -20) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }

    for (const bridgeX of BRIDGES) {
      const left = bridgeX - BRIDGE_WIDTH / 2;
      const deckTop = RIVER_TOP - 52;
      const deckHeight = RIVER_BOTTOM - RIVER_TOP + 104;

      g.fillStyle = "rgba(4,9,8,.48)";
      g.fillRect(left - 10, deckTop + 8, BRIDGE_WIDTH + 20, deckHeight);
      g.fillStyle = "#555248";
      g.fillRect(left - 7, deckTop, BRIDGE_WIDTH + 14, deckHeight);
      g.fillStyle = "rgba(0,0,0,.42)";
      g.fillRect(left + BRIDGE_WIDTH + 7, deckTop + 18, 18, deckHeight - 12);
      const deck = g.createLinearGradient(left, 0, left + BRIDGE_WIDTH, 0);
      deck.addColorStop(0, "#494941");
      deck.addColorStop(.18, "#777565");
      deck.addColorStop(.5, "#666456");
      deck.addColorStop(.82, "#777565");
      deck.addColorStop(1, "#494941");
      g.fillStyle = deck;
      g.fillRect(left, deckTop, BRIDGE_WIDTH, deckHeight);

      g.fillStyle = "#242b27";
      g.fillRect(left - 8, deckTop, 8, deckHeight);
      g.fillRect(left + BRIDGE_WIDTH, deckTop, 8, deckHeight);
      g.fillStyle = "rgba(238,226,184,.11)";
      g.fillRect(left + 10, deckTop + 8, BRIDGE_WIDTH - 20, 6);
      g.strokeStyle = "rgba(225,222,190,.22)";
      g.lineWidth = 2;
      for (let y = deckTop + 12; y < deckTop + deckHeight; y += 22) {
        g.beginPath(); g.moveTo(left + 4, y); g.lineTo(left + BRIDGE_WIDTH - 4, y); g.stroke();
      }

      g.strokeStyle = "rgba(235,226,170,.45)";
      g.lineWidth = 3;
      g.setLineDash([18, 15]);
      g.beginPath(); g.moveTo(bridgeX, deckTop + 8); g.lineTo(bridgeX, deckTop + deckHeight - 8); g.stroke();
      g.setLineDash([]);

      g.fillStyle = "#85816d";
      g.fillRect(left - 13, RIVER_TOP - 60, BRIDGE_WIDTH + 26, 18);
      g.fillRect(left - 13, RIVER_BOTTOM + 42, BRIDGE_WIDTH + 26, 18);
      g.fillStyle = "rgba(10,16,14,.55)";
      g.fillRect(left - 4, RIVER_TOP + 52, 12, 54);
      g.fillRect(left + BRIDGE_WIDTH - 8, RIVER_TOP + 52, 12, 54);
    }

    g.fillStyle = "rgba(205,234,226,.55)";
    g.font = "700 11px Rajdhani, sans-serif";
    g.textAlign = "center";
    g.fillText("RIVER LINE · BRIDGE CROSSING ONLY", W / 2, RIVER_TOP + 26);
    g.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake);
    ctx.drawImage(background, 0, 0);
    drawTerritoryLine();
    for (const wreck of state.wrecks) drawWreck(wreck);
    for (const obstacle of state.obstacles) drawMapObstacle(obstacle);
    drawWarehouse(state.enemyHQ.warehouse);
    drawWarehouse(state.playerHQ.warehouse);
    drawHQ(state.enemyHQ);
    drawHQ(state.playerHQ);
    for (const tower of state.enemyHQ.machineGuns) drawMachineGunTower(tower);
    for (const tower of state.playerHQ.machineGuns) drawMachineGunTower(tower);
    for (const fortification of state.fortifications) drawFortification(fortification);
    const sorted = [...state.units].sort((a, b) => a.y - b.y);
    for (const unit of sorted) if (unit.type !== "helicopter") drawTank(unit);
    for (const unit of sorted) if (unit.type === "helicopter") drawHelicopter(unit);
    const selectedUnit = getSelectedUnit();
    if (selectedUnit) drawManualSelection(selectedUnit);
    if (state.placementPreview) drawFortificationPreview(state.placementPreview);
    for (const p of state.projectiles) drawProjectile(p);
    for (const p of state.particles) drawParticle(p);
    for (const f of state.floaters) drawFloater(f);
    ctx.restore();
    renderMinimap();
  }

  function drawFortification(fortification) {
    if (fortification.dead) return;
    const progress = fortification.completed ? 1 : fortification.buildProgress / fortification.buildTime;
    ctx.save();
    ctx.translate(fortification.x, fortification.y);
    ctx.globalAlpha = .28 + progress * .72;
    if (fortification.hitFlash > 0) {
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 16 * fortification.hitFlash;
    }

    if (fortification.type === "obstacle") {
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath(); ctx.ellipse(5, 15, 62, 21, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#2a241c";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      for (const offset of [-22, 0, 22]) {
        ctx.beginPath(); ctx.moveTo(offset - 24, -18); ctx.lineTo(offset + 24, 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(offset - 24, 18); ctx.lineTo(offset + 24, -18); ctx.stroke();
      }
      ctx.strokeStyle = "#76583b";
      ctx.lineWidth = 7;
      for (const offset of [-22, 0, 22]) {
        ctx.beginPath(); ctx.moveTo(offset - 23, -18); ctx.lineTo(offset + 23, 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(offset - 23, 18); ctx.lineTo(offset + 23, -18); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(218,188,132,.45)";
      ctx.lineWidth = 2;
      for (const offset of [-22, 0, 22]) {
        ctx.beginPath(); ctx.moveTo(offset - 20, -16); ctx.lineTo(offset + 20, 16); ctx.stroke();
      }
      ctx.strokeStyle = "#a8a58e";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-52, 0); ctx.lineTo(52, 0); ctx.stroke();
      for (let x = -48; x <= 48; x += 12) {
        ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x + 4, 5); ctx.stroke();
      }
      ctx.fillStyle = "#b7a988";
      for (const x of [-43, -21, 1, 23, 45]) {
        ctx.beginPath(); ctx.arc(x, 0, 2.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#9a633f";
      for (const x of [-34, -8, 18, 42]) {
        ctx.beginPath(); ctx.arc(x, 9 + (x % 3), 3, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      const teamAccent = fortification.team === "player" ? "#a9c45d" : "#bc584d";
      ctx.fillStyle = "rgba(0,0,0,.48)";
      ctx.beginPath(); ctx.ellipse(5, 20, 61, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4b4130";
      for (let index = 0; index < 12; index++) {
        const angle = Math.PI * 2 * index / 12;
        ctx.beginPath();
        ctx.ellipse(Math.cos(angle) * 47, Math.sin(angle) * 24 + 8, 15, 8, angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(205,183,137,.2)"; ctx.lineWidth = 1; ctx.stroke();
      }
      const concrete = ctx.createLinearGradient(-34, -42, 35, 33);
      concrete.addColorStop(0, "#a7a895");
      concrete.addColorStop(.28, "#777a6d");
      concrete.addColorStop(.65, "#51584f");
      concrete.addColorStop(1, "#292f2b");
      ctx.fillStyle = concrete;
      ctx.beginPath();
      ctx.moveTo(-45, 25); ctx.lineTo(-39, -22); ctx.lineTo(-27, -35);
      ctx.lineTo(27, -35); ctx.lineTo(39, -22); ctx.lineTo(45, 25); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#202621"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "rgba(232,232,210,.14)";
      ctx.beginPath(); ctx.moveTo(-34, -19); ctx.lineTo(-25, -29); ctx.lineTo(25, -29); ctx.lineTo(32, -20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#252b27";
      ctx.beginPath(); ctx.ellipse(0, -34, 27, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#666b60";
      ctx.beginPath(); ctx.ellipse(0, -37, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b0f0d";
      roundRect(ctx, -29, -16, 58, 12, 3); ctx.fill();
      ctx.fillStyle = teamAccent;
      ctx.fillRect(-22, -12, 44, 3);
      ctx.fillStyle = "rgba(15,20,17,.58)";
      for (let crack = 0; crack < 4; crack++) {
        const x = -32 + crack * 19;
        ctx.fillRect(x, 4 + (crack % 2) * 7, 12, 2);
      }
      ctx.save();
      ctx.rotate(fortification.angle + Math.PI / 2);
      ctx.fillStyle = "#1b211d"; roundRect(ctx, -6, -42, 12, 43, 3); ctx.fill();
      ctx.fillStyle = "#8d9181"; ctx.fillRect(-2, -47, 4, 43);
      ctx.fillStyle = "#202621"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      if (fortification.flash > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(255,228,132,${fortification.flash})`;
        ctx.beginPath(); ctx.arc(0, -50, 9 + fortification.flash * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = fortification.team === "player" ? "#cde86b" : "#ff665a";
    ctx.beginPath(); ctx.moveTo(-8, fortification.size + 5); ctx.lineTo(0, fortification.size - 1); ctx.lineTo(8, fortification.size + 5); ctx.closePath(); ctx.fill();
    if (!fortification.completed) {
      ctx.strokeStyle = "rgba(235,210,145,.75)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(-fortification.size - 8, -fortification.size * .72, fortification.size * 2 + 16, fortification.size * 1.42);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(8,14,11,.88)"; ctx.fillRect(-43, fortification.size * .72 + 7, 86, 15);
      ctx.fillStyle = "#d5b26d"; ctx.fillRect(-40, fortification.size * .72 + 10, 80 * progress, 4);
      ctx.strokeStyle = "#667168"; ctx.strokeRect(-40, fortification.size * .72 + 10, 80, 4);
      ctx.fillStyle = "#f1dfb4"; ctx.font = "700 9px Rajdhani"; ctx.textAlign = "center";
      ctx.fillText(`施工 ${Math.round(progress * 100)}%`, 0, fortification.size * .72 + 20);
    } else if (fortification.hp < fortification.maxHp) {
      ctx.fillStyle = "rgba(0,0,0,.72)"; ctx.fillRect(-38, fortification.size + 7, 76, 6);
      ctx.fillStyle = "#cde86b"; ctx.fillRect(-37, fortification.size + 8, 74 * fortification.hp / fortification.maxHp, 4);
    }
    ctx.restore();
  }

  function drawFortificationPreview(preview) {
    const stats = FORTIFICATION_TYPES[preview.type];
    if (!stats) return;
    ctx.save();
    ctx.translate(preview.x, preview.y);
    ctx.strokeStyle = preview.valid ? "rgba(205,232,107,.95)" : "rgba(241,91,76,.95)";
    ctx.fillStyle = preview.valid ? "rgba(205,232,107,.12)" : "rgba(241,91,76,.12)";
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.arc(0, 0, stats.size + 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(5,11,9,.9)"; ctx.fillRect(-70, stats.size + 18, 140, 20);
    ctx.fillStyle = preview.valid ? "#dff18e" : "#ff8a7d";
    ctx.font = "700 10px Rajdhani"; ctx.textAlign = "center";
    ctx.fillText(preview.reason, 0, stats.size + 32);
    ctx.restore();
  }

  function drawManualSelection(unit) {
    const radius = TYPES[unit.type].size * .9 + 18 + Math.sin(state.time * 5) * 2;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(state.time * .55);
    ctx.strokeStyle = "rgba(121,224,242,.92)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.shadowColor = "#79e0f2";
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#9af0ff";
      ctx.beginPath(); ctx.moveTo(0, -radius - 6); ctx.lineTo(-4, -radius + 1); ctx.lineTo(4, -radius + 1); ctx.closePath(); ctx.fill();
    }
    ctx.rotate(-state.time * .55);
    ctx.shadowBlur = 0;
    ctx.font = "700 10px Rajdhani";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(5,18,20,.88)";
    ctx.fillRect(-42, radius + 8, 84, 18);
    ctx.fillStyle = "#9af0ff";
    ctx.fillText("WASD · AUTO FIRE", 0, radius + 21);
    ctx.restore();
  }

  function drawTerritoryLine() {
    let front = H / 2;
    const ally = state.units.filter(u => u.team === "player");
    const enemy = state.units.filter(u => u.team === "enemy");
    if (ally.length || enemy.length) {
      const allyFront = ally.length ? Math.min(...ally.map(u => u.y)) : H - 360;
      const enemyFront = enemy.length ? Math.max(...enemy.map(u => u.y)) : 360;
      front = (allyFront + enemyFront) / 2;
    }
    ctx.save();
    ctx.strokeStyle = "rgba(238,245,233,.11)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 15]);
    ctx.beginPath(); ctx.moveTo(30, front); ctx.lineTo(W - 30, front); ctx.stroke();
    ctx.fillStyle = "rgba(238,245,233,.25)";
    ctx.font = "700 10px Rajdhani";
    ctx.fillText("CONTACT LINE", 38, front - 8);
    ctx.restore();
  }

  function drawMapObstacle(obstacle) {
    if (obstacle.dead) return;
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.rotation);
    const size = obstacle.size;
    drawSoftShadow(ctx, 7, size * .32, size * .9, size * .34, .36);
    if (obstacle.hitFlash > 0) {
      ctx.shadowColor = "#fff3c0";
      ctx.shadowBlur = 14 * obstacle.hitFlash;
    }
    if (obstacle.type === "rock") {
      const rock = ctx.createLinearGradient(-size, -size, size, size);
      rock.addColorStop(0, "#8b8972");
      rock.addColorStop(.45, "#555849");
      rock.addColorStop(1, "#222820");
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(-size * .9, size * .1); ctx.lineTo(-size * .62, -size * .55); ctx.lineTo(-size * .08, -size * .82);
      ctx.lineTo(size * .68, -size * .48); ctx.lineTo(size * .9, size * .1); ctx.lineTo(size * .46, size * .55); ctx.lineTo(-size * .55, size * .48);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(13,16,12,.7)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,220,.13)";
      ctx.beginPath(); ctx.moveTo(-size * .52, -size * .42); ctx.lineTo(-size * .06, -size * .66); ctx.lineTo(size * .38, -size * .38); ctx.lineTo(-size * .16, -size * .2); ctx.closePath(); ctx.fill();
    } else if (obstacle.type === "concrete") {
      drawIsoBlock(ctx, 0, 0, size * 1.6, size * .72, size * .34, "#777b6c", "#3b4038", "#52594d", "rgba(20,24,20,.8)");
      ctx.strokeStyle = "rgba(28,31,27,.55)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-size * .45, -size * .16); ctx.lineTo(-size * .12, size * .24); ctx.lineTo(size * .25, -size * .05); ctx.stroke();
    } else if (obstacle.type === "sandbag") {
      for (let row = 0; row < 3; row++) {
        for (let col = -2; col <= 2; col++) {
          ctx.fillStyle = row % 2 ? "#8b7650" : "#a18b61";
          ctx.beginPath(); ctx.ellipse(col * size * .28 + (row % 2) * size * .14, row * size * .18 - size * .22, size * .18, size * .11, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(34,26,18,.45)"; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    } else {
      drawIsoBlock(ctx, 0, 0, size * 1.35, size * .82, size * .32, "#666052", "#2e302b", "#46463c", "rgba(15,18,14,.75)");
      ctx.strokeStyle = "#171b16"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-size * .65, -size * .34); ctx.lineTo(size * .55, size * .32); ctx.stroke();
      ctx.strokeStyle = "#6d5540"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(size * .38, -size * .38); ctx.lineTo(-size * .28, size * .34); ctx.stroke();
    }
    if (obstacle.destructible && obstacle.hp < obstacle.maxHp) {
      ctx.rotate(-obstacle.rotation);
      ctx.fillStyle = "rgba(0,0,0,.72)"; ctx.fillRect(-30, size * .72, 60, 5);
      ctx.fillStyle = "#d6b36d"; ctx.fillRect(-30, size * .72, 60 * obstacle.hp / obstacle.maxHp, 5);
    }
    ctx.restore();
  }

  function drawWarehouse(warehouse) {
    const friendly = warehouse.team === "player";
    const accent = friendly ? "#d5bd72" : "#d37a61";
    ctx.save();
    ctx.translate(warehouse.x, warehouse.y);
    drawSoftShadow(ctx, 8, 31, 68, 27, .42);
    if (warehouse.dead) {
      ctx.globalAlpha = .65;
      drawIsoBlock(ctx, 0, 4, 88, 30, 16, "#242821", "#171c18", "#111611", "#111511");
      ctx.strokeStyle = "#151915"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-40, -18); ctx.lineTo(42, 25); ctx.moveTo(34, -22); ctx.lineTo(-22, 27); ctx.stroke();
      ctx.restore();
      return;
    }
    const wall = warehouse.hitFlash > 0 ? "#eee3c0" : "#454b3f";
    drawIsoBlock(ctx, 0, 2, 98, 50, 18, wall, "#252d26", "#30382f", accent);
    ctx.fillStyle = "#29322b";
    ctx.beginPath(); ctx.moveTo(-57, -23); ctx.lineTo(0, -54); ctx.lineTo(57, -23); ctx.lineTo(49, -16); ctx.lineTo(0, -42); ctx.lineTo(-49, -16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(238,230,194,.11)";
    for (let x = -40; x <= 36; x += 19) {
      ctx.fillRect(x, -19, 10, 38);
    }
    ctx.fillStyle = "#1d251f"; ctx.fillRect(-19, -1, 38, 36);
    ctx.fillStyle = "#313a32"; ctx.fillRect(-15, 2, 30, 30);
    ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.strokeRect(-19, -1, 38, 36);
    ctx.fillStyle = accent; ctx.font = "800 8px Rajdhani"; ctx.textAlign = "center";
    ctx.fillText("SUPPLY", 0, -10);
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(-43, 38, 86, 7);
    ctx.fillStyle = accent; ctx.fillRect(-43, 38, 86 * warehouse.hp / warehouse.maxHp, 7);
    ctx.restore();
  }

  function drawHQ(hq) {
    const isPlayer = hq.team === "player";
    const c = isPlayer ? "#9db257" : "#a74e45";
    ctx.save();
    ctx.translate(hq.x, hq.y);
    const collapse = hq.destroyProgress ?? 0;
    if (collapse >= 1) {
      ctx.fillStyle = "rgba(7,9,8,.8)";
      ctx.beginPath(); ctx.ellipse(0, 18, 205, 58, 0, 0, Math.PI * 2); ctx.fill();
      const rubbleColors = ["#222822", "#3d4038", "#545246", "#6a4939"];
      for (let index = 0; index < 28; index++) {
        const angle = index * 2.31;
        const radius = 18 + index % 7 * 25;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * .28 + 8;
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        ctx.fillStyle = rubbleColors[index % rubbleColors.length];
        ctx.fillRect(-9 - index % 4, -5, 18 + index % 5 * 3, 8 + index % 3 * 4);
        ctx.restore();
      }
      ctx.fillStyle = "#141916"; ctx.fillRect(-78, -4, 156, 20);
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-72, 4); ctx.lineTo(-18, -9); ctx.lineTo(24, 10); ctx.lineTo(73, -3); ctx.stroke();
      ctx.restore();
      return;
    }
    if (collapse > 0) {
      ctx.translate(0, collapse * 11);
      ctx.rotate(Math.sin(collapse * Math.PI * 4) * .025 * collapse);
      ctx.globalAlpha = 1 - collapse * .28;
    }

    for (const cannon of hq.cannons) {
      if (!cannon.targetId) continue;
      const target = state.units.find(unit => unit.id === cannon.targetId && !unit.dead);
      if (!target) continue;
      ctx.save();
      ctx.strokeStyle = isPlayer ? "rgba(205,232,107,.18)" : "rgba(241,91,76,.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 10]);
      ctx.beginPath();
      ctx.moveTo(cannon.offsetX, cannon.offsetY);
      ctx.lineTo(target.x - hq.x, target.y - hq.y);
      ctx.stroke();
      ctx.restore();
    }

    drawSoftShadow(ctx, 12, 36, 208, 54, .44);
    drawIsoBlock(ctx, 0, -2, 350, 58, 28, "#263029", "#121914", "#1a221c", c);
    const roof = ctx.createLinearGradient(-175, -46, 175, 26);
    roof.addColorStop(0, isPlayer ? "#53633b" : "#5b302c");
    roof.addColorStop(.48, "#303a31");
    roof.addColorStop(1, "#161d18");
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(-182, -34); ctx.lineTo(-140, -58); ctx.lineTo(140, -58); ctx.lineTo(182, -34);
    ctx.lineTo(162, -18); ctx.lineTo(-162, -18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#3d463d";
    for (let x = -156; x <= 132; x += 48) {
      drawIsoBlock(ctx, x, -50, 30, 18, 8, "#465047", "#202821", "#29332b", "rgba(255,255,255,.08)");
    }
    drawIsoBlock(ctx, 0, -4, 108, 70, 20, "#313c34", "#161e19", "#222b24", "rgba(255,255,255,.14)");
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, -10, 29, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#202821";
    ctx.beginPath(); ctx.arc(0, -10, 18, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(0, -10);
    ctx.rotate(state.time * .8 * (isPlayer ? 1 : -1));
    ctx.strokeStyle = isPlayer ? "#cde86b" : "#f15b4c";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(17, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = isPlayer ? "#cde86b" : "#f15b4c";
    ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.fill();

    for (const cannon of hq.cannons) {
      ctx.save();
      ctx.translate(cannon.offsetX, cannon.offsetY);
      ctx.fillStyle = "#171e19";
      ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = isPlayer ? "#82934c" : "#8f443d";
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();

      ctx.rotate(cannon.angle);
      const recoil = cannon.recoil * 8;
      ctx.fillStyle = "#273129";
      ctx.fillRect(2 - recoil, -6, 45, 12);
      ctx.fillStyle = c;
      ctx.fillRect(34 - recoil, -8, 15, 16);
      if (cannon.flash > 0) {
        ctx.globalAlpha = cannon.flash;
        ctx.fillStyle = "#fff0a8";
        ctx.beginPath(); ctx.arc(55 - recoil, 0, 14, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    if (hq.flash > 0) {
      ctx.globalAlpha = hq.flash * .42;
      ctx.fillStyle = "#fff5d1";
      ctx.fillRect(-175, -30, 350, 60);
      ctx.globalAlpha = 1;
    }

    const labelY = isPlayer ? 47 : -88;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(7,12,9,.82)"; ctx.fillRect(-104, labelY, 208, 34);
    ctx.strokeStyle = c; ctx.strokeRect(-104, labelY, 208, 34);
    ctx.fillStyle = "#eaf1e9"; ctx.font = "800 13px Noto Sans SC";
    ctx.fillText(isPlayer ? "我方总部 · 双炮台" : "敌军总部 · 双炮台", 0, labelY + 16);
    ctx.fillStyle = isPlayer ? "#cde86b" : "#f37b70";
    ctx.font = "700 8px Rajdhani";
    ctx.fillText("AUTO DEFENSE ONLINE", 0, labelY + 27);
    ctx.restore();
  }

  function drawMachineGunTower(tower) {
    const isPlayer = tower.team === "player";
    const accent = isPlayer ? "#cde86b" : "#f15b4c";
    ctx.save();
    ctx.translate(tower.x, tower.y);
    if (tower.dead) {
      ctx.globalAlpha = .58;
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath(); ctx.ellipse(0, 15, 37, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#232821";
      ctx.fillRect(-25, -5, 50, 30);
      ctx.strokeStyle = "#111511"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(-18, -12); ctx.lineTo(24, 24); ctx.stroke();
      ctx.restore();
      return;
    }

    const target = state.units.find(unit => unit.id === tower.targetId && !unit.dead);
    if (target) {
      ctx.strokeStyle = isPlayer ? "rgba(205,232,107,.16)" : "rgba(241,91,76,.16)";
      ctx.setLineDash([4, 9]);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(target.x - tower.x, target.y - tower.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    drawSoftShadow(ctx, 5, 27, 45, 22, .42);
    ctx.fillStyle = tower.hitFlash > 0 ? "#ece7cf" : "#303a31";
    ctx.beginPath(); ctx.moveTo(-31, 24); ctx.lineTo(-25, -3); ctx.lineTo(25, -3); ctx.lineTo(31, 24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(12,16,13,.55)";
    ctx.beginPath(); ctx.moveTo(31, 24); ctx.lineTo(40, 30); ctx.lineTo(-22, 30); ctx.lineTo(-31, 24); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
    drawIsoBlock(ctx, 0, -12, 24, 28, 8, "#252e27", "#111711", "#171f19", "rgba(255,255,255,.08)");

    ctx.save();
    ctx.rotate(tower.angle);
    ctx.fillStyle = isPlayer ? "#7f914d" : "#93463f";
    roundRect(ctx, -14, -14, 28, 28, 8); ctx.fill();
    ctx.fillStyle = "#202721";
    ctx.fillRect(2, -8, 37, 5);
    ctx.fillRect(2, 3, 37, 5);
    ctx.fillStyle = accent;
    ctx.fillRect(31, -9, 10, 7);
    ctx.fillRect(31, 2, 10, 7);
    if (tower.flash > 0) {
      ctx.globalAlpha = tower.flash;
      ctx.fillStyle = "#fff1a1";
      ctx.beginPath(); ctx.arc(45, -5, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(45, 5, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    const ratio = tower.hp / tower.maxHp;
    ctx.fillStyle = "rgba(3,7,5,.78)"; ctx.fillRect(-32, 34, 64, 5);
    ctx.fillStyle = isPlayer ? "#cde86b" : "#ed6659"; ctx.fillRect(-32, 34, 64 * ratio, 5);
    ctx.fillStyle = accent; ctx.font = "700 8px Rajdhani"; ctx.textAlign = "center";
    ctx.fillText("AA / GROUND", 0, 50);
    ctx.restore();
  }

  function drawHelicopter(unit) {
    const stats = TYPES.helicopter;
    const isPlayer = unit.team === "player";
    const size = stats.size;
    const hover = Math.sin(unit.hoverPhase) * 4;
    const bodyColor = isPlayer ? "#667c4d" : "#8e453e";
    const bodyDark = isPlayer ? "#34432f" : "#4d2825";
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.fillStyle = "rgba(0,0,0,.38)";
    ctx.beginPath(); ctx.ellipse(11, 48, size * 1.25, size * .5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, hover);
    ctx.rotate(unit.heading);

    ctx.strokeStyle = "#202722"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-size * .46, size * .25); ctx.lineTo(-size * .62, size * .69); ctx.lineTo(-size * .27, size * .69); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * .46, size * .25); ctx.lineTo(size * .62, size * .69); ctx.lineTo(size * .27, size * .69); ctx.stroke();

    const fuselage = ctx.createLinearGradient(-size * .5, -size * .5, size * .55, size * .45);
    fuselage.addColorStop(0, isPlayer ? "#91a76a" : "#b86458");
    fuselage.addColorStop(.45, bodyColor);
    fuselage.addColorStop(1, bodyDark);
    ctx.fillStyle = fuselage;
    ctx.beginPath();
    ctx.moveTo(0, -size * .78);
    ctx.bezierCurveTo(size * .52, -size * .61, size * .6, -.05 * size, size * .42, size * .38);
    ctx.quadraticCurveTo(0, size * .65, -size * .42, size * .38);
    ctx.bezierCurveTo(-size * .6, -.05 * size, -size * .52, -size * .61, 0, -size * .78); ctx.fill();
    ctx.strokeStyle = "rgba(10,15,12,.82)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,230,.1)";
    ctx.beginPath();
    ctx.moveTo(-size * .16, -size * .62);
    ctx.bezierCurveTo(size * .22, -size * .52, size * .35, -size * .08, size * .22, size * .27);
    ctx.quadraticCurveTo(-size * .03, size * .38, -size * .19, size * .2);
    ctx.bezierCurveTo(-size * .06, -.08 * size, -size * .24, -size * .36, -size * .16, -size * .62);
    ctx.fill();

    const glass = ctx.createLinearGradient(-18, -28, 18, -10);
    glass.addColorStop(0, "#17292d"); glass.addColorStop(.55, "#31515a"); glass.addColorStop(1, "#101c20");
    ctx.fillStyle = glass;
    ctx.beginPath(); ctx.moveTo(0, -size * .66); ctx.quadraticCurveTo(size * .3, -size * .5, size * .32, -size * .18); ctx.lineTo(0, -size * .12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -size * .66); ctx.quadraticCurveTo(-size * .3, -size * .5, -size * .32, -size * .18); ctx.lineTo(0, -size * .12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(154,207,215,.28)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -size * .66); ctx.lineTo(0, -size * .12); ctx.stroke();

    ctx.fillStyle = bodyDark;
    ctx.beginPath(); ctx.moveTo(-size * .13, size * .34); ctx.lineTo(size * .13, size * .34); ctx.lineTo(size * .08, size * 1.52); ctx.lineTo(-size * .08, size * 1.52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = bodyColor; ctx.fillRect(-size * .12, size * .38, size * .24, size * .86);
    ctx.fillStyle = bodyDark;
    ctx.beginPath(); ctx.moveTo(-size * .46, size * 1.31); ctx.lineTo(size * .46, size * 1.19); ctx.lineTo(size * .42, size * 1.42); ctx.lineTo(-size * .42, size * 1.49); ctx.closePath(); ctx.fill();
    ctx.fillStyle = isPlayer ? "#d8ef79" : "#ff776b";
    ctx.fillRect(-size * .055, size * 1.25, size * .11, size * .16);

    ctx.fillStyle = bodyDark;
    ctx.beginPath(); ctx.moveTo(-size * .2, -.02 * size); ctx.lineTo(-size * 1.02, size * .2); ctx.lineTo(-size * .94, size * .38); ctx.lineTo(-size * .2, size * .22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(size * .2, -.02 * size); ctx.lineTo(size * 1.02, size * .2); ctx.lineTo(size * .94, size * .38); ctx.lineTo(size * .2, size * .22); ctx.closePath(); ctx.fill();
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#242b26";
      roundRect(ctx, side * size * .7 - 7, size * .11, 14, 24, 4); ctx.fill();
      ctx.fillStyle = "#121713";
      for (let tube = 0; tube < 3; tube++) {
        ctx.beginPath(); ctx.arc(side * size * .7 - 4 + tube * 4, size * .16, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.save();
    ctx.rotate(angleDelta(unit.heading, unit.turretAngle));
    ctx.fillStyle = "#151b17";
    ctx.beginPath(); ctx.arc(0, -size * .65, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-2.5, -size * 1.04 + unit.recoil * 5, 5, size * .42);
    if (unit.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = unit.flash;
      ctx.fillStyle = "#fff2a3";
      ctx.beginPath(); ctx.arc(0, -size * 1.08, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, size * 1.36);
    ctx.rotate(-unit.rotorAngle * 1.6);
    ctx.strokeStyle = "rgba(191,205,186,.55)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-size * .28, 0); ctx.lineTo(size * .28, 0); ctx.moveTo(0, -size * .28); ctx.lineTo(0, size * .28); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(unit.rotorAngle);
    ctx.fillStyle = "rgba(210,220,202,.08)";
    ctx.beginPath(); ctx.ellipse(0, 0, size * 1.48, size * .28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(210,220,202,.24)"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-size * 1.35, 0); ctx.lineTo(size * 1.35, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -size * 1.35); ctx.lineTo(0, size * 1.35); ctx.stroke();
    ctx.strokeStyle = "rgba(229,235,215,.58)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-size * 1.25, 0); ctx.lineTo(size * 1.25, 0); ctx.moveTo(0, -size * 1.25); ctx.lineTo(0, size * 1.25); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#171d19"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7d8475"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    drawUnitStatus(unit, "AH-9", 72);
  }

  function drawFieldArtillery(unit) {
    const stats = TYPES.artillery;
    const isPlayer = unit.team === "player";
    const color = isPlayer ? "#9b9257" : "#a95848";
    const size = stats.size;
    const recoil = unit.recoil * 9;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.heading);

    ctx.fillStyle = "rgba(0,0,0,.43)";
    ctx.beginPath(); ctx.ellipse(7, 13, size * 1.02, size * .72, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = "#34372d";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-size * .18, size * .18); ctx.lineTo(-size * .48, size * 1.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * .18, size * .18); ctx.lineTo(size * .48, size * 1.02); ctx.stroke();
    ctx.strokeStyle = "#77735a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-size * .48, size * 1.02); ctx.lineTo(-size * .66, size * 1.12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * .48, size * 1.02); ctx.lineTo(size * .66, size * 1.12); ctx.stroke();

    for (const side of [-1, 1]) {
      const wheelX = side * size * .62;
      ctx.fillStyle = "#171b17";
      ctx.beginPath(); ctx.arc(wheelX, size * .12, size * .34, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#626454"; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = "rgba(225,222,190,.28)"; ctx.lineWidth = 2;
      const spin = unit.distance / size * 3;
      for (let spoke = 0; spoke < 4; spoke++) {
        const angle = spin + spoke * Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(wheelX, size * .12); ctx.lineTo(wheelX + Math.cos(angle) * size * .22, size * .12 + Math.sin(angle) * size * .22); ctx.stroke();
      }
    }

    ctx.fillStyle = color;
    roundRect(ctx, -size * .46, -size * .28, size * .92, size * .62, 6); ctx.fill();
    ctx.strokeStyle = "rgba(20,24,18,.7)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fillRect(-size * .4, size * .19, size * .8, size * .16);
    ctx.fillStyle = "#353a2e";
    ctx.fillRect(-size * .23, size * .22, size * .46, size * .26);

    ctx.save();
    ctx.rotate(angleDelta(unit.heading, unit.turretAngle));
    const barrelLength = size * 1.82;
    ctx.fillStyle = "#2a3028";
    ctx.fillRect(-4, -barrelLength + recoil, 8, barrelLength + size * .08);
    ctx.fillStyle = color;
    ctx.fillRect(-7, -barrelLength + recoil, 14, 14);
    ctx.fillStyle = "#20251f";
    roundRect(ctx, -size * .25, -size * .18, size * .5, size * .5, 5); ctx.fill();

    ctx.fillStyle = isPlayer ? "#ada363" : "#b65e50";
    ctx.beginPath();
    ctx.moveTo(-size * .58, -size * .35);
    ctx.lineTo(size * .58, -size * .35);
    ctx.lineTo(size * .46, size * .12);
    ctx.lineTo(-size * .46, size * .12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(18,22,17,.65)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = isPlayer ? "#e2e987" : "#ff8377";
    ctx.save(); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();

    if (unit.flash > 0) {
      ctx.globalAlpha = unit.flash;
      ctx.fillStyle = "#fff0a2";
      ctx.beginPath(); ctx.arc(0, -barrelLength - 5 + recoil, 15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    drawUnitStatus(unit, "FA", 64);
  }

  function drawAPC(unit) {
    const isPlayer = unit.team === "player";
    const accent = isPlayer ? "#9eb779" : "#b85d50";
    const size = TYPES.apc.size;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.heading);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath(); ctx.ellipse(5, 8, size * .88, size * .82, 0, 0, Math.PI * 2); ctx.fill();
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#171d18";
      roundRect(ctx, side * size * .55 - 8, -size * .67, 16, size * 1.36, 7); ctx.fill();
      ctx.fillStyle = "#697160";
      for (let wheel = -2; wheel <= 2; wheel++) {
        ctx.beginPath(); ctx.arc(side * size * .55, wheel * size * .25, 5.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    const hull = ctx.createLinearGradient(0, -size * .7, 0, size * .65);
    hull.addColorStop(0, unit.hitFlash > 0 ? "#efe6cf" : accent);
    hull.addColorStop(1, isPlayer ? "#3b5138" : "#5a2d29");
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(-size * .45, -size * .72); ctx.lineTo(size * .45, -size * .72);
    ctx.lineTo(size * .64, -size * .35); ctx.lineTo(size * .62, size * .62);
    ctx.lineTo(-size * .62, size * .62); ctx.lineTo(-size * .64, -size * .35); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#202820"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(20,27,21,.32)"; ctx.fillRect(-size * .44, -size * .06, size * .88, size * .29);
    ctx.strokeStyle = "rgba(230,237,210,.2)"; ctx.strokeRect(-size * .44, -size * .06, size * .88, size * .29);
    ctx.fillStyle = isPlayer ? "#e4ef9a" : "#ff9a82";
    ctx.beginPath(); ctx.arc(-size * .34, -size * .55, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * .34, -size * .55, 3, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(0, size * .62);
    ctx.rotate(unit.doorOpen * .9);
    ctx.fillStyle = "#252e27"; ctx.fillRect(-size * .38, -5, size * .76, 10);
    ctx.strokeStyle = accent; ctx.strokeRect(-size * .38, -5, size * .76, 10);
    ctx.restore();

    ctx.save();
    ctx.rotate(angleDelta(unit.heading, unit.turretAngle));
    ctx.fillStyle = "#263029"; ctx.beginPath(); ctx.arc(0, -size * .12, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1b221c"; ctx.fillRect(-2, -size * .68 + unit.recoil * 4, 4, size * .56);
    if (unit.flash > 0) {
      ctx.globalAlpha = unit.flash; ctx.fillStyle = "#fff3a8";
      ctx.beginPath(); ctx.arc(0, -size * .72, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    drawUnitStatus(unit, unit.infantryReleased ? "APC✓" : "APC·2", 64);
  }

  function drawInfantry(unit) {
    const isPlayer = unit.team === "player";
    const accent = isPlayer ? "#b7cf83" : "#cf6c5e";
    const step = Math.sin(unit.distance * .35) * 4;
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.heading);
    ctx.fillStyle = "rgba(0,0,0,.36)";
    ctx.beginPath(); ctx.ellipse(3, 7, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#263029"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-4, 5); ctx.lineTo(-6 - step, 14); ctx.moveTo(4, 5); ctx.lineTo(6 + step, 14); ctx.stroke();
    ctx.fillStyle = unit.hitFlash > 0 ? "#efe7d1" : accent;
    ctx.beginPath(); ctx.ellipse(0, 1, 9, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#303a30"; ctx.beginPath(); ctx.arc(0, -10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.rotate(angleDelta(unit.heading, unit.turretAngle));
    ctx.strokeStyle = "#1d241e"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -23); ctx.stroke();
    if (unit.flash > 0) {
      ctx.globalAlpha = unit.flash; ctx.fillStyle = "#fff1a1";
      ctx.beginPath(); ctx.arc(0, -26, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    drawUnitStatus(unit, "INF", 38);
  }

  function drawRocketArtillery(unit) {
    const isPlayer = unit.team === "player";
    const body = unit.hitFlash > 0 ? "#f1ead1" : isPlayer ? "#667348" : "#81453b";
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.heading);
    ctx.fillStyle = "rgba(0,0,0,.44)";
    ctx.beginPath(); ctx.ellipse(8, 13, 44, 48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#151a16";
    roundRect(ctx, -31, -38, 12, 76, 6); ctx.fill();
    roundRect(ctx, 19, -38, 12, 76, 6); ctx.fill();
    ctx.fillStyle = body;
    roundRect(ctx, -24, -35, 48, 70, 9); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fillRect(-20, 12, 40, 20);
    ctx.fillStyle = isPlayer ? "#3c4932" : "#512b27";
    roundRect(ctx, -18, 11, 36, 22, 5); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.turretAngle);
    ctx.fillStyle = "#2b3028";
    roundRect(ctx, -23, -27, 46, 48, 5); ctx.fill();
    ctx.strokeStyle = "#0d110e"; ctx.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      for (const side of [-1, 1]) {
        const x = side * 10;
        const y = -21 + row * 12;
        ctx.fillStyle = "#171c18";
        roundRect(ctx, x - 6, y - 14, 12, 31, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#59614e";
        ctx.beginPath(); ctx.ellipse(x, y - 13, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (unit.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(255,220,116,${unit.flash})`;
      ctx.beginPath(); ctx.arc((unit.shots ?? 0) % 2 ? 10 : -10, -42, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    drawUnitStatus(unit, "MLRS", 56);
  }

  function drawTank(unit) {
    if (unit.type === "apc") {
      drawAPC(unit);
      return;
    }
    if (unit.type === "infantry") {
      drawInfantry(unit);
      return;
    }
    if (unit.type === "artillery") {
      drawFieldArtillery(unit);
      return;
    }
    if (unit.type === "rocket") {
      drawRocketArtillery(unit);
      return;
    }
    const stats = TYPES[unit.type];
    const isPlayer = unit.team === "player";
    const heavy = unit.type === "heavy";
    const medium = unit.type === "medium";
    const size = stats.size;
    const trackLength = size * 1.62;
    const trackWidth = size * (heavy ? .31 : .28);
    const trackOffset = size * .57;
    const bodyColor = isPlayer ? stats.color : heavy ? "#8e453e" : medium ? "#9d4a42" : "#a75147";
    ctx.save();
    ctx.translate(unit.x, unit.y);
    ctx.rotate(unit.heading);
    const recoil = unit.recoil * 7;

    ctx.fillStyle = "rgba(0,0,0,.48)";
    ctx.beginPath(); ctx.ellipse(8, 14, size * 1.04, size * .9, 0, 0, Math.PI * 2); ctx.fill();

    const lowerHull = ctx.createLinearGradient(0, size * .02, 0, size * .78);
    lowerHull.addColorStop(0, isPlayer ? "rgba(66,82,45,.9)" : "rgba(86,43,38,.9)");
    lowerHull.addColorStop(1, "rgba(13,18,14,.92)");
    ctx.fillStyle = lowerHull;
    ctx.beginPath();
    ctx.moveTo(-size * .58, -size * .08);
    ctx.lineTo(size * .58, -size * .08);
    ctx.lineTo(size * .72, size * .62);
    ctx.lineTo(size * .48, size * .8);
    ctx.lineTo(-size * .48, size * .8);
    ctx.lineTo(-size * .72, size * .62);
    ctx.closePath();
    ctx.fill();

    for (const side of [-1, 1]) {
      const trackX = side * trackOffset - trackWidth / 2;
      const trackGradient = ctx.createLinearGradient(trackX, 0, trackX + trackWidth, 0);
      trackGradient.addColorStop(0, "#101511");
      trackGradient.addColorStop(.48, "#353a32");
      trackGradient.addColorStop(1, "#111612");
      ctx.fillStyle = trackGradient;
      roundRect(ctx, trackX, -trackLength / 2, trackWidth, trackLength, trackWidth / 2); ctx.fill();
      ctx.strokeStyle = "#080b09"; ctx.lineWidth = 2; ctx.stroke();

      ctx.fillStyle = "#68705e";
      for (let wheel = 0; wheel < 5; wheel++) {
        const wheelY = -trackLength * .34 + wheel * trackLength * .17;
        ctx.beginPath(); ctx.arc(side * trackOffset, wheelY, trackWidth * .31, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#20251f"; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = "rgba(230,233,205,.18)"; ctx.lineWidth = 1;
        const spoke = unit.distance / Math.max(1, size) * 2 + wheel;
        ctx.beginPath();
        ctx.moveTo(side * trackOffset, wheelY);
        ctx.lineTo(side * trackOffset + Math.cos(spoke) * trackWidth * .25, wheelY + Math.sin(spoke) * trackWidth * .25);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(160,166,144,.32)";
      ctx.lineWidth = 2;
      const treadShift = unit.distance % 10;
      for (let treadY = -trackLength / 2 + treadShift; treadY < trackLength / 2; treadY += 10) {
        ctx.beginPath(); ctx.moveTo(trackX + 2, treadY); ctx.lineTo(trackX + trackWidth - 2, treadY); ctx.stroke();
      }
    }

    const hullGradient = ctx.createLinearGradient(0, -size * .7, 0, size * .62);
    hullGradient.addColorStop(0, unit.hitFlash > 0 ? "#f5eed4" : bodyColor);
    hullGradient.addColorStop(.55, unit.hitFlash > 0 ? "#d7d0b9" : bodyColor);
    hullGradient.addColorStop(1, isPlayer ? "#35412b" : "#4a2724");
    ctx.fillStyle = hullGradient;
    ctx.beginPath();
    if (heavy) {
      ctx.moveTo(-size * .58, -size * .68);
      ctx.lineTo(size * .58, -size * .68);
      ctx.lineTo(size * .68, -size * .38);
      ctx.lineTo(size * .64, size * .62);
      ctx.lineTo(-size * .64, size * .62);
      ctx.lineTo(-size * .68, -size * .38);
    } else if (medium) {
      ctx.moveTo(-size * .43, -size * .72);
      ctx.lineTo(size * .43, -size * .72);
      ctx.lineTo(size * .62, -size * .34);
      ctx.lineTo(size * .54, size * .58);
      ctx.lineTo(-size * .54, size * .58);
      ctx.lineTo(-size * .62, -size * .34);
    } else {
      ctx.moveTo(-size * .34, -size * .7);
      ctx.quadraticCurveTo(0, -size * .84, size * .34, -size * .7);
      ctx.lineTo(size * .53, -size * .28);
      ctx.lineTo(size * .45, size * .48);
      ctx.quadraticCurveTo(0, size * .62, -size * .45, size * .48);
      ctx.lineTo(-size * .53, -size * .28);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(10,15,11,.65)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,220,.08)";
    ctx.beginPath();
    ctx.moveTo(-size * .42, -size * .54);
    ctx.lineTo(size * .32, -size * .56);
    ctx.lineTo(size * .45, -size * .32);
    ctx.lineTo(-size * .32, -size * .28);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = .2;
    ctx.fillStyle = isPlayer ? "#17281b" : "#321d18";
    ctx.beginPath(); ctx.ellipse(-size * .2, -size * .42, size * .24, size * .12, -.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size * .28, size * .05, size * .2, size * .1, .62, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-size * .23, size * .36, size * .18, size * .08, .2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(225,224,190,.3)";
    for (const side of [-1, 1]) {
      for (const y of [-.42, .08, .42]) {
        ctx.beginPath(); ctx.arc(side * size * .43, y * size, 1.25, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.fillStyle = "rgba(12,17,13,.24)";
    ctx.fillRect(-size * .47, size * .28, size * .94, size * .22);
    ctx.strokeStyle = "rgba(215,222,190,.2)"; ctx.lineWidth = 1;
    for (let grille = -2; grille <= 2; grille++) {
      ctx.beginPath(); ctx.moveTo(grille * size * .16, size * .3); ctx.lineTo(grille * size * .16, size * .47); ctx.stroke();
    }
    ctx.fillStyle = isPlayer ? "#d8e983" : "#ffd2a0";
    ctx.beginPath(); ctx.arc(-size * .37, -size * .57, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(size * .37, -size * .57, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(18,24,18,.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-size * .42, -size * .18); ctx.lineTo(size * .42, -size * .18); ctx.stroke();

    if (heavy) {
      ctx.fillStyle = "rgba(18,23,18,.3)";
      ctx.fillRect(-size * .65, -size * .17, size * .14, size * .58);
      ctx.fillRect(size * .51, -size * .17, size * .14, size * .58);
      ctx.fillStyle = "rgba(225,224,190,.28)";
      for (const side of [-1, 1]) {
        for (let bolt = 0; bolt < 3; bolt++) {
          ctx.beginPath(); ctx.arc(side * size * .58, bolt * size * .2 - size * .05, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (!medium) {
      ctx.strokeStyle = "rgba(225,232,196,.28)";
      ctx.beginPath(); ctx.moveTo(-size * .28, size * .33); ctx.lineTo(size * .28, size * .33); ctx.stroke();
      ctx.fillStyle = "#252d25";
      ctx.fillRect(-size * .18, size * .4, size * .36, size * .1);
    }

    ctx.fillStyle = isPlayer ? "#d7eb78" : "#ff776b";
    ctx.save(); ctx.translate(-size * .37, size * .05); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();

    ctx.save();
    ctx.rotate(angleDelta(unit.heading, unit.turretAngle));
    const barrelLength = size * (heavy ? 1.28 : medium ? 1.17 : 1.07);
    const barrelWidth = heavy ? 9 : medium ? 7 : 6;
    ctx.fillStyle = "#252d26";
    ctx.fillRect(-barrelWidth / 2, -barrelLength + recoil, barrelWidth, barrelLength - size * .02);
    ctx.fillStyle = "rgba(255,255,230,.13)";
    ctx.fillRect(-barrelWidth / 2 + 1, -barrelLength + recoil + 3, Math.max(1, barrelWidth * .24), barrelLength - size * .1);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-barrelWidth * .82, -barrelLength + recoil, barrelWidth * 1.64, heavy ? 13 : 9);

    const turretGradient = ctx.createLinearGradient(-size * .42, -size * .25, size * .42, size * .28);
    turretGradient.addColorStop(0, isPlayer ? "#b7c969" : "#c3675d");
    turretGradient.addColorStop(1, isPlayer ? "#586738" : "#71352f");
    ctx.fillStyle = turretGradient;
    ctx.beginPath();
    if (heavy) {
      ctx.moveTo(-size * .45, -size * .4);
      ctx.lineTo(size * .45, -size * .4);
      ctx.lineTo(size * .5, size * .18);
      ctx.lineTo(size * .28, size * .34);
      ctx.lineTo(-size * .28, size * .34);
      ctx.lineTo(-size * .5, size * .18);
    } else if (medium) {
      ctx.moveTo(-size * .32, -size * .38);
      ctx.quadraticCurveTo(0, -size * .53, size * .32, -size * .38);
      ctx.lineTo(size * .43, size * .12);
      ctx.quadraticCurveTo(0, size * .38, -size * .43, size * .12);
    } else {
      ctx.arc(0, -size * .03, size * .37, 0, Math.PI * 2);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(14,20,15,.6)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(size * .08, size * .18, size * .28, size * .11, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#30392e";
    ctx.beginPath(); ctx.ellipse(0, -size * .08, size * .19, size * .15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(220,226,194,.22)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = isPlayer ? "#d8ef79" : "#ff7569";
    ctx.beginPath(); ctx.arc(0, -size * .08, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1b211b"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(size * .24, 0); ctx.lineTo(size * .39, size * .48); ctx.stroke();

    if (heavy) {
      ctx.fillStyle = "#1c231d";
      ctx.fillRect(size * .18, -size * .38, size * .18, size * .22);
      ctx.strokeStyle = "#202620"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(size * .27, -size * .38); ctx.lineTo(size * .42, -size * .72); ctx.stroke();
    } else if (!medium) {
      ctx.strokeStyle = "#202620"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(size * .2, -size * .2); ctx.lineTo(size * .45, -size * .83); ctx.stroke();
    }

    if (unit.flash > 0) {
      ctx.globalAlpha = unit.flash;
      ctx.fillStyle = "#fff1a8";
      ctx.beginPath(); ctx.arc(0, -barrelLength - 3 + recoil, heavy ? 14 : medium ? 12 : 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (heavy) {
      ctx.save();
      ctx.rotate(angleDelta(unit.heading, unit.aaAngle));
      for (const gun of unit.aaGuns) {
        const gunX = gun.side * size * .36;
        ctx.fillStyle = isPlayer ? "#9caf5c" : "#ad574d";
        roundRect(ctx, gunX - 7, -size * .2, 14, 16, 3); ctx.fill();
        ctx.fillStyle = "#1e251f";
        ctx.fillRect(gunX - 2, -size * .68, 4, size * .5);
        ctx.fillStyle = isPlayer ? "#d8ef79" : "#ff796e";
        ctx.fillRect(gunX - 4, -size * .69, 8, 5);
        if (gun.flash > 0) {
          ctx.globalAlpha = gun.flash;
          ctx.fillStyle = "#fff1a1";
          ctx.beginPath(); ctx.arc(gunX, -size * .75, 6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }
    ctx.restore();

    drawUnitStatus(unit, heavy ? "HT/AA" : medium ? "MT" : "LT", heavy ? 70 : medium ? 64 : 58);
  }

  function drawUnitStatus(unit, label, barW) {
    const size = TYPES[unit.type].size;
    const isPlayer = unit.team === "player";
    const ratio = unit.hp / unit.maxHp;
    ctx.fillStyle = "rgba(3,7,5,.7)"; ctx.fillRect(unit.x - barW / 2, unit.y + size + 10, barW, 5);
    ctx.fillStyle = ratio > .45 ? (isPlayer ? "#cde86b" : "#ed6659") : "#f1a651";
    ctx.fillRect(unit.x - barW / 2, unit.y + size + 10, barW * ratio, 5);
    const labelWidth = label.length > 3 ? 36 : 24;
    ctx.fillStyle = "rgba(8,13,10,.72)";
    ctx.fillRect(unit.x - labelWidth / 2, unit.y - size - 19, labelWidth, 13);
    ctx.fillStyle = isPlayer ? "#d9ef7e" : "#ff8075";
    ctx.font = "700 9px Rajdhani"; ctx.textAlign = "center";
    ctx.fillText(label, unit.x, unit.y - size - 10);
  }

  function drawWreck(w) {
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.rotation); ctx.globalAlpha = Math.min(.62, w.life / 2);
    if (w.type === "helicopter") {
      ctx.fillStyle = "#20261f";
      ctx.beginPath(); ctx.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#151a16"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-43, -31); ctx.lineTo(39, 34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-38, 30); ctx.lineTo(45, -27); ctx.stroke();
      ctx.strokeStyle = "#343c31"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(9, 12); ctx.lineTo(25, 54); ctx.stroke();
      ctx.restore();
      return;
    }
    if (w.type === "artillery") {
      ctx.fillStyle = "#171b17";
      ctx.beginPath(); ctx.arc(-21, 2, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(21, 2, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#34382f"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(28, -38); ctx.stroke();
      ctx.strokeStyle = "#22271f"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-7, 8); ctx.lineTo(-21, 39); ctx.moveTo(7, 8); ctx.lineTo(24, 37); ctx.stroke();
      ctx.restore();
      return;
    }
    if (w.type === "infantry") {
      ctx.fillStyle = "#222820";
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, .4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#151a16"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(15, -9); ctx.stroke();
      ctx.restore();
      return;
    }
    if (w.type === "apc") {
      ctx.fillStyle = "#121712"; ctx.fillRect(-27, -34, 11, 68); ctx.fillRect(16, -34, 11, 68);
      ctx.fillStyle = "#293128"; ctx.fillRect(-23, -31, 46, 62);
      ctx.strokeStyle = "#151a16"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-24, -25); ctx.lineTo(25, 29); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = "#111511"; ctx.fillRect(-28, -34, 12, 68); ctx.fillRect(16, -34, 12, 68);
    ctx.fillStyle = "#232820"; ctx.fillRect(-22, -31, 44, 62);
    ctx.fillStyle = "#323329"; ctx.beginPath(); ctx.arc(0, -4, w.type === "heavy" ? 19 : w.type === "medium" ? 17 : 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#0d100d"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-24, -30); ctx.lineTo(25, 32); ctx.stroke();
    ctx.strokeStyle = "rgba(142,113,76,.45)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(15, -7); ctx.lineTo(38, -27); ctx.stroke();
    ctx.restore();
  }

  function drawProjectile(p) {
    ctx.save();
    const friendly = p.team === "player";
    const glow = friendly ? "#e8f77f" : "#ff715f";
    const t = p.progress ?? 0;
    const tangentX = p.tx - p.startX;
    const tangentY = p.ty - p.startY - Math.PI * p.arcHeight * Math.cos(Math.PI * t);
    const length = Math.max(1, Math.hypot(tangentX, tangentY));
    const ux = tangentX / length;
    const uy = tangentY / length;
    const trail = p.bullet ? 24 : p.rocket ? 64 : p.artillery ? 56 : p.heavy ? 42 : 32;
    const tailX = p.x - ux * trail;
    const tailY = p.y - uy * trail;

    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = glow;
    ctx.shadowBlur = p.bullet ? 8 : p.rocket ? 26 : p.artillery ? 22 : 14;
    const gradient = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
    gradient.addColorStop(0, "rgba(255,250,215,1)");
    gradient.addColorStop(.25, friendly ? "rgba(224,244,116,.92)" : "rgba(255,105,82,.92)");
    gradient.addColorStop(1, "rgba(255,100,60,0)");
    ctx.strokeStyle = gradient;
    ctx.lineCap = "round";
    ctx.lineWidth = p.bullet ? 1.7 : p.rocket ? 5.2 : p.artillery ? 6 : p.heavy ? 4.5 : 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tailX, tailY); ctx.stroke();

    if (p.artillery || p.rocket) {
      ctx.fillStyle = friendly ? "rgba(224,244,116,.22)" : "rgba(255,102,79,.24)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.rocket ? 8 : 10, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#fffbe4";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.bullet ? 1.8 : p.rocket ? 4.2 : p.artillery ? 4.8 : p.heavy ? 3.8 : 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawParticle(p) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = p.smoke ? alpha * .48 : alpha;
    if (p.flash) {
      ctx.globalCompositeOperation = "lighter";
      const radius = Math.max(1, p.size * (1.25 - alpha * .2));
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      glow.addColorStop(0, "rgba(255,255,240,1)");
      glow.addColorStop(.28, p.color);
      glow.addColorStop(1, "rgba(255,120,45,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
    } else if (p.ring) {
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = p.color; ctx.lineWidth = (p.ringWidth ?? 4) * alpha;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (2 - alpha), 0, Math.PI * 2); ctx.stroke();
    } else if (p.streak) {
      const speed = Math.max(1, Math.hypot(p.vx, p.vy));
      const streakLength = Math.min(18, Math.max(4, speed * .09));
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(.8, p.size * .75); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / speed * streakLength, p.y - p.vy / speed * streakLength); ctx.stroke();
    } else if (p.smoke) {
      const smoke = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, p.size));
      smoke.addColorStop(0, p.color); smoke.addColorStop(.65, p.color); smoke.addColorStop(1, "rgba(40,43,37,0)");
      ctx.fillStyle = smoke; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    } else if (p.debris) {
      ctx.translate(p.x, p.y); ctx.rotate((p.vx + p.vy) * .01);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size * .45, p.size * 2, p.size * .9);
    } else {
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawFloater(f) {
    ctx.save(); ctx.globalAlpha = f.life / f.maxLife;
    ctx.fillStyle = f.team === "player" ? "#e0f486" : "#ff8a7f";
    ctx.font = "800 15px Rajdhani"; ctx.textAlign = "center"; ctx.fillText(f.text, f.x, f.y); ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  function renderMinimap() {
    const mw = minimap.width, mh = minimap.height;
    mctx.fillStyle = "#202b23"; mctx.fillRect(0, 0, mw, mh);
    mctx.strokeStyle = "rgba(255,255,255,.06)"; mctx.lineWidth = 1;
    for (const lane of LANES) {
      const x = lane / W * mw;
      mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, mh); mctx.stroke();
    }
    mctx.fillStyle = "rgba(241,91,76,.16)"; mctx.fillRect(0, 0, mw, 48);
    mctx.fillStyle = "rgba(205,232,107,.13)"; mctx.fillRect(0, mh - 48, mw, 48);
    if (HAS_RIVER) {
      mctx.fillStyle = "rgba(47,126,137,.65)";
      mctx.fillRect(0, RIVER_TOP / H * mh, mw, (RIVER_BOTTOM - RIVER_TOP) / H * mh);
      mctx.fillStyle = "#aaa58b";
      for (const bridgeX of BRIDGES) {
        mctx.fillRect((bridgeX - BRIDGE_WIDTH / 2) / W * mw, (RIVER_TOP - 38) / H * mh, BRIDGE_WIDTH / W * mw, (RIVER_BOTTOM - RIVER_TOP + 76) / H * mh);
      }
    }
    mctx.fillStyle = "#f15b4c"; mctx.fillRect(20, 12, mw - 40, 7);
    mctx.fillStyle = "#cde86b"; mctx.fillRect(20, mh - 19, mw - 40, 7);
    for (const hq of [state.enemyHQ, state.playerHQ]) {
      if (!hq.warehouse.dead) {
        mctx.fillStyle = hq.team === "player" ? "#d8bd72" : "#dc8068";
        mctx.fillRect(hq.warehouse.x / W * mw - 3, hq.warehouse.y / H * mh - 3, 6, 6);
      }
      for (const tower of hq.machineGuns) {
        if (tower.dead) continue;
        mctx.fillStyle = tower.team === "player" ? "#b8df73" : "#ef7468";
        mctx.fillRect(tower.x / W * mw - 2, tower.y / H * mh - 2, 4, 4);
      }
    }
    for (const fortification of state.fortifications) {
      if (fortification.dead) continue;
      const x = fortification.x / W * mw;
      const y = fortification.y / H * mh;
      mctx.fillStyle = fortification.team === "player"
        ? (fortification.completed ? "#d5ed75" : "rgba(213,237,117,.45)")
        : (fortification.completed ? "#ff665a" : "rgba(255,102,90,.45)");
      if (fortification.type === "bunker") mctx.fillRect(x - 3, y - 3, 6, 6);
      else { mctx.beginPath(); mctx.arc(x, y, 2.5, 0, Math.PI * 2); mctx.fill(); }
    }
    for (const unit of state.units) {
      mctx.fillStyle = unit.type === "helicopter" ? (unit.team === "player" ? "#8ee9ff" : "#ff9b89") : unit.team === "player" ? "#d5ed75" : "#ff665a";
      const x = unit.x / W * mw, y = unit.y / H * mh;
      const r = unit.type === "helicopter" ? 4 : unit.type === "heavy" ? 3.5 : unit.type === "rocket" ? 3.4 : unit.type === "apc" ? 3.3 : unit.type === "artillery" ? 3.2 : unit.type === "medium" ? 3 : unit.type === "infantry" ? 1.8 : 2.5;
      mctx.beginPath(); mctx.arc(x, y, r, 0, Math.PI * 2); mctx.fill();
      if (unit.id === state.selectedUnitId) {
        mctx.strokeStyle = "#8eefff"; mctx.lineWidth = 1.5;
        mctx.beginPath(); mctx.arc(x, y, r + 3, 0, Math.PI * 2); mctx.stroke();
      }
    }
    updateCameraBox();
  }

  function updateHud(force = false) {
    const now = performance.now();
    if (!force && now - lastHudUpdate < 90) return;
    lastHudUpdate = now;
    const cp = state.playerCP;
    el.cpValue.textContent = cp;
    [...el.cpPips.children].forEach((pip, index) => {
      pip.classList.toggle("active", index < cp);
      pip.classList.toggle("filling", index === cp && cp < CP_MAX);
      if (index === cp) pip.style.setProperty("--fill", `${state.playerCPProgress / CP_INTERVAL * 100}%`);
    });
    el.battleTime.textContent = formatTime(state.time);
    el.playerHqBar.style.width = `${state.playerHQ.hp / MAX_HQ_HP * 100}%`;
    el.enemyHqBar.style.width = `${state.enemyHQ.hp / MAX_HQ_HP * 100}%`;
    el.playerHqHp.textContent = Math.ceil(state.playerHQ.hp);
    el.enemyHqHp.textContent = Math.ceil(state.enemyHQ.hp);
    const allies = state.units.filter(u => u.team === "player").length;
    const enemies = state.units.filter(u => u.team === "enemy").length;
    el.allyCount.textContent = allies;
    el.enemyCount.textContent = enemies;
    el.warehouseStatus.textContent = state.playerHQ.warehouse.dead ? "仓库已摧毁 · 额外补给中断" : `仓库补给 +1 / ${WAREHOUSE_CP_INTERVAL.toFixed(1)}秒`;
    el.warehouseStatus.classList.toggle("destroyed", state.playerHQ.warehouse.dead);
    canvas.dataset.playerCannonLocks = state.playerHQ.cannons.map(cannon => cannon.targetId ?? "").join(",");
    canvas.dataset.enemyCannonLocks = state.enemyHQ.cannons.map(cannon => cannon.targetId ?? "").join(",");
    canvas.dataset.playerCannonShots = state.playerHQ.cannons.map(cannon => cannon.shots).join(",");
    canvas.dataset.enemyCannonShots = state.enemyHQ.cannons.map(cannon => cannon.shots).join(",");
    canvas.dataset.aiTelemetry = JSON.stringify({
      difficulty: state.difficulty,
      difficultyName: DIFFICULTIES[state.difficulty].name,
      enemyCPInterval: DIFFICULTIES[state.difficulty].enemyCPInterval,
      cooldownMin: DIFFICULTIES[state.difficulty].cooldownMin,
      cooldownMax: DIFFICULTIES[state.difficulty].cooldownMax,
      aiSpawned: state.aiSpawned,
      aiFortificationsBuilt: state.aiFortificationsBuilt,
      enemyCP: state.enemyCP,
      warehouseAlive: !state.enemyHQ.warehouse.dead,
      artilleryRange: TYPES.artillery.range,
      rocketRange: TYPES.rocket.range,
      composition: Object.fromEntries(Object.keys(TYPES).map(type => [type, state.units.filter(unit => unit.team === "enemy" && unit.type === type).length]))
    });
    const manualUnit = getSelectedUnit();
    canvas.dataset.commandTelemetry = JSON.stringify({
      order: state.battleOrder,
      selectedUnitId: state.selectedUnitId,
      manualDodges: state.manualDodges,
      selected: manualUnit ? { id: manualUnit.id, type: manualUnit.type, x: Math.round(manualUnit.x), y: Math.round(manualUnit.y), moving: manualUnit.moving } : null
    });
    canvas.dataset.mapTelemetry = JSON.stringify({ map: state.map, name: MAPS[state.map].name, height: H, river: HAS_RIVER, riverTop: RIVER_TOP, riverBottom: RIVER_BOTTOM, bridges: BRIDGES });
    canvas.dataset.warehouseTelemetry = JSON.stringify([state.playerHQ.warehouse, state.enemyHQ.warehouse].map(warehouse => ({
      id: warehouse.id,
      team: warehouse.team,
      hp: warehouse.hp,
      dead: warehouse.dead,
      bonusInterval: WAREHOUSE_CP_INTERVAL
    })));
    canvas.dataset.resourceTelemetry = JSON.stringify({ playerCP: state.playerCP, enemyCP: state.enemyCP, max: CP_MAX, interval: CP_INTERVAL, warehouseInterval: WAREHOUSE_CP_INTERVAL });
    canvas.dataset.fortificationTelemetry = JSON.stringify(state.fortifications.map(fortification => ({
      id: fortification.id,
      team: fortification.team,
      type: fortification.type,
      x: Math.round(fortification.x),
      y: Math.round(fortification.y),
      hp: fortification.hp,
      completed: fortification.completed,
      progress: Math.round(fortification.buildProgress / fortification.buildTime * 100),
      shots: fortification.shots,
      targetId: fortification.targetId,
      dead: fortification.dead
    })));
    canvas.dataset.unitTelemetry = JSON.stringify(state.units.slice(0, 16).map(unit => ({
      id: unit.id,
      team: unit.team,
      type: unit.type,
      air: unit.air,
      bridge: unit.bridge,
      stage: unit.pathStage,
      x: Math.round(unit.x),
      y: Math.round(unit.y),
      selected: unit.id === state.selectedUnitId,
      shots: unit.shots ?? 0,
      infantryReleased: unit.infantryReleased,
      doorOpen: Math.round((unit.doorOpen ?? 0) * 100) / 100,
      carrierId: unit.carrierId ?? null,
      target: unit.currentTarget ?? null,
      aaShots: unit.aaGuns?.reduce((sum, gun) => sum + gun.shots, 0) ?? 0
    })));
    canvas.dataset.towerTelemetry = JSON.stringify([state.playerHQ, state.enemyHQ].flatMap(hq => hq.machineGuns.map(tower => ({
      id: tower.id,
      team: tower.team,
      hp: tower.hp,
      dead: tower.dead,
      shots: tower.shots,
      targetId: tower.targetId
    }))));
    canvas.dataset.projectileTelemetry = JSON.stringify(state.projectiles.slice(0, 12).map(projectile => ({
      team: projectile.team,
      sourceType: projectile.sourceType,
      bullet: projectile.bullet,
      artillery: projectile.artillery,
      rocket: projectile.rocket,
      x: Math.round(projectile.x),
      y: Math.round(projectile.y),
      targetX: Math.round(projectile.tx),
      targetY: Math.round(projectile.ty)
    }))); 
    const cockpitActive = Boolean(state.cockpitMode && manualUnit && !manualUnit.dead);
    el.cockpitOverlay?.classList.toggle("active", cockpitActive);
    viewport.classList.toggle("cockpit-active", cockpitActive);
    if (cockpitActive) {
      const stats = TYPES[manualUnit.type];
      const weaponName = manualUnit.type === "helicopter" ? "航空机枪 · 可越河突击" :
        manualUnit.type === "rocket" ? "火箭齐射 · 慢装填" :
        manualUnit.type === "artillery" ? "野战炮 · 远距支援" :
        stats.bullet ? "机枪连射" :
        manualUnit.type === "heavy" ? "重坦主炮 + 双联防空" : "坦克主炮";
      const reloadRatio = clamp(1 - (manualUnit.reload ?? 0) / Math.max(.1, stats.fireRate), 0, 1);
      el.cockpitUnit.textContent = `${stats.name} #${manualUnit.id}`;
      el.cockpitWeapon.textContent = `${weaponName} · 左键按住开火`;
      el.cockpitReload.style.width = `${reloadRatio * 100}%`;
      el.cockpitReload.style.background = reloadRatio >= .96 ? "linear-gradient(90deg,#9fffc3,#f3d36c)" : "linear-gradient(90deg,#f0634e,#f0a750)";
      el.cockpitOverlay.style.setProperty("--aim-pulse", state.manualAimPulse.toFixed(2));
    } else if (el.cockpitReload) {
      el.cockpitReload.style.width = "0%";
    }
    el.unitCards.forEach(card => card.classList.toggle("unaffordable", cp < TYPES[card.dataset.unit].cost));
    el.fortificationCards.forEach(card => card.classList.toggle("unaffordable", cp < FORTIFICATION_TYPES[card.dataset.fortification].cost));
  }

  function updateCameraBox() {
    const ratioTop = viewport.scrollTop / viewport.scrollHeight;
    const ratioHeight = viewport.clientHeight / viewport.scrollHeight;
    const wrapHeight = document.querySelector("#minimap-wrap").clientHeight;
    el.minimapCamera.style.top = `${ratioTop * wrapHeight}px`;
    el.minimapCamera.style.height = `${Math.max(18, ratioHeight * wrapHeight)}px`;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  function addLog(message, type = "") {
    const row = document.createElement("div");
    row.className = `event-item ${type}`;
    row.innerHTML = `<time>${formatTime(state.time)}</time><b>${message}</b>`;
    el.eventLog.prepend(row);
    while (el.eventLog.children.length > 8) el.eventLog.lastElementChild.remove();
  }

  function toast(message, isError = false, duration = 1700) {
    clearTimeout(toastTimeout);
    el.toast.textContent = message;
    el.toast.classList.toggle("error", isError);
    el.toast.classList.add("show");
    toastTimeout = setTimeout(() => el.toast.classList.remove("show"), duration);
  }

  function togglePause() {
    if (!state.started || state.ended) return;
    state.paused = !state.paused;
    document.body.classList.toggle("paused", state.paused);
    el.pauseButton.classList.toggle("active", state.paused);
    toast(state.paused ? "战斗已暂停" : "战斗继续");
  }

  function focusFront() {
    const all = state.units;
    let y = H / 2;
    let x = W / 2;
    if (all.length) {
      const allyFront = state.units.filter(u => u.team === "player").sort((a, b) => a.y - b.y)[0];
      const enemyFront = state.units.filter(u => u.team === "enemy").sort((a, b) => b.y - a.y)[0];
      if (allyFront && enemyFront) {
        y = (allyFront.y + enemyFront.y) / 2;
        x = (allyFront.x + enemyFront.x) / 2;
      } else {
        const front = allyFront || enemyFront;
        y = front.y;
        x = front.x;
      }
    }
    const scale = viewport.scrollHeight / H;
    const xScale = canvas.clientWidth / W;
    viewport.scrollTo({ top: y * scale - viewport.clientHeight / 2, left: x * xScale - viewport.clientWidth / 2, behavior: "smooth" });
  }

  function selectManualUnitAt(clientX, clientY) {
    if (!state.started || state.paused || state.ended) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * W;
    const y = (clientY - rect.top) / rect.height * H;
    let selected = null;
    let bestDistance = Infinity;
    for (const unit of state.units) {
      if (unit.team !== "player" || unit.dead) continue;
      const distance = Math.hypot(unit.x - x, unit.y - y);
      const hitRadius = TYPES[unit.type].size * 1.05 + 14;
      if (distance <= hitRadius && distance < bestDistance) {
        selected = unit;
        bestDistance = distance;
      }
    }
    if (selected) selectManualUnit(selected);
    else clearManualSelection();
  }

  function beginFortificationDrag(event) {
    const card = event.currentTarget;
    const type = card.dataset.fortification;
    const stats = FORTIFICATION_TYPES[type];
    if (!stats) return;
    event.preventDefault();
    if (!state.started) { toast("请先开始战斗", true); return; }
    if (state.paused || state.ended) return;
    if (state.playerCP < stats.cost) { toast(`指挥点不足：${stats.name}需要 ${stats.cost} 点`, true); return; }
    cancelFortificationDrag();
    const ghost = card.cloneNode(true);
    ghost.classList.add("fortification-drag-ghost");
    ghost.removeAttribute("data-fortification");
    document.body.appendChild(ghost);
    card.classList.add("dragging");
    fortificationDrag = { type, source: card, ghost };
    updateFortificationDrag(event);
  }

  function updateFortificationDrag(event) {
    if (!fortificationDrag) return;
    const { ghost, type } = fortificationDrag;
    ghost.style.left = `${event.clientX}px`;
    ghost.style.top = `${event.clientY}px`;
    const canvasRect = canvas.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const inside = event.clientX >= canvasRect.left && event.clientX <= canvasRect.right && event.clientY >= viewportRect.top && event.clientY <= viewportRect.bottom;
    if (!inside) {
      state.placementPreview = null;
      ghost.classList.remove("valid");
      ghost.classList.add("invalid");
      return;
    }
    const x = (event.clientX - canvasRect.left) / canvasRect.width * W;
    const y = (event.clientY - canvasRect.top) / canvasRect.height * H;
    const placement = validateFortificationPlacement(type, x, y);
    state.placementPreview = { type, x, y, ...placement };
    ghost.classList.toggle("valid", placement.valid);
    ghost.classList.toggle("invalid", !placement.valid);
  }

  function finishFortificationDrag(event) {
    if (!fortificationDrag) return;
    updateFortificationDrag(event);
    const preview = state.placementPreview;
    if (preview?.valid) placeFortification(preview.type, preview.x, preview.y);
    else if (preview) toast(preview.reason, true);
    cancelFortificationDrag();
  }

  function cancelFortificationDrag() {
    if (fortificationDrag) {
      fortificationDrag.source?.classList.remove("dragging");
      fortificationDrag.ghost?.remove();
    }
    fortificationDrag = null;
    if (state) state.placementPreview = null;
  }

  function loop(now) {
    try {
      const dt = Math.min(.05, (now - lastTime) / 1000);
      lastTime = now;
      update(dt);
      render();
      updateHud();
      requestAnimationFrame(loop);
    } catch (error) {
      document.documentElement.dataset.gameError = `${error.name}: ${error.message}`;
      console.error(error);
    }
  }

  el.enterCommandButton.addEventListener("click", enterCommandCenter);
  el.startButton.addEventListener("click", beginGame);
  el.destructionPrompt.addEventListener("click", revealBattleResult);
  el.resultMenuButton.addEventListener("click", returnToMainMenu);
  el.returnMenuButton.addEventListener("click", returnToMainMenu);
  el.difficultyButtons.forEach(button => button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty)));
  el.mapButtons.forEach(button => button.addEventListener("click", () => selectMap(button.dataset.map)));
  el.orderButtons.forEach(button => button.addEventListener("click", () => setBattleOrder(button.dataset.order)));
  el.fortificationCards.forEach(card => card.addEventListener("pointerdown", beginFortificationDrag));
  window.addEventListener("pointermove", updateFortificationDrag);
  window.addEventListener("pointerup", finishFortificationDrag);
  window.addEventListener("pointercancel", cancelFortificationDrag);
  el.restartButton.addEventListener("click", () => {
    resetGame();
    state.started = true;
    state.running = false;
    document.body.classList.remove("menu-open");
    initAudio();
    addLog("新一轮战斗即将开始", "ally");
    startBattleIntro();
  });
  el.unitCards.forEach(card => card.addEventListener("click", () => selectUnit(card.dataset.unit)));
  el.laneButtons.forEach(button => button.addEventListener("click", () => {
    if (!state.started) { toast("请先开始战斗", true); return; }
    if (state.paused || state.ended) return;
    deploy("player", state.selected, Number(button.dataset.lane));
  }));
  el.pauseButton.addEventListener("click", togglePause);
  el.soundButton.addEventListener("click", () => {
    state.sound = !state.sound;
    el.soundButton.classList.toggle("muted", !state.sound);
    toast(state.sound ? "声音已开启" : "声音已关闭");
    if (state.sound) { initAudio(); sound("deploy"); }
  });
  el.focusButton.addEventListener("click", focusFront);

  viewport.addEventListener("scroll", () => {
    el.dragHint.classList.add("hidden");
    updateCameraBox();
  }, { passive: true });
  viewport.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch") return;
    if (state.cockpitMode && event.target === canvas && event.button === 0) {
      initAudio();
      state.manualFire = true;
      state.manualAimPulse = .35;
      event.preventDefault();
      return;
    }
    dragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartScrollLeft = viewport.scrollLeft;
    dragStartScroll = viewport.scrollTop;
    pointerStartX = event.clientX; pointerStartY = event.clientY; pointerMoved = false; pointerStartedOnCanvas = event.target === canvas;
    viewport.classList.add("dragging"); viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointermove", event => {
    if (!dragging) return;
    if (Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) > 6) pointerMoved = true;
    viewport.scrollLeft = dragStartScrollLeft - (event.clientX - dragStartX) * 1.25;
    viewport.scrollTop = dragStartScroll - (event.clientY - dragStartY) * 1.25;
  });
  viewport.addEventListener("pointerup", event => {
    state.manualFire = false;
    if (state.destructionReady) {
      dragging = false;
      viewport.classList.remove("dragging");
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      revealBattleResult();
      return;
    }
    const shouldSelect = !pointerMoved && pointerStartedOnCanvas;
    dragging = false; viewport.classList.remove("dragging");
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (shouldSelect) selectManualUnitAt(event.clientX, event.clientY);
  });
  viewport.addEventListener("pointercancel", () => { dragging = false; pointerMoved = false; viewport.classList.remove("dragging"); });
  window.addEventListener("pointerup", () => { state.manualFire = false; });

  minimap.addEventListener("click", event => {
    const rect = minimap.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    viewport.scrollTo({ top: ratio * viewport.scrollHeight - viewport.clientHeight / 2, behavior: "smooth" });
  });

  window.addEventListener("keydown", event => {
    if (event.target.matches("input, textarea")) return;
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyV") {
      career = { wins: 0, losses: 0 };
      localStorage.removeItem(CAREER_KEY);
      for (const legacyKey of LEGACY_CAREER_KEYS) localStorage.removeItem(legacyKey);
      updateCareerBoard();
      return;
    }
    if (event.code === "Escape" && state.selectedUnitId !== null) {
      event.preventDefault();
      clearManualSelection();
      return;
    }
    if (event.code === "KeyF" && state.started && !state.paused && !state.ended) {
      event.preventDefault();
      focusFront();
      return;
    }
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code) && state.started && !state.paused && !state.ended) {
      event.preventDefault();
      if (getSelectedUnit()) {
        manualKeys.add(event.code);
        manualTapExpiry.set(event.code, state.time + .11);
      } else {
        cameraKeys.add(event.code);
      }
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyG" && state.started) {
      state.aiCooldown = 9999;
      state.playerCP = CP_MAX;
      state.enemyCP = CP_MAX;
      for (let index = 0; index < 3; index++) {
        if (!deploy("player", "light", 1, true)) continue;
        const unit = state.units[state.units.length - 1];
        unit.x = LANES[1] + (index - 1) * 3;
        unit.y = PLAYER_HQ_Y - 410 + index * 2;
        unit.pathStage = 2;
        unit.hp = 99999;
        unit.maxHp = 99999;
      }
      if (deploy("enemy", "light", 1, true)) {
        const target = state.units[state.units.length - 1];
        target.x = LANES[1]; target.y = PLAYER_HQ_Y - 680; target.pathStage = 2; target.debugSpeed = 0;
        target.hp = 99999; target.maxHp = 99999;
      }
      state.playerCP = CP_MAX;
      state.enemyCP = 0;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyK" && state.started) {
      const savedPlayerCP = state.playerCP;
      const savedEnemyCP = state.enemyCP;
      state.aiCooldown = 9999;
      state.playerCP = CP_MAX;
      state.enemyCP = CP_MAX;
      const frontY = HAS_RIVER ? RIVER_TOP - 145 : H * .48;
      if (deploy("player", "apc", 1, true)) {
        const carrier = state.units[state.units.length - 1];
        carrier.x = LANES[1]; carrier.y = frontY; carrier.pathStage = 2; carrier.debugSpeed = 0;
        carrier.hp = 99999; carrier.maxHp = 99999;
      }
      if (deploy("enemy", "light", 1, true)) {
        const contact = state.units[state.units.length - 1];
        contact.x = LANES[1]; contact.y = frontY - 105; contact.pathStage = 2; contact.debugSpeed = 0;
        contact.hp = 99999; contact.maxHp = 99999;
      }
      state.playerCP = savedPlayerCP;
      state.enemyCP = savedEnemyCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyU" && state.started) {
      const savedCP = state.playerCP;
      state.aiCooldown = 9999;
      state.playerCP = CP_MAX;
      if (deploy("player", "medium", 1, true)) {
        const raider = state.units[state.units.length - 1];
        raider.x = LANES[1]; raider.y = ENEMY_HQ_Y + 420; raider.pathStage = 2; raider.debugSpeed = 8;
        raider.hp = 99999; raider.maxHp = 99999;
      }
      state.playerCP = savedCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyY" && state.started) {
      damageTarget(state.enemyHQ.warehouse, 9999, "player");
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyJ" && state.started) {
      const savedPlayerCP = state.playerCP;
      const savedEnemyCP = state.enemyCP;
      state.aiCooldown = 9999;
      state.playerCP = CP_MAX;
      state.enemyCP = CP_MAX;
      if (deploy("player", "light", 1, true)) {
        const dodgeUnit = state.units[state.units.length - 1];
        dodgeUnit.x = LANES[1]; dodgeUnit.y = 900; dodgeUnit.pathStage = 2; dodgeUnit.debugSpeed = 0;
        dodgeUnit.hp = 999999; dodgeUnit.maxHp = 999999;
      }
      if (deploy("enemy", "artillery", 1, true)) {
        const attacker = state.units[state.units.length - 1];
        attacker.x = LANES[1]; attacker.y = 570; attacker.pathStage = 2; attacker.debugSpeed = 0; attacker.reload = .18;
        attacker.hp = 999999; attacker.maxHp = 999999;
      }
      if (deploy("enemy", "light", 1, true)) {
        const closeTarget = state.units[state.units.length - 1];
        closeTarget.x = LANES[1]; closeTarget.y = 785; closeTarget.pathStage = 2; closeTarget.debugSpeed = 0;
        closeTarget.hp = 999999; closeTarget.maxHp = 999999;
      }
      state.playerCP = savedPlayerCP;
      state.enemyCP = savedEnemyCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyT" && state.started) {
      const savedCP = state.enemyCP;
      state.enemyCP = CP_MAX;
      if (deploy("enemy", "light", 1, true)) {
        const threat = state.units[state.units.length - 1];
        threat.x = state.playerHQ.x;
        threat.y = state.playerHQ.y - 245;
        threat.pathStage = 2;
        threat.heading = Math.PI;
        threat.turretAngle = Math.PI;
      }
      state.enemyCP = savedCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyB" && state.started) {
      const savedCP = state.playerCP;
      state.playerCP = CP_MAX;
      if (deploy("player", "medium", 1, true)) {
        const bridgeUnit = state.units[state.units.length - 1];
        bridgeUnit.bridge = 0;
        bridgeUnit.pathStage = 1;
        bridgeUnit.x = BRIDGES[0];
        bridgeUnit.y = RIVER_BOTTOM + 62;
        bridgeUnit.heading = 0;
        bridgeUnit.turretAngle = 0;
        bridgeUnit.debugSpeed = 8;
        bridgeUnit.hp = 9999;
        bridgeUnit.maxHp = 9999;
      }
      state.playerCP = savedCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyF" && state.started) {
      const savedPlayerCP = state.playerCP;
      const savedEnemyCP = state.enemyCP;
      state.playerCP = CP_MAX;
      state.enemyCP = CP_MAX;
      if (deploy("player", "artillery", 1, true)) {
        const gun = state.units[state.units.length - 1];
        gun.x = LANES[1];
        gun.y = 900;
        gun.pathStage = 2;
        gun.heading = 0;
        gun.turretAngle = 0;
        gun.debugSpeed = 0;
        gun.hp = 9999;
        gun.maxHp = 9999;
      }
      if (deploy("enemy", "light", 1, true)) {
        const target = state.units[state.units.length - 1];
        target.x = LANES[1];
        target.y = 570;
        target.pathStage = 2;
        target.heading = Math.PI;
        target.turretAngle = Math.PI;
        target.debugSpeed = 0;
        target.hp = 9999;
        target.maxHp = 9999;
      }
      state.playerCP = savedPlayerCP;
      state.enemyCP = savedEnemyCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyV" && state.started) {
      const savedCP = state.playerCP;
      state.playerCP = CP_MAX;
      if (deploy("player", "helicopter", 1, true)) {
        const helicopter = state.units[state.units.length - 1];
        helicopter.x = LANES[1];
        helicopter.y = RIVER_BOTTOM + 90;
        helicopter.debugSpeed = 8;
        helicopter.ignoreCombat = true;
        helicopter.hp = 9999;
        helicopter.maxHp = 9999;
      }
      state.playerCP = savedCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyH" && state.started) {
      const savedPlayerCP = state.playerCP;
      const savedEnemyCP = state.enemyCP;
      state.playerCP = CP_MAX;
      state.enemyCP = CP_MAX;
      if (deploy("player", "heavy", 1, true)) {
        const heavy = state.units[state.units.length - 1];
        heavy.x = LANES[1]; heavy.y = 900; heavy.pathStage = 2; heavy.debugSpeed = 0;
        heavy.hp = 9999; heavy.maxHp = 9999;
      }
      if (deploy("enemy", "helicopter", 1, true)) {
        const helicopter = state.units[state.units.length - 1];
        helicopter.x = LANES[1]; helicopter.y = 650; helicopter.debugSpeed = 0; helicopter.ignoreCombat = true;
        helicopter.hp = 9999; helicopter.maxHp = 9999;
      }
      state.playerCP = savedPlayerCP;
      state.enemyCP = savedEnemyCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyC" && state.started) {
      const savedPlayerCP = state.playerCP;
      const savedEnemyCP = state.enemyCP;
      state.playerCP = CP_MAX;
      state.enemyCP = CP_MAX;
      if (deploy("player", "helicopter", 1, true)) {
        const playerAir = state.units[state.units.length - 1];
        playerAir.x = LANES[1]; playerAir.y = 900; playerAir.debugSpeed = 0;
        playerAir.hp = 9999; playerAir.maxHp = 9999;
      }
      if (deploy("enemy", "helicopter", 1, true)) {
        const enemyAir = state.units[state.units.length - 1];
        enemyAir.x = LANES[1]; enemyAir.y = 750; enemyAir.debugSpeed = 0;
        enemyAir.hp = 9999; enemyAir.maxHp = 9999;
      }
      state.playerCP = savedPlayerCP;
      state.enemyCP = savedEnemyCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyM" && state.started) {
      const savedCP = state.enemyCP;
      state.enemyCP = CP_MAX;
      if (deploy("enemy", "helicopter", 1, true)) {
        const airThreat = state.units[state.units.length - 1];
        airThreat.x = W / 2; airThreat.y = state.playerHQ.y - 230; airThreat.debugSpeed = 0; airThreat.ignoreCombat = true;
        airThreat.hp = 9999; airThreat.maxHp = 9999;
      }
      state.enemyCP = savedCP;
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyN" && state.started) {
      state.aiCooldown = 9999;
      state.enemyCP = CP_MAX;
      if (deploy("enemy", "medium", 1, true)) {
        const builder = state.units[state.units.length - 1];
        builder.x = LANES[1]; builder.y = HAS_RIVER ? RIVER_TOP - 250 : H * .43;
        builder.pathStage = 2; builder.debugSpeed = 0; builder.hp = 9999; builder.maxHp = 9999;
      }
      runAIFortification();
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyR" && state.started) {
      state.aiCooldown = 9999;
      state.playerCP = CP_MAX;
      state.enemyCP = CP_MAX;
      if (deploy("player", "rocket", 1, true)) {
        const rocket = state.units[state.units.length - 1];
        rocket.x = LANES[1]; rocket.y = 900; rocket.pathStage = 2; rocket.debugSpeed = 0; rocket.hp = 9999; rocket.maxHp = 9999;
      }
      if (deploy("enemy", "heavy", 1, true)) {
        const target = state.units[state.units.length - 1];
        target.x = LANES[1]; target.y = 570; target.pathStage = 2; target.debugSpeed = 0; target.hp = 9999; target.maxHp = 9999;
      }
      updateHud(true);
      return;
    }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyZ" && state.started) { beginHQDestruction(true); return; }
    if (new URLSearchParams(location.search).has("debug") && event.code === "KeyX" && state.started) { beginHQDestruction(false); return; }
    if (event.code === "Digit1") selectUnit("light");
    else if (event.code === "Digit2") selectUnit("medium");
    else if (event.code === "Digit3") selectUnit("heavy");
    else if (event.code === "Digit4") selectUnit("artillery");
    else if (event.code === "Digit5") selectUnit("rocket");
    else if (event.code === "Digit6") selectUnit("helicopter");
    else if (event.code === "Digit7") selectUnit("apc");
    else if (event.altKey && ["KeyA", "KeyS", "KeyD"].includes(event.code) && state.started && !state.paused && !state.ended) {
      deploy("player", state.selected, { KeyA: 0, KeyS: 1, KeyD: 2 }[event.code]);
    } else if (event.code === "Space") {
      event.preventDefault(); togglePause();
    }
  });
  window.addEventListener("keyup", event => {
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
      manualKeys.delete(event.code);
      cameraKeys.delete(event.code);
    }
  });
  window.addEventListener("blur", () => {
    manualKeys.clear();
    cameraKeys.clear();
    state.manualFire = false;
  });
  window.addEventListener("resize", updateCameraBox);

  updateCareerBoard();
  resetGame();
  requestAnimationFrame(loop);

  window.gameDebug = {
    snapshot: () => ({
      started: state.started, paused: state.paused, ended: state.ended, selected: state.selected,
      playerCP: state.playerCP, enemyCP: state.enemyCP, playerHQ: state.playerHQ.hp,
      enemyHQ: state.enemyHQ.hp, allies: state.units.filter(u => u.team === "player").length,
      enemies: state.units.filter(u => u.team === "enemy").length, time: state.time,
      playerCannonLocks: state.playerHQ.cannons.map(cannon => cannon.targetId),
      enemyCannonLocks: state.enemyHQ.cannons.map(cannon => cannon.targetId)
    }),
    grantCP: () => { state.playerCP = CP_MAX; updateHud(true); },
    deploy: (type = "light", lane = 1) => deploy("player", type, lane),
    damageEnemyHQ: amount => damageTarget(state.enemyHQ, amount, "player")
  };
})();
