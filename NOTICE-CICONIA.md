# NOTICE — Ciconia

This document is operational attribution, not legal advice.

## Verovio

Ciconia is based on [Verovio](https://github.com/rism-digital/verovio).

Verovio remains copyrighted by its original authors and is available under
the GNU Lesser General Public License v3 (`COPYING`, `COPYING.LESSER`).

Ciconia is a **downstream** set of modifications. It is not an official
Verovio release and does not imply endorsement by the Verovio maintainers.

## Fonts

Fonts bundled with Verovio (including Leipzig and Bravura) are licensed under
the SIL Open Font License. See `fonts/README.md`.

Ciconia adds genuine Bravura SMuFL glyph XML for U+E959 and U+E95B. Those
contours belong to Bravura (Daniel Spreadbury / Steinberg) and must not be
presented as Leipzig.

## Ciconia modifications

Ciconia-specific documentation and tests in this tree (`CICONIA.md`,
`ciconia/tests/`, and the two mensural patches described there) are downstream
changes on top of the pinned Verovio base.

Preserve all upstream notices when publishing a future public repository:

- `COPYING`
- `COPYING.LESSER`
- `README.md` Verovio authorship and license badge
- `fonts/README.md` (SIL OFL attribution)
- LibMEI and other third-party notices already in-tree
