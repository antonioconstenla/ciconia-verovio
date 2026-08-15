# Ciconia

Ciconia is a thin downstream build of Verovio focused on standards-compliant
mensural rendering improvements that are not yet available upstream.

**Status: EARLY DEVELOPMENT / NOT YET RELEASED**

Ciconia is not an official Verovio product and is not affiliated with or
endorsed by the Verovio maintainers.

## What Ciconia is

A Verovio-based renderer/distribution that carries generic mensural rendering
fixes until they are merged upstream. Canonical input remains **standard MEI 5.1**
with `notationtype="mensural.black"`.

Ciconia is **not** a new MEI dialect.

Do not invent `notationtype="mensural.black-italian"` or Ciconia-only MEI
attributes for the current features.

## Upstream

- Project: [Verovio](https://github.com/rism-digital/verovio)
- Upstream base SHA: `fb5c4db7e9a9d3214a204c4a83c2d2e011782a52`
- Reference release: Verovio 6.2.1 (`version-6.2.1`, commit `8d42439dc9231f6c87779287b542febcb3d609b3`)
- At this base, Verovio reports itself as `6.3.0-dev`

## Current patch list

### Patch 1 — MEI mensural 2B/3B rests and longa/modusminor rendering

`<rest dur="2B"/>` draws a 2-staff-space rest (2 breves).
`<rest dur="3B"/>` draws a 3-staff-space rest (3 breves).
`<rest dur="longa"/>` with `modusminor="2"` draws 2 spaces.
`<rest dur="longa"/>` with `modusminor="3"` draws 3 spaces.

Tokens `2B`/`3B` are valid **rest** durations in MEI 5.1; they are not valid
note durations. Invalid `<note dur="2B"/>` warns and does not round-trip as a
legitimate duration.

### Patch 2 — explicit mensural note extSym rendering

`note@glyph.name` / `note@glyph.num` are visual overrides only.
`@dur` and `@dur.quality` remain the semantic/timing values.

Missing Leipzig glyphs (E959, E95B) use genuine **Bravura** contours via a
tertiary `Resources::GetGlyph` fallback. Those outlines are not installed as
Leipzig.

## Lifecycle

If an upstream Verovio release later includes one of these fixes, drop the
corresponding downstream patch when consuming that release.

## Tests

Ciconia-specific structural tests live in `ciconia/tests/`. They drive the
native CLI and assert SVG geometry/glyphs plus MEI round-trip tokens.

Upstream visual tests live in the separate `verovio.org` `_tests` suite and
are not duplicated here.

## Native build (Windows, existing MSVC/CMake)

CMake source directory is `cmake/`.

```
cmake -S cmake -B build -G "NMake Makefiles" -DCMAKE_BUILD_TYPE=Release -DNO_HUMDRUM_SUPPORT=ON
cmake --build build --target verovio
python -m unittest discover -s ciconia/tests -v
```

Point `CICONIA_VEROVIO` at the executable if it is not `build/verovio.exe`.
