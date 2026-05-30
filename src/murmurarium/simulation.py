"""Deterministic signal lab simulation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import math
import random
from typing import Any


CALLSIGN_PREFIXES = ("VX", "MOTH", "LIMN", "NULL", "ORR", "KITE", "ECHO", "RIFT")
SIGNAL_VERBS = ("fold", "tune", "borrow", "mirror", "swallow", "polish", "misplace")
SIGNAL_OBJECTS = (
    "the basement moon",
    "a wet antenna",
    "three minutes of thunder",
    "the spare north",
    "a pocket eclipse",
    "the glass alphabet",
    "yesterday's dial tone",
)
GLYPHS = ("<>", "/\\", "()", "~~", "**", "[]", "oo", "!!", "@@", "+-")

PALETTES = (
    ("ion orchard", "#060707", "#7cffc4", "#ffcf5a", "#ff4f9a", "#5bc0ff"),
    ("blackbox candy", "#08060a", "#f8f3d6", "#9cff3b", "#ff7043", "#9a7cff"),
    ("midnight pager", "#05070c", "#7de2d1", "#f3b43f", "#e84a5f", "#eef5db"),
    ("oxide aurora", "#0a0706", "#8fffd2", "#d8ff63", "#ff6b35", "#66a6ff"),
)


@dataclass(frozen=True)
class Packet:
    """A small decoded burst from the imaginary signal."""

    id: str
    glyph: str
    label: str
    phrase: str
    band: str
    x: float
    y: float
    strength: float
    drift: float
    phase: float
    tone: int
    width: float


def seed_to_int(seed: str) -> int:
    """Convert text to a stable integer seed."""

    normalized = (seed or "spectral switchboard").strip().lower().encode("utf-8")
    digest = hashlib.sha256(normalized).hexdigest()
    return int(digest[:16], 16)


def build_transmission(
    seed: str = "numbers station for houseplants",
    frequency: float = 7.13,
    noise: float = 0.32,
    packets: int = 18,
    t: float = 0.0,
) -> dict[str, Any]:
    """Build a deterministic radio-console state suitable for JSON output."""

    packets = int(_clamp(packets, 6, 40))
    frequency = _clamp(float(frequency), 1.0, 19.9)
    noise = _clamp(float(noise), 0.0, 1.0)
    t = float(t)

    seed_int = seed_to_int(seed)
    rng = random.Random(seed_int)
    palette = PALETTES[seed_int % len(PALETTES)]
    callsign = _callsign(rng, seed_int)
    phase = (math.sin(t * 0.7 + frequency) + 1.0) / 2.0
    stability = _clamp(1.0 - noise * 0.74 + phase * 0.18, 0.05, 1.0)
    carrier = frequency * (1.0 + math.sin(t * 0.17) * 0.006)

    packet_items = [
        _build_packet(seed_int, index, packets, frequency, noise, t)
        for index in range(packets)
    ]
    waveform = _build_waveform(seed_int, frequency, noise, t)
    spectrum = _build_spectrum(seed_int, frequency, noise, t)
    links = _build_links(packet_items)

    return {
        "seed": seed or "numbers station for houseplants",
        "frequency": _round(frequency, 3),
        "noise": _round(noise, 3),
        "packets": [asdict(packet) for packet in packet_items],
        "links": links,
        "waveform": waveform,
        "spectrum": spectrum,
        "signal": {
            "callsign": callsign,
            "decoded": _decoded_sentence(seed, rng, phase, stability),
            "phase": _round(phase, 4),
            "stability": _round(stability, 4),
            "carrier": _round(carrier, 4),
            "palette": {
                "name": palette[0],
                "background": palette[1],
                "trace": palette[2],
                "amber": palette[3],
                "hot": palette[4],
                "cool": palette[5],
            },
        },
    }


def _build_packet(
    seed_int: int,
    index: int,
    count: int,
    frequency: float,
    noise: float,
    t: float,
) -> Packet:
    local = random.Random(seed_int + index * 65_537)
    ring = 0.18 + (index % 5) * 0.075 + local.random() * 0.045
    angle = (index / count) * math.tau + frequency * 0.08 + local.uniform(-0.4, 0.4)
    jitter = noise * 0.045 * math.sin(t * local.uniform(0.5, 1.7) + index)
    x = 0.5 + math.cos(angle + t * 0.05) * (ring + jitter)
    y = 0.5 + math.sin(angle * 1.31 - t * 0.04) * (ring * 0.78 + jitter)
    strength = _clamp(local.uniform(0.38, 0.95) * (1.0 - noise * 0.36), 0.08, 1.0)
    tone = 38 + int((frequency * 3 + index * 5 + local.randrange(18)) % 34)
    label = f"{local.choice(CALLSIGN_PREFIXES)}-{index + local.randrange(11, 98):02d}"
    phrase = f"{local.choice(SIGNAL_VERBS)} {local.choice(SIGNAL_OBJECTS)}"
    band = local.choice(("low velvet", "green carrier", "knife weather", "paper orbit"))
    return Packet(
        id=f"p{index:02d}",
        glyph=local.choice(GLYPHS),
        label=label,
        phrase=phrase,
        band=band,
        x=_round(_clamp(x, 0.06, 0.94)),
        y=_round(_clamp(y, 0.08, 0.92)),
        strength=_round(strength),
        drift=_round(local.uniform(-1.0, 1.0)),
        phase=_round((angle % math.tau) / math.tau),
        tone=tone,
        width=_round(local.uniform(0.006, 0.032)),
    )


def _build_waveform(seed_int: int, frequency: float, noise: float, t: float) -> list[float]:
    rng = random.Random(seed_int ^ 0x5151_474E)
    samples: list[float] = []
    for index in range(160):
        x = index / 159
        carrier = math.sin((x * frequency * 2.8 + t * 0.32) * math.tau)
        sub = math.sin((x * (frequency * 0.71 + 1.7) - t * 0.09) * math.tau)
        pulse = math.sin((x * 3.0 + t * 0.2 + rng.random() * 0.01) * math.tau)
        static = (rng.random() - 0.5) * noise * 0.72
        samples.append(_round((carrier * 0.46 + sub * 0.24 + pulse * 0.18 + static) * 0.88))
    return samples


def _build_spectrum(seed_int: int, frequency: float, noise: float, t: float) -> list[dict[str, float]]:
    rng = random.Random(seed_int ^ 0xBEEF)
    bins: list[dict[str, float]] = []
    for index in range(36):
        hz = 1.0 + index * 0.54
        distance = abs(hz - frequency)
        peak = math.exp(-(distance**2) / 2.2)
        harmonic = 0.34 * math.exp(-((hz - frequency * 0.5) ** 2) / 1.1)
        shimmer = 0.11 * math.sin(index * 0.73 + t * 1.3)
        static = rng.random() * noise * 0.42
        amp = _clamp(0.04 + peak + harmonic + shimmer + static, 0.0, 1.0)
        bins.append({"hz": _round(hz, 2), "amp": _round(amp)})
    return bins


def _build_links(packets: list[Packet]) -> list[dict[str, Any]]:
    links: list[dict[str, Any]] = []
    for left_index, left in enumerate(packets):
        for right in packets[left_index + 1 :]:
            distance = math.dist((left.x, left.y), (right.x, right.y))
            phase_gap = abs(left.phase - right.phase)
            if distance < 0.24 and phase_gap < 0.36:
                links.append(
                    {
                        "from": left.id,
                        "to": right.id,
                        "gain": _round((1.0 - distance / 0.24) * (1.0 - phase_gap * 0.7)),
                    }
                )
    return sorted(links, key=lambda link: link["gain"], reverse=True)[:80]


def _callsign(rng: random.Random, seed_int: int) -> str:
    prefix = rng.choice(CALLSIGN_PREFIXES)
    digits = str(seed_int % 997).zfill(3)
    suffix = rng.choice(("A", "X", "Q", "N", "V"))
    return f"{prefix}-{digits}-{suffix}"


def _decoded_sentence(seed: str, rng: random.Random, phase: float, stability: float) -> str:
    object_name = rng.choice(SIGNAL_OBJECTS)
    verb = rng.choice(SIGNAL_VERBS)
    if stability < 0.35:
        condition = "through a lovely amount of static"
    elif phase > 0.6:
        condition = "while the carrier turns bright"
    else:
        condition = "beneath the slow green sweep"
    if len(seed.strip()) % 2 == 0:
        condition = "between two impossible stations"
    return f"Decoded: {verb} {object_name} {condition}."


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _round(value: float, digits: int = 4) -> float:
    return round(value, digits)
