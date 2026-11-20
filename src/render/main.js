// Đảo Đèn Lồng — phần hiển thị 3D (Three.js) cho 3 Đêm.
// Dùng chung engine `../core/sim.js` với chế độ headless.

import * as THREE from '../vendor/three.module.js';
import { Game } from '../core/sim.js';
import { TUNING, P, NIGHTS } from '../core/constants.js';
import * as audio from './audio.js';

// bảng màu chuẩn
const C = {
  sky: 0x0e1430, fog: 0x1b2350,
  grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lantern: 0xffb347, core: 0xffe9b0, unlit: 0x5b5f6e,
  moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shade: 0x120a1a, shadeEdge: 0x7a3cff, shadeStun: 0x3a3450,
  cloth: 0xe8e2d0, red: 0xc8102e,
  gold: 0xf2c14e, drifter: 0x8fa3b8,
};

const $ = (id) => document.getElementById(id);

// ---------- DOM ----------
const hudEl = $('hud');
const flamesEl = $('flames').querySelector('b');
const clockEl = $('clock');
const lanternCountEl = $('lantern-count');
const scoreEl = $('score');
const moteBarEl = $('mote-bar');
const moteLabelEl = $('mote-label');
const cdDashFill = $('cd-dash').querySelector('.fill');
const cdPulseFill = $('cd-pulse').querySelector('.fill');
const cdDashBox = $('cd-dash');
const cdPulseBox = $('cd-pulse');
const interactHintEl = $('interact-hint');
const arrowEl = $('arrow');
const flashEl = $('flash');

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.fog, 30, 95);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);

const hemi = new THREE.HemisphereLight(0x8899cc, 0x141420, 0.6);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0x334466, 0.8);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x99aacc, 0.5);
moon.position.set(25, 60, 15);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -80;
moon.shadow.camera.right = 80;
moon.shadow.camera.top = 80;
moon.shadow.camera.bottom = -80;
scene.add(moon);

// ngôi sao
{
  const n = 700;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 90 + Math.random() * 130;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6 + 5;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xccccff, size: 0.5, transparent: true, opacity: 0.8 })));
}

// ---------- trạng thái game ----------
let phase = 'menu'; // menu | intro | playing | result | sunrise
let currentNight = 1;
let totalScore = 0;
let game = null;
let paused = false;
let yawDeg = 0;
let locked = false;
let flashT = 0;
let colorBlind = false;
let leaderboard = [];
let nightsWon = 0;
let reducedMotion = false;
let bigFont = false;
let subtitles = false;
let keyBindings = { move_fwd: 'w', move_back: 's', move_left: 'a', move_right: 'd', jump: ' ', dash: 'Shift', interact: 'e', pulse: 'q', pause: 'Escape' };
let bench = null;
let benchStartT = 0;
const keys = {};

const terrainGroup = new THREE.Group();
scene.add(terrainGroup);
const entityGroup = new THREE.Group();
scene.add(entityGroup);

const lanternMeshes = new Map();
const moteMeshes = new Map();
const shadeMeshes = new Map();
const drifterMeshes = new Map();
const charmMeshes = new Map();
let playerGroup = null;
const effects = [];

const INTRO_LINES = {
  1: 'Ông Đăng: “Đảo Bến chìm trong sương. Hãy thắp 5 ngọn đèn trước khi đêm tàn, Mây ạ.”',
  2: 'Ông Đăng: “Qua cầu tre sang Đảo Cau. Gió Lạc rình rập kẻ mang đom đóm.”',
  3: 'Ông Đăng: “Đảo Chuông cao ba tầng. Hãy leo lên và thắp sáng ngọn tháp.”',
};

// ---------- địa hình ----------
function clearGroup(g) {
  while (g.children.length) g.remove(g.children[0]);
}

function cyl(rt, rb, h, mat, x, y, z, thetaStart, thetaLen) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, 48, 1, false, thetaStart, thetaLen);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}

