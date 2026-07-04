/* ═══════════════════════════════════════════════
   NEON BREAKER v1.2.0 — Game Engine
   ═══════════════════════════════════════════════ */

// ─── Settings ───
const settings = {
  masterVol: 70,
  sfxVol: 80,
  shake: true,
  particles: true,
  scanlines: true,
  trail: true,
  edgeGlow: true
};

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('nb_settings'));
    if (s) Object.assign(settings, s);
  } catch(e) {}
}
function saveSettings() {
  try { localStorage.setItem('nb_settings', JSON.stringify(settings)); } catch(e) {}
}
loadSettings();

// ─── High Score ───
function getHigh() { try { return parseInt(localStorage.getItem('nb_high')) || 0; } catch(e) { return 0; } }
function setHigh(v) { try { localStorage.setItem('nb_high', v); } catch(e) {} }

// ─── Audio ───
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null, masterGain = null, sfxGain = null;

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new AudioCtx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = settings.masterVol / 100;
    masterGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = settings.sfxVol / 100;
    sfxGain.connect(masterGain);
  } catch(e) {}
}

function tone(freq, dur, type, vol) {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(vol || 0.06, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

const sfx = {
  brick(c)  { tone(360 + c * 65, 0.09, 'square', 0.06); },
  paddle()  { tone(190, 0.07, 'triangle', 0.04); },
  wall()    { tone(150, 0.035, 'sine', 0.025); },
  lose()    { tone(85, 0.45, 'sawtooth', 0.07); },
  powerup() { tone(520, 0.07, 'sine', 0.05); setTimeout(() => tone(850, 0.1, 'sine', 0.04), 70); },
  combo()   { tone(660, 0.05, 'sine', 0.05); setTimeout(() => tone(1000, 0.08, 'sine', 0.04), 50); },
  victory() { [523,659,784,1047].forEach((f,i) => setTimeout(() => tone(f, 0.28, 'sine', 0.06), i*120)); },
  lvl()     { tone(310, 0.12, 'sine', 0.04); setTimeout(() => tone(420, 0.18, 'sine', 0.04), 100); },
  click()   { tone(800, 0.03, 'sine', 0.03); }
};

function updateAudioVolumes() {
  if (masterGain) masterGain.gain.value = settings.masterVol / 100;
  if (sfxGain) sfxGain.gain.value = settings.sfxVol / 100;
}

// ─── Canvas ───
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ─── Cursor ───
const cursorEl = document.getElementById('customCursor');
document.addEventListener('mousemove', e => {
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top = e.clientY + 'px';
});
canvas.addEventListener('mouseenter', () => cursorEl.classList.add('over-game'));
canvas.addEventListener('mouseleave', () => cursorEl.classList.remove('over-game'));

// ─── DOM ───
const $ = id => document.getElementById(id);
const hudScore = $('hudScore'), hudCombo = $('hudCombo'), hudHigh = $('hudHigh');
const hudLevel = $('hudLevel'), hudLives = $('hudLives');
const menuTagline = $('menuTagline'), menuBest = $('menuBest');
const comboToast = $('comboToast');
const gameWrapper = $('gameWrapper');
const canvasContainer = $('canvasContainer');

const panels = {
  menu:     $('menuPanel'),
  pause:    $('pausePanel'),
  options:  $('optionsPanel'),
  gameover: $('gameOverPanel'),
  victory:  $('victoryPanel')
};

// ─── State Machine ───
let state = 'menu'; // menu | playing | paused | options | gameover | victory
let optionsFrom = 'menu'; // where we opened options from

function showPanel(name) {
  Object.values(panels).forEach(p => p.classList.remove('active'));
  if (name && panels[name]) panels[name].classList.add('active');
}

function setGamePushed(yes) {
  gameWrapper.classList.toggle('pushed', yes);
}

function goMenu() {
  state = 'menu';
  setGamePushed(true);
  showPanel('menu');
  refreshMenuBest();
  pickTagline();
}

function goPlay() {
  state = 'playing';
  setGamePushed(false);
  showPanel(null);
}

function goPause() {
  state = 'paused';
  setGamePushed(true);
  showPanel('pause');
}

function goOptions(from) {
  optionsFrom = from;
  state = 'options';
  setGamePushed(true);
  showPanel('options');
  syncOptionsUI();
}

function goGameOver() {
  state = 'gameover';
  setGamePushed(true);
  showPanel('gameover');
  const hi = getHigh();
  if (score > hi) setHigh(score);
  $('goMessage').textContent = goMessages[Math.floor(Math.random() * goMessages.length)];
  $('goScore').textContent = score.toLocaleString();
  $('goStats').innerHTML = statsHTML();
}

function goVictory() {
  state = 'victory';
  setGamePushed(true);
  showPanel('victory');
  const hi = getHigh();
  if (score > hi) setHigh(score);
  $('vicSub').textContent = 'Level ' + level + ' done';
  $('vicScore').textContent = score.toLocaleString();
  $('vicStats').innerHTML = statsHTML();
}

// ─── Human Touch: Rotating Taglines ───
const taglines = [
  "shatter the grid. own the night.",
  "one ball. zero mercy.",
  "the grid doesn't negotiate.",
  "break things. look cool doing it.",
  "neon never sleeps.",
  "reflexes required. patience optional.",
  "your mouse. your problem."
];

const goMessages = [
  "the grid won this round",
  "needs more coffee",
  "system failure",
  "the ball has left the building",
  "not your best work",
  "try again, champ"
];

function pickTagline() {
  menuTagline.textContent = taglines[Math.floor(Math.random() * taglines.length)];
}

function refreshMenuBest() {
  const hi = getHigh();
  menuBest.textContent = hi > 0 ? ('BEST: ' + hi.toLocaleString()) : '';
}

function statsHTML() {
  return `
    <div><div class="stat-label">Level</div><div class="stat-val">${level}</div></div>
    <div><div class="stat-label">Max Combo</div><div class="stat-val">x${maxCombo}</div></div>
    <div><div class="stat-label">Bricks</div><div class="stat-val">${bricksDestroyed}</div></div>
    <div><div class="stat-label">Balls Lost</div><div class="stat-val">${ballsLost}</div></div>
  `;
}

// ─── Options UI Sync ───
function syncOptionsUI() {
  $('optMasterVol').value = settings.masterVol;
  $('optMasterVolVal').textContent = settings.masterVol + '%';
  $('optSfxVol').value = settings.sfxVol;
  $('optSfxVolVal').textContent = settings.sfxVol + '%';
  $('optShake').checked = settings.shake;
  $('optParticles').checked = settings.particles;
  $('optScanlines').checked = settings.scanlines;
  $('optTrail').checked = settings.trail;
  $('optEdgeGlow').checked = settings.edgeGlow;
  applyScanlines();
}

function applyScanlines() {
  canvasContainer.classList.toggle('no-scanlines', !settings.scanlines);
}

// Options event wiring
 $('optMasterVol').addEventListener('input', e => {
  settings.masterVol = +e.target.value;
  $('optMasterVolVal').textContent = settings.masterVol + '%';
  updateAudioVolumes(); saveSettings();
});
 $('optSfxVol').addEventListener('input', e => {
  settings.sfxVol = +e.target.value;
  $('optSfxVolVal').textContent = settings.sfxVol + '%';
  updateAudioVolumes(); saveSettings();
});
 $('optShake').addEventListener('change', e => { settings.shake = e.target.checked; saveSettings(); });
 $('optParticles').addEventListener('change', e => { settings.particles = e.target.checked; saveSettings(); });
 $('optScanlines').addEventListener('change', e => { settings.scanlines = e.target.checked; applyScanlines(); saveSettings(); });
 $('optTrail').addEventListener('change', e => { settings.trail = e.target.checked; saveSettings(); });
 $('optEdgeGlow').addEventListener('change', e => { settings.edgeGlow = e.target.checked; saveSettings(); });
 $('btnResetHigh').addEventListener('click', () => {
  try { localStorage.removeItem('nb_high'); } catch(e) {}
  hudHigh.textContent = '0';
  refreshMenuBest();
  sfx.click();
});
 $('btnOptionsBack').addEventListener('click', () => {
  sfx.click();
  if (optionsFrom === 'pause') goPause();
  else goMenu();
});

// ─── Button Wiring ───
 $('btnPlay').addEventListener('click', () => {
  initAudio(); sfx.click();
  resetGame(); goPlay(); sfx.lvl();
});
 $('btnResume').addEventListener('click', () => { sfx.click(); goPlay(); });
 $('btnPauseOptions').addEventListener('click', () => { sfx.click(); goOptions('pause'); });
 $('btnQuit').addEventListener('click', () => { sfx.click(); goMenu(); });
 $('btnRetry').addEventListener('click', () => {
  sfx.click(); resetGame(); goPlay(); sfx.lvl();
});
 $('btnGoMenu').addEventListener('click', () => { sfx.click(); goMenu(); });
 $('btnNext').addEventListener('click', () => {
  sfx.click(); level++; initLevel(); updateHUD(); goPlay(); sfx.lvl();
});
 $('btnMenuOptions').addEventListener('click', () => { sfx.click(); goOptions('menu'); });

// ─── Keyboard ───
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (state === 'playing') goPause();
    else if (state === 'paused') goPlay();
    else if (state === 'options') {
      if (optionsFrom === 'pause') goPause();
      else goMenu();
    }
  }
  if ((e.key === ' ' || e.key === 'Enter') && state === 'playing') launchBalls();
  if (e.key === ' ' && state === 'menu') { e.preventDefault(); $('btnPlay').click(); }
});

