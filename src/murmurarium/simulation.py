"""Deterministic signal lab simulation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
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
    ("velvet numbers", "#07050a", "#c8f7ff", "#ffd166", "#ef476f", "#7b9cff"),
    ("copper static", "#0b0805", "#9ef0c9", "#f4a261", "#e63946", "#8ecae6"),
)

TRANSMISSION_MODES = ("voice", "numbers", "morse", "hex", "sstv")
MORSE_FRAGMENTS = ("... ---", ".-.. .. -- -. /", "-. --- .-. - ....", "... - .- - .. --- -.")
NUMBER_GROUPS = ("17", "42", "88", "103", "204", "319", "507", "614", "821", "903")
HEX_FRAGMENTS = ("a4f2", "0d9c", "7b1e", "c0ff", "feed", "b33f", "dead", "cafe")
CHALLENGE_WORDS = ("orchard", "basement", "pager", "eclipse", "carrier", "thunder", "antenna")
EVENT_SEEDS = (
    "solstice numbers relay",
    "equinox static choir",
    "aurora pager cadence",
    "meteor shower morse",
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


def event_seed(for_day: date | None = None) -> str:
    """Return a deterministic rare station phrase for the given day."""

    day = for_day or date.today()
    digest = hashlib.sha256(day.isoformat().encode("utf-8")).hexdigest()
    index = int(digest[:8], 16) % len(EVENT_SEEDS)
    return EVENT_SEEDS[index]


def list_presets() -> list[dict[str, str | float | int]]:
    return [
        {
            "name": "Garden",
            "seed": "numbers station for houseplants",
            "frequency": 7.13,
            "noise": 0.32,
            "packets": 18,
            "mode": "voice",
        },
        {
            "name": "Midnight",
            "seed": "midnight kettle on channel nine",
            "frequency": 11.41,
            "noise": 0.18,
            "packets": 24,
            "mode": "morse",
        },
        {
            "name": "Weather",
            "seed": "secret weather from the laundromat",
            "frequency": 4.72,
            "noise": 0.61,
            "packets": 30,
            "mode": "numbers",
        },
        {
            "name": "Cipher",
            "seed": "lost pager under the pier",
            "frequency": 14.2,
            "noise": 0.44,
            "packets": 22,
            "mode": "hex",
        },
        {
            "name": "Event",
            "seed": event_seed(),
            "frequency": 9.8,
            "noise": 0.27,
            "packets": 20,
            "mode": "sstv",
        },
    ]


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
    mode: str = "voice",
    mix_seed: str = "",
    mix_amount: float = 0.0,
) -> dict[str, Any]:
    """Build a deterministic radio-console state suitable for JSON output."""

    primary = _build_transmission_core(
        seed=seed,
        frequency=frequency,
        noise=noise,
        packets=packets,
        t=t,
        mode=mode,
    )
    mix_amount = _clamp(float(mix_amount), 0.0, 1.0)
    if mix_amount <= 0.01 or not (mix_seed or "").strip():
        return primary

    secondary = _build_transmission_core(
        seed=mix_seed,
        frequency=frequency * (1.0 + mix_amount * 0.08),
        noise=min(1.0, noise + mix_amount * 0.18),
        packets=packets,
        t=t,
        mode=mode,
    )
    return _blend_transmissions(primary, secondary, mix_amount, mix_seed)


def _build_transmission_core(
    seed: str,
    frequency: float,
    noise: float,
    packets: int,
    t: float,
    mode: str,
) -> dict[str, Any]:
    packets = int(_clamp(packets, 6, 40))
    frequency = _clamp(float(frequency), 1.0, 19.9)
    noise = _clamp(float(noise), 0.0, 1.0)
    t = float(t)
    mode = _normalize_mode(mode)

    seed_int = seed_to_int(seed)
    rng = random.Random(seed_int)
    palette = PALETTES[seed_int % len(PALETTES)]
    callsign = _callsign(rng, seed_int)
    phase = (math.sin(t * 0.7 + frequency) + 1.0) / 2.0
    stability = _clamp(1.0 - noise * 0.74 + phase * 0.18, 0.05, 1.0)
    carrier = frequency * (1.0 + math.sin(t * 0.17) * 0.006)

    packet_items = [
        _build_packet(seed_int, index, packets, frequency, noise, t, mode)
        for index in range(packets)
    ]
    waveform = _build_waveform(seed_int, frequency, noise, t)
    spectrum = _build_spectrum(seed_int, frequency, noise, t)
    links = _build_links(packet_items)
    analysis = _build_analysis(packet_items, spectrum, links, stability)
    challenge = _build_challenge(seed_int, packet_items)
    constellation = _build_constellation(packet_items, links)

    vu_level = _round(_clamp(stability * 0.6 + average_from_waveform(waveform) * 0.4, 0.0, 1.0))

    return {
        "seed": seed or "numbers station for houseplants",
        "mode": mode,
        "frequency": _round(frequency, 3),
        "noise": _round(noise, 3),
        "packets": [asdict(packet) for packet in packet_items],
        "links": links,
        "waveform": waveform,
        "spectrum": spectrum,
        "analysis": analysis,
        "challenge": challenge,
        "constellation": constellation,
        "timeline": _build_timeline(seed_int, t, stability, mode),
        "vu": vu_level,
        "signal": {
            "callsign": callsign,
            "decoded": _decoded_sentence(seed, rng, phase, stability, mode),
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


def _blend_transmissions(
    primary: dict[str, Any],
    secondary: dict[str, Any],
    mix_amount: float,
    mix_seed: str,
) -> dict[str, Any]:
    blend = _clamp(mix_amount, 0.0, 1.0)
    inverse = 1.0 - blend
    waveform = [
        _round(primary["waveform"][index] * inverse + secondary["waveform"][index] * blend)
        for index in range(len(primary["waveform"]))
    ]
    spectrum = [
        {
            "hz": primary["spectrum"][index]["hz"],
            "amp": _round(
                primary["spectrum"][index]["amp"] * inverse
                + secondary["spectrum"][index]["amp"] * blend
            ),
        }
        for index in range(len(primary["spectrum"]))
    ]
    merged_packets = primary["packets"][: max(6, int(len(primary["packets"]) * inverse))]
    secondary_packets = secondary["packets"][: max(4, int(len(secondary["packets"]) * blend))]
    for index, packet in enumerate(secondary_packets):
        merged = dict(packet)
        merged["id"] = f"m{index:02d}"
        merged["strength"] = _round(packet["strength"] * blend)
        merged_packets.append(merged)

    stability = _clamp(
        primary["signal"]["stability"] * inverse + secondary["signal"]["stability"] * blend,
        0.05,
        1.0,
    )
    packet_items = [Packet(**packet) for packet in merged_packets]
    links = _build_links(packet_items)
    analysis = _build_analysis(packet_items, spectrum, links, stability)
    analysis["mixAmount"] = _round(blend)
    analysis["mixSeed"] = mix_seed.strip()

    blended = dict(primary)
    blended["waveform"] = waveform
    blended["spectrum"] = spectrum
    blended["packets"] = merged_packets
    blended["links"] = links
    blended["analysis"] = analysis
    blended["vu"] = _round(_clamp(stability * 0.65 + average_from_waveform(waveform) * 0.35, 0.0, 1.0))
    blended["mix"] = {"seed": mix_seed.strip(), "amount": _round(blend)}
    blended["signal"] = dict(primary["signal"])
    blended["signal"]["decoded"] = (
        f"Mixed ({int(blend * 100)}%): {secondary['signal']['decoded']} "
        f"interfering with {primary['signal']['decoded']}"
    )
    blended["signal"]["stability"] = _round(stability)
    return blended


def average_from_waveform(waveform: list[float]) -> float:
    if not waveform:
        return 0.0
    return sum(abs(sample) for sample in waveform) / len(waveform)


def _build_packet(
    seed_int: int,
    index: int,
    count: int,
    frequency: float,
    noise: float,
    t: float,
    mode: str,
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
    phrase = _packet_phrase(local, mode, index)
    band = _packet_band(local, mode)
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


def _build_analysis(
    packets: list[Packet],
    spectrum: list[dict[str, float]],
    links: list[dict[str, Any]],
    stability: float,
) -> dict[str, Any]:
    strongest_packet = max(packets, key=lambda packet: packet.strength)
    dominant_bin = max(spectrum, key=lambda item: item["amp"])
    average_strength = sum(packet.strength for packet in packets) / len(packets)
    average_drift = sum(abs(packet.drift) for packet in packets) / len(packets)
    link_density = len(links) / max(1, len(packets))
    coherence = _clamp(stability * 0.72 + average_strength * 0.2 + min(link_density, 1.0) * 0.08, 0.0, 1.0)

    interference = _clamp(1.0 - coherence + average_drift * 0.35, 0.0, 1.0)
    band_plan = [
        {"hz": bin_item["hz"], "amp": bin_item["amp"]}
        for bin_item in sorted(spectrum, key=lambda item: item["amp"], reverse=True)[:5]
    ]

    return {
        "strongestPacket": {
            "id": strongest_packet.id,
            "label": strongest_packet.label,
            "strength": strongest_packet.strength,
            "tone": strongest_packet.tone,
        },
        "dominantFrequency": dominant_bin["hz"],
        "dominantAmplitude": dominant_bin["amp"],
        "averageStrength": _round(average_strength),
        "averageDrift": _round(average_drift),
        "linkCount": len(links),
        "linkDensity": _round(link_density),
        "coherence": _round(coherence),
        "interference": _round(interference),
        "bandPlan": band_plan,
        "signalGrade": _signal_grade(coherence, interference),
    }


def _signal_grade(coherence: float, interference: float) -> str:
    score = coherence * 0.7 + (1.0 - interference) * 0.3
    if score >= 0.82:
        return "A"
    if score >= 0.68:
        return "B"
    if score >= 0.5:
        return "C"
    return "D"


def _callsign(rng: random.Random, seed_int: int) -> str:
    prefix = rng.choice(CALLSIGN_PREFIXES)
    digits = str(seed_int % 997).zfill(3)
    suffix = rng.choice(("A", "X", "Q", "N", "V"))
    return f"{prefix}-{digits}-{suffix}"


def _normalize_mode(mode: str) -> str:
    normalized = (mode or "voice").strip().lower()
    return normalized if normalized in TRANSMISSION_MODES else "voice"


def _packet_phrase(local: random.Random, mode: str, index: int) -> str:
    if mode == "numbers":
        group = " ".join(local.sample(NUMBER_GROUPS, k=3))
        return f"group {group}"
    if mode == "morse":
        return local.choice(MORSE_FRAGMENTS)
    if mode == "hex":
        return " ".join(local.sample(HEX_FRAGMENTS, k=4))
    if mode == "sstv":
        lines = ("scanline", "phosphor row", "image burst", "slowvision frame")
        return f"{local.choice(lines)} {index + local.randrange(1, 99):02d}"
    return f"{local.choice(SIGNAL_VERBS)} {local.choice(SIGNAL_OBJECTS)}"


def _packet_band(local: random.Random, mode: str) -> str:
    bands = {
        "numbers": ("counted carrier", "group repeat", "cipher cadence", "station math"),
        "morse": ("dash weather", "dot lattice", "keyer drift", "relay echo"),
        "hex": ("dump stream", "nibble rain", "opcode haze", "checksum glow"),
        "sstv": ("slowscan drift", "phosphor wash", "image carrier", "frame bleed"),
    }
    return local.choice(bands.get(mode, ("low velvet", "green carrier", "knife weather", "paper orbit")))


def _build_challenge(seed_int: int, packets: list[Packet]) -> dict[str, Any]:
    rng = random.Random(seed_int ^ 0xCAF1)
    secret = rng.choice(CHALLENGE_WORDS)
    marker_index = seed_int % len(packets)
    marker = packets[marker_index]
    return {
        "hint": f"One packet whispers a hidden word. Strongest glyph: {marker.glyph}.",
        "secretWord": secret,
        "markerPacket": marker.id,
    }


def _build_constellation(
    packets: list[Packet],
    links: list[dict[str, Any]],
) -> list[dict[str, float | str]]:
    by_id = {packet.id: packet for packet in packets}
    stars: list[dict[str, float | str]] = []
    for packet in packets[:12]:
        stars.append(
            {
                "id": packet.id,
                "x": packet.x,
                "y": packet.y,
                "strength": packet.strength,
                "label": packet.label,
            }
        )
    edges: list[dict[str, str | float]] = []
    for link in links[:24]:
        if link["from"] in by_id and link["to"] in by_id:
            edges.append({"from": link["from"], "to": link["to"], "gain": link["gain"]})
    return {"stars": stars, "edges": edges}


def _build_timeline(seed_int: int, t: float, stability: float, mode: str) -> list[dict[str, float | str]]:
    rng = random.Random(seed_int ^ int(t * 1000))
    points: list[dict[str, float | str]] = []
    for index in range(8):
        stamp = _round(max(0.0, t - (7 - index) * 0.42), 2)
        points.append(
            {
                "t": stamp,
                "coherence": _round(_clamp(stability + rng.uniform(-0.12, 0.12), 0.0, 1.0)),
                "mode": mode,
            }
        )
    return points


def _decoded_sentence(
    seed: str,
    rng: random.Random,
    phase: float,
    stability: float,
    mode: str,
) -> str:
    if mode == "numbers":
        groups = " ".join(rng.sample(NUMBER_GROUPS, k=5))
        return f"Numbers: {groups} — repeat, then wait for the green sweep."
    if mode == "morse":
        fragment = rng.choice(MORSE_FRAGMENTS)
        return f"Morse: {fragment} — keying at {rng.randint(12, 22)} WPM beneath the carrier."
    if mode == "hex":
        dump = " ".join(rng.sample(HEX_FRAGMENTS, k=6))
        return f"Hex dump: {dump} — checksum unstable at {int(stability * 100)}%."
    if mode == "sstv":
        return (
            f"SSTV frame: {rng.randint(120, 320)} lines at {rng.randint(8, 16)}s — "
            f"ghost image forming at {int(stability * 100)}% lock."
        )
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