function buildTerrain(night) {
  clearGroup(terrainGroup);
  const grassMat = new THREE.MeshStandardMaterial({ color: C.grass, roughness: 1 });
  const sandMat = new THREE.MeshStandardMaterial({ color: C.sand, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 1 });
  const seaMat = new THREE.MeshBasicMaterial({ color: C.sea });

  // biển mây (mặt phẳng lớn dưới đảo)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -1.5;
  terrainGroup.add(sea);

  if (night === 1) {
    terrainGroup.add(cyl(40, 44, 2.4, grassMat, 0, -1.2));
    terrainGroup.add(cyl(40, 40, 0.4, sandMat, 0, 0.1));
    addDecor(0, 0, 40);
  } else if (night === 2) {
    terrainGroup.add(cyl(28, 32, 2.4, grassMat, 0, -1.2));
    terrainGroup.add(cyl(28, 32, 2.4, grassMat, 70, -1.2));
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), woodMat);
    bridge.position.set(35, 0.05, 0);
    bridge.receiveShadow = true;
    terrainGroup.add(bridge);
    addDecor(0, 0, 28);
    addDecor(70, 0, 28);
    // bục nhảy
    addPad([20, 0.15, 18]);
    addPad([50, 0.15, -18]);
  } else if (night === 3) {
    terrainGroup.add(cyl(45, 50, 3, grassMat, 0, -1.5)); // tầng 0
    terrainGroup.add(cyl(24, 24, 3, grassMat, 0, 1.5, 0, Math.PI)); // tầng 1 (nửa z>0)
    terrainGroup.add(cyl(8, 8, 6, grassMat, 0, 3)); // tầng 2
    // tháp chuông
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 20), new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.8 }));
    tower.position.set(0, 10, 0);
    tower.castShadow = true;
    terrainGroup.add(tower);
    // dốc (2 tấm nghiêng ở 30° và 150°)
    for (const deg of [30, 150]) {
      const r = (deg * Math.PI) / 180;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 7), grassMat);
      ramp.position.set(Math.cos(r) * 27, 1.5, Math.sin(r) * 27);
      ramp.rotation.y = -r;
      ramp.rotation.x = -0.4;
      ramp.castShadow = true;
      terrainGroup.add(ramp);
    }
    addPad([0, 3.15, 13]);
  }
}

function addDecor(cx, cz, radius) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * (radius - 8);
    const tree = Math.random() > 0.5;
    let m;
    if (tree) {
      m = new THREE.Mesh(new THREE.ConeGeometry(0.5 + Math.random() * 0.4, 1.5 + Math.random(), 7), new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 1 }));
      m.position.y = 0.8;
    } else {
      m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.5), new THREE.MeshStandardMaterial({ color: 0x3a4a44, roughness: 1 }));
      m.position.y = 0.3;
    }
    m.position.x = cx + Math.cos(a) * r;
    m.position.z = cz + Math.sin(a) * r;
    m.castShadow = true;
    terrainGroup.add(m);
  }
}

function addPad(pos) {
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 16), new THREE.MeshBasicMaterial({ color: C.gold }));
  pad.position.set(pos[0], pos[1], pos[2]);
  terrainGroup.add(pad);
}

// ---------- người chơi ----------
function buildPlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 1.2, 12), new THREE.MeshStandardMaterial({ color: C.cloth, roughness: 0.9 }));
  body.position.y = 0.6;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf2c39a, roughness: 0.8 }));
  head.position.y = 1.42;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 16), new THREE.MeshStandardMaterial({ color: 0xe7c86a, roughness: 0.8 }));
  hat.position.y = 1.72;
  hat.castShadow = true;
  g.add(hat);
  // khăn đỏ
  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: C.red }));
  scarf.position.set(0.3, 1.15, 0);
  g.add(scarf);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), new THREE.MeshBasicMaterial({ color: C.core }));
  lantern.position.set(0.02, 1.05, 0.35);
  g.add(lantern);
  const pLight = new THREE.PointLight(0xffcc88, 8, 14, 1.8);
  pLight.position.y = 1.2;
  g.add(pLight);
  return g;
}

// ---------- thực thể ----------
function buildLantern(l) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 8), new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.9 }));
  pole.position.y = 1.6;
  pole.castShadow = true;
  g.add(pole);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.85), new THREE.MeshStandardMaterial({ color: C.unlit, emissive: 0x000000, roughness: 0.7 }));
  body.position.y = 3.4;
  body.castShadow = true;
  g.add(body);
  const light = new THREE.PointLight(0xffaa33, 0, 15, 1.8);
  light.position.y = 3.4;
  g.add(light);
  // thanh dầu (hiện khi sáng)
  const fuelBar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: C.gold }));
  fuelBar.position.y = 4.2;
  fuelBar.visible = false;
  g.add(fuelBar);
  g.position.set(l.pos[0], l.pos[1], l.pos[2]);
  entityGroup.add(g);
  lanternMeshes.set(l.id, { body, light, fuelBar });
}

function addMoteMesh(m) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshBasicMaterial({ color: C.moteCore }));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), new THREE.MeshBasicMaterial({ color: C.moteHalo, transparent: true, opacity: 0.25 }));
  g.add(halo);
  g.position.set(m.pos[0], m.pos[1] + 0.8, m.pos[2]);
  g.userData.phase = Math.random() * Math.PI * 2;
  entityGroup.add(g);
  moteMeshes.set(m.id, g);
}