// ─── Mouse ───
let mouseX = W / 2;
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * (W / r.width);
});
canvas.addEventListener('click', () => {
  if (state === 'playing') launchBalls();
});

// ─── Game Variables ───
let score = 0, displayScore = 0, lives = 3, level = 1;
let combo = 0, maxCombo = 0, comboTimer = 0;
let bricksDestroyed = 0, ballsLost = 0;
let shakeX = 0, shakeY = 0, shakeMag = 0;
let frame = 0;
let edgeFlashColor = null, edgeFlashAlpha = 0;

// ─── Background Stars ───
const stars = Array.from({length: 50}, () => ({
  x: Math.random() * W, y: Math.random() * H,
  s: .4 + Math.random() * 1.2,
  sp: .08 + Math.random() * .2,
  a: .15 + Math.random() * .4,
  ph: Math.random() * 6.28,
  tw: .008 + Math.random() * .02
}));

// ─── Paddle ───
const paddle = { x: W/2, y: H-35, w: 120, h: 14, targetX: W/2, prevX: W/2, trail: [] };
let paddleWide = false, paddleWideTimer = 0;

// ─── Balls ───
let balls = [];
function makeBall(x, y, dx, dy) {
  return { x, y, dx, dy, r: 7, speed: 4.5 + level * .25, trail: [], stuck: !dx && !dy };
}

