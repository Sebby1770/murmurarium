const canvas = document.querySelector("#signal-canvas");
const ctx = canvas.getContext("2d");
const seedInput = document.querySelector("#seed");
const frequencyInput = document.querySelector("#frequency");
const noiseInput = document.querySelector("#noise");
const packetsInput = document.querySelector("#packets");
const frequencyValue = document.querySelector("#frequency-value");
const noiseValue = document.querySelector("#noise-value");
const packetsValue = document.querySelector("#packets-value");
const decoded = document.querySelector("#decoded");
const hoverText = document.querySelector("#hover-text");
const callsignLabel = document.querySelector("#callsign");
const stabilityLabel = document.querySelector("#stability");
const carrierLabel = document.querySelector("#carrier");
const scanButton = document.querySelector("#scan");
const soundButton = document.querySelector("#sound");
const captureButton = document.querySelector("#capture");

const stations = [
  "numbers station for houseplants",
  "lost pager under the pier",
  "antenna dreams in orange",
  "midnight kettle on channel nine",
  "static politely eating a map",
  "two magnets arguing with thunder",
  "secret weather from the laundromat"
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
    frequency: frequencyInput.value,
    noise: noiseInput.value,
    packets: packetsInput.value,
    t: String(((now - start) / 1000).toFixed(3))
  });
  return `/api/transmission?${params.toString()}`;
}

async function loadState(force = false) {
  const now = performance.now();
  if (!force && now - lastFetch < 520) return;
  lastFetch = now;
  updateControlLabels();
  const response = await fetch(apiUrl(now));
  state = await response.json();
  updateLabels();
  updateAudio();
}

function updateControlLabels() {
  frequencyValue.textContent = Number(frequencyInput.value).toFixed(2);
  noiseValue.textContent = Number(noiseInput.value).toFixed(2);
  packetsValue.textContent = packetsInput.value;
}

function updateLabels() {
  if (!state) return;
  decoded.textContent = state.signal.decoded;
  callsignLabel.textContent = state.signal.callsign;
  stabilityLabel.textContent = `${Math.round(state.signal.stability * 100)}%`;
  carrierLabel.textContent = `${state.signal.carrier.toFixed(2)} MHz`;
}

function draw() {
  resizeCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  drawConsole(width, height);
  if (state) {
    drawWaveform(width, height);
    drawSpectrum(width, height);
    drawRadar(width, height);
  }
  requestAnimationFrame(draw);
}