function addShadeMesh(s) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 18), new THREE.MeshStandardMaterial({ color: C.shade, emissive: 0x1a0a2a, roughness: 0.4 }));
  body.position.y = 1.0;
  body.castShadow = true;
  g.add(body);
  const edge = new THREE.Mesh(new THREE.SphereGeometry(1.0, 18, 18), new THREE.MeshBasicMaterial({ color: C.shadeEdge, transparent: true, opacity: 0.25 }));
  edge.position.y = 1.0;
  g.add(edge);
  g.position.set(s.pos[0], s.pos[1], s.pos[2]);
  g.userData.body = body;
  entityGroup.add(g);
  shadeMeshes.set(s.id, g);
}

function addDrifterMesh(d) {
  const g = new THREE.Group();
  const ribbon = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.6), new THREE.MeshStandardMaterial({ color: C.drifter, emissive: 0x223344, roughness: 0.5 }));
  ribbon.position.y = 1.0;
  g.add(ribbon);
  g.position.set(d.pos[0], d.pos[1], d.pos[2]);
  entityGroup.add(g);
  drifterMeshes.set(d.id, g);
}

function addCharmMesh(c) {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), new THREE.MeshStandardMaterial({ color: C.red, emissive: 0x330000 }));
  leaf.position.y = 0.8;
  g.add(leaf);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 16), new THREE.MeshBasicMaterial({ color: C.gold }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.8;
  g.add(ring);
  g.position.set(c.pos[0], c.pos[1], c.pos[2]);
  entityGroup.add(g);
  charmMeshes.set(c.id, g);
}

