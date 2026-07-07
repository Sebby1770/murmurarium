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
const paletteName = document.querySelector("#palette-name");
const coherenceLabel = document.querySelector("#coherence");
const linkCountLabel = document.querySelector("#link-count");
const dominantFrequencyLabel = document.querySelector("#dominant-frequency");
const strongestPacketLabel = document.querySelector("#strongest-packet");
const packetCountLabel = document.querySelector("#packet-count");
const packetList = document.querySelector("#packet-list");
const scanLog = document.querySelector("#scan-log");
const scanCount = document.querySelector("#scan-count");
const scanButton = document.querySelector("#scan");
const freezeButton = document.querySelector("#freeze");
const soundButton = document.querySelector("#sound");
const captureButton = document.querySelector("#capture");
const exportButton = document.querySelector("#export-json");
const shareButton = document.querySelector("#share");
const modeInput = document.querySelector("#mode");
const timelinePanel = document.querySelector("#timeline");
const timelineMode = document.querySelector("#timeline-mode");
const presetButtons = document.querySelectorAll(".preset");

const stations = [
  "numbers station for houseplants",
  "lost pager under the pier",
  "antenna dreams in orange",
  "midnight kettle on channel nine",
  "static politely eating a map",
  "two magnets arguing with thunder",
  "secret weather from the laundromat",
];

let state = null;
let pointer = { x: -1, y: -1 };
let lastFetch = 0;
let start = performance.now();
let audio = null;
let isFrozen = false;
let scanHistory = [];

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
    mode: modeInput.value,
    t: String(((now - start) / 1000).toFixed(3)),
  });
  return `/api/transmission?${params.toString()}`;
}

function syncUrlState() {
  const params = new URLSearchParams({
    seed: seedInput.value,
    frequency: frequencyInput.value,
    noise: noiseInput.value,
    packets: packetsInput.value,
    mode: modeInput.value,
  });
  const next = `#${params.toString()}`;
  if (window.location.hash !== next) {
    history.replaceState(null, "", next);
  }
}

function loadUrlState() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("seed")) seedInput.value = params.get("seed");
  if (params.get("frequency")) frequencyInput.value = params.get("frequency");
  if (params.get("noise")) noiseInput.value = params.get("noise");
  if (params.get("packets")) packetsInput.value = params.get("packets");
  if (params.get("mode")) modeInput.value = params.get("mode");
}

async function loadState(force = false) {
  const now = performance.now();
  if (isFrozen && !force) return;
  if (!force && now - lastFetch < 520) return;
  lastFetch = now;
  updateControlLabels();

  try {
    const response = await fetch(apiUrl(now));
    state = await response.json();
    applyPalette();
    updateLabels();
    updatePacketList();
    updateScanLog();
    updateTimeline();
    updateAudio();
    syncUrlState();
  } catch (error) {
    hoverText.textContent = "Signal endpoint is quiet. Check the local server.";
  }
}

function applyPalette() {
  if (!state?.signal?.palette) return;
  const palette = state.signal.palette;
  document.documentElement.style.setProperty("--trace", palette.trace);
  document.documentElement.style.setProperty("--amber", palette.amber);
  document.documentElement.style.setProperty("--hot", palette.hot);
  document.documentElement.style.setProperty("--cool", palette.cool);
  document.documentElement.style.setProperty("--bg", palette.background);
  paletteName.textContent = palette.name;
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
  coherenceLabel.textContent = `${Math.round(state.analysis.coherence * 100)}%`;
  linkCountLabel.textContent = String(state.analysis.linkCount);
  dominantFrequencyLabel.textContent = `${Number(state.analysis.dominantFrequency).toFixed(2)} Hz`;
  strongestPacketLabel.textContent = state.analysis.strongestPacket.label;
}

function updatePacketList() {
  if (!state) return;
  const packets = [...state.packets]
    .sort((left, right) => right.strength - left.strength)
    .slice(0, 6);
  packetCountLabel.textContent = `${state.packets.length} bursts`;
  packetList.innerHTML = packets
    .map((packet) => {
      const strength = Math.round(packet.strength * 100);
      return `
        <li>
          <span class="packet-rank">${packet.glyph}</span>
          <span>
            <strong>${packet.label}</strong>
            <em>${packet.band} / tone ${packet.tone}</em>
          </span>
          <b>${strength}%</b>
        </li>
      `;
    })
    .join("");
}

function updateTimeline() {
  if (!state?.timeline) return;
  timelineMode.textContent = state.mode || "voice";
  timelinePanel.innerHTML = state.timeline
    .map(
      (point) => `
        <div class="timeline-point" style="--coherence:${point.coherence}">
          <span>${point.t}s</span>
          <b>${Math.round(point.coherence * 100)}%</b>
        </div>
      `
    )
    .join("");
}

function updateScanLog() {
  if (!state) return;
  const entry = {
    callsign: state.signal.callsign,
    seed: state.seed,
    coherence: Math.round(state.analysis.coherence * 100),
  };
  const last = scanHistory[0];
  if (!last || last.callsign !== entry.callsign || last.seed !== entry.seed) {
    scanHistory = [entry, ...scanHistory].slice(0, 5);
  }
  scanCount.textContent = String(scanHistory.length);
  scanLog.innerHTML = scanHistory
    .map(
      (item) => `
        <li>
          <strong>${item.callsign}</strong>
          <span>${item.coherence}% / ${item.seed}</span>
        </li>
      `
    )
    .join("");
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
  gradient.addColorStop(0, cssVar("--bg"));
  gradient.addColorStop(0.55, "#101711");
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
  ctx.strokeStyle = alpha(cssVar("--trace"), 0.22);
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
  ctx.shadowColor = alpha(cssVar("--trace"), 0.55);
  ctx.strokeStyle = cssVar("--trace");
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = cssVar("--amber");
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`TRACE ${state.signal.callsign}`, 44, top + 23);
}

