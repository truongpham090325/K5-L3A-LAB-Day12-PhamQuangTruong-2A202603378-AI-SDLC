// Đảo Đèn Lồng — phần hiển thị 3D (Three.js) cho chế độ chơi trên trình duyệt.
// Dùng chung engine logic `../core/sim.js` với chế độ headless.

import * as THREE from '../vendor/three.module.js';
import { Game } from '../core/sim.js';
import { TUNING, ISLAND_RADIUS } from '../core/constants.js';

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const flamesEl = $('flames');
const carriedEl = $('carried');
const lanternsEl = $('lanterns');
const timeEl = $('time');
const scoreEl = $('score');
const overlay = $('overlay');
const overlayTitle = $('overlay-title');
const overlaySub = $('overlay-sub');
const flashEl = $('flash');
const hintEl = $('hint');

// ---------- renderer / scene / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x0a0a1a, 35, 90);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);

// ánh sáng nền
scene.add(new THREE.AmbientLight(0x334466, 1.4));
const hemi = new THREE.HemisphereLight(0x8899cc, 0x141420, 0.7);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x99aacc, 0.5);
moon.position.set(25, 50, 15);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -50;
moon.shadow.camera.right = 50;
moon.shadow.camera.top = 50;
moon.shadow.camera.bottom = -50;
scene.add(moon);

// ---------- ngôi sao ----------
function buildStars() {
  const count = 700;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 5;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xccccff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.8 });
  scene.add(new THREE.Points(geo, mat));
}
buildStars();

// ---------- đảo ----------
function buildIsland() {
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 4, 2.2, 64),
    new THREE.MeshStandardMaterial({ color: 0x2c4430, roughness: 1 })
  );
  ground.position.y = -1.1;
  ground.receiveShadow = true;
  scene.add(ground);

  const top = new THREE.Mesh(
    new THREE.CircleGeometry(ISLAND_RADIUS, 64),
    new THREE.MeshStandardMaterial({ color: 0x31503a, roughness: 1 })
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.005;
  top.receiveShadow = true;
  scene.add(top);

  // rìa đảo phát sáng nhẹ (chỉ hiển thị)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(ISLAND_RADIUS, 0.25, 8, 80),
    new THREE.MeshBasicMaterial({ color: 0x5a8f66 })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.05;
  scene.add(rim);

  // cây/đá trang trí
  const decor = new THREE.Group();
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * (ISLAND_RADIUS - 6);
    const isTree = Math.random() > 0.5;
    let m;
    if (isTree) {
      m = new THREE.Mesh(new THREE.ConeGeometry(0.5 + Math.random() * 0.4, 1.5 + Math.random(), 7), new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 1 }));
      m.position.y = 0.8;
    } else {
      m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.5), new THREE.MeshStandardMaterial({ color: 0x3a4a44, roughness: 1 }));
      m.position.y = 0.3;
    }
    m.position.x = Math.cos(a) * r;
    m.position.z = Math.sin(a) * r;
    m.castShadow = true;
    decor.add(m);
  }
  scene.add(decor);
}
buildIsland();

// ---------- game ----------
const game = new Game({ seed: (Date.now() >>> 0) });
game.buildScenario(null);

// ---------- người chơi ----------
const playerGroup = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0xd98b3a, roughness: 0.9 }));
  body.position.y = 0.6;
  body.castShadow = true;
  playerGroup.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf2c39a, roughness: 0.8 }));
  head.position.y = 1.42;
  playerGroup.add(head);

  // nón lá
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 16), new THREE.MeshStandardMaterial({ color: 0xe7c86a, roughness: 0.8 }));
  hat.position.y = 1.72;
  hat.castShadow = true;
  playerGroup.add(hat);

  // đèn lồng nhỏ treo trên nón
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  lantern.position.set(0.02, 1.05, 0.35);
  playerGroup.add(lantern);

  // ánh sáng ấm quanh người chơi
  const pLight = new THREE.PointLight(0xffcc88, 8, 14, 1.8);
  pLight.position.y = 1.2;
  playerGroup.add(pLight);
}
scene.add(playerGroup);