// ---------- hiệu ứng ----------
function spawnPulseRing() {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 48), new THREE.MeshBasicMaterial({ color: C.lantern, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(playerGroup.position.x, playerGroup.position.y + 0.15, playerGroup.position.z);
  scene.add(ring);
  effects.push({ kind: 'ring', mesh: ring, age: 0, life: 0.45, maxR: TUNING.pulse_radius });
}

// ---------- thiết lập game ----------
function startGame(night) {
  currentNight = night;
  game = new Game({ seed: (Date.now() >>> 0), night });
  game.buildScenario(null);
  buildTerrain(night);
  clearGroup(entityGroup);
  lanternMeshes.clear();
  moteMeshes.clear();
  shadeMeshes.clear();
  drifterMeshes.clear();
  charmMeshes.clear();
  effects.length = 0;
  for (const l of game.lanterns) buildLantern(l);
  for (const m of game.motes) addMoteMesh(m);
  for (const s of game.shades) addShadeMesh(s);
  for (const d of game.drifters) addDrifterMesh(d);
  for (const c of game.charms) addCharmMesh(c);
  if (!playerGroup) {
    playerGroup = buildPlayer();
    scene.add(playerGroup);
  }
  playerGroup.position.set(0, 0, 0);
  yawDeg = 0;
}

// ---------- input ----------
window.addEventListener('keydown', (e) => {
  const k = e.key;
  keys[k] = true;
  if (k === ' ' || k === 'Tab') e.preventDefault();
  if (k === keyBindings.pause && phase === 'playing') togglePause();
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function lockPointer() {
  try {
    if (!locked && document.pointerLockElement !== renderer.domElement) {
      const r = renderer.domElement.requestPointerLock();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    }
  } catch (e) {
    /* pointer lock không khả dụng: bỏ qua */
  }
}

renderer.domElement.addEventListener('click', () => {
  if (phase === 'playing' && !paused) lockPointer();
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
});
document.addEventListener('mousemove', (e) => {
  if (locked && phase === 'playing' && !paused) yawDeg = (yawDeg + e.movementX * settings.sensitivity) % 360;
});

// ---------- điều khiển luồng game ----------
function show(id) {
  for (const s of ['menu', 'night-intro', 'result', 'pause-menu', 'settings', 'sunrise']) $(s).classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
}

function togglePause() {
  paused = !paused;
  if (paused) {
    show('pause-menu');
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    show(null);
    lockPointer();
  }
}

let settings = audio.loadSettings();
colorBlind = !!settings.colorBlind;
audio.setMusicVolume(settings.music);
audio.setSfxVolume(settings.sfx);

$('btn-start').onclick = () => {
  audio.startMusic();
  show(null);
  startNight(1);
};
$('btn-settings').onclick = () => show('settings');
$('btn-settings2').onclick = () => show('settings');
$('btn-settings-done').onclick = () => {
  settings = {
    music: +$('set-music').value, sfx: +$('set-sfx').value, sensitivity: +$('set-sens').value,
    colorBlind: !!$('set-cb').checked, reducedMotion: !!$('set-motion').checked,
    bigFont: !!$('set-bigfont').checked, subtitles: !!$('set-subtitles').checked, keys: { ...keyBindings },
  };
  audio.saveSettings(settings);
  audio.setMusicVolume(settings.music);
  audio.setSfxVolume(settings.sfx);
  colorBlind = settings.colorBlind;
  applyAccessibility();
  show(paused ? 'pause-menu' : 'menu');
};
$('set-music').value = settings.music;
$('set-sfx').value = settings.sfx;
$('set-sens').value = settings.sensitivity;
$('set-cb').checked = !!settings.colorBlind;
$('set-motion').checked = !!settings.reducedMotion;
$('set-bigfont').checked = !!settings.bigFont;
$('set-subtitles').checked = !!settings.subtitles;

// Đổi phím: bấm vào hành động -> gõ phím mới
const KB_ACTIONS = [
  ['move_fwd', 'Di chuyển tiến'], ['move_back', 'Di chuyển lùi'],
  ['move_left', 'Di chuyển trái'], ['move_right', 'Di chuyển phải'],
  ['jump', 'Nhảy'], ['dash', 'Lướt'], ['interact', 'Nạp đèn/Châm dầu'], ['pulse', 'Tỏa sáng'], ['pause', 'Tạm dừng'],
];
function keyLabel(k) {
  if (k == null) return '(ngắt)';
  if (k === ' ') return 'Space';
  if (k === 'Shift') return 'Shift';
  if (k === 'Escape') return 'Esc';
  if (k === 'ArrowUp') return '↑';
  if (k === 'ArrowDown') return '↓';
  if (k === 'ArrowLeft') return '←';
  if (k === 'ArrowRight') return '→';
  return k;
}
function rebind(action) {
  const label = KB_ACTIONS.find((a) => a[0] === action)[1];
  const name = (window.prompt('Nhấn phím mới cho "' + label + '" (bấm Đồng ý để bôi đường trang):', keyLabel(keyBindings[action])) || '').trim();
  const allowed = /^[A-Za-z0-9_]$|^(Shift|Escape|Space|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/;
  if (!allowed.test(name)) { window.alert('Phím không hợp lệ: ' + name); return; }
  keyBindings[action] = name;
  settings.keys = { ...keyBindings };
  audio.saveSettings(settings);
  renderKB();
}
function renderKB() {
  const sec = $('kb-section');
  sec.innerHTML = '';
  for (const [action, label] of KB_ACTIONS) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = label + ': ' + keyLabel(keyBindings[action]);
    btn.onclick = () => rebind(action);
    sec.appendChild(btn);
  }
}

function applyAccessibility() {
  reducedMotion = settings.reducedMotion;
  bigFont = settings.bigFont;
  subtitles = settings.subtitles;
  if (settings.keys) Object.assign(keyBindings, settings.keys);
  const appEl = document.getElementById('app');
  appEl.style.transform = bigFont ? 'scale(1.25)' : '';
  moon.position.y = 40; // chốt tại rạnh mây (không rung) khi reducedMotion
  $('subtitles').hidden = !subtitles || phase !== 'playing';
  updateSubtitles();
  renderKB();
}

function updateSubtitles() {
  const el = $('subtitles');
  const cues = [];
  if (game && game.state === 'playing') {
    const timeLeft = game.durationS - game.simTick / 60;
    if (timeLeft <= 10 && timeLeft > 0) cues.push('10 s cuối');
    const warn = game.lanterns.find((l) => l.lit && l.fuel < P.low_fuel_threshold * 60);
    if (warn) cues.push('Đèn "' + warn.id + '" sắp hết dầu');
    const drainShades = game.shades.filter((s) => s.state === 'drain');
    if (drainShades.length) cues.push('Bóng Mực đang hút dầu: ' + drainShades.map((s) => s.id).join(','));
    const half = game.lanterns.filter((l) => !l.lit && l.deposited > 0).map((l) => l.id);
    if (half.length) cues.push('Đèn chưa sáng: ' + half.slice(0, 3).join(','));
  }
  el.textContent = cues.join(' · ');
  el.hidden = !subtitles || phase !== 'playing' || el.textContent === '';
}

function startNight(n) {
  currentNight = n;
  $('intro-night').textContent = 'Đêm ' + n;
  $('intro-island').textContent = NIGHTS[n].name;
  $('intro-line').textContent = INTRO_LINES[n];
  show('night-intro');
}
$('btn-enter').onclick = () => {
  startGame(currentNight);
  show(null);
  hudEl.classList.remove('hidden');
  phase = 'playing';
  lockPointer();
};
$('btn-resume').onclick = togglePause;
$('btn-restart').onclick = () => {
  paused = false;
  show(null);
  startGame(currentNight);
  phase = 'playing';
};
$('btn-menu').onclick = () => {
  paused = false;
  phase = 'menu';
  show('menu');
  hudEl.classList.add('hidden');
};
$('btn-again').onclick = () => {
  totalScore = 0;
  show(null);
  startNight(1);
};
$('btn-next').onclick = () => {
  if (game.state === 'won') {
    totalScore += game.score;
    nightsWon++;
    if (currentNight < 3) startNight(currentNight + 1);
    else {
      $('total-score').textContent = 'Tổng điểm: ' + totalScore;
      show('sunrise');
      phase = 'sunrise';
      saveToLeaderboard();
    }
  } else {
    startNight(currentNight);
  }
};

async function loadLeaderboard() {
  try {
    const d = await (await fetch('/api/leaderboard')).json();
    leaderboard = (d && d.entries) || [];
  } catch (e) { leaderboard = []; }
}

function showLeaderboard() {
  const t = $('leaderboard-tbody');
  t.innerHTML = '';
  leaderboard.slice(0, 10).forEach((e, i) => {
    const tr = document.createElement('tr');
    const rank = document.createElement('td'); rank.textContent = (i + 1).toString();
    const name = document.createElement('td'); name.textContent = e.name;
    const score = document.createElement('td'); score.textContent = String(e.score);
    const nights = document.createElement('td'); nights.textContent = String(e.nights_won);
    const when = document.createElement('td'); when.textContent = (e.achieved_at || '').slice(5, 16);
    tr.appendChild(rank); tr.appendChild(name); tr.appendChild(score); tr.appendChild(nights); tr.appendChild(when);
    t.appendChild(tr);
  });
  show('leaderboard');
}

function saveToLeaderboard() {
  const name = (window.prompt('Mây đã thắng! Nhập tên của bạn để lưu điểm (3–12 ký tự [A-Za-z0-9_]):', '') || '').trim();
  if (!/^[A-Za-z0-9_]{3,12}$/.test(name)) {
    window.alert('Tên phải từ 3–12 ký tự [A-Za-z0-9_].');
    return;
  }
  const entry = { name, score: totalScore, nights_won: nightsWon, achieved_at: new Date().toISOString(), seed: game.seed };
  const entries = [...leaderboard, entry].sort((a, b) => (b.score - a.score) || new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime()).slice(0, 10);
  leaderboard = entries;
  fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries }) })
    .then(() => showLeaderboard());
}

