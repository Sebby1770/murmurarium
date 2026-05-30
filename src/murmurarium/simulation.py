"""Deterministic dream-terrarium simulation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import math
import random
from typing import Any


ADJECTIVES = (
    "static",
    "velvet",
    "glass",
    "feral",
    "lunar",
    "hollow",
    "copper",
    "honeyed",
    "borrowed",
    "salted",
    "bright",
    "oblique",
)

NOUNS = (
    "choir",
    "spore",
    "satellite",
    "oracle",
    "thimble",
    "meteor",
    "lantern",
    "pollen",
    "compass",
    "tuning fork",
    "mothlight",
    "echo",
)

MOODS = (
    "curious",
    "electric",
    "sleepy",
    "dramatic",
    "suspicious",
    "ceremonial",
    "giddy",
    "distant",
)

PALETTES = (
    ("inkcap", "#0b0a09", "#f6e8c8", "#69d2e7", "#f25f5c", "#b8e986"),
    ("pickled sun", "#100f0b", "#fff7b3", "#ff9f1c", "#2ec4b6", "#e71d73"),
    ("museum storm", "#111114", "#f4f1de", "#81b29a", "#e07a5f", "#3d5a80"),
    ("noon crypt", "#0d0d0d", "#e8f7ee", "#00c2a8", "#ff6f91", "#ffc75f"),
)


@dataclass(frozen=True)
class Murmur:
    """A single synthetic organism in the terrarium."""

    id: str
    name: str
    mood: str
    phrase: str
    x: float
    y: float
    radius: float
    hue: float
    tempo: float
    wobble: float
    spin: float
    note: int
    glow: float


def seed_to_int(seed: str) -> int:
    """Convert any text into a stable integer seed."""

    normalized = (seed or "murmurarium").strip().lower().encode("utf-8")
    digest = hashlib.sha256(normalized).hexdigest()
    return int(digest[:16], 16)


def _round(value: float, digits: int = 4) -> float:
    return round(value, digits)


def _word(rng: random.Random, words: tuple[str, ...]) -> str:
    return words[rng.randrange(len(words))]


def _murmur_name(rng: random.Random, index: int) -> str:
    adjective = _word(rng, ADJECTIVES)
    noun = _word(rng, NOUNS)
    suffix = format(index + rng.randrange(17, 233), "x")
    return f"{adjective} {noun} {suffix}"


def _phrase(rng: random.Random, mood: str) -> str:
    verb = rng.choice(("hums", "counts", "folds", "tastes", "braids", "tilts"))
    object_name = rng.choice(("rain", "dust", "radio", "orbit", "milk glass", "old light"))
    return f"{verb} {object_name} in a {mood} loop"


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def build_terrarium(
    seed: str = "murmurarium",
    count: int = 44,
    t: float = 0.0,
    gravity: float = 0.62,
) -> dict[str, Any]:
    """Build a deterministic terrarium state suitable for JSON output."""

    count = int(_clamp(count, 8, 96))
    gravity = _clamp(float(gravity), 0.05, 1.4)
    t = float(t)

    seed_int = seed_to_int(seed)
    rng = random.Random(seed_int)
    palette = PALETTES[seed_int % len(PALETTES)]
    orbit_bias = rng.uniform(-0.18, 0.18)
    pulse = 0.5 + 0.5 * math.sin(t * 0.8 + (seed_int % 37))
    viscosity = _clamp(0.25 + gravity * 0.35 + pulse * 0.22, 0.1, 1.0)

    murmurs: list[Murmur] = []
    for index in range(count):
        local = random.Random(seed_int + index * 104_729)
        mood = _word(local, MOODS)
        angle = (index / count) * math.tau + local.uniform(-0.2, 0.2)
        lane = 0.13 + (index % 9) * 0.035 + local.random() * 0.08
        wobble = local.uniform(0.35, 2.4)
        drift = math.sin(t * wobble + local.uniform(0.0, math.tau)) * 0.07
        inward = gravity * (0.05 + local.random() * 0.11)
        x = 0.5 + math.cos(angle + t * 0.05 + orbit_bias) * (lane + drift - inward)
        y = 0.5 + math.sin(angle * 1.37 - t * 0.04) * (lane * 0.78 + drift * 0.6)
        radius = 0.011 + local.random() * 0.029 + pulse * local.random() * 0.011
        hue = (local.randrange(360) + pulse * 70 + index * 9) % 360
        tempo = 44 + local.random() * 96 + gravity * 18
        note = 36 + (seed_int + index * 7 + local.randrange(18)) % 36
        glow = _clamp(0.3 + local.random() * 0.65 + pulse * 0.18, 0.25, 1.0)
        murmurs.append(
            Murmur(
                id=f"m{index:02d}",
                name=_murmur_name(local, index),
                mood=mood,
                phrase=_phrase(local, mood),
                x=_round(_clamp(x, 0.04, 0.96)),
                y=_round(_clamp(y, 0.05, 0.94)),
                radius=_round(radius),
                hue=_round(hue, 2),
                tempo=_round(tempo, 2),
                wobble=_round(wobble, 3),
                spin=_round(local.uniform(-1.0, 1.0), 3),
                note=note,
                glow=_round(glow, 3),
            )
        )

    threads = _build_threads(murmurs)
    omen = _build_omen(seed, seed_int, pulse, gravity)

    return {
        "seed": seed or "murmurarium",
        "count": count,
        "murmurs": [asdict(murmur) for murmur in murmurs],
        "threads": threads,
        "weather": {
            "omen": omen,
            "pulse": _round(pulse, 4),
            "gravity": _round(gravity, 4),
            "viscosity": _round(viscosity, 4),
            "palette": {
                "name": palette[0],
                "background": palette[1],
                "paper": palette[2],
                "accent": palette[3],
                "spark": palette[4],
                "warning": palette[5],
            },
        },
    }


def _build_threads(murmurs: list[Murmur]) -> list[dict[str, Any]]:
    threads: list[dict[str, Any]] = []
    for left_index, left in enumerate(murmurs):
        for right in murmurs[left_index + 1 :]:
            distance = math.dist((left.x, left.y), (right.x, right.y))
            if distance < 0.17 and (left_index + int(right.id[1:])) % 3 == 0:
                threads.append(
                    {
                        "from": left.id,
                        "to": right.id,
                        "strength": _round(1.0 - distance / 0.17, 4),
                    }
                )
    return sorted(threads, key=lambda item: item["strength"], reverse=True)[:140]


def _build_omen(seed: str, seed_int: int, pulse: float, gravity: float) -> str:
    rng = random.Random(seed_int ^ 0xC0FFEE)
    subject = rng.choice(("The ceiling", "A spoon", "The static", "A map", "The tide"))
    action = rng.choice(("learns your name", "misplaces north", "grows antennae", "keeps humming"))
    condition = "when the pulse rises" if pulse > 0.55 else "under low gravity"
    if gravity > 1.0:
        condition = "while everything leans inward"
    if len(seed.strip()) % 5 == 0:
        condition = "inside the fifth echo"
    return f"{subject} {action} {condition}."
