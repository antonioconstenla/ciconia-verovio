# Ciconia upstream contribution plan

No GitHub issues, PRs, forks, or releases have been created from this local
repository. This file records **future** extraction intent only.

Ciconia is a downstream profile of Verovio. If a patch is merged upstream,
drop that downstream commit when consuming a suitable upstream release.

Upstream base (pinned): `fb5c4db7e9a9d3214a204c4a83c2d2e011782a52`
(`6.3.0-dev`; reference release 6.2.1 = `8d42439dc9231f6c87779287b542febcb3d609b3`).

Official repository: `https://github.com/rism-digital/verovio.git`

CLA: a signed Verovio CLA is required before any real PR.

---

## Patch / commit 1 → future upstream PR A

| Field | Value |
| --- | --- |
| Ciconia commit | `b545d35078609706f9aff7ad358586160d90aaa3` |
| Upstream base | `fb5c4db7e9a9d3214a204c4a83c2d2e011782a52` |
| Problem | Mensural `2B`/`3B` rests are not parsed; longa rest graphy ignores `modusminor` |
| Standards | MEI 5.1 `data.DURATIONRESTS` / `data.MULTIBREVERESTS.mensural` |
| Upstream issue | [Verovio #1405](https://github.com/rism-digital/verovio/issues/1405) |
| Likely tests | Rest 2-space / 3-space SVG geometry; `2B`/`3B` round-trip; invalid `<note dur="2B"/>`; longa + `modusminor` 2\|3 |

### Known open questions

- Unspecified longa (`modusminor` absent): Ciconia keeps the **2-space E9F2** drawing fallback while alignment already treats unspecified modus as ternary. #1405 preferred a **visual** ternary default. This policy must be explicit in an upstream discussion.
- Architecture is Option C (rest-only consume). `2B`/`3B` live in `data_DURATION` and currently pass through `GetActualDur()` as themselves. A Verovio review may want `GetActualDur()` mapped to `DURATION_long` while drawing/time stay explicit.
- `rest@spaces` is unread; MEI already has the attribute.
- 3-space rests are a geometric rectangle (`3 * GetDrawingDoubleUnit`); E9F1 is **4** staff spaces and must not be scaled as 3B.
- Default `Att::StrToDuration` still rejects `2B`/`3B` on notes (intentional).
- `libmei/addons` is the appropriate layer: `data.DURATIONRESTS` is excluded from codegen.

---

## Patch / commit 2 → future upstream PR B

| Field | Value |
| --- | --- |
| Ciconia commit | `b000d48f65949641e3237a34d16e2e2717069341` |
| Upstream base | `fb5c4db7e9a9d3214a204c4a83c2d2e011782a52` |
| Problem | Mensural notes ignore `att.extSym` (`glyph.name` / `glyph.num`); rests already honor it |
| Standards | MEI 5.1 `att.extSym` on `note`; visual override only |
| Upstream issue | none opened; related font-coverage question |

### Font fallback / resource implementation question

Leipzig SVG/metadata do not contain E959 (`mensuralBlackSemibrevisCaudata`) or
E95B (`mensuralBlackSemibrevisOblique`). Ciconia ships genuine Bravura glyph XML
and a **tertiary** `Resources::GetGlyph` lookup: current font → configured
fallback → Bravura. Ordinary Leipzig glyphs (e.g. E938) still resolve in Leipzig
first.

Open questions for upstream:

- Is a global Bravura completeness fallback acceptable, or should only named
  extSym glyphs request Bravura?
- `fonts/supported.xml` was updated, but `smufl.h` was patched by hand and
  `SMUFL_COUNT` remains **650** while the enum/list has **652** entries.
  Upstream should regenerate via `fonts/generate.py`.
- LoadFont completeness is now checked against Bravura, allowing Leipzig to
  remain a subset.
- Do not copy Bravura outlines into `data/Leipzig/`.
- WASM toolkits built with `-x Bravura` would not embed these glyphs.

Likely tests: N1–N3 glyph presence, ordinary minima/semibrevis/brevis Leipzig
regression (path-level, not only `E938` string), unknown `glyph.name` fallback,
`glyph.num="U+E95B"`.
