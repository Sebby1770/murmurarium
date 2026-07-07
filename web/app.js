const canvas = document.querySelector("#signal-canvas");
const ctx = canvas.getContext("2d");
const phosphorCanvas = document.querySelector("#phosphor-canvas");
const phosphorCtx = phosphorCanvas.getContext("2d");
const waterfallCanvas = document.querySelector("#waterfall-canvas");
const waterfallCtx = waterfallCanvas.getContext("2d");
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
const mixSeedInput = document.querySelector("#mix-seed");
const mixAmountInput = document.querySelector("#mix-amount");
const mixValue = document.querySelector("#mix-value");
const vuFill = document.querySelector("#vu-fill");
const fullscreenButton = document.querySelector("#fullscreen");
const gallerySaveButton = document.querySelector("#gallery-save");
const galleryList = document.querySelector("#gallery-list");
const galleryCount = document.querySelector("#gallery-count");
const GALLERY_KEY = "spectral-switchboard-gallery";
const autoScanButton = document.querySelector("#auto-scan");
const eventSeedButton = document.querySelector("#event-seed");
const tapeRecordButton = document.querySelector("#tape-record");
const tapePlayButton = document.querySelector("#tape-play");
const tapeClearButton = document.querySelector("#tape-clear");
const tapeCount = document.querySelector("#tape-count");
const challengeHint = document.querySelector("#challenge-hint");
const challengeStatus = document.querySelector("#challenge-status");
const challengeForm = document.querySelector("#challenge-form");
const challengeGuess = document.querySelector("#challenge-guess");
const liveStreamButton = document.querySelector("#live-stream");
const galleryExportButton = document.querySelector("#gallery-export");
const signalGradeLabel = document.querySelector("#signal-grade");
const interferenceLabel = document.querySelector("#interference-level");
const bandPlanList = document.querySelector("#band-plan");
const leaderboardList = document.querySelector("#leaderboard-list");
const leaderboardCount = document.querySelector("#leaderboard-count");
const LEADERBOARD_KEY = "spectral-switchboard-leaderboard";
const exportWavButton = document.querySelector("#export-wav");
const dnaHash = document.querySelector("#dna-hash");
const dnaBars = document.querySelector("#dna-bars");
const dnaResonance = document.querySelector("#dna-resonance");
const dnaHybrid = document.querySelector("#dna-hybrid");
const dreamText = document.querySelector("#dream-text");
const dreamMood = document.querySelector("#dream-mood");

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
let autoScanTimer = null;
let eventSource = null;
let tapeFrames = [];
let tapePlaying = false;
let challengeSolved = false;
let waterfallHistory = [];
let liveStreamActive = false;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  canvas.width = width;
  canvas.height = height;
  phosphorCanvas.width = width;
  phosphorCanvas.height = height;
  waterfallCanvas.width = width;
  waterfallCanvas.height = height;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  phosphorCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  waterfallCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function renderPhosphor(width, height) {
  phosphorCtx.globalAlpha = 0.88;
  phosphorCtx.drawImage(canvas, 0, 0, width, height);
  phosphorCtx.globalAlpha = 0.14;
  phosphorCtx.fillStyle = "#05070c";
  phosphorCtx.fillRect(0, 0, width, height);
  phosphorCtx.globalAlpha = 1;
  ctx.globalAlpha = 0.42;
  ctx.drawImage(phosphorCanvas, 0, 0, width, height);
  ctx.globalAlpha = 1;
}

function streamUrl() {
  const params = new URLSearchParams({
    seed: seedInput.value,
    frequency: frequencyInput.value,
    noise: noiseInput.value,
    packets: packetsInput.value,
    mode: modeInput.value,
    mix_seed: mixSeedInput.value,
    mix_amount: mixAmountInput.value,
    interval: "0.55",
  });
  return `/api/stream?${params.toString()}`;
}

