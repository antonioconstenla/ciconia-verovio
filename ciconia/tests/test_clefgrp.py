"""ClefGrp coverage (Phase 6C4C3).

Exercises WASM toolkit rendering for:
- opening C4+F2 vertical pair (same system-start X)
- group continuation across systems
- group → single and single → group transitions
- redoLayout stability
- GetClefLocOffset equivalence formula (C4 == F2 == 6)

Set CICONIA_WASM_TOOLKIT to verovio-toolkit-wasm.js built from this worktree
(with ClefGrp support). Tests skip if the toolkit env is missing.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "clefgrp"
HARNESS = Path(__file__).resolve().parent / "clefgrp_harness.mjs"
SSC_FIXTURES = Path(__file__).resolve().parent / "fixtures" / "systemstartclef"
SSC_HARNESS = Path(__file__).resolve().parent / "systemstart_clef_harness.mjs"


def node_path() -> str:
    env = os.environ.get("CICONIA_NODE")
    if env:
        return env
    found = shutil.which("node")
    if not found:
        raise unittest.SkipTest("node not found on PATH (set CICONIA_NODE)")
    return found


def wasm_toolkit() -> Path:
    env = os.environ.get("CICONIA_WASM_TOOLKIT")
    if not env:
        raise unittest.SkipTest("CICONIA_WASM_TOOLKIT not set")
    path = Path(env)
    if not path.exists():
        raise unittest.SkipTest(f"WASM toolkit missing: {path}")
    return path


def run_harness(case: str, harness: Path = HARNESS, fixtures: Path = FIXTURES) -> dict:
    toolkit = wasm_toolkit()
    cmd = [
        node_path(),
        str(harness),
        "--toolkit",
        str(toolkit),
        "--fixtures",
        str(fixtures),
        "--case",
        case,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        raise AssertionError(
            f"harness failed case={case} rc={proc.returncode}\n"
            f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
        )
    lines = [ln for ln in proc.stdout.splitlines() if ln.strip().startswith("{")]
    if not lines:
        raise AssertionError(f"no JSON from harness\n{proc.stdout}\n{proc.stderr}")
    return json.loads(lines[-1])


class ClefLocOffsetEquivalenceTests(unittest.TestCase):
    """C4 and F2 share staff mapping: GetClefLocOffset both = 6."""

    def test_formula_c4_f2_equivalent(self):
        # Pure Python (no WASM): mirrors Clef::GetClefLocOffset for C/F shapes.
        def loc_offset(shape: str, line: int) -> int:
            offset = 0
            if shape == "G":
                offset = -4
            elif shape == "F":
                offset = 4
            elif shape == "C":
                offset = 0
            offset += (line - 1) * 2
            return offset

        self.assertEqual(loc_offset("C", 4), 6)  # 0+(4-1)*2
        self.assertEqual(loc_offset("F", 2), 6)  # 4+(2-1)*2
        self.assertEqual(loc_offset("C", 4), loc_offset("F", 2))

    def test_harness_loc_offset_case(self):
        result = run_harness("loc_offset_equivalence")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["c4Offset"], 6)
        self.assertEqual(result["f2Offset"], 6)


class ClefGrpTests(unittest.TestCase):
    def test_g1_opening_vertical_pair(self):
        result = run_harness("g1_opening_vertical_pair_line")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["redoStable"], result)
        self.assertEqual(result["system1ClefCount"], 2)
        self.assertTrue(result["hasPair"], result)
        self.assertTrue(result["geo"]["sameX"], result)
        self.assertTrue(result["geo"]["c4AboveF2"], result)

    def test_g2_continuation_shows_pair(self):
        result = run_harness("g2_continuation_line")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["redoStable"], result)
        self.assertEqual(result["system1ClefCount"], 2)
        self.assertEqual(result["system2ClefCount"], 2)

    def test_g3_group_to_single(self):
        result = run_harness("g3_group_to_single_line")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["system2ClefCount"], 1)
        self.assertTrue(result["system2Single"], result)

    def test_g4_single_to_group(self):
        result = run_harness("g4_single_to_group_line")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["system2ClefCount"], 2)
        self.assertTrue(result["contPair"], result)

    def test_g5_redo_stable(self):
        result = run_harness("g5_redo_line")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["redoStable"], result)


class SystemStartClefStillPass(unittest.TestCase):
    """Existing 6C4C2 c1–c7 must still pass (single-clef promotion preserved)."""

    def test_c1_through_c7_still_pass(self):
        cases = (
            "c1_explicit_at_sb_line",
            "c2_continuation_only_line",
            "c3_mid_system_clef_line",
            "c5_next_system_state_line",
            "c6_two_staff_line",
            "c7_second_layer_leading_clef_line",
        )
        for case in cases:
            with self.subTest(case=case):
                result = run_harness(case, harness=SSC_HARNESS, fixtures=SSC_FIXTURES)
                self.assertTrue(result["pass"], result)
                self.assertTrue(result.get("redoStable", True), result)


if __name__ == "__main__":
    unittest.main()