function showResult() {
  phase = 'result';
  if (game.state === 'won') {
    $('result-title').textContent = '🌅 Mây đã giữ đảo sáng đến bình minh!';
    $('result-sub').textContent = 'Thắng! Điểm đêm này: ' + game.score;
  } else {
    $('result-title').textContent = '💫 Thua cuộc';
    $('result-sub').textContent = 'Điểm: ' + totalScore;
  }
  show('result');
}

function onGameOver() {
  showResult();
  if (document.pointerLockElement) document.exitPointerLock();
}

// ---------- HUD ----------
function fmtClock(s) {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ':' + String(sec).padStart(2, '0');
}

let lastCountdownSec = -1;

function updateHUD() {
  const p = game.player;
  flamesEl.textContent = p.flames;
  const lit = game.lanterns.filter((l) => l.lit).length;
  lanternCountEl.textContent = '🏮 ' + lit + '/' + game.lanterns.length;
  scoreEl.textContent = 'Điểm: ' + game.score;
  const timeLeft = game.durationS - game.simTick / 60;
  clockEl.textContent = fmtClock(timeLeft);
  clockEl.classList.toggle('danger', timeLeft <= 30);
  if (timeLeft <= 10 && timeLeft > 0) {
    const sec = Math.ceil(timeLeft);
    if (sec !== lastCountdownSec) {
      lastCountdownSec = sec;
      audio.sfx('countdown');
    }
  }

  // thanh đom đóm + sức chứa
  const cap = p.capacity;
  const cells = Math.min(p.carried, cap);
  moteBarEl.innerHTML = '';
  for (let i = 0; i < cap; i++) {
    const d = document.createElement('div');
    d.className = 'mote-cell' + (i < cells ? ' filled' : '');
    moteBarEl.appendChild(d);
  }
  moteLabelEl.textContent = p.carried + '/' + cap;

  // hồi chiêu
  const dashCd = TUNING.dash_cooldown_s * 60;
  const pulseCd = TUNING.pulse_cooldown_s * 60;
  cdDashFill.style.width = (1 - p.dashCdTicks / dashCd) * 100 + '%';
  cdPulseFill.style.width = (1 - p.pulseCdTicks / pulseCd) * 100 + '%';
  cdDashBox.classList.toggle('ready', p.dashCdTicks <= 0);
  cdPulseBox.classList.toggle('ready', p.pulseCdTicks <= 0 && p.carried >= TUNING.pulse_cost);

  // gợi ý nạp đèn / châm dầu
  let nearest = null;
  let bestD = Infinity;
  for (const l of game.lanterns) {
    const full = l.lit && l.fuel >= 6000;
    if (full) continue; // đèn đầy dầu
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (d < bestD) {
      bestD = d;
      nearest = l;
    }
  }
  if (nearest && bestD <= TUNING.interact_radius) {
    const hint = nearest.lit ? 'E — Châm dầu (' + nearest.fuel.toFixed(1) + '/100)' : 'E — Nạp ánh sáng (' + nearest.deposited + '/' + TUNING.lantern_cost + ')';
    interactHintEl.textContent = hint;
    interactHintEl.classList.remove('hidden');
  } else {
    interactHintEl.classList.add('hidden');
  }

  // mũi tên chỉ đèn chưa thắp gần nhất
  if (nearest && bestD > TUNING.interact_radius) {
    const bearing = Math.atan2(nearest.pos[0] - p.pos[0], nearest.pos[2] - p.pos[2]);
    const rel = bearing - (yawDeg * Math.PI) / 180;
    if (Math.abs(rel) > 0.45) {
      arrowEl.classList.remove('hidden');
      arrowEl.style.transform = 'rotate(' + (-rel * 180 / Math.PI) + 'deg)';
    } else {
      arrowEl.classList.add('hidden');
    }
  } else {
    arrowEl.classList.add('hidden');
  }

  updateSubtitles();
}