// ---------- đèn lồng lớn ----------
const lanternMeshes = new Map();
for (const l of game.lanterns) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 8), new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9 }));
  pole.position.y = 1.6;
  pole.castShadow = true;
  group.add(pole);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.85), new THREE.MeshStandardMaterial({ color: 0x3a2a18, emissive: 0x000000, roughness: 0.7 }));
  body.position.y = 3.4;
  body.castShadow = true;
  group.add(body);

  const light = new THREE.PointLight(0xffaa33, 0, 15, 1.8);
  light.position.y = 3.4;
  group.add(light);

  group.position.set(l.pos[0], l.pos[1], l.pos[2]);
  scene.add(group);
  lanternMeshes.set(l.id, { group, body, light });
}

// ---------- đom đóm ----------
const moteMeshes = new Map();
function addMoteMesh(m) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.25 }));
  g.add(halo);
  g.position.set(m.pos[0], m.pos[1] + 0.8, m.pos[2]);
  g.userData.phase = Math.random() * Math.PI * 2;
  scene.add(g);
  moteMeshes.set(m.id, g);
}

// ---------- Bóng Mực ----------
const shadeMeshes = new Map();
function addShadeMesh(s) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 18), new THREE.MeshStandardMaterial({ color: 0x2a1738, emissive: 0x1a0a2a, roughness: 0.4 }));
  body.position.y = 1.0;
  body.castShadow = true;
  g.add(body);
  const mist = new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 18), new THREE.MeshBasicMaterial({ color: 0x6a3a8a, transparent: true, opacity: 0.18 }));
  mist.position.y = 1.0;
  g.add(mist);
  g.position.set(s.pos[0], s.pos[1], s.pos[2]);
  g.userData.body = body;
  scene.add(g);
  shadeMeshes.set(s.id, g);
}

for (const m of game.motes) addMoteMesh(m);
for (const s of game.shades) addShadeMesh(s);

// ---------- hiệu ứng ----------
const effects = [];

function spawnPulseRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.65, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(playerGroup.position.x, 0.15, playerGroup.position.z);
  scene.add(ring);
  effects.push({ kind: 'ring', mesh: ring, age: 0, life: 0.45, maxR: TUNING.pulse_radius });
}

// ---------- input ----------
const keys = {};
let yawDeg = 0;
let locked = false;
let jumpVy = 0;
let playerYVisual = 0;

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

renderer.domElement.addEventListener('click', () => {
  if (!locked && document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  if (locked) hintEl.style.opacity = '0.4';
  else hintEl.style.opacity = '1';
});
document.addEventListener('mousemove', (e) => {
  if (locked) yawDeg = (yawDeg + e.movementX * 0.22) % 360;
});

$('restart').addEventListener('click', () => location.reload());

// ---------- vòng lặp chính ----------
const STEP = 1 / 60;
let acc = 0;
let lastT = performance.now();
let flashT = 0;

function buildFrame() {
  const mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  const mz = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
  return { move: [mx, mz], cam_yaw_deg: yawDeg, jump: !!keys[' '], interact: !!keys['e'], pulse: !!keys['q'] };
}

function handleEvents(events) {
  for (const e of events) {
    if (e.name === 'pulse') spawnPulseRing();
    else if (e.name === 'player_hit') flashT = 0.25;
  }
}

function stepGame() {
  const events = game.step(buildFrame());
  handleEvents(events);
  if (game.state !== 'playing') showOverlay();
}

function showOverlay() {
  if (game.state === 'won') {
    overlayTitle.textContent = '🎉 Thắng rồi!';
    overlaySub.textContent = 'Mây đã thắp lại cả 5 Đèn Lồng Lớn. Điểm: ' + game.score;
  } else if (game.state === 'lost') {
    overlayTitle.textContent = '💫 Thua cuộc';
    overlaySub.textContent = 'Bóng tối đã nuốt lấy Mây. Điểm: ' + game.score;
  }
  overlay.classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const fx = effects[i];
    fx.age += dt;
    const t = fx.age / fx.life;
    if (t >= 1) {
      scene.remove(fx.mesh);
      effects.splice(i, 1);
      continue;
    }
    if (fx.kind === 'ring') {
      const r = 0.5 + (fx.maxR - 0.5) * t;
      fx.mesh.scale.setScalar(r);
      fx.mesh.material.opacity = 0.8 * (1 - t);
    }
  }
}