function apiUrl(now) {
  const params = new URLSearchParams({
    seed: seedInput.value,
    frequency: frequencyInput.value,
    noise: noiseInput.value,
    packets: packetsInput.value,
    mode: modeInput.value,
    mix_seed: mixSeedInput.value,
    mix_amount: mixAmountInput.value,
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
    mix_seed: mixSeedInput.value,
    mix_amount: mixAmountInput.value,
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
  if (params.get("mix_seed")) mixSeedInput.value = params.get("mix_seed");
  if (params.get("mix_amount")) mixAmountInput.value = params.get("mix_amount");
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
    updateChallenge();
    updateDna();
    updateDream();
    updateBandPlan();
    updateSignalTelemetry();
    pushWaterfallRow();
    updateAudio();
    recordTapeFrame();
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
  mixValue.textContent = Number(mixAmountInput.value).toFixed(2);
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
  if (state.vu != null) {
    vuFill.style.height = `${Math.round(state.vu * 100)}%`;
  }
}

function updateSignalTelemetry() {
  if (!state?.analysis) return;
  const grade = state.analysis.signalGrade || "—";
  signalGradeLabel.textContent = grade;
  signalGradeLabel.dataset.grade = grade;
  const interference = state.analysis.interference ?? 0;
  interferenceLabel.textContent = `${Math.round(interference * 100)}%`;
}

function updateBandPlan() {
  if (!state?.analysis?.bandPlan) return;
  bandPlanList.innerHTML = state.analysis.bandPlan
    .map(
      (band) => `
        <li>
          <span>${Number(band.hz).toFixed(0)} Hz</span>
          <div class="band-bar"><span style="--amp:${band.amp}"></span></div>
          <b>${Math.round(band.amp * 100)}%</b>
        </li>
      `
    )
    .join("");
}

function pushWaterfallRow() {
  if (!state?.spectrum) return;
  waterfallHistory.push(state.spectrum.map((bin) => bin.amp));
  waterfallHistory = waterfallHistory.slice(-120);
  renderWaterfall();
}

function renderWaterfall() {
  const width = waterfallCanvas.clientWidth;
  const height = waterfallCanvas.clientHeight;
  if (!width || !height || !waterfallHistory.length) return;
  waterfallCtx.clearRect(0, 0, width, height);
  const rowHeight = Math.max(1, height / waterfallHistory.length);
  const binCount = waterfallHistory[0].length;
  const binWidth = width / binCount;
  waterfallHistory.forEach((row, rowIndex) => {
    row.forEach((amp, binIndex) => {
      const hue = amp > 0.66 ? cssVar("--hot") : amp > 0.33 ? cssVar("--amber") : cssVar("--trace");
      waterfallCtx.fillStyle = alpha(hue, 0.12 + amp * 0.72);
      waterfallCtx.fillRect(
        binIndex * binWidth,
        rowIndex * rowHeight,
        Math.max(1, binWidth),
        Math.max(1, rowHeight)
      );
    });
  });
}

function updateChallenge() {
  if (!state?.challenge) return;
  challengeHint.textContent = state.challenge.hint;
  if (challengeSolved) {
    challengeStatus.textContent = "solved";
  }
}

function updateDna() {
  if (!state?.dna) return;
  dnaHash.textContent = state.dna.hash;
  dnaResonance.textContent = `${Math.round(state.dna.resonance * 100)}% resonance`;
  dnaBars.innerHTML = state.dna.bars
    .map((bar) => `<span style="--h:${bar}"></span>`)
    .join("");
  if (state.dna.hybrid?.secondaryHash) {
    dnaHybrid.textContent = `Hybrid overlap ${state.dna.hybrid.overlap}/6 · score ${Math.round(state.dna.hybrid.score * 100)}%`;
  } else {
    dnaHybrid.textContent = "";
  }
}

function updateDream() {
  if (!state?.dream) return;
  dreamMood.textContent = state.dream.mood;
  dreamText.textContent = state.dream.text;
}

function recordTapeFrame() {
  if (!tapeRecordButton || tapeRecordButton.getAttribute("aria-pressed") !== "true" || !state) return;
  tapeFrames.push({
    coherence: state.analysis.coherence,
    callsign: state.signal.callsign,
    t: performance.now(),
  });
  tapeFrames = tapeFrames.slice(-40);
  tapeCount.textContent = `${tapeFrames.length} frames`;
  tapePlayButton.disabled = tapeFrames.length < 2;
  tapeClearButton.disabled = tapeFrames.length === 0;
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
    if (state.mode === "sstv") drawSstv(width, height);
    drawConstellation(width, height);
    drawLissajous(width, height);
    renderPhosphor(width, height);
  }
  requestAnimationFrame(draw);
}

function drawLissajous(width, height) {
  if (!state?.lissajous?.length) return;
  const size = Math.min(width, height) * 0.18;
  const cx = width * 0.18;
  const cy = height * 0.42;
  ctx.fillStyle = "rgba(5, 7, 12, 0.62)";
  ctx.fillRect(cx - size / 2 - 8, cy - size / 2 - 8, size + 16, size + 16);
  ctx.strokeStyle = alpha(cssVar("--cool"), 0.35);
  ctx.strokeRect(cx - size / 2 - 8, cy - size / 2 - 8, size + 16, size + 16);
  ctx.beginPath();
  state.lissajous.forEach((point, index) => {
    const x = cx + (point.x - 0.5) * size;
    const y = cy + (point.y - 0.5) * size;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = alpha(cssVar("--trace"), 0.82);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = cssVar("--amber");
  ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("XY", cx - size / 2, cy - size / 2 - 10);
}

function drawConstellation(width, height) {
  if (!state?.constellation) return;
  const left = width * 0.04;
  const top = height * 0.72;
  const mapWidth = width * 0.28;
  const mapHeight = height * 0.2;
  ctx.fillStyle = "rgba(5, 7, 12, 0.55)";
  ctx.fillRect(left, top, mapWidth, mapHeight);
  ctx.strokeStyle = alpha(cssVar("--cool"), 0.35);
  ctx.strokeRect(left, top, mapWidth, mapHeight);
  const byId = new Map(state.constellation.stars.map((star) => [star.id, star]));
  for (const edge of state.constellation.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    ctx.strokeStyle = alpha(cssVar("--trace"), 0.08 + edge.gain * 0.35);
    ctx.beginPath();
    ctx.moveTo(left + from.x * mapWidth, top + from.y * mapHeight);
    ctx.lineTo(left + to.x * mapWidth, top + to.y * mapHeight);
    ctx.stroke();
  }
  for (const star of state.constellation.stars) {
    ctx.fillStyle = alpha(cssVar("--amber"), 0.35 + star.strength * 0.5);
    ctx.beginPath();
    ctx.arc(left + star.x * mapWidth, top + star.y * mapHeight, 2 + star.strength * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSstv(width, height) {
  const left = width * 0.08;
  const top = height * 0.62;
  const frameWidth = width * 0.34;
  const frameHeight = height * 0.22;
  const lines = 18;
  ctx.fillStyle = "rgba(5, 7, 12, 0.72)";
  ctx.fillRect(left, top, frameWidth, frameHeight);
  ctx.strokeStyle = alpha(cssVar("--amber"), 0.5);
  ctx.strokeRect(left, top, frameWidth, frameHeight);
  for (let line = 0; line < lines; line += 1) {
    const y = top + (line / lines) * frameHeight;
    const drift = Math.sin(performance.now() / 900 + line * 0.4) * 0.5;
    ctx.fillStyle = line % 2 === 0 ? alpha(cssVar("--trace"), 0.35) : alpha(cssVar("--hot"), 0.22);
    ctx.fillRect(left + 4, y + drift, frameWidth - 8, Math.max(1.5, frameHeight / lines - 1));
  }
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

async function loadEventSeed() {
  try {
    const response = await fetch("/api/presets");
    const payload = await response.json();
    const event = payload.presets.find((preset) => preset.name === "Event");
    if (!event) return;
    seedInput.value = event.seed;
    frequencyInput.value = String(event.frequency);
    noiseInput.value = String(event.noise);
    packetsInput.value = String(event.packets);
    modeInput.value = event.mode;
    challengeSolved = false;
    challengeStatus.textContent = "listening";
    start = performance.now();
    loadState(true);
  } catch {
    hoverText.textContent = "Could not load today's event station.";
  }
}

function toggleAutoScan() {
  const enabled = autoScanButton.getAttribute("aria-pressed") !== "true";
  autoScanButton.setAttribute("aria-pressed", String(enabled));
  if (autoScanTimer) {
    clearInterval(autoScanTimer);
    autoScanTimer = null;
  }
  if (enabled) {
    autoScanTimer = setInterval(scan, 4200);
    scan();
  }
}

function toggleTapeRecord() {
  const enabled = tapeRecordButton.getAttribute("aria-pressed") !== "true";
  tapeRecordButton.setAttribute("aria-pressed", String(enabled));
  tapeRecordButton.textContent = enabled ? "Rec" : "Tape";
}

function playTape() {
  if (tapeFrames.length < 2 || tapePlaying) return;
  tapePlaying = true;
  let index = 0;
  const timer = setInterval(() => {
    const frame = tapeFrames[index];
    coherenceLabel.textContent = `${Math.round(frame.coherence * 100)}%`;
    callsignLabel.textContent = frame.callsign;
    index += 1;
    if (index >= tapeFrames.length) {
      clearInterval(timer);
      tapePlaying = false;
    }
  }, 280);
}

function clearTape() {
  tapeFrames = [];
  tapeCount.textContent = "0 frames";
  tapePlayButton.disabled = true;
  tapeClearButton.disabled = true;
}

function scan() {
  seedInput.value = stations[Math.floor(Math.random() * stations.length)];
  challengeSolved = false;
  challengeStatus.textContent = "listening";
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

function loadGallery() {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY) || "[]");
  } catch {
    return [];
  }
}

function renderGallery() {
  const items = loadGallery();
  galleryCount.textContent = `${items.length} saved`;
  galleryList.innerHTML = items
    .map(
      (item, index) => `
        <li>
          <button type="button" data-index="${index}" class="gallery-load">${item.callsign}</button>
          <span>${item.seed}</span>
        </li>
      `
    )
    .join("");
  galleryList.querySelectorAll(".gallery-load").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = items[Number(button.dataset.index)];
      if (!entry) return;
      seedInput.value = entry.seed;
      frequencyInput.value = entry.frequency;
      noiseInput.value = entry.noise;
      packetsInput.value = entry.packets;
      modeInput.value = entry.mode;
      mixSeedInput.value = entry.mix_seed || "";
      mixAmountInput.value = entry.mix_amount || "0";
      start = performance.now();
      loadState(true);
    });
  });
}

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}

