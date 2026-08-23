"""RedoLayout encoded-break coverage (Phase 6C3).

Exercises Toolkit::RedoLayout via the WASM toolkit (same C++ as native).
Set CICONIA_WASM_TOOLKIT to verovio-toolkit-wasm.js built from this worktree.
Uses ``node`` from PATH (override with CICONIA_NODE if needed).
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "redolayout"
HARNESS = Path(__file__).resolve().parent / "redolayout_toolkit_harness.mjs"


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


class RedoLayoutEncodedBreaksTests(unittest.TestCase):
    def test_r1_sb_only_encoded_stable_across_redolayout(self):
        result = run_harness("r1_sb_encoded")
        self.assertTrue(result["loadPass"], result)
        self.assertTrue(result["redo1Pass"], result)
        self.assertTrue(result["redo2Pass"], result)
        self.assertEqual(result["breaks"], "encoded")

    def test_r2_pb_only_encoded(self):
        result = run_harness("r2_pb_encoded")
        self.assertTrue(result["loadPass"], result)
        self.assertTrue(result["redo1Pass"], result)
        self.assertTrue(result["redo2Pass"], result)

    def test_r3_pb_and_sb_encoded(self):
        result = run_harness("r3_pb_sb_encoded")
        self.assertTrue(result["sbPass"], result)
        self.assertTrue(result["pbPass"], result)
        self.assertTrue(result["redo1Pass"], result)
        self.assertTrue(result["redo2Pass"], result)

    def test_r4_encoded_no_break_fallback(self):
        result = run_harness("r4_encoded_nobreak")
        self.assertTrue(result["renders"], result)
        self.assertGreaterEqual(result["pages"], 1)
        self.assertGreaterEqual(result["systems"], 1)
        self.assertTrue(result["redoStable"], result)

    def test_r5_sb_only_auto_not_encoded(self):
        """SB must not be forced as an encoded boundary under breaks=auto."""
        result = run_harness("r5_sb_auto")
        self.assertEqual(result["breaks"], "auto")
        self.assertFalse(result["boundaryForced"], result)
        self.assertFalse(result["redo1BoundaryForced"], result)
        self.assertFalse(result["redo2BoundaryForced"], result)

    def test_r6_sb_only_smart(self):
        result = run_harness("r6_sb_smart")
        self.assertEqual(result["breaks"], "smart")
        self.assertTrue(result["renders"], result)

    def test_r7_sb_only_none(self):
        result = run_harness("r7_sb_none")
        self.assertEqual(result["breaks"], "none")
        self.assertTrue(result["renders"], result)


if __name__ == "__main__":
    unittest.main()
