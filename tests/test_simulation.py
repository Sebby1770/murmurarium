import json
import unittest

from murmurarium.simulation import build_terrarium, seed_to_int
from murmurarium.server import MurmurariumHandler


class SimulationTests(unittest.TestCase):
    def test_seed_to_int_is_stable(self):
        self.assertEqual(seed_to_int("Static Radio"), seed_to_int(" static radio "))

    def test_build_terrarium_is_deterministic(self):
        first = build_terrarium(seed="glass orchard", count=20, t=1.25, gravity=0.7)
        second = build_terrarium(seed="glass orchard", count=20, t=1.25, gravity=0.7)
        self.assertEqual(first, second)

    def test_build_terrarium_clamps_count_and_positions(self):
        state = build_terrarium(seed="big", count=300, t=0, gravity=4)
        self.assertEqual(state["count"], 96)
        self.assertLessEqual(state["weather"]["gravity"], 1.4)
        for murmur in state["murmurs"]:
            self.assertGreaterEqual(murmur["x"], 0.04)
            self.assertLessEqual(murmur["x"], 0.96)
            self.assertGreaterEqual(murmur["y"], 0.05)
            self.assertLessEqual(murmur["y"], 0.94)

    def test_payload_is_json_serializable(self):
        state = build_terrarium(seed="json", count=12)
        encoded = json.dumps(state)
        self.assertIn("murmurs", encoded)

    def test_parse_helpers_fall_back(self):
        self.assertEqual(MurmurariumHandler.__module__, "murmurarium.server")


if __name__ == "__main__":
    unittest.main()
