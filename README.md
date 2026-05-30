# Murmurarium

A weird little Python + JavaScript terrarium for procedural "murmurs".

Python runs the deterministic dream-simulation and serves a tiny JSON API.
JavaScript paints the organism swarm onto a canvas, lets you mutate the seed,
and turns the swarm into a small ambient instrument through the Web Audio API.

## Features

- No external Python runtime dependencies.
- Deterministic simulation from any text seed.
- Canvas renderer with hover inspection, controls, and exportable snapshots.
- Optional Web Audio tones generated from the current swarm.
- Tests for the simulation and API behavior.

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

## API

```text
GET /api/terrarium?seed=static%20radio&count=42&t=0.8&gravity=0.62
```

Returns:

- `murmurs`: simulated organisms with position, color, tempo, mood, and phrase.
- `threads`: short connections between nearby murmurs.
- `weather`: global oddness, pulse, viscosity, and palette data.

## Project Shape

```text
src/murmurarium/   Python simulation and HTTP server
web/               JavaScript, CSS, and HTML UI
tests/             Python unit tests
```

## Why

Because sometimes a project should feel like a pocket-sized radio telescope
aimed at a puddle.