function drawConsole(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#05070c");
  gradient.addColorStop(0.5, "#101711");
  gradient.addColorStop(1, "#090610");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(248, 243, 214, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawWaveform(width, height) {
  const top = height * 0.08;
  const bandHeight = Math.max(130, height * 0.26);
  const baseline = top + bandHeight / 2;

  ctx.fillStyle = "rgba(5, 7, 12, 0.58)";
  ctx.fillRect(28, top, width - 56, bandHeight);
  ctx.strokeStyle = "rgba(124, 255, 196, 0.18)";
  ctx.strokeRect(28, top, width - 56, bandHeight);

  ctx.beginPath();
  state.waveform.forEach((sample, index) => {
    const x = 42 + (index / (state.waveform.length - 1)) * (width - 84);
    const y = baseline + sample * bandHeight * 0.38;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(124, 255, 196, 0.55)";
  ctx.strokeStyle = "#7cffc4";
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffcf5a";
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`TRACE ${state.signal.callsign}`, 44, top + 23);
}

function drawSpectrum(width, height) {
  const left = 32;
  const bottom = height * 0.57;
  const graphWidth = Math.max(220, width * 0.38);
  const graphHeight = Math.max(90, height * 0.18);
  const barWidth = graphWidth / state.spectrum.length;

  ctx.fillStyle = "rgba(255, 207, 90, 0.06)";
  ctx.fillRect(left, bottom - graphHeight, graphWidth, graphHeight);

  state.spectrum.forEach((bin, index) => {
    const h = bin.amp * graphHeight;
    const hueColor = index % 3 === 0 ? "#ff4f9a" : index % 3 === 1 ? "#ffcf5a" : "#5bc0ff";
    ctx.fillStyle = hueColor;
    ctx.globalAlpha = 0.35 + bin.amp * 0.52;
    ctx.fillRect(left + index * barWidth, bottom - h, Math.max(2, barWidth - 2), h);
  });
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(248, 243, 214, 0.18)";
  ctx.strokeRect(left, bottom - graphHeight, graphWidth, graphHeight);
}

function drawRadar(width, height) {
  const radius = Math.min(width, height) * 0.29;
  const cx = width * 0.64;
  const cy = height * 0.48;
  const hovered = findHovered(width, height, cx, cy, radius);

  ctx.strokeStyle = "rgba(124, 255, 196, 0.18)";
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, (radius * ring) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  const sweep = (performance.now() / 1600) % (Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 207, 90, 0.65)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweep) * radius, cy + Math.sin(sweep) * radius);
  ctx.stroke();

  drawLinks(cx, cy, radius);

  for (const packet of state.packets) {
    const x = cx + (packet.x - 0.5) * radius * 2;
    const y = cy + (packet.y - 0.5) * radius * 2;
    const isHovered = hovered && hovered.id === packet.id;
    const size = 6 + packet.strength * 13;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(performance.now() / 900 * packet.drift);
    ctx.shadowBlur = isHovered ? 26 : 14;
    ctx.shadowColor = "rgba(124, 255, 196, 0.6)";
    ctx.fillStyle = isHovered ? "#ffcf5a" : "#7cffc4";
    ctx.strokeStyle = "rgba(5, 7, 12, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = isHovered ? "#f8f3d6" : "rgba(248, 243, 214, 0.72)";
    ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(packet.glyph, x + size * 0.68, y + 4);
  }

  if (hovered) {
    hoverText.textContent = `${hovered.label}: ${hovered.phrase}. Band: ${hovered.band}. Tone ${hovered.tone}.`;
  } else {
    hoverText.textContent = "Move over a packet to inspect the burst.";
  }
}

function drawLinks(cx, cy, radius) {
  const byId = new Map(state.packets.map((packet) => [packet.id, packet]));
  for (const link of state.links) {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (!from || !to) continue;
    ctx.strokeStyle = `rgba(91, 192, 255, ${0.07 + link.gain * 0.24})`;
    ctx.lineWidth = 1 + link.gain * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + (from.x - 0.5) * radius * 2, cy + (from.y - 0.5) * radius * 2);
    ctx.lineTo(cx + (to.x - 0.5) * radius * 2, cy + (to.y - 0.5) * radius * 2);
    ctx.stroke();
  }
}

function findHovered(width, height, cx, cy, radius) {
  if (!state || pointer.x < 0) return null;
  let winner = null;
  let winnerDistance = Infinity;
  for (const packet of state.packets) {
    const x = cx + (packet.x - 0.5) * radius * 2;
    const y = cy + (packet.y - 0.5) * radius * 2;
    const distance = Math.hypot(pointer.x - x, pointer.y - y);
    if (distance < 18 && distance < winnerDistance) {
      winner = packet;
      winnerDistance = distance;
    }
  }
  return winner;
}

function scan() {
  seedInput.value = stations[Math.floor(Math.random() * stations.length)];
  frequencyInput.value = (2 + Math.random() * 16).toFixed(2);
  noiseInput.value = (Math.random() * 0.72).toFixed(2);
  start = performance.now();
  loadState(true);
}

function capture() {
  const link = document.createElement("a");
  link.download = `spectral-switchboard-${Date.now()}.png`;
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
  gain.gain.value = 0.032;
  gain.connect(context.destination);
  const oscillators = state.packets.slice(0, 5).map((packet, index) => {
    const osc = context.createOscillator();
    const localGain = context.createGain();
    osc.type = index % 2 === 0 ? "sawtooth" : "sine";
    osc.frequency.value = midiToHz(packet.tone);
    localGain.gain.value = 0.16;
    osc.connect(localGain);
    localGain.connect(gain);
    osc.start();
    return osc;
  });
  audio = { context, oscillators };
  soundButton.setAttribute("aria-pressed", "true");
}

function updateAudio() {
  if (!audio || !state) return;
  state.packets.slice(0, audio.oscillators.length).forEach((packet, index) => {
    audio.oscillators[index].frequency.setTargetAtTime(
      midiToHz(packet.tone),
      audio.context.currentTime,
      0.12
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
frequencyInput.addEventListener("input", () => loadState(true));
noiseInput.addEventListener("input", () => loadState(true));
packetsInput.addEventListener("input", () => loadState(true));
scanButton.addEventListener("click", scan);
captureButton.addEventListener("click", capture);
soundButton.addEventListener("click", toggleSound);
window.addEventListener("resize", resizeCanvas);

setInterval(() => loadState(false), 560);
resizeCanvas();
loadState(true);
draw();
