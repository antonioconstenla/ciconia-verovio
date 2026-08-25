"""System-start clef coverage (Phase 6C4C2).

Exercises WASM toolkit rendering for:
- explicit clef at system start promoted to system-start drawing (REPLACE)
- ordinary continuation (still drawn)
- mid-system explicit clef (continuation retained)
- next-system continuation uses NEW clef state after promotion

Set CICONIA_WASM_TOOLKIT to verovio-toolkit-wasm.js built from this worktree.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "systemstartclef"
HARNESS = Path(__file__).resolve().parent / "systemstart_clef_harness.mjs"


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


def run_harness(case: str) -> dict:
    toolkit = wasm_toolkit()
    cmd = [
        node_path(),
        str(HARNESS),
        "--toolkit",
        str(toolkit),
        "--fixtures",
        str(FIXTURES),
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


class SystemStartClefTests(unittest.TestCase):
    def test_c1_explicit_clef_at_system_start_promoted(self):
        result = run_harness("c1_explicit_at_sb_line")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["redoStable"], result)
        self.assertEqual(result["system1ClefCount"], 1)
        self.assertTrue(result["hasExplicit"], result)
        self.assertTrue(result["alignOk"], result)

    def test_c2_ordinary_continuation_still_drawn(self):
        result = run_harness("c2_continuation_only_line")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["redoStable"], result)
        self.assertEqual(result["system1ClefCount"], 1)

    def test_c3_mid_system_explicit_keeps_continuation(self):
        result = run_harness("c3_mid_system_clef_line")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["redoStable"], result)
        self.assertEqual(result["system1ClefCount"], 2)
        self.assertTrue(result["hasLater"], result)

    def test_c4_breaks_line_redo_stable_bundle(self):
        for case in (
            "c1_explicit_at_sb_line",
            "c2_continuation_only_line",
            "c3_mid_system_clef_line",
            "c5_next_system_state_line",
            "c6_two_staff_line",
            "c7_second_layer_leading_clef_line",
        ):
            result = run_harness(case)
            self.assertEqual(result["breaks"], "line", result)
            self.assertTrue(result["redoStable"], result)

    def test_c5_next_system_continuation_uses_new_clef(self):
        result = run_harness("c5_next_system_state_line")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["redoStable"], result)
        self.assertEqual(result["system1ClefCount"], 1)
        self.assertEqual(result["system2ClefCount"], 1)
        self.assertTrue(result["matchesNewC1"], result)
        self.assertTrue(result["differsFromOldC2"], result)

    def test_c6_two_staff_promotion_and_continuation(self):
        result = run_harness("c6_two_staff_line")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["system1ClefCount"], 2)
        self.assertTrue(result["hasExplicit"], result)
        self.assertTrue(result["alignOk"], result)

    def test_c7_second_layer_leading_clef_not_promoted(self):
        result = run_harness("c7_second_layer_leading_clef_line")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["system1ClefCount"], 2)
        self.assertTrue(result["hasLayer2Clef"], result)
        self.assertTrue(result["continuationAtStart"], result)


if __name__ == "__main__":
    unittest.main()
