const canvas = document.querySelector("#murmur-canvas");
const ctx = canvas.getContext("2d");
const seedInput = document.querySelector("#seed");
const countInput = document.querySelector("#count");
const gravityInput = document.querySelector("#gravity");
const countValue = document.querySelector("#count-value");
const gravityValue = document.querySelector("#gravity-value");
const omen = document.querySelector("#omen");
const hoverText = document.querySelector("#hover-text");
const paletteLabel = document.querySelector("#palette");
const pulseLabel = document.querySelector("#pulse");
const threadsLabel = document.querySelector("#threads");
const randomizeButton = document.querySelector("#randomize");
const soundButton = document.querySelector("#sound");
const snapshotButton = document.querySelector("#snapshot");

const seeds = [
  "static radio in a teacup",
  "lunar soup elevator",
  "velvet thunder alphabet",
  "small opera for magnets",
  "borrowed moon in the sink",
  "greenhouse full of dial tones",
  "accordion weather machine"
];

let state = null;
let pointer = { x: -1, y: -1 };
let lastFetch = 0;
let start = performance.now();
let audio = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function apiUrl(now) {
  const params = new URLSearchParams({
    seed: seedInput.value,
    count: countInput.value,
    gravity: gravityInput.value,
    t: String(((now - start) / 1000).toFixed(3))
  });
  return `/api/terrarium?${params.toString()}`;
}

async function loadState(force = false) {
  const now = performance.now();
  if (!force && now - lastFetch < 600) return;
  lastFetch = now;
  countValue.textContent = countInput.value;
  gravityValue.textContent = Number(gravityInput.value).toFixed(2);
  const response = await fetch(apiUrl(now));
  state = await response.json();
  updateLabels();
  updateAudio();
}

function updateLabels() {
  if (!state) return;
  omen.textContent = state.weather.omen;
  paletteLabel.textContent = state.weather.palette.name;
  pulseLabel.textContent = state.weather.pulse.toFixed(2);
  threadsLabel.textContent = String(state.threads.length);
}

function draw() {
  resizeCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  drawBackground(width, height);
  if (state) {
    drawThreads(width, height);
    drawMurmurs(width, height);
  }
  requestAnimationFrame(draw);
}

function drawBackground(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#080807");
  gradient.addColorStop(0.48, "#17100d");
  gradient.addColorStop(1, "#080807");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 42; i += 1) {
    const x = (Math.sin(i * 71.4) * 0.5 + 0.5) * width;
    const y = (Math.cos(i * 43.2) * 0.5 + 0.5) * height;
    ctx.fillStyle = i % 3 === 0 ? "#63d6d0" : "#ffc45c";
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawThreads(width, height) {
  const byId = new Map(state.murmurs.map((murmur) => [murmur.id, murmur]));
  for (const thread of state.threads) {
    const from = byId.get(thread.from);
    const to = byId.get(thread.to);
    if (!from || !to) continue;
    ctx.strokeStyle = `rgba(245, 231, 200, ${0.05 + thread.strength * 0.2})`;
    ctx.lineWidth = 1 + thread.strength * 1.6;
    ctx.beginPath();
    ctx.moveTo(from.x * width, from.y * height);
    ctx.lineTo(to.x * width, to.y * height);
    ctx.stroke();
  }
}

function drawMurmurs(width, height) {
  const hovered = findHovered(width, height);
  for (const murmur of state.murmurs) {
    const x = murmur.x * width;
    const y = murmur.y * height;
    const radius = Math.max(5, murmur.radius * Math.min(width, height));
    const spin = (performance.now() / 1000) * murmur.spin;
    const isHovered = hovered && hovered.id === murmur.id;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.shadowBlur = isHovered ? 30 : 16 * murmur.glow;
    ctx.shadowColor = `hsla(${murmur.hue}, 90%, 62%, 0.8)`;
    ctx.fillStyle = `hsla(${murmur.hue}, 86%, ${isHovered ? 70 : 58}%, 0.92)`;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const wobble = 1 + Math.sin(i + performance.now() / 700 * murmur.wobble) * 0.18;
      const px = Math.cos(angle) * radius * wobble;
      const py = Math.sin(angle) * radius * (1.16 - wobble * 0.18);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (hovered) {
    hoverText.textContent = `${hovered.name}: ${hovered.phrase}. Mood: ${hovered.mood}. Note ${hovered.note}.`;
  } else {
    hoverText.textContent = "Move over a murmur to inspect its tiny opinion.";
  }
}

function findHovered(width, height) {
  if (!state || pointer.x < 0) return null;
  let winner = null;
  let winnerDistance = Infinity;
  for (const murmur of state.murmurs) {
    const x = murmur.x * width;
    const y = murmur.y * height;
    const radius = Math.max(10, murmur.radius * Math.min(width, height) * 1.8);
    const distance = Math.hypot(pointer.x - x, pointer.y - y);
    if (distance < radius && distance < winnerDistance) {
      winner = murmur;
      winnerDistance = distance;
    }
  }
  return winner;
}

function randomize() {
  seedInput.value = seeds[Math.floor(Math.random() * seeds.length)];
  start = performance.now();
  loadState(true);
}

function snapshot() {
  const link = document.createElement("a");
  link.download = `murmurarium-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function toggleSound() {
  if (audio) {
    audio.oscillators.forEach((osc) => osc.stop());
    audio.context.close();
    audio = null;
    soundButton.setAttribute("aria-pressed", "false");
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext || !state) return;
  const context = new AudioContext();
  const gain = context.createGain();
  gain.gain.value = 0.035;
  gain.connect(context.destination);
  const oscillators = state.murmurs.slice(0, 6).map((murmur, index) => {
    const osc = context.createOscillator();
    const localGain = context.createGain();
    osc.type = index % 2 === 0 ? "sine" : "triangle";
    osc.frequency.value = midiToHz(murmur.note);
    localGain.gain.value = 0.22;
    osc.connect(localGain);
    localGain.connect(gain);
    osc.start();
    return osc;
  });
  audio = { context, gain, oscillators };
  soundButton.setAttribute("aria-pressed", "true");
}

function updateAudio() {
  if (!audio || !state) return;
  state.murmurs.slice(0, audio.oscillators.length).forEach((murmur, index) => {
    audio.oscillators[index].frequency.setTargetAtTime(
      midiToHz(murmur.note),
      audio.context.currentTime,
      0.18
    );
  });
}

function midiToHz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
});

canvas.addEventListener("pointerleave", () => {
  pointer = { x: -1, y: -1 };
});

seedInput.addEventListener("input", () => loadState(true));
countInput.addEventListener("input", () => loadState(true));
gravityInput.addEventListener("input", () => loadState(true));
randomizeButton.addEventListener("click", randomize);
snapshotButton.addEventListener("click", snapshot);
soundButton.addEventListener("click", toggleSound);
window.addEventListener("resize", resizeCanvas);

setInterval(() => loadState(false), 650);
resizeCanvas();
loadState(true);
draw();