// ---------- vòng lặp ----------
const STEP = 1 / 60;
let acc = 0;
let lastT = performance.now();

function isPressed(k) {
  if (!k) return false;
  if (k === 'ArrowUp') return !!keys['ArrowUp'] || !!keys['arrowup'];
  if (k === 'ArrowDown') return !!keys['ArrowDown'] || !!keys['arrowdown'];
  if (k === 'ArrowLeft') return !!keys['ArrowLeft'] || !!keys['arrowleft'];
  if (k === 'ArrowRight') return !!keys['ArrowRight'] || !!keys['arrowright'];
  return !!keys[k];
}

function actionForKey(key) {
  for (const [a, k] of Object.entries(keyBindings)) if (k === key) return a;
  return null;
}

function buildFrame() {
  const mx = (isPressed(keyBindings.move_right) ? 1 : 0) - (isPressed(keyBindings.move_left) ? 1 : 0);
  const mz = (isPressed(keyBindings.move_fwd) ? 1 : 0) - (isPressed(keyBindings.move_back) ? 1 : 0);
  return { move: [mx, mz], cam_yaw_deg: yawDeg, jump: isPressed(keyBindings.jump), interact: isPressed(keyBindings.interact), pulse: isPressed(keyBindings.pulse), dash: isPressed(keyBindings.dash) };
}

function handleEvents(events) {
  for (const e of events) {
    switch (e.name) {
      case 'mote_picked':
        audio.sfx('pickup');
        break;
      case 'lantern_lit':
        audio.sfx('lantern');
        break;
      case 'pulse':
        audio.sfx('pulse');
        spawnPulseRing();
        break;
      case 'player_hit':
        audio.sfx('hit');
        flashT = 0.25;
        break;
      case 'dash':
        audio.sfx('dash');
        break;
      case 'shade_spawned':
        audio.sfx('shade');
        break;
      case 'charm_picked':
        audio.sfx('pickup');
        break;
      case 'drifter_steal':
        audio.sfx('hit');
        break;
    }
  }
}