function drawSpectrum(width, height) {
  const left = 32;
  const bottom = height * 0.57;
  const graphWidth = Math.max(220, width * 0.38);
  const graphHeight = Math.max(90, height * 0.18);
  const barWidth = graphWidth / state.spectrum.length;

  ctx.fillStyle = alpha(cssVar("--amber"), 0.08);
  ctx.fillRect(left, bottom - graphHeight, graphWidth, graphHeight);

  state.spectrum.forEach((bin, index) => {
    const h = bin.amp * graphHeight;
    const hueColor = index % 3 === 0 ? cssVar("--hot") : index % 3 === 1 ? cssVar("--amber") : cssVar("--cool");
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

  ctx.strokeStyle = alpha(cssVar("--trace"), 0.18);
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, (radius * ring) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  const sweep = (performance.now() / 1600) % (Math.PI * 2);
  ctx.strokeStyle = alpha(cssVar("--amber"), 0.72);
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
    ctx.rotate((performance.now() / 900) * packet.drift);
    ctx.shadowBlur = isHovered ? 26 : 14;
    ctx.shadowColor = alpha(cssVar("--trace"), 0.6);
    ctx.fillStyle = isHovered ? cssVar("--amber") : cssVar("--trace");
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
    hoverText.textContent = isFrozen ? "Signal frozen. Resume scanning to animate new drift." : "Move over a packet to inspect the burst.";
  }
}

function drawLinks(cx, cy, radius) {
  const byId = new Map(state.packets.map((packet) => [packet.id, packet]));
  for (const link of state.links) {
    const from = byId.get(link.from);
    const to = byId.get(link.to);
    if (!from || !to) continue;
    ctx.strokeStyle = alpha(cssVar("--cool"), 0.07 + link.gain * 0.28);
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
  packetsInput.value = String(12 + Math.floor(Math.random() * 24));
  start = performance.now();
  loadState(true);
}

function usePreset(event) {
  const button = event.currentTarget;
  seedInput.value = button.dataset.seed;
  frequencyInput.value = button.dataset.frequency;
  noiseInput.value = button.dataset.noise;
  packetsInput.value = button.dataset.packets;
  if (button.dataset.mode) modeInput.value = button.dataset.mode;
  start = performance.now();
  loadState(true);
}

async function shareStation() {
  syncUrlState();
  const url = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
  try {
    await navigator.clipboard.writeText(url);
    hoverText.textContent = "Station link copied to clipboard.";
  } catch {
    hoverText.textContent = url;
  }
}

function capture() {
  const link = document.createElement("a");
  link.download = `spectral-switchboard-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function exportJson() {
  if (!state) return;
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.download = `spectral-switchboard-${state.signal.callsign}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function toggleFreeze() {
  isFrozen = !isFrozen;
  freezeButton.setAttribute("aria-pressed", String(isFrozen));
  freezeButton.textContent = isFrozen ? "Resume" : "Freeze";
  if (!isFrozen) {
    start = performance.now();
    loadState(true);
  }
}

function toggleSound() {
  if (audio) {
    audio.oscillators.forEach((osc) => osc.stop());
    audio.noiseSource?.stop();
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
  const noiseGain = context.createGain();
  noiseGain.gain.value = Number(noiseInput.value) * 0.018;
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseData.length; index += 1) {
    noiseData[index] = (Math.random() * 2 - 1) * 0.35;
  }
  const noiseSource = context.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseSource.connect(noiseGain);
  noiseGain.connect(gain);
  gain.connect(context.destination);
  noiseSource.start();
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
  audio = { context, oscillators, noiseGain, noiseSource };
  soundButton.setAttribute("aria-pressed", "true");
}

function updateAudio() {
  if (!audio || !state) return;
  audio.noiseGain.gain.setTargetAtTime(
    Number(noiseInput.value) * 0.018,
    audio.context.currentTime,
    0.15
  );
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

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function alpha(hex, opacity) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
});

canvas.addEventListener("pointerleave", () => {
  pointer = { x: -1, y: -1 };
});

seedInput.addEventListener("input", () => loadState(true));
frequencyInput.addEventListener("input", () => loadState(true));
noiseInput.addEventListener("input", () => loadState(true));
packetsInput.addEventListener("input", () => loadState(true));
modeInput.addEventListener("change", () => loadState(true));
scanButton.addEventListener("click", scan);
shareButton.addEventListener("click", shareStation);
freezeButton.addEventListener("click", toggleFreeze);
captureButton.addEventListener("click", capture);
exportButton.addEventListener("click", exportJson);
soundButton.addEventListener("click", toggleSound);
presetButtons.forEach((button) => button.addEventListener("click", usePreset));
window.addEventListener("resize", resizeCanvas);

setInterval(() => loadState(false), 560);
resizeCanvas();
loadUrlState();
loadState(true);
draw();