function renderLeaderboard() {
  const entries = loadLeaderboard();
  leaderboardCount.textContent = `${entries.length} solves`;
  leaderboardList.innerHTML = entries
    .map(
      (entry, index) => `
        <li>
          <span class="leaderboard-rank">${index + 1}</span>
          <span>
            <strong>${entry.callsign}</strong>
            <em>${entry.word} · ${entry.grade}</em>
          </span>
          <b>${entry.coherence}%</b>
        </li>
      `
    )
    .join("");
}

function recordLeaderboardSolve() {
  if (!state?.challenge || !challengeSolved) return;
  const entries = loadLeaderboard();
  const entry = {
    callsign: state.signal.callsign,
    word: state.challenge.secretWord,
    grade: state.analysis.signalGrade || "—",
    coherence: Math.round(state.analysis.coherence * 100),
    solvedAt: Date.now(),
  };
  const duplicate = entries.some(
    (item) => item.word === entry.word && item.callsign === entry.callsign
  );
  if (!duplicate) {
    entries.unshift(entry);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 8)));
    renderLeaderboard();
  }
}

function exportGallery() {
  const items = loadGallery();
  if (!items.length) {
    hoverText.textContent = "Gallery is empty — save a station first.";
    return;
  }
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.download = `spectral-gallery-${Date.now()}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  hoverText.textContent = `Exported ${items.length} saved station(s).`;
}

function toggleLiveStream() {
  const enabled = liveStreamButton.getAttribute("aria-pressed") !== "true";
  liveStreamButton.setAttribute("aria-pressed", String(enabled));
  liveStreamActive = enabled;
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (enabled) {
    isFrozen = false;
    freezeButton.setAttribute("aria-pressed", "false");
    freezeButton.textContent = "Freeze";
    eventSource = new EventSource(streamUrl());
    eventSource.onmessage = (event) => {
      try {
        state = JSON.parse(event.data);
        applyPalette();
        updateLabels();
        updatePacketList();
        updateScanLog();
        updateTimeline();
        updateChallenge();
        updateDna();
        updateDream();
        updateBandPlan();
        updateSignalTelemetry();
        pushWaterfallRow();
        updateAudio();
        recordTapeFrame();
      } catch {
        hoverText.textContent = "Live stream frame could not be decoded.";
      }
    };
    eventSource.onerror = () => {
      hoverText.textContent = "Live stream disconnected.";
      toggleLiveStream();
    };
    hoverText.textContent = "Live SSE stream connected.";
  } else {
    hoverText.textContent = "Live stream stopped.";
    start = performance.now();
    loadState(true);
  }
}

function saveToGallery() {
  if (!state) return;
  const items = loadGallery();
  items.unshift({
    callsign: state.signal.callsign,
    seed: seedInput.value,
    frequency: frequencyInput.value,
    noise: noiseInput.value,
    packets: packetsInput.value,
    mode: modeInput.value,
    mix_seed: mixSeedInput.value,
    mix_amount: mixAmountInput.value,
    savedAt: Date.now(),
  });
  localStorage.setItem(GALLERY_KEY, JSON.stringify(items.slice(0, 12)));
  renderGallery();
  hoverText.textContent = "Station saved to local gallery.";
}

function toggleFullscreen() {
  const target = document.querySelector(".stage");
  if (!document.fullscreenElement) {
    target.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
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

function exportWav() {
  if (!state?.waveform?.length) return;
  const sampleRate = 8000;
  const samples = state.waveform.flatMap((sample, index) => {
    const tone = state.packets[index % state.packets.length]?.tone ?? 60;
    const hz = 440 * 2 ** ((tone - 69) / 12);
    const wobble = Math.sin((index / state.waveform.length) * Math.PI * 2 * (hz / 120));
    return [Math.max(-1, Math.min(1, sample * 0.7 + wobble * 0.25))];
  });
  const repeated = [];
  const stretch = Math.max(1, Math.floor(sampleRate / 40));
  samples.forEach((sample) => {
    for (let index = 0; index < stretch; index += 1) repeated.push(sample);
  });
  const buffer = new ArrayBuffer(44 + repeated.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, text) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + repeated.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, repeated.length * 2, true);
  repeated.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample * 0x7fff, true);
  });
  const link = document.createElement("a");
  link.download = `spectral-${state.signal.callsign}-${Date.now()}.wav`;
  link.href = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  link.click();
  URL.revokeObjectURL(link.href);
  hoverText.textContent = "Carrier exported as WAV.";
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
mixSeedInput.addEventListener("input", () => loadState(true));
mixAmountInput.addEventListener("input", () => loadState(true));
scanButton.addEventListener("click", scan);
autoScanButton.addEventListener("click", toggleAutoScan);
eventSeedButton.addEventListener("click", loadEventSeed);
tapeRecordButton.addEventListener("click", toggleTapeRecord);
tapePlayButton.addEventListener("click", playTape);
tapeClearButton.addEventListener("click", clearTape);
challengeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!state?.challenge) return;
  const guess = challengeGuess.value.trim().toLowerCase();
  if (guess === state.challenge.secretWord) {
    challengeSolved = true;
    challengeStatus.textContent = "solved";
    recordLeaderboardSolve();
    hoverText.textContent = `Challenge cleared: the hidden word was "${state.challenge.secretWord}".`;
  } else {
    challengeStatus.textContent = "miss";
    hoverText.textContent = "Not quite. Keep tuning and inspect the packet stack.";
  }
});
shareButton.addEventListener("click", shareStation);
fullscreenButton.addEventListener("click", toggleFullscreen);
gallerySaveButton.addEventListener("click", saveToGallery);
galleryExportButton.addEventListener("click", exportGallery);
liveStreamButton.addEventListener("click", toggleLiveStream);
freezeButton.addEventListener("click", toggleFreeze);
captureButton.addEventListener("click", capture);
exportButton.addEventListener("click", exportJson);
exportWavButton.addEventListener("click", exportWav);
soundButton.addEventListener("click", toggleSound);
presetButtons.forEach((button) => button.addEventListener("click", usePreset));
window.addEventListener("resize", resizeCanvas);

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea, select")) return;
  const key = event.key.toLowerCase();
  if (key === "s") {
    event.preventDefault();
    scan();
  } else if (key === "f") {
    event.preventDefault();
    toggleFreeze();
  } else if (key === "l") {
    event.preventDefault();
    toggleLiveStream();
  } else if (key === "a") {
    event.preventDefault();
    toggleAutoScan();
  } else if (key === "c") {
    event.preventDefault();
    capture();
  } else if (key === "w") {
    event.preventDefault();
    exportWav();
  } else if (key === "?") {
    hoverText.textContent = "Shortcuts: S scan · F freeze · L live · A auto · C capture · W WAV";
  }
});

setInterval(() => {
  if (!liveStreamActive) loadState(false);
}, 560);
resizeCanvas();
loadUrlState();
renderGallery();
renderLeaderboard();
loadState(true);
draw();
