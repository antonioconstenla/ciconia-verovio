#!/usr/bin/env node
/**
 * Toolkit harness for Phase 6C4C3 clefGrp cases.
 * Usage:
 *   node clefgrp_harness.mjs --toolkit <wasm.js> --fixtures <dir> --case <name>
 *
 * Requires a WASM toolkit built with ClefGrp support (CICONIA_WASM_TOOLKIT).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

function waitModule(mod) {
  if (mod.HEAPU8 && typeof mod._vrvToolkit_constructor === "function") {
    return Promise.resolve(mod);
  }
  if (mod.calledRun) return Promise.resolve(mod);
  if (mod.ready) return mod.ready.then(() => mod);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 120000);
    const prev = mod.onRuntimeInitialized;
    mod.onRuntimeInitialized = () => {
      clearTimeout(t);
      if (typeof prev === "function") prev();
      resolve(mod);
    };
  });
}

function useTranslate(chunk, id) {
  const re = new RegExp(
    `id="${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"[\\s\\S]{0,220}?translate\\(([^,]+),\\s*([^)]+)\\)`,
    "m"
  );
  const m = chunk.match(re);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
}

function staffStartX(chunk) {
  const m = chunk.match(/path d="M(\d+(?:\.\d+)?) /);
  return m ? parseFloat(m[1]) : null;
}

function systemChunks(svg) {
  const systems = [...svg.matchAll(/<g[^>]*class="system"[^>]*>/g)].map((m) => m.index);
  const bounds = [...systems, svg.length];
  const rows = [];
  for (let i = 0; i < systems.length; i++) {
    const chunk = svg.slice(bounds[i], bounds[i + 1]);
    const ids = [
      ...chunk.matchAll(/<g[^>]*class="[^"]*clef[^"]*"[^>]*id="([^"]+)"/g),
      ...chunk.matchAll(/<g[^>]*id="([^"]+)"[^>]*class="[^"]*clef[^"]*"/g),
    ].map((m) => m[1]);
    const unique = [...new Set(ids)].filter((id) => !id.startsWith("grp"));
    const drawn = unique.filter((id) => useTranslate(chunk, id) !== null);
    const xy = Object.fromEntries(
      drawn.map((id) => {
        const t = useTranslate(chunk, id);
        return [id, t];
      })
    );
    rows.push({
      system: i,
      clefIds: unique,
      drawnClefIds: drawn,
      clefCount: drawn.length,
      staffStartX: staffStartX(chunk),
      clefXY: xy,
      chunk,
    });
  }
  return rows;
}

function renderAll(tk) {
  let svg = "";
  for (let p = 1; p <= tk.getPageCount(); p++) svg += tk.renderToSVG(p);
  return svg;
}

function runStages(tk, mei, opts) {
  const out = {};
  for (const stage of ["load", "redo1", "redo2"]) {
    if (stage === "load") {
      tk.resetOptions();
      tk.setOptions(opts);
      tk.loadData(mei);
      tk.redoLayout();
    } else {
      tk.setOptions(opts);
      tk.redoLayout();
    }
    const svg = renderAll(tk);
    out[stage] = {
      pages: tk.getPageCount(),
      systems: systemChunks(svg),
      svg,
    };
  }
  return out;
}

/** Documented GetClefLocOffset equivalence: C4 and F2 both = 6. */
function clefLocOffset(shape, line) {
  let offset = 0;
  if (shape === "G") offset = -4;
  else if (shape === "F") offset = 4;
  else if (shape === "C") offset = 0;
  offset += (line - 1) * 2;
  return offset;
}

const toolkitPath = arg("--toolkit");
const fixtures = arg("--fixtures");
const caseName = arg("--case");
if (!toolkitPath || !fixtures || !caseName) {
  console.error("missing --toolkit/--fixtures/--case");
  process.exit(2);
}

const verovio = require(path.resolve(toolkitPath));
await waitModule(verovio.module);
const tk = new verovio.toolkit();

const lineOpts = {
  breaks: "line",
  mdivAll: true,
  adjustPageHeight: false,
  evenNoteSpacing: true,
  scale: 40,
  svgViewBox: true,
  mmOutput: false,
};

function pairGeometry(sys) {
  const c4 = sys?.clefXY?.c4;
  const f2 = sys?.clefXY?.f2;
  if (!c4 || !f2) return null;
  return {
    sameX: Math.abs(c4.x - f2.x) <= 2,
    c4AboveF2: c4.y < f2.y, // SVG Y grows downward
    deltaX: c4.x - f2.x,
    c4,
    f2,
  };
}

function hasIds(sys, ids) {
  return ids.every((id) => sys?.drawnClefIds?.includes(id));
}

function stageClefCounts(stages, sysIdx) {
  return {
    load: stages.load.systems[sysIdx]?.clefCount,
    redo1: stages.redo1.systems[sysIdx]?.clefCount,
    redo2: stages.redo2.systems[sysIdx]?.clefCount,
  };
}

let result;

