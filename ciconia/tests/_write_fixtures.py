"""Generate generic Ciconia regression MEI fixtures (no manuscript IDs)."""
from pathlib import Path

HERE = Path(__file__).parent / "fixtures"


def wrap(layer: str, mm: str | None = "2", xml_id: str = "s1") -> str:
    mm_attr = f' modusminor="{mm}"' if mm else ""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.1">
  <meiHead>
    <fileDesc>
      <titleStmt><title>Ciconia mensural regression</title></titleStmt>
      <pubStmt/>
    </fileDesc>
  </meiHead>
  <music>
    <body>
      <mdiv>
        <score>
          <scoreDef>
            <staffGrp>
              <staffDef n="1" lines="5" notationtype="mensural.black"{mm_attr} tempus="3" prolatio="2">
                <clef shape="C" line="3"/>
              </staffDef>
            </staffGrp>
          </scoreDef>
          <section>
            <staff n="1">
              <layer n="1">
                {layer}
              </layer>
            </staff>
          </section>
        </score>
      </mdiv>
    </body>
  </music>
</mei>
"""


FILES = {
    "rests/r1-longa-modusminor-2.mei": wrap(
        '<rest xml:id="r1" dur="longa"/>\n                <note xml:id="n1" pname="c" oct="4" dur="brevis"/>',
        "2",
    ),
    "rests/r2-longa-modusminor-3.mei": wrap(
        '<rest xml:id="r2" dur="longa"/>\n                <note xml:id="n2" pname="c" oct="4" dur="brevis"/>',
        "3",
    ),
    "rests/r3-explicit-2B.mei": wrap(
        '<rest xml:id="r3" dur="2B"/>\n                <note xml:id="n3" pname="c" oct="4" dur="brevis"/>',
        "3",
    ),
    "rests/r4-explicit-3B.mei": wrap(
        '<rest xml:id="r4" dur="3B"/>\n                <note xml:id="n4" pname="c" oct="4" dur="brevis"/>',
        "2",
    ),
    "rests/r5-explicit-2B-no-mm.mei": wrap(
        '<rest xml:id="r5" dur="2B"/>\n                <note xml:id="n5" pname="c" oct="4" dur="brevis"/>',
        None,
    ),
    "rests/r6-explicit-3B-no-mm.mei": wrap(
        '<rest xml:id="r6" dur="3B"/>\n                <note xml:id="n6" pname="c" oct="4" dur="brevis"/>',
        None,
    ),
    "rests/r7-brevis.mei": wrap(
        '<rest xml:id="r7" dur="brevis"/>\n                <note xml:id="n7" pname="c" oct="4" dur="brevis"/>',
        "2",
    ),
    "rests/r8-longa-unspecified-mm.mei": wrap(
        '<rest xml:id="r8" dur="longa"/>\n                <note xml:id="n8" pname="c" oct="4" dur="brevis"/>',
        None,
    ),
    "notes/n1-minima-oblique-stem-up.mei": wrap(
        '<note xml:id="n1" pname="e" oct="4" dur="minima" stem.dir="up" glyph.auth="smufl" glyph.name="mensuralBlackSemibrevisOblique"/>',
        "2",
    ),
    "notes/n2-semibrevis-perfecta-oblique.mei": wrap(
        '<note xml:id="n2" pname="e" oct="4" dur="semibrevis" dur.quality="perfecta" glyph.auth="smufl" glyph.name="mensuralBlackSemibrevisOblique"/>',
        "2",
    ),
    "notes/n3-brevis-imperfecta-caudata.mei": wrap(
        '<note xml:id="n3" pname="d" oct="4" dur="brevis" dur.quality="imperfecta" glyph.auth="smufl" glyph.name="mensuralBlackSemibrevisCaudata"/>',
        "2",
    ),
    "notes/ordinary-minima.mei": wrap(
        '<note xml:id="n4" pname="e" oct="4" dur="minima" stem.dir="up"/>',
        "2",
    ),
    "notes/ordinary-semibrevis.mei": wrap(
        '<note xml:id="n5" pname="e" oct="4" dur="semibrevis"/>',
        "2",
    ),
    "notes/ordinary-brevis.mei": wrap(
        '<note xml:id="n6" pname="d" oct="4" dur="brevis"/>',
        "2",
    ),
    "notes/unknown-extsym.mei": wrap(
        '<note xml:id="n7" pname="e" oct="4" dur="minima" stem.dir="up" glyph.auth="smufl" glyph.name="notARealSmuflGlyphName"/>',
        "2",
    ),
    "notes/n8-glyph-num-oblique.mei": wrap(
        '<note xml:id="n8" pname="e" oct="4" dur="minima" stem.dir="up" glyph.auth="smufl" glyph.num="U+E95B"/>',
        "2",
    ),
    "notes/invalid-note-dur-2B.mei": wrap(
        '<note xml:id="bad2b" pname="c" oct="4" dur="2B"/>',
        "2",
    ),
    "notes/invalid-note-dur-3B.mei": wrap(
        '<note xml:id="bad3b" pname="c" oct="4" dur="3B"/>',
        "2",
    ),
}


def main() -> None:
    for rel, text in FILES.items():
        path = HERE / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
        print(path)


if __name__ == "__main__":
    main()
