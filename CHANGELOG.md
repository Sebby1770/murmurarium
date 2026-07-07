# Changelog

## 0.4.0 — 2026-07-07

### Added
- **Decode challenge** mode with hidden word guessing per station
- **Constellation map** mini-graph of packet stars and link edges
- **Daily event seed** preset via `/api/presets` and Event button
- **Auto-scan** mode cycling random stations every 4.2s
- **Tape recorder** capturing coherence frames with playback

### Improved
- Presets API for programmatic station loading
- Challenge hint panel and solve status in UI

## 0.3.0 — 2026-07-07

### Added
- **Station mixing**: blend a second station phrase with adjustable interference amount
- **SSTV slowscan mode** with dedicated decode output and scanline visualization
- **SSE stream endpoint** (`/api/stream`) for server-pushed signal updates
- **Phosphor persistence** canvas layer for CRT-style trails
- **VU meter** tied to signal level
- **Station gallery** saved to localStorage with one-click recall
- **Fullscreen** stage mode

### Improved
- Mix-aware analysis metadata (`mixAmount`, `mixSeed`)
- Shareable URL state now includes mix parameters

## 0.2.0 — 2026-07-07

### Added
- **Transmission modes**: voice decode, numbers station, morse relay, and hex dump — each with unique packet phrases, bands, and decoded output
- **Tape timeline** panel showing coherence history across recent signal snapshots
- **Shareable station links** via URL hash state (seed, frequency, noise, packets, mode)
- **Share button** copies the current station URL to clipboard
- **Cipher preset** and expanded palette library
- **Noise-floor audio synthesis** tied to the noise slider

### Improved
- Signal analysis telemetry (coherence, dominant frequency, strongest packet, link density)
- Packet stack and scan log UI panels
- Health endpoint now reports version `0.2.0`

### Tests
- Mode-specific decode output tests
- Invalid mode fallback test