// ─── Bricks ───
let bricks = [];
const BR = 6, BC = 12, BW = 58, BH = 20, BP = 4;
const BOX = (W - (BC * (BW + BP) - BP)) / 2;
const BOY = 55;

const COLORS = [
  { f:'#ff2d6a', g:'rgba(255,45,106,0.4)',  p:60 },
  { f:'#ff6a00', g:'rgba(255,106,0,0.4)',   p:50 },
  { f:'#ffe600', g:'rgba(255,230,0,0.4)',   p:40 },
  { f:'#39ff14', g:'rgba(57,255,20,0.4)',   p:30 },
  { f:'#00f0ff', g:'rgba(0,240,255,0.4)',   p:20 },
  { f:'#b44aff', g:'rgba(180,74,255,0.4)',  p:10 }
];

// ─── Particles ───
let particles = [];
const MAX_P = 400;

function emitP(x, y, col, n, o) {
  if (!settings.particles) return;
  o = o || {};
  for (let i = 0; i < n && particles.length < MAX_P; i++) {
    const a = Math.random() * 6.28;
    const sp = (o.sMin||1) + Math.random() * ((o.sMax||4) - (o.sMin||1));
    particles.push({
      x, y, dx: Math.cos(a)*sp, dy: Math.sin(a)*sp,
      life: 1, decay: (o.dMin||.015) + Math.random()*((o.dMax||.03)-(o.dMin||.015)),
      sz: (o.szMin||2) + Math.random()*((o.szMax||4)-(o.szMin||2)),
      col, grav: o.grav || .06, rot: Math.random()*6.28, rs: (Math.random()-.5)*.2,
      shape: o.shape || 'sq'
    });
  }
}

function emitSparks(x, y, n) {
  if (!settings.particles) return;
  for (let i = 0; i < n && particles.length < MAX_P; i++) {
    const a = Math.random()*6.28, sp = 3+Math.random()*5;
    particles.push({
      x, y, dx: Math.cos(a)*sp, dy: Math.sin(a)*sp,
      life: 1, decay: .04+Math.random()*.04, sz: 1, col: '#fff',
      grav: .02, rot: a, rs: 0, shape: 'line', len: 5+Math.random()*8
    });
  }
}

// ─── Floating Text ───
let floats = [];
function addFloat(x, y, txt, col) { floats.push({x, y, txt, col, life: 1, dy: -1.2}); }

// ─── Power-Ups ───
let powerUps = [];
const PU_TYPES = [
  { type:'wide',  col:'#39ff14', label:'WIDE PADDLE' },
  { type:'multi', col:'#ffe600', label:'MULTI BALL' },
  { type:'life',  col:'#ff2d6a', label:'EXTRA LIFE' },
  { type:'slow',  col:'#00f0ff', label:'SLOW BALL' }
];

function maybePU(x, y) {
  if (Math.random() < .13) {
    const t = PU_TYPES[Math.floor(Math.random()*PU_TYPES.length)];
    powerUps.push({x, y, dy:1.5, ...t, sz:10, pulse:0, rot:0});
  }
}

