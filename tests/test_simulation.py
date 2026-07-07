import json
import unittest

from murmurarium.server import SignalLabHandler
from murmurarium.simulation import build_transmission, seed_to_int


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

    def test_server_handler_is_available(self):
        self.assertEqual(SignalLabHandler.__module__, "murmurarium.server")


if __name__ == "__main__":
    unittest.main()
