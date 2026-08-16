"""Ciconia structural/geometry regression tests run against the native CLI.

Upstream Verovio visual tests live in verovio.org `_tests` and require the
Python toolkit plus cairosvg. These tests reuse the same MEI 5.1 input model
but assert SVG structure and round-trip tokens without brittle full-SVG snapshots.
"""
from __future__ import annotations

import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
DEFAULT_EXE = ROOT / "build" / "verovio.exe"
DATA = ROOT / "data"

REST_GROUP = re.compile(r'<g id="([^"]+)" class="rest">(.*?)</g>', re.DOTALL)
NOTE_GROUP = re.compile(r'<g id="([^"]+)" class="note">(.*?)</g>', re.DOTALL)
STAFF_Y = re.compile(r'<path d="M[0-9.]+ ([0-9.]+) L')
USE_HREF = re.compile(r'xlink:href="#(E[0-9A-F]+)')
USE_TRANSLATE = re.compile(
    r'<use xlink:href="#(E[0-9A-F]+)[^"]*" transform="translate\(([^,]+), ([^)]+)\) scale\(([^,]+),'
)
GLYPH_BOX_W = re.compile(r'<g c="([A-F0-9]+)"[^>]*\sw="([0-9.]+)"')
RECT = re.compile(
    r'<rect\s[^>]*x="([^"]+)"\s+y="([^"]+)"\s+height="([^"]+)"\s+width="([^"]+)"'
)
DUR_ON = re.compile(r'<(rest|note)\b([^>]*xml:id="([^"]+)"[^>]*)>', re.DOTALL)
DUR_ATTR = re.compile(r'\bdur="([^"]+)"')
QUALITY_ATTR = re.compile(r'\bdur\.quality="([^"]+)"')


def exe_path() -> Path:
    env = os.environ.get("CICONIA_VEROVIO")
    path = Path(env) if env else DEFAULT_EXE
    if not path.exists():
        raise unittest.SkipTest(f"native CLI not found: {path}")
    return path


def render(src: Path, kind: str) -> tuple[int, str, str]:
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / f"out.{kind}"
        proc = subprocess.run(
            [
                str(exe_path()),
                "-r",
                str(DATA),
                "-f",
                "mei",
                "-t",
                kind,
                "-o",
                str(out),
                str(src),
            ],
            capture_output=True,
            text=True,
            timeout=90,
        )
        text = out.read_text(encoding="utf-8") if out.exists() else ""
        return proc.returncode, text, (proc.stderr or "")


def staff_space(svg: str) -> float:
    ys = [float(y) for y in STAFF_Y.findall(svg)]
    uniq: list[float] = []
    for y in ys:
        if not uniq or abs(y - uniq[-1]) > 1e-6:
            uniq.append(y)
        if len(uniq) >= 5:
            break
    diffs = [uniq[i + 1] - uniq[i] for i in range(len(uniq) - 1)]
    return sum(diffs) / len(diffs)


def rest_inner(svg: str, rest_id: str) -> str:
    for gid, inner in REST_GROUP.findall(svg):
        if gid == rest_id:
            return inner
    return ""


def rest_spaces(svg: str, rest_id: str) -> float | None:
    inner = rest_inner(svg, rest_id)
    space = staff_space(svg)
    rects = RECT.findall(inner)
    if rects:
        return float(rects[0][2]) / space
    uses = USE_HREF.findall(inner)
    if not uses:
        return None
    scale_m = re.search(
        rf'xlink:href="#{uses[0]}[^"]*" transform="translate\([^)]+\) scale\(([^,]+),',
        svg,
    )
    sc = float(scale_m.group(1)) if scale_m else 0.72
    if uses[0].startswith("E9F2"):
        return (500.0 * sc) / space
    if uses[0].startswith("E9F3"):
        return 1.0
    return None


def note_inner(svg: str, note_id: str) -> str:
    for gid, inner in NOTE_GROUP.findall(svg):
        if gid == note_id:
            return inner
    return ""


def roundtrip_element(mei: str, xml_id: str) -> tuple[str | None, str | None, str | None]:
    for tag, attrs, eid in DUR_ON.findall(mei):
        if eid == xml_id:
            dur = DUR_ATTR.search(attrs)
            qual = QUALITY_ATTR.search(attrs)
            return tag, (dur.group(1) if dur else None), (qual.group(1) if qual else None)
    return None, None, None


def resource_glyph_width(font_xml: Path, code: str) -> float:
    text = font_xml.read_text(encoding="utf-8")
    for glyph, width in GLYPH_BOX_W.findall(text):
        if glyph == code:
            return float(width)
    raise AssertionError(f"glyph {code} not found in {font_xml}")