function activatePU(pu) {
  sfx.powerup();
  if (pu.type === 'wide') { paddleWide = true; paddleWideTimer = 540; }
  else if (pu.type === 'multi') {
    const mb = balls.find(b => !b.stuck);
    if (mb) {
      for (let i = 0; i < 2; i++) {
        const a = Math.atan2(mb.dy, mb.dx) + (i?0.4:-0.4);
        const nb = makeBall(mb.x, mb.y, Math.cos(a)*mb.speed, Math.sin(a)*mb.speed);
        nb.stuck = false; balls.push(nb);
      }
    }
  }
  else if (pu.type === 'life') lives = Math.min(lives+1, 5);
  else if (pu.type === 'slow') {
    balls.forEach(b => {
      if (!b.stuck) {
        const f = .6;
        b.dx *= f; b.dy *= f; b.speed *= f;
      }
    });
  }
}

let puLabel = '', puLabelCol = '', puLabelTimer = 0;
function showPULabel(label, col) { puLabel = label; puLabelCol = col; puLabelTimer = 120; }

// ─── Combo Toast ───
function popCombo(c) {
  const cols = ['#ffe600','#ff6a00','#ff2d6a','#b44aff','#00f0ff'];
  comboToast.textContent = 'x' + c;
  comboToast.style.color = cols[Math.min(Math.floor(c/3), cols.length-1)];
  comboToast.classList.remove('pop');
  void comboToast.offsetWidth;
  comboToast.classList.add('pop');
}

// ─── Shake ───
function shake(m) { if (settings.shake) shakeMag = Math.max(shakeMag, m); }
function updShake() {
  if (shakeMag > .15) {
    shakeX = (Math.random()-.5)*shakeMag*2;
    shakeY = (Math.random()-.5)*shakeMag*2;
    shakeMag *= .82;
  } else { shakeX = shakeY = shakeMag = 0; }
}

// ─── HUD ───
function bumpEl(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); setTimeout(()=>el.classList.remove('bump'), 100); }

function updateHUD() {
  hudHigh.textContent = getHigh().toLocaleString();
  hudLevel.textContent = level;
  hudLives.textContent = lives;
  hudLives.classList.toggle('last-life', lives === 1);

  // Combo urgency
  if (combo > 1 && comboTimer < 30 && comboTimer > 0) {
    hudCombo.classList.add('urgent');
  } else {
    hudCombo.classList.remove('urgent');
  }
  hudCombo.textContent = combo > 1 ? 'x' + combo : '--';
}

// ─── Level Gen ───
function genBricks() {
  bricks = [];
  for (let r = 0; r < BR; r++) {
    for (let c = 0; c < BC; c++) {
      let hp = 1, on = true;
      if (level === 2) {
        const d = Math.abs(c-BC/2+.5) + Math.abs(r-BR/2+.5);
        if (d > 5.5) on = false;
        if (d <= 1.5) hp = 2;
      } else if (level === 3) {
        if ((r+c)%2) on = false;
        hp = r < 2 ? 3 : r < 4 ? 2 : 1;
      } else if (level === 4) {
        hp = Math.min(3, Math.ceil((BR-r)/2));
      } else if (level === 5) {
        hp = (r===0||r===BR-1||c===0||c===BC-1) ? 3 : (r+c)%2 ? 2 : 1;
      } else {
        hp = Math.min(5, Math.max(1, Math.ceil((BR-r)/1.5) + Math.floor(level/3) - 1));
      }
      if (on) {
        bricks.push({
          x: BOX + c*(BW+BP), y: BOY + r*(BH+BP),
          w: BW, h: BH, hp, mhp: hp,
          col: COLORS[r % COLORS.length],
          flash: 0, cracks: [], shk: 0
        });
      }
    }
  }
}

function addCrack(b) {
  const cx = b.x+b.w/2, cy = b.y+b.h/2;
  const a = Math.random()*6.28, l = 4+Math.random()*10;
  b.cracks.push({ x1: cx+(Math.random()-.5)*8, y1: cy+(Math.random()-.5)*5, x2: cx+Math.cos(a)*l, y2: cy+Math.sin(a)*l });
}

// ─── Init ───
function initLevel() {
  genBricks();
  balls = [makeBall(W/2, paddle.y-20, 0, 0)];
  powerUps = []; particles = []; floats = [];
  paddleWide = false; paddleWideTimer = 0;
  combo = 0; comboTimer = 0; paddle.trail = [];
}

function resetGame() {
  score = 0; displayScore = 0; lives = 3; level = 1;
  maxCombo = 0; bricksDestroyed = 0; ballsLost = 0;
  frame = 0; edgeFlashAlpha = 0;
  initLevel(); updateHUD();
}

