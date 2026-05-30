# Spectral Switchboard

A strange Python + JavaScript signal console for imaginary radio transmissions.

Python generates deterministic transmission data from a text seed: waveform
samples, spectrum bins, packet bursts, callsigns, and decoded nonsense. JavaScript
turns that into a playable oscilloscope/radar console with live controls, canvas
rendering, snapshot capture, and optional Web Audio tones.

## Features

- No external Python runtime dependencies.
- Deterministic transmissions from any station phrase.
- Python JSON API for waveform, spectrum, packet, and callsign data.
- Canvas oscilloscope, spectrum analyzer, and radar packet display.
- Optional generated audio based on packet tones.
- Unit tests for deterministic signal behavior and input clamping.

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python -m murmurarium
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

You can also run it directly from the source tree:

```bash
PYTHONPATH=src python -m murmurarium --port 8000
```

## Tests

```bash
PYTHONPATH=src python -m unittest discover -s tests
```

Or:

```bash
npm test
```

## API

```text
GET /api/transmission?seed=numbers%20station&frequency=7.13&noise=0.32&packets=18&t=0.8
```

Returns:

- `signal`: callsign, decoded phrase, carrier, stability, and palette.
- `waveform`: 160 normalized waveform samples.
- `spectrum`: amplitude bins for the analyzer view.
- `packets`: decoded packet bursts with radar position, tone, band, and glyph.
- `links`: gain-weighted packet connections.

## Project Shape

```text
src/murmurarium/   Python signal simulation and HTTP server
web/               JavaScript, CSS, and HTML console UI
tests/             Python unit tests
```

## Why

Because it is more fun when a web app feels like tuning into a station that
should not be broadcasting yet.