if (caseName === "loc_offset_equivalence") {
  const c4 = clefLocOffset("C", 4);
  const f2 = clefLocOffset("F", 2);
  result = {
    case: caseName,
    c4Offset: c4,
    f2Offset: f2,
    // C4: 0+(4-1)*2=6; F2: 4+(2-1)*2=6
    formula: "C4: 0+(4-1)*2=6; F2: 4+(2-1)*2=6",
    pass: c4 === 6 && f2 === 6 && c4 === f2,
  };
} else if (caseName === "g1_opening_vertical_pair_line") {
  const mei = fs.readFileSync(
    path.join(fixtures, "g1-opening-vertical-pair.mei"),
    "utf8"
  );
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const geo = pairGeometry(s1);
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    hasPair: hasIds(s1, ["c4", "f2"]),
    geo,
    pass:
      s1?.clefCount === 2 &&
      hasIds(s1, ["c4", "f2"]) &&
      geo &&
      geo.sameX &&
      geo.c4AboveF2,
    redoStable:
      stages.load.systems[1]?.clefCount === 2 &&
      stages.redo1.systems[1]?.clefCount === 2 &&
      stages.redo2.systems[1]?.clefCount === 2,
    stages: {
      load: { pages: stages.load.pages, systems: stages.load.systems.map(({ chunk, ...r }) => r) },
      redo1: { pages: stages.redo1.pages, systems: stages.redo1.systems.map(({ chunk, ...r }) => r) },
      redo2: { pages: stages.redo2.pages, systems: stages.redo2.systems.map(({ chunk, ...r }) => r) },
    },
  };
} else if (caseName === "g2_continuation_line") {
  const mei = fs.readFileSync(path.join(fixtures, "g2-continuation.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const s2 = stages.redo2.systems[2];
  const geo1 = pairGeometry(s1);
  // Continuation may reuse ids or anonymous copies — count + vertical pair geometry.
  const contPair =
    s2?.clefCount === 2 &&
    s2.drawnClefIds.length === 2 &&
    (() => {
      const a = s2.clefXY[s2.drawnClefIds[0]];
      const b = s2.clefXY[s2.drawnClefIds[1]];
      if (!a || !b) return false;
      return Math.abs(a.x - b.x) <= 2 && a.y !== b.y;
    })();
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    system2ClefCount: s2?.clefCount,
    hasPair: hasIds(s1, ["c4", "f2"]),
    geo1,
    contPair,
    pass:
      s1?.clefCount === 2 &&
      hasIds(s1, ["c4", "f2"]) &&
      geo1?.sameX &&
      geo1?.c4AboveF2 &&
      s2?.clefCount === 2 &&
      contPair,
    redoStable:
      stageClefCounts(stages, 1).load === 2 &&
      stageClefCounts(stages, 2).load === 2 &&
      stageClefCounts(stages, 1).redo2 === 2 &&
      stageClefCounts(stages, 2).redo2 === 2,
  };
} else if (caseName === "g3_group_to_single_line") {
  const mei = fs.readFileSync(
    path.join(fixtures, "g3-group-to-single.mei"),
    "utf8"
  );
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const s2 = stages.redo2.systems[2];
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    system2ClefCount: s2?.clefCount,
    hasPair: hasIds(s1, ["c4", "f2"]),
    hasLaterC1: s1?.drawnClefIds?.includes("later-c1") || false,
    // After C1, next system should be single C1 continuation (not the pair).
    system2Single: s2?.clefCount === 1,
    pass:
      s1?.clefCount === 3 &&
      hasIds(s1, ["c4", "f2", "later-c1"]) &&
      s2?.clefCount === 1,
    redoStable:
      stages.load.systems[2]?.clefCount === stages.redo2.systems[2]?.clefCount,
  };
} else if (caseName === "g4_single_to_group_line") {
  const mei = fs.readFileSync(
    path.join(fixtures, "g4-single-to-group.mei"),
    "utf8"
  );
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const s2 = stages.redo2.systems[2];
  const contPair =
    s2?.clefCount === 2 &&
    (() => {
      const ids = s2.drawnClefIds;
      if (ids.length < 2) return false;
      const a = s2.clefXY[ids[0]];
      const b = s2.clefXY[ids[1]];
      return a && b && Math.abs(a.x - b.x) <= 2 && a.y !== b.y;
    })();
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    system2ClefCount: s2?.clefCount,
    hasC2: s1?.drawnClefIds?.includes("explicit-c2") || false,
    hasPair: hasIds(s1, ["c4", "f2"]),
    contPair,
    pass:
      s1?.clefCount === 3 &&
      s1?.drawnClefIds?.includes("explicit-c2") &&
      hasIds(s1, ["c4", "f2"]) &&
      s2?.clefCount === 2 &&
      contPair,
    redoStable:
      stages.load.systems[2]?.clefCount === stages.redo2.systems[2]?.clefCount,
  };
} else if (caseName === "g5_redo_line") {
  const mei = fs.readFileSync(path.join(fixtures, "g5-redo.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const counts = [1, 2].map((i) => stageClefCounts(stages, i));
  result = {
    case: caseName,
    breaks: "line",
    counts,
    pass: counts.every(
      (c) => c.load === 2 && c.redo1 === 2 && c.redo2 === 2
    ),
    redoStable: counts.every(
      (c) => c.load === c.redo1 && c.redo1 === c.redo2
    ),
  };
} else {
  console.error("unknown case", caseName);
  process.exit(2);
}

console.log(JSON.stringify(result));