def use_translate_scale(svg: str, code: str) -> tuple[float, float, float]:
    for found, x, y, sc in USE_TRANSLATE.findall(svg):
        if found == code:
            return float(x), float(y), float(sc)
    raise AssertionError(f"no <use> for {code}")


class RestGeometryTests(unittest.TestCase):
    def assert_rest(
        self,
        rel: str,
        rest_id: str,
        spaces: float,
        dur: str,
        glyph: str | None,
    ) -> None:
        src = FIXTURES / rel
        rc_svg, svg, err_svg = render(src, "svg")
        rc_mei, mei, _err_mei = render(src, "mei")
        self.assertEqual(rc_svg, 0, err_svg)
        self.assertEqual(rc_mei, 0)
        measured = rest_spaces(svg, rest_id)
        self.assertIsNotNone(measured)
        self.assertAlmostEqual(measured, spaces, places=2)
        inner = rest_inner(svg, rest_id)
        if glyph:
            self.assertIn(glyph, inner)
            self.assertFalse(RECT.findall(inner))
        else:
            self.assertTrue(RECT.findall(inner))
            self.assertNotIn("E9F1", inner)
        tag, rt_dur, _ = roundtrip_element(mei, rest_id)
        self.assertEqual(tag, "rest")
        self.assertEqual(rt_dur, dur)

    def test_r1_longa_modusminor_2_is_two_spaces(self):
        self.assert_rest("rests/r1-longa-modusminor-2.mei", "r1", 2.0, "longa", "E9F2")

    def test_r2_longa_modusminor_3_is_three_spaces(self):
        self.assert_rest("rests/r2-longa-modusminor-3.mei", "r2", 3.0, "longa", None)

    def test_r3_explicit_2B_is_two_spaces(self):
        self.assert_rest("rests/r3-explicit-2B.mei", "r3", 2.0, "2B", "E9F2")

    def test_r4_explicit_3B_is_three_spaces(self):
        self.assert_rest("rests/r4-explicit-3B.mei", "r4", 3.0, "3B", None)

    def test_r5_2B_without_modusminor(self):
        self.assert_rest("rests/r5-explicit-2B-no-mm.mei", "r5", 2.0, "2B", "E9F2")

    def test_r6_3B_without_modusminor(self):
        self.assert_rest("rests/r6-explicit-3B-no-mm.mei", "r6", 3.0, "3B", None)

    def test_r7_brevis_is_one_space(self):
        self.assert_rest("rests/r7-brevis.mei", "r7", 1.0, "brevis", "E9F3")

    def test_r8_unspecified_longa_keeps_two_space_fallback(self):
        self.assert_rest("rests/r8-longa-unspecified-mm.mei", "r8", 2.0, "longa", "E9F2")


