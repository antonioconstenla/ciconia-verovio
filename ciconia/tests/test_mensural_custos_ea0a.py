"""Mensural custos default U+EA0A (mensuralCustosCheckmark).

Exercises WASM toolkit rendering for:
- mensural default EA0A when Resources resolves it
- explicit glyph.num / glyph.name overrides
- neume EA06 and CMN EA02 regressions
- Leipzig / Bravura resource presence
- Gootville resolution via actual Resources fallback behavior

Set CICONIA_WASM_TOOLKIT to verovio-toolkit-wasm.js built from this worktree
(with EA0A resources). Tests skip if the toolkit env is missing.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "custos"
HARNESS = Path(__file__).resolve().parent / "custos_ea0a_harness.mjs"


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


def run_harness(case: str, font: str | None = None) -> dict:
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
    if font:
        cmd.extend(["--font", font])
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


class MensuralCustosEa0aTests(unittest.TestCase):
    def test_t1_mensural_default_ea0a(self):
        result = run_harness("t1_mensural_default", font="Leipzig")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["flat"], ["EA0A"])

    def test_t2_glyph_num_overrides_default(self):
        result = run_harness("t2_glyph_num_override", font="Leipzig")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["flat"], ["EA02"])

    def test_t3_glyph_name_overrides_default(self):
        result = run_harness("t3_glyph_name_override", font="Leipzig")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["flat"], ["EA02"])

    def test_t4_neume_remains_ea06(self):
        result = run_harness("t4_neume_default", font="Leipzig")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["flat"], ["EA06"])

    def test_t5_cmn_remains_ea02(self):
        result = run_harness("t5_cmn_default", font="Leipzig")
        self.assertTrue(result["pass"], result)
        self.assertEqual(result["flat"], ["EA02"])

    def test_t6_leipzig_resource_has_ea0a(self):
        result = run_harness("t6_leipzig_resource")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["resourcePresent"], result)

    def test_t7_bravura_resource_has_ea0a(self):
        result = run_harness("t7_bravura_resource")
        self.assertTrue(result["pass"], result)
        self.assertTrue(result["resourcePresent"], result)

    def test_t8_gootville_resources_resolution(self):
        result = run_harness("t8_gootville_fallback_resolution")
        self.assertTrue(result["pass"], result)
        self.assertIn(result["resolved"], ("EA0A", "EA02"), result)


if __name__ == "__main__":
    unittest.main()
