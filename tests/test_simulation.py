import json
import unittest

from murmurarium.server import SignalLabHandler
from murmurarium.simulation import (
    build_transmission,
    compare_dna,
    decode_relay,
    encode_relay,
    event_seed,
    list_presets,
    seed_to_int,
)


class SimulationTests(unittest.TestCase):
    def test_seed_to_int_is_stable(self):
        self.assertEqual(seed_to_int("Static Radio"), seed_to_int(" static radio "))

    def test_build_transmission_is_deterministic(self):
        first = build_transmission(seed="glass antenna", packets=14, t=1.25, frequency=9.4, noise=0.3)
        second = build_transmission(seed="glass antenna", packets=14, t=1.25, frequency=9.4, noise=0.3)
        self.assertEqual(first, second)

    def test_build_transmission_clamps_inputs(self):
        state = build_transmission(seed="big", packets=300, frequency=80, noise=8)
        self.assertEqual(len(state["packets"]), 40)
        self.assertLessEqual(state["frequency"], 19.9)
        self.assertLessEqual(state["noise"], 1.0)
        for packet in state["packets"]:
            self.assertGreaterEqual(packet["x"], 0.06)
            self.assertLessEqual(packet["x"], 0.94)
            self.assertGreaterEqual(packet["y"], 0.08)
            self.assertLessEqual(packet["y"], 0.92)

    def test_payload_includes_waveform_and_spectrum(self):
        state = build_transmission(seed="json", packets=12)
        self.assertEqual(len(state["waveform"]), 160)
        self.assertEqual(len(state["spectrum"]), 36)
        self.assertIn("analysis", state)
        self.assertIn("dominantFrequency", state["analysis"])
        self.assertIn("strongestPacket", state["analysis"])
        self.assertIn("Decoded:", state["signal"]["decoded"])
        self.assertIn("packets", json.dumps(state))

    def test_transmission_modes_change_decoded_output(self):
        voice = build_transmission(seed="mode test", mode="voice")
        numbers = build_transmission(seed="mode test", mode="numbers")
        morse = build_transmission(seed="mode test", mode="morse")
        hex_mode = build_transmission(seed="mode test", mode="hex")
        self.assertTrue(voice["signal"]["decoded"].startswith("Decoded:"))
        self.assertTrue(numbers["signal"]["decoded"].startswith("Numbers:"))
        self.assertTrue(morse["signal"]["decoded"].startswith("Morse:"))
        self.assertTrue(hex_mode["signal"]["decoded"].startswith("Hex dump:"))
        self.assertEqual(len(voice["timeline"]), 8)

    def test_invalid_mode_falls_back_to_voice(self):
        state = build_transmission(seed="fallback", mode="satellite")
        self.assertEqual(state["mode"], "voice")

    def test_mix_transmission_blends_secondary_signal(self):
        primary = build_transmission(seed="alpha station", mix_amount=0.0)
        mixed = build_transmission(seed="alpha station", mix_seed="beta station", mix_amount=0.5)
        self.assertIn("mix", mixed)
        self.assertEqual(mixed["mix"]["seed"], "beta station")
        self.assertGreater(len(mixed["packets"]), len(primary["packets"]) // 2)
        self.assertIn("vu", mixed)

    def test_sstv_mode_has_unique_decode(self):
        state = build_transmission(seed="slowscan", mode="sstv")
        self.assertTrue(state["signal"]["decoded"].startswith("SSTV frame:"))

    def test_challenge_and_constellation_included(self):
        state = build_transmission(seed="challenge test")
        self.assertIn("challenge", state)
        self.assertIn("secretWord", state["challenge"])
        self.assertIn("stars", state["constellation"])
        self.assertIn("edges", state["constellation"])

    def test_relay_round_trip_and_dna_compare(self):
        code = encode_relay(
            seed="relay test",
            frequency=8.2,
            noise=0.4,
            packets=20,
            mode="morse",
            mix_seed="ghost",
            mix_amount=0.25,
        )
        station = decode_relay(code)
        self.assertEqual(station["seed"], "relay test")
        self.assertEqual(station["mode"], "morse")
        match = compare_dna("abcd1234", "abcd9999")
        self.assertGreaterEqual(match["overlap"], 4)
        self.assertGreater(match["score"], 0.4)

    def test_dna_dream_and_lissajous_included(self):
        state = build_transmission(seed="dream dna test")
        self.assertIn("dna", state)
        self.assertEqual(len(state["dna"]["codons"]), 6)
        self.assertIn("dream", state)
        self.assertIn("text", state["dream"])
        self.assertGreater(len(state["lissajous"]), 10)

    def test_mixed_transmission_has_hybrid_dna(self):
        state = build_transmission(
            seed="alpha station",
            mix_seed="beta station",
            mix_amount=0.5,
        )
        self.assertIn("hybrid", state["dna"])
        self.assertIn("secondaryHash", state["dna"]["hybrid"])

    def test_analysis_includes_grade_band_plan_and_interference(self):
        state = build_transmission(seed="grade test", packets=20, noise=0.2)
        analysis = state["analysis"]
        self.assertIn("signalGrade", analysis)
        self.assertIn(analysis["signalGrade"], ("A", "B", "C", "D"))
        self.assertIn("interference", analysis)
        self.assertGreaterEqual(analysis["interference"], 0.0)
        self.assertLessEqual(analysis["interference"], 1.0)
        self.assertIn("bandPlan", analysis)
        self.assertEqual(len(analysis["bandPlan"]), 5)
        for band in analysis["bandPlan"]:
            self.assertIn("hz", band)
            self.assertIn("amp", band)

    def test_event_seed_and_presets(self):
        self.assertTrue(event_seed())
        presets = list_presets()
        self.assertGreaterEqual(len(presets), 5)
        self.assertEqual(presets[-1]["name"], "Event")

    def test_server_handler_is_available(self):
        self.assertEqual(SignalLabHandler.__module__, "murmurarium.server")


if __name__ == "__main__":
    unittest.main()