class NoteGlyphTests(unittest.TestCase):
    def render_note(self, rel: str) -> tuple[str, str, str]:
        src = FIXTURES / rel
        rc_svg, svg, err = render(src, "svg")
        rc_mei, mei, _ = render(src, "mei")
        self.assertEqual(rc_svg, 0, err)
        self.assertEqual(rc_mei, 0)
        return svg, mei, err

    def test_n1_oblique_minima_uses_e95b_and_stem(self):
        svg, mei, _ = self.render_note("notes/n1-minima-oblique-stem-up.mei")
        inner = note_inner(svg, "n1")
        self.assertIn("E95B", inner)
        # The stem is a sibling <g class="stem"> after the notehead, so check the page.
        self.assertIn("E93E", svg)
        self.assertIn('class="stem"', svg)
        self.assertNotIn("E938", svg)
        self.assertNotIn("E93F", svg)
        tag, dur, _ = roundtrip_element(mei, "n1")
        self.assertEqual(tag, "note")
        self.assertEqual(dur, "minima")

    def test_n1_oblique_minima_stem_centerline_on_rhombus_apex(self):
        svg, _, _ = self.render_note("notes/n1-minima-oblique-stem-up.mei")
        e95b_w = resource_glyph_width(DATA / "Bravura.xml", "E95B")
        e938_w = resource_glyph_width(DATA / "Leipzig.xml", "E938")
        stem_w = resource_glyph_width(DATA / "Leipzig.xml", "E93E")
        head_x, _head_y, head_sc = use_translate_scale(svg, "E95B")
        stem_x, _stem_y, stem_sc = use_translate_scale(svg, "E93E")
        attachment_x = head_x + (e95b_w - e938_w / 2.0) * head_sc
        stem_center_x = stem_x + (stem_w * stem_sc) / 2.0
        self.assertLessEqual(abs(stem_center_x - attachment_x), 1.0)
        full_bbox_center = head_x + (e95b_w / 2.0) * head_sc
        self.assertGreater(abs(stem_center_x - full_bbox_center), 10.0)

    def test_n9_diagnostic_oblique_stem_down_renders(self):
        svg, mei, _ = self.render_note("notes/n9-minima-oblique-stem-down.mei")
        inner = note_inner(svg, "n9")
        self.assertIn("E95B", inner)
        self.assertIn("E93F", svg)
        self.assertIn('class="stem"', svg)
        self.assertNotIn("E93E", svg)
        tag, dur, _ = roundtrip_element(mei, "n9")
        self.assertEqual((tag, dur), ("note", "minima"))

    def test_n2_oblique_semibrevis_has_no_stem(self):
        svg, mei, _ = self.render_note("notes/n2-semibrevis-perfecta-oblique.mei")
        inner = note_inner(svg, "n2")
        self.assertIn("E95B", inner)
        self.assertNotIn('class="stem"', inner)
        tag, dur, quality = roundtrip_element(mei, "n2")
        self.assertEqual((tag, dur, quality), ("note", "semibrevis", "perfecta"))

    def test_n3_caudata_brevis_has_no_geometric_rect(self):
        svg, mei, _ = self.render_note("notes/n3-brevis-imperfecta-caudata.mei")
        inner = note_inner(svg, "n3")
        self.assertIn("E959", inner)
        self.assertFalse(RECT.findall(inner))
        tag, dur, quality = roundtrip_element(mei, "n3")
        self.assertEqual((tag, dur, quality), ("note", "brevis", "imperfecta"))

    def test_ordinary_minima_stays_leipzig_e938(self):
        svg, mei, _ = self.render_note("notes/ordinary-minima.mei")
        inner = note_inner(svg, "n4")
        self.assertIn("E938", inner)
        self.assertNotIn("E95B", svg)
        self.assertNotIn("E959", svg)
        _, dur, _ = roundtrip_element(mei, "n4")
        self.assertEqual(dur, "minima")

    def test_ordinary_semibrevis_stays_leipzig_e938(self):
        svg, mei, _ = self.render_note("notes/ordinary-semibrevis.mei")
        inner = note_inner(svg, "n5")
        self.assertIn("E938", inner)
        self.assertNotIn("E95B", svg)
        _, dur, _ = roundtrip_element(mei, "n5")
        self.assertEqual(dur, "semibrevis")

    def test_ordinary_brevis_unchanged(self):
        svg, mei, _ = self.render_note("notes/ordinary-brevis.mei")
        inner = note_inner(svg, "n6")
        self.assertNotIn("E959", svg)
        self.assertTrue(RECT.findall(inner))
        _, dur, _ = roundtrip_element(mei, "n6")
        self.assertEqual(dur, "brevis")

    def test_unknown_extsym_falls_back_without_crash(self):
        svg, mei, err = self.render_note("notes/unknown-extsym.mei")
        inner = note_inner(svg, "n7")
        self.assertIn("E938", inner)
        self.assertNotIn("E95B", svg)
        _, dur, _ = roundtrip_element(mei, "n7")
        self.assertEqual(dur, "minima")
        self.assertNotIn("Unknown dur", err)

    def test_glyph_num_oblique_supported(self):
        svg, mei, _ = self.render_note("notes/n8-glyph-num-oblique.mei")
        inner = note_inner(svg, "n8")
        self.assertIn("E95B", inner)
        _, dur, _ = roundtrip_element(mei, "n8")
        self.assertEqual(dur, "minima")


class InvalidNoteDurationTests(unittest.TestCase):
    def assert_invalid(self, rel: str, xml_id: str, token: str) -> None:
        src = FIXTURES / rel
        rc_svg, svg, err_svg = render(src, "svg")
        rc_mei, mei, err_mei = render(src, "mei")
        self.assertEqual(rc_svg, 0)
        self.assertEqual(rc_mei, 0)
        self.assertTrue(svg)
        combined = err_svg + err_mei
        self.assertIn(f"Unknown dur '{token}'", combined)
        tag, dur, _ = roundtrip_element(mei, xml_id)
        self.assertEqual(tag, "note")
        self.assertIsNone(dur)

    def test_invalid_note_2B(self):
        self.assert_invalid("notes/invalid-note-dur-2B.mei", "bad2b", "2B")

    def test_invalid_note_3B(self):
        self.assert_invalid("notes/invalid-note-dur-3B.mei", "bad3b", "3B")


if __name__ == "__main__":
    unittest.main()