function launchBalls() {
  balls.forEach(b => {
    if (b.stuck) {
      const a = -Math.PI/2 + (Math.random()-.5)*.5;
      b.dx = Math.cos(a)*b.speed; b.dy = Math.sin(a)*b.speed; b.stuck = false;
    }
  });
}

// ─── Collision ───
function ballRect(b, r) {
  const cx = Math.max(r.x, Math.min(b.x, r.x+r.w));
  const cy = Math.max(r.y, Math.min(b.y, r.y+r.h));
  const dx = b.x-cx, dy = b.y-cy;
  return dx*dx+dy*dy < b.r*b.r;
}

// ─── UPDATE ───
function update() {
  if (state !== 'playing') return;
  frame++;

  // Smooth score display
  if (displayScore < score) {
    displayScore += Math.ceil((score - displayScore) * 0.15);
    if (displayScore > score) displayScore = score;
    hudScore.textContent = displayScore.toLocaleString();
  }

  // Timers
  if (comboTimer > 0) { comboTimer--; if (comboTimer <= 0) { combo = 0; updateHUD(); } }
  if (puLabelTimer > 0) puLabelTimer--;
  if (edgeFlashAlpha > 0) edgeFlashAlpha *= .88;

  // Paddle wide
  if (paddleWide) { paddleWideTimer--; if (paddleWideTimer <= 0) paddleWide = false; }

  // Paddle
  const tw = paddleWide ? 180 : 120;
  paddle.w += (tw - paddle.w) * .08;
  paddle.prevX = paddle.x;
  paddle.targetX = mouseX;
  paddle.x += (paddle.targetX - paddle.x) * .14;
  paddle.x = Math.max(paddle.w/2, Math.min(W-paddle.w/2, paddle.x));
  const paddleVel = paddle.x - paddle.prevX;

  // Paddle trail
  paddle.trail.push({x: paddle.x, w: paddle.w});
  if (paddle.trail.length > 5) paddle.trail.shift();

  // Paddle speed particles
  if (settings.particles && Math.abs(paddleVel) > 3) {
    const dir = paddleVel > 0 ? -1 : 1;
    if (frame % 2 === 0) {
      emitP(paddle.x + dir*paddle.w/2, paddle.y, paddleWide?'#39ff14':'#00f0ff', 1,
        {sMin:.3, sMax:1.5, szMin:1, szMax:2.5, dMin:.03, dMax:.06, grav:0, shape:'circle'});
    }
  }

  // Balls
  for (let i = balls.length-1; i >= 0; i--) {
    const b = balls[i];
    if (b.stuck) { b.x = paddle.x; b.y = paddle.y - b.r - paddle.h/2; continue; }

    if (settings.trail) { b.trail.push({x:b.x, y:b.y}); if (b.trail.length > 12) b.trail.shift(); }
    else b.trail.length = 0;

    b.x += b.dx; b.y += b.dy;

    // Walls
    if (b.x-b.r <= 0)  { b.x=b.r;     b.dx=Math.abs(b.dx);  sfx.wall(); edgeFlash('#00f0ff', .15); }
    if (b.x+b.r >= W)  { b.x=W-b.r;   b.dx=-Math.abs(b.dx); sfx.wall(); edgeFlash('#00f0ff', .15); }
    if (b.y-b.r <= 0)  { b.y=b.r;      b.dy=Math.abs(b.dy);  sfx.wall(); }

    // Paddle
    const pr = {x:paddle.x-paddle.w/2, y:paddle.y-paddle.h/2, w:paddle.w, h:paddle.h};
    if (b.dy > 0 && ballRect(b, pr)) {
      const hit = Math.max(-.95, Math.min(.95, (b.x-paddle.x)/(paddle.w/2)));
      const ang = hit * (Math.PI/3);
      const spd = Math.sqrt(b.dx*b.dx+b.dy*b.dy);
      // Add slight spin from paddle velocity
      const spin = paddleVel * .015;
      b.dx = Math.sin(ang)*spd + spin;
      b.dy = -Math.cos(ang)*spd;
      // Normalize speed
      const ns = Math.sqrt(b.dx*b.dx+b.dy*b.dy);
      if (ns > 0) { b.dx = b.dx/ns*spd; b.dy = b.dy/ns*spd; }
      b.y = pr.y - b.r;
      sfx.paddle();
      emitP(b.x, b.y+4, '#00f0ff', 4, {sMin:.5,sMax:2,grav:.01,dMin:.02,dMax:.05});
    }

    // Bricks
    for (let j = bricks.length-1; j >= 0; j--) {
      const br = bricks[j];
      if (!ballRect(b, br)) continue;

      const cx = br.x+br.w/2, cy = br.y+br.h/2;
      const dx = b.x-cx, dy = b.y-cy;
      if (Math.abs(dx/br.w) > Math.abs(dy/br.h)) b.dx = dx>0?Math.abs(b.dx):-Math.abs(b.dx);
      else b.dy = dy>0?Math.abs(b.dy):-Math.abs(b.dy);

      br.hp--; br.flash = 10; br.shk = (Math.random()-.5)*4;

      if (br.hp <= 0) {
        combo++; comboTimer = 100;
        if (combo > maxCombo) maxCombo = combo;
        bricksDestroyed++;
        const pts = br.col.p * Math.max(1, combo);
        score += pts;
        const bx = br.x+br.w/2, by = br.y+br.h/2;
        emitP(bx, by, br.col.f, 16, {sMax:5, szMax:5});
        emitSparks(bx, by, 5);
        addFloat(bx, by-8, '+'+pts, br.col.f);
        edgeFlash(br.col.f, .2);
        if (combo >= 3 && combo%3===0) { popCombo(combo); sfx.combo(); }
        maybePU(bx, by);
        sfx.brick(combo);
        shake(2 + Math.min(combo, 10)*.7);
        bumpEl(hudScore);
        bricks.splice(j, 1);
      } else {
        addCrack(br);
        sfx.brick(0);
        shake(1);
        emitP(br.x+br.w/2, br.y+br.h/2, br.col.f, 4, {sMax:2,szMax:3,dMax:.04});
      }
      updateHUD();
      break;
    }

    if (b.y-b.r > H+10) { balls.splice(i, 1); ballsLost++; }
  }

  // All balls lost
  if (balls.length === 0) {
    lives--; combo = 0; updateHUD();
    sfx.lose(); shake(8); bumpEl(hudLives);
    emitP(paddle.x, H-20, '#ff2d6a', 20, {sMax:5,szMax:3.5,grav:.1});
    edgeFlash('#ff2d6a', .35);
    if (lives <= 0) { goGameOver(); }
    else balls = [makeBall(paddle.x, paddle.y-20, 0, 0)];
  }

  // Victory
  if (bricks.length === 0 && state === 'playing') { sfx.victory(); goVictory(); }

  // Power-ups
  for (let i = powerUps.length-1; i >= 0; i--) {
    const pu = powerUps[i];
    pu.y += pu.dy; pu.pulse += .1; pu.rot += .03;
    const pr = {x:paddle.x-paddle.w/2, y:paddle.y-paddle.h/2, w:paddle.w, h:paddle.h};
    if (pu.x>pr.x && pu.x<pr.x+pr.w && pu.y>pr.y && pu.y<pr.y+pr.h) {
      activatePU(pu); showPULabel(pu.label, pu.col);
      emitP(pu.x, pu.y, pu.col, 10, {sMax:3,szMax:3,dMax:.04});
      powerUps.splice(i, 1); updateHUD(); continue;
    }
    if (pu.y > H+20) powerUps.splice(i, 1);
  }

  // Particles
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx; p.y += p.dy; p.dy += p.grav; p.dx *= .99;
    p.life -= p.decay; p.rot += p.rs;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Floats
  for (let i = floats.length-1; i >= 0; i--) {
    const f = floats[i]; f.y += f.dy; f.life -= .018;
    if (f.life <= 0) floats.splice(i, 1);
  }

  // Brick decay
  bricks.forEach(b => { if (b.flash > 0) b.flash--; b.shk *= .8; });

  updShake();
}