function syncScene(dt) {
  // người chơi (gồm nhảy trực quan)
  const pp = game.player.pos;
  playerGroup.position.set(pp[0], playerYVisual, pp[2]);
  playerGroup.rotation.y = (yawDeg * Math.PI) / 180;

  // đèn lồng lớn
  for (const l of game.lanterns) {
    const m = lanternMeshes.get(l.id);
    if (l.lit) {
      m.body.material.emissive.set(0xff9a2a);
      m.body.material.color.set(0xffb84d);
      m.light.intensity = 20;
    } else {
      m.body.material.emissive.set(0x000000);
      m.body.material.color.set(0x3a2a18);
      m.light.intensity = 0;
    }
  }

  // đom đóm (thêm/xóa + bồng bềnh)
  const activeMotes = new Set(game.motes.map((m) => m.id));
  for (const id of moteMeshes.keys()) {
    if (!activeMotes.has(id)) {
      scene.remove(moteMeshes.get(id));
      moteMeshes.delete(id);
    }
  }
  const now = performance.now() / 1000;
  for (const m of game.motes) {
    if (!moteMeshes.has(m.id)) addMoteMesh(m);
    const g = moteMeshes.get(m.id);
    g.position.set(m.pos[0], m.pos[1] + 0.8 + Math.sin(now * 2 + g.userData.phase) * 0.15, m.pos[2]);
  }

  // Bóng Mực (thêm/xóa + trạng thái)
  const activeShades = new Set(game.shades.map((s) => s.id));
  for (const id of shadeMeshes.keys()) {
    if (!activeShades.has(id)) {
      scene.remove(shadeMeshes.get(id));
      shadeMeshes.delete(id);
    }
  }
  for (const s of game.shades) {
    if (!shadeMeshes.has(s.id)) addShadeMesh(s);
    const g = shadeMeshes.get(s.id);
    g.position.set(s.pos[0], s.pos[1] + 1.0, s.pos[2]);
    const body = g.userData.body;
    if (s.state === 'stunned') {
      body.material.emissive.set(0x664488);
      g.scale.y = 0.6;
    } else {
      body.material.emissive.set(0x1a0a2a);
      g.scale.y = 1 + Math.sin(now * 3) * 0.05;
    }
  }

  // camera theo sau người chơi
  const rad = (yawDeg * Math.PI) / 180;
  const fwd = { x: Math.sin(rad), z: Math.cos(rad) };
  const camDist = 8;
  const camH = 4.5;
  camera.position.set(pp[0] - fwd.x * camDist, camH + playerYVisual * 0.5, pp[2] - fwd.z * camDist);
  camera.lookAt(pp[0], 1.6 + playerYVisual * 0.5, pp[2]);

  // HUD
  flamesEl.textContent = game.player.flames;
  carriedEl.textContent = game.player.carried;
  const lit = game.lanterns.filter((l) => l.lit).length;
  lanternsEl.textContent = '🏮 ' + lit + '/5';
  const timeLeft = Math.max(0, Math.ceil(game.nightDurationS - game.tick / 60));
  timeEl.textContent = timeLeft + 's';
  scoreEl.textContent = game.score;
}

function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min((t - lastT) / 1000, 0.25);
  lastT = t;
  acc += dt;

  // nhảy trực quan
  if (keys[' '] && playerYVisual <= 0.001) jumpVy = 6.5;
  playerYVisual += jumpVy * dt;
  jumpVy -= 18 * dt;
  if (playerYVisual < 0) {
    playerYVisual = 0;
    jumpVy = 0;
  }

  // bước mô phỏng với bước cố định 60Hz
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    if (game.state === 'playing') stepGame();
    acc -= STEP;
    steps++;
  }

  updateEffects(dt);
  syncScene(dt);

  if (flashT > 0) {
    flashT -= dt;
    flashEl.style.opacity = String(Math.min(1, flashT * 4));
  } else if (flashEl.style.opacity !== '0') {
    flashEl.style.opacity = '0';
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(loop);