function syncScene(dt) {
  const p = game.player;
  playerGroup.position.set(p.pos[0], p.pos[1], p.pos[2]);
  playerGroup.rotation.y = (yawDeg * Math.PI) / 180;

  const nowT = performance.now() / 1000;
  const blink = (Math.floor(nowT * 2) % 2) === 0;
  for (const l of game.lanterns) {
    const m = lanternMeshes.get(l.id);
    const f = Math.max(0, Math.min(1, l.fuel / 6000)); // 6000 = fuel_max(100) * 60
    if (l.lit) {
      m.body.material.emissive.set(C.lantern);
      m.body.material.color.set(C.lantern);
      m.light.intensity = 20;
      m.fuelBar.visible = true;
      m.fuelBar.scale.set(f * 0.7, 0.12, 0.12);
      m.fuelBar.material.opacity = l.fuel < P.low_fuel_threshold * 60 ? (blink ? 1 : 0.45) : 1;
    } else {
      m.body.material.emissive.set(0x000000);
      m.body.material.color.set(C.unlit);
      m.light.intensity = 0;
      m.fuelBar.visible = false;
      m.body.scale.set(1, colorBlind ? 0.8 : 0.85, 1); // đèn tắt: bị xẹp
    }
  }

  const activeMotes = new Set(game.motes.map((m) => m.id));
  for (const id of [...moteMeshes.keys()]) {
    if (!activeMotes.has(id)) {
      entityGroup.remove(moteMeshes.get(id));
      moteMeshes.delete(id);
    }
  }
  const now = performance.now() / 1000;
  for (const m of game.motes) {
    if (!moteMeshes.has(m.id)) addMoteMesh(m);
    const g = moteMeshes.get(m.id);
    g.position.set(m.pos[0], m.pos[1] + 0.8 + Math.sin(now * 2 + g.userData.phase) * 0.15, m.pos[2]);
  }

  const activeShades = new Set(game.shades.map((s) => s.id));
  for (const id of [...shadeMeshes.keys()]) {
    if (!activeShades.has(id)) {
      entityGroup.remove(shadeMeshes.get(id));
      shadeMeshes.delete(id);
    }
  }
  for (const s of game.shades) {
    if (!shadeMeshes.has(s.id)) addShadeMesh(s);
    const g = shadeMeshes.get(s.id);
    g.position.set(s.pos[0], s.pos[1], s.pos[2]);
    if (s.state === 'drain') {
      g.userData.body.material.emissive.set(0x3a1a5a);
      g.userData.body.material.color.set(0x5a2a90);
    } else if (s.state === 'stunned') {
      g.userData.body.material.emissive.set(C.shadeStun);
      g.userData.body.material.color.set(C.shade);
    } else {
      g.userData.body.material.emissive.set(0x1a0a2a);
      g.userData.body.material.color.set(colorBlind ? C.shadeEdge : C.shade);
    }
    g.scale.y = s.state === 'stunned' ? 0.6 : 1;
  }

  const activeDrifters = new Set(game.drifters.map((d) => d.id));
  for (const id of [...drifterMeshes.keys()]) {
    if (!activeDrifters.has(id)) {
      entityGroup.remove(drifterMeshes.get(id));
      drifterMeshes.delete(id);
    }
  }
  for (const d of game.drifters) {
    if (!drifterMeshes.has(d.id)) addDrifterMesh(d);
    drifterMeshes.get(d.id).position.set(d.pos[0], d.pos[1], d.pos[2]);
  }

  for (const c of game.charms) {
    const g = charmMeshes.get(c.id);
    g.visible = c.available;
    g.rotation.y += dt * 2;
  }

  // ánh sáng môi trường tăng theo tiến độ
  const lit = game.lanterns.filter((l) => l.lit).length;
  ambient.intensity = 0.15 + 0.55 * (lit / game.lanterns.length);

  // camera
  const rad = (yawDeg * Math.PI) / 180;
  const fwd = { x: Math.sin(rad), z: Math.cos(rad) };
  const camDist = 8;
  const camH = 4.5;
  camera.position.set(p.pos[0] - fwd.x * camDist, p.pos[1] + camH, p.pos[2] - fwd.z * camDist);
  camera.lookAt(p.pos[0], p.pos[1] + 1.6, p.pos[2]);
}

// ---------- Bench (cảnh benchmark, đo FPS) ----------
function runBench(duration) {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed') || 42);
  bench = {
    duration: duration,
    warmupMs: 3000,
    startT: performance.now(),
    frames: [],
    done: false,
  };
  benchStartT = bench.startT;
  show(null);
  phase = 'bench';
  startBenchScene(seed);
}

function startBenchScene(seed) {
  game = new Game({ seed, night: 1 });
  buildTerrain(1);
  clearGroup(entityGroup);
  lanternMeshes.clear(); moteMeshes.clear(); shadeMeshes.clear(); drifterMeshes.clear(); charmMeshes.clear();
  // 3 đèn L1–L3 đang sáng fuel 100; L4–L5 tắt
  for (const l of game.lanterns) {
    buildLantern(l);
    l.lit = game.lanterns.indexOf(l) < 3;
    l.fuel = 6000;
  }
  // 200 Bóng Mực (wander), 100 đom đóm
  for (let i = 0; i < 200; i++) {
    const a = (i / 200) * Math.PI * 2;
    const r = 10 + (i % 22);
    const sh = { id: 'B_' + i, pos: [Math.cos(a) * r, 1.0, Math.sin(a) * r], state: 'wander', seed: i };
    game.shades.push(sh);
    addShadeMesh(sh);
  }
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2;
    const r = 8 + (i % 18);
    game.motes.push({ id: 'Bm_' + i, pos: [Math.cos(a) * r, 0, Math.sin(a) * r], kind: 'random', ttlTicks: null });
    addMoteMesh(game.motes[game.motes.length - 1]);
  }
  playerGroup = buildPlayer();
  scene.add(playerGroup);
  playerGroup.position.set(0, 0, 0);
  ambient.intensity = 0.35 + 0.55 * (game.lanterns.filter((l) => l.lit).length / 5) * 0.9;
}

