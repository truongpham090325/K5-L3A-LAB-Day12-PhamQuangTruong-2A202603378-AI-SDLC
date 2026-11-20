// Âm thanh thủ tục (WebAudio) — không dùng asset ngoài.
// Nhạc nền + hiệu ứng tạo bằng oscillator/noise.

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;

const VOLUME_KEY = 'ddl_settings';

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(masterGain);
  }
  return ctx;
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(VOLUME_KEY)) || { music: 0.5, sfx: 0.8, sensitivity: 0.22 };
  } catch {
    return { music: 0.5, sfx: 0.8, sensitivity: 0.22 };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify(s));
  } catch {}
}

export function setMusicVolume(v) {
  ensureCtx();
  musicGain.gain.value = v;
}
export function setSfxVolume(v) {
  ensureCtx();
  sfxGain.gain.value = v;
}

// nhạc nền: pad êm dịu, tái tạo theo vòng
export function startMusic() {
  ensureCtx();
  if (musicTimer) return;
  let bar = 0;
  const chords = [
    [130.81, 164.81, 196.0, 246.94], // Cmaj7-ish
    [110.0, 130.81, 164.81, 220.0], // Am
    [98.0, 123.47, 146.83, 196.0], // G
    [87.31, 110.0, 130.81, 174.61], // F
  ];
  musicTimer = setInterval(() => {
    if (!ctx) return;
    const t = ctx.currentTime;
    const chord = chords[bar % chords.length];
    for (const f of chord) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (Math.random() - 0.5) * 8;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.03, t + 1.5);
      g.gain.linearRampToValueAtTime(0.0001, t + 6);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 6.2);
    }
    bar++;
  }, 6500);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function blip(freq, dur, type = 'sine', vol = 0.3, slide = 0) {
  ensureCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.25, lp = 800) {
  ensureCtx();
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  src.start(t);
}

export function sfx(name) {
  ensureCtx();
  switch (name) {
    case 'pickup':
      blip(880, 0.08, 'sine', 0.25, 300);
      break;
    case 'lantern':
      blip(523, 0.5, 'triangle', 0.3, 200);
      blip(784, 0.5, 'sine', 0.2, 100);
      break;
    case 'pulse':
      blip(220, 0.25, 'sawtooth', 0.2, -80);
      noise(0.2, 0.15, 2000);
      break;
    case 'hit':
      noise(0.2, 0.3, 400);
      blip(110, 0.25, 'square', 0.2, -60);
      break;
    case 'jump':
      blip(330, 0.12, 'sine', 0.2, 200);
      break;
    case 'dash':
      noise(0.15, 0.2, 1500);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.25), i * 120));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'triangle', 0.25), i * 150));
      break;
    case 'shade':
      blip(70, 0.4, 'sawtooth', 0.2, 20);
      break;
    case 'countdown':
      blip(660, 0.1, 'square', 0.2);
      break;
    default:
      blip(440, 0.1, 'sine', 0.2);
  }
}