function edgeFlash(col, a) { edgeFlashColor = col; edgeFlashAlpha = a; }

// ─── RENDER ───
function render() {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(-10,-10,W+20,H+20);

  // Stars
  stars.forEach(s => {
    const tw = .5 + .5*Math.sin(frame*s.tw + s.ph);
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = '#3a4a7a';
    ctx.fillRect(s.x, s.y, s.s, s.s);
    s.y += s.sp; if (s.y > H) { s.y = 0; s.x = Math.random()*W; }
  });
  ctx.globalAlpha = 1;

  // Vignette
  const vig = ctx.createRadialGradient(W/2,H/2,W*.22,W/2,H/2,W*.8);
  vig.addColorStop(0,'rgba(13,13,26,0)'); vig.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);

  // Paddle area glow
  if (settings.edgeGlow) {
    const pg = ctx.createRadialGradient(paddle.x,H,0,paddle.x,H,180);
    const gc = paddleWide?'rgba(57,255,20,':'rgba(0,240,255,';
    pg.addColorStop(0, gc+'.035)'); pg.addColorStop(1, gc+'0)');
    ctx.fillStyle = pg; ctx.fillRect(0,H-180,W,180);
  }

  // Danger line — pulses faster when ball is low
  if (state === 'playing') {
    let dangerA = .08;
    balls.forEach(b => {
      if (!b.stuck && b.y > H * .7) dangerA = .15 + (b.y - H*.7) / (H*.3) * .15;
    });
    dangerA += Math.sin(frame * .08) * .03;
    ctx.save();
    ctx.strokeStyle = `rgba(255,45,106,${dangerA})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6,6]);
    ctx.beginPath(); ctx.moveTo(0,H-6); ctx.lineTo(W,H-6); ctx.stroke();
    ctx.restore();
  }

  // Bricks
  bricks.forEach(drawBrick);

  // Power-ups
  powerUps.forEach(drawPU);

  // Particles
  drawParticles();

  // Floats
  floats.forEach(f => {
    ctx.save();
    ctx.globalAlpha = f.life;
    ctx.fillStyle = f.col;
    ctx.shadowColor = f.col; ctx.shadowBlur = 6;
    ctx.font = 'bold 12px "Orbitron",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.txt, f.x, f.y);
    ctx.restore();
  });

  // Balls
  balls.forEach(drawBall);

  // Paddle
  drawPaddle();

  // PU label
  if (puLabelTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, puLabelTimer / 20);
    ctx.fillStyle = puLabelCol;
    ctx.font = 'bold 11px "Orbitron",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.shadowColor = puLabelCol; ctx.shadowBlur = 10;
    ctx.fillText(puLabel, W/2, H-50);
    ctx.restore();
  }

  // Edge flash
  if (edgeFlashAlpha > .005 && settings.edgeGlow) {
    ctx.save();
    ctx.globalAlpha = edgeFlashAlpha;
    ctx.strokeStyle = edgeFlashColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = edgeFlashColor;
    ctx.shadowBlur = 20;
    ctx.strokeRect(1,1,W-2,H-2);
    ctx.restore();
  }

  // Brick count
  ctx.save();
  ctx.globalAlpha = .3;
  ctx.fillStyle = '#fff';
  ctx.font = '10px "Share Tech Mono",monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('BRICKS: ' + bricks.length, 8, 6);
  ctx.restore();

  // Lives dots
  ctx.save();
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#ff2d6a';
    ctx.shadowColor = 'rgba(255,45,106,0.4)'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(W-18-i*18, H-14, 3.5, 0, 6.28); ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

function drawBrick(b) {
  const sx = b.x + b.shk;
  const alpha = .5 + (b.hp/b.mhp)*.5;
  ctx.save();
  ctx.shadowColor = b.flash > 0 ? '#fff' : b.col.g;
  ctx.shadowBlur = b.flash > 0 ? 22 : 10;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = b.flash > 0 ? '#fff' : b.col.f;
  const r = 3;
  ctx.beginPath();
  ctx.moveTo(sx+r, b.y); ctx.lineTo(sx+b.w-r, b.y);
  ctx.quadraticCurveTo(sx+b.w, b.y, sx+b.w, b.y+r);
  ctx.lineTo(sx+b.w, b.y+b.h-r);
  ctx.quadraticCurveTo(sx+b.w, b.y+b.h, sx+b.w-r, b.y+b.h);
  ctx.lineTo(sx+r, b.y+b.h);
  ctx.quadraticCurveTo(sx, b.y+b.h, sx, b.y+b.h-r);
  ctx.lineTo(sx, b.y+r);
  ctx.quadraticCurveTo(sx, b.y, sx+r, b.y);
  ctx.closePath(); ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = .25; ctx.fillStyle = '#fff';
  ctx.fillRect(sx+3, b.y+2, b.w-6, b.h*.25);
  ctx.globalAlpha = .12; ctx.fillStyle = '#000';
  ctx.fillRect(sx+2, b.y+b.h*.72, b.w-4, b.h*.26);

  if (b.cracks.length) {
    ctx.globalAlpha = .55; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
    b.cracks.forEach(c => { ctx.beginPath(); ctx.moveTo(c.x1+b.shk,c.y1); ctx.lineTo(c.x2+b.shk,c.y2); ctx.stroke(); });
  }
  if (b.mhp > 1) {
    ctx.globalAlpha = .8; ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "Orbitron",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.hp, sx+b.w/2, b.y+b.h/2+1);
  }
  ctx.restore();
}

function drawPaddle() {
  const {x,y,w,h,trail} = paddle;
  const py = y-h/2, px = x-w/2, r = h/2;
  ctx.save();

  // Trail
  if (settings.trail) {
    trail.forEach((t,idx) => {
      ctx.globalAlpha = (idx/trail.length)*.06;
      ctx.fillStyle = paddleWide?'#39ff14':'#00f0ff';
      const tp = t.x-t.w/2;
      ctx.beginPath();
      ctx.moveTo(tp+r,py); ctx.lineTo(tp+t.w-r,py);
      ctx.arc(tp+t.w-r,py+r,r,-Math.PI/2,Math.PI/2);
      ctx.lineTo(tp+r,py+h); ctx.arc(tp+r,py+r,r,Math.PI/2,-Math.PI/2);
      ctx.closePath(); ctx.fill();
    });
  }

  ctx.globalAlpha = 1;
  ctx.shadowColor = paddleWide?'rgba(57,255,20,0.5)':'rgba(0,240,255,0.5)';
  ctx.shadowBlur = 18;

  const g = ctx.createLinearGradient(px,py,px,py+h);
  if (paddleWide) { g.addColorStop(0,'#5fff3a'); g.addColorStop(1,'#1a8a0a'); }
  else { g.addColorStop(0,'#40f8ff'); g.addColorStop(1,'#007a82'); }
  ctx.fillStyle = g;

  ctx.beginPath();
  ctx.moveTo(px+r,py); ctx.lineTo(px+w-r,py);
  ctx.arc(px+w-r,py+r,r,-Math.PI/2,Math.PI/2);
  ctx.lineTo(px+r,py+h); ctx.arc(px+r,py+r,r,Math.PI/2,-Math.PI/2);
  ctx.closePath(); ctx.fill();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = .35; ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(px+r,py); ctx.lineTo(px+w-r,py);
  ctx.arc(px+w-r,py+r,r,-Math.PI/2,0);
  ctx.lineTo(px+w,py+3); ctx.lineTo(px,py+3);
  ctx.arc(px+r,py+r,r,Math.PI,-Math.PI/2);
  ctx.closePath(); ctx.fill();

  ctx.globalAlpha = .6; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(px+r,py+r,1.5,0,6.28); ctx.fill();
  ctx.beginPath(); ctx.arc(px+w-r,py+r,1.5,0,6.28); ctx.fill();
  ctx.restore();
}

function drawBall(b) {
  ctx.save();

  // Trail
  if (settings.trail) {
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i], p = i/b.trail.length;
      ctx.globalAlpha = p*.25;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(.5, b.r*p*.7), 0, 6.28); ctx.fill();
    }
  }

  // Outer ring
  ctx.globalAlpha = .12; ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r+3+Math.sin(frame*.1)*1.5, 0, 6.28); ctx.stroke();

  // Body
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(0,240,255,0.8)'; ctx.shadowBlur = 18;
  const g = ctx.createRadialGradient(b.x-1.5,b.y-1.5,0,b.x,b.y,b.r);
  g.addColorStop(0,'#fff'); g.addColorStop(.3,'#b0faff'); g.addColorStop(.7,'#00d4e0'); g.addColorStop(1,'#008a94');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.fill();

  ctx.shadowBlur = 0; ctx.globalAlpha = .5; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(b.x-1.5, b.y-1.5, b.r*.3, 0, 6.28); ctx.fill();
  ctx.restore();
}

function drawPU(pu) {
  ctx.save();
  const ps = pu.sz + Math.sin(pu.pulse)*3;
  ctx.translate(pu.x, pu.y);
  ctx.shadowColor = pu.col; ctx.shadowBlur = 14;
  ctx.rotate(pu.rot);
  ctx.strokeStyle = pu.col; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0,-ps); ctx.lineTo(ps,0); ctx.lineTo(0,ps); ctx.lineTo(-ps,0);
  ctx.closePath(); ctx.stroke();
  ctx.globalAlpha = .18; ctx.fillStyle = pu.col; ctx.fill();
  ctx.rotate(-pu.rot);
  ctx.globalAlpha = .9; ctx.shadowBlur = 0; ctx.fillStyle = pu.col;
  ctx.font = 'bold 8px "Orbitron",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(pu.type==='wide'?'W':pu.type==='multi'?'M':pu.type==='slow'?'S':'+', 0, 1);
  ctx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life*.85;
    ctx.shadowColor = p.col; ctx.shadowBlur = 3;
    if (p.shape === 'line') {
      ctx.strokeStyle = p.col; ctx.lineWidth = p.sz; ctx.lineCap = 'round';
      const l = (p.len||6)*p.life;
      ctx.beginPath(); ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x-Math.cos(p.rot)*l, p.y-Math.sin(p.rot)*l); ctx.stroke();
    } else if (p.shape === 'circle') {
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.3, p.sz*p.life), 0, 6.28); ctx.fill();
    } else {
      ctx.fillStyle = p.col;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const s = p.sz*p.life;
      ctx.fillRect(-s/2,-s/2,s,s);
    }
    ctx.restore();
  });
}

// ─── Loop ───
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// ─── Boot ───
applyScanlines();
refreshMenuBest();
pickTagline();
goMenu();
requestAnimationFrame(loop);