function doBenchFrame(dt) {
  if (bench.done) return;
  const nowT = performance.now() / 1000;
  const wobble = nowT * 0.3;
  for (const sh of game.shades) {
    sh.pos[0] += Math.sin(wobble + sh.seed * 0.13) * 0.4;
    sh.pos[2] += Math.cos(wobble + sh.seed * 0.07) * 0.4;
    const m = shadeMeshes.get(sh.id);
    if (m) m.position.set(sh.pos[0], sh.pos[1], sh.pos[2]);
  }
  const a = (nowT / 15) * 2 * Math.PI;
  camera.position.set(30 * Math.cos(a), 15, 30 * Math.sin(a));
  camera.lookAt(0, 0, 0);
  const elapsed = nowT - bench.startT / 1000;
  bench.frames.push({ t: elapsed, dt: dt });
  if (elapsed > bench.duration + bench.warmupMs / 1000 + 0.5) benchFinish();
}

function benchFinish() {
  if (bench.done) return;
  bench.done = true;
  const framesAll = bench.frames;
  const warmS = bench.warmupMs / 1000;
  const frames = framesAll.filter((f) => f.t >= warmS && f.t <= warmS + bench.duration);
  const dtMs = frames.map((f) => f.dt * 1000);
  const N = dtMs.length;
  const sumDt = dtMs.reduce((a, b) => a + b, 0);
  const avgFps = N > 0 && sumDt > 0 ? (1000 * N) / sumDt : 0;

  const k = Math.max(1, Math.ceil(0.01 * N));
  const sortedWorst = [...dtMs].sort((a, b) => b - a).slice(0, k);
  const meanWorst = sortedWorst.reduce((a, b) => a + b, 0) / sortedWorst.length;
  const p1LowFps = meanWorst > 0 ? 1000 / meanWorst : 0;

  const sorted = [...dtMs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length));
  const frameMsP95 = sorted.length ? sorted[idx] : 0;

  const loadMs = framesAll.length > 0 ? Math.round(framesAll[0].t * 1000) : 0;
  const peakMem = typeof performance.memory !== 'undefined' ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
  const result = {
    contract_version: '1.3',
    avg_fps: +avgFps.toFixed(1),
    p1_low_fps: +p1LowFps.toFixed(1),
    frame_ms_p95: +frameMsP95.toFixed(1),
    frames: N,
    load_ms: loadMs,
    peak_mem_mb: peakMem,
    vsync_off: false,
    renderer: 'Three.js 0.160.0 (vendored), WebGL, shader sRGB',
    os: navigator.platform || 'unknown',
  };
  fetch('/api/bench', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result) })
    .catch(() => {})
    .finally(() => {
      const info = document.createElement('div');
      info.id = 'bench-result';
      info.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,10,30,0.95);color:#F5F1E6;font:20px system-ui;z-index:99';
      info.textContent = 'Bench: avg_fps ' + result.avg_fps + ', p1_low_fps ' + result.p1_low_fps + ', frames ' + N;
      document.body.appendChild(info);
    });
}

function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - lastT) / 1000, 0.25);
  lastT = t;

  if (bench) {
    doBenchFrame(dt);
    renderer.render(scene, camera);
    return;
  }

  acc += dt;

  if (phase === 'playing' && game && game.state === 'playing' && !paused) {
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      const events = game.step(buildFrame());
      handleEvents(events);
      acc -= STEP;
      steps++;
      if (game.state !== 'playing') break;
    }
    if (game.state !== 'playing') onGameOver();
  } else {
    acc = 0;
  }

  if (game) syncScene(dt);

  // hiệu ứng
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.age += dt;
    const tt = fx.age / fx.life;
    if (tt >= 1) {
      scene.remove(fx.mesh);
      effects.splice(i, 1);
      continue;
    }
    if (fx.kind === 'ring') {
      fx.mesh.scale.setScalar(0.5 + (fx.maxR - 0.5) * tt);
      fx.mesh.material.opacity = 0.8 * (1 - tt);
    }
  }

  if (!reducedMotion && flashT > 0) {
    flashT -= dt;
    flashEl.style.opacity = String(Math.min(1, flashT * 4));
  } else if (flashEl.style.opacity !== '0') {
    flashEl.style.opacity = '0';
  }

  if (phase === 'playing' && game && !paused) updateHUD();

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(loop);

// Bench: kích hoạt tự động khi URL có tham số ?bench=1
// Leaderboard & Leaderboard-close
$('leaderboard-close').onclick = () => show('menu');

window.addEventListener('load', async () => {
  await loadLeaderboard();
  applyAccessibility();
  const params = new URLSearchParams(location.search);
  if (params.get('bench') === '1') runBench(Number(params.get('duration') || 30));
});

// Expose game cho công cụ chụp frame (demo video)
window.__ddl = {
  get game() { return game; },
  get renderer() { return renderer; },
  get scene() { return scene; },
  get camera() { return camera; },
  get menu() { return $('menu'); },
  startGame, syncScene, updateHUD,
};
