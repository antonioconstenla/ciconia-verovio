#!/usr/bin/env node
/**
 * Toolkit harness for Phase 6C4C2 system-start clef cases.
 * Usage:
 *   node systemstart_clef_harness.mjs --toolkit <wasm.js> --fixtures <dir> --case <name>
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

function useTranslateX(chunk, id) {
  const re = new RegExp(
    `id="${id.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"[\\s\\S]{0,220}?translate\\(([^,]+),`,
    "m"
  );
  const m = chunk.match(re);
  return m ? parseFloat(m[1]) : null;
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
    const unique = [...new Set(ids)];
    const drawn = unique.filter((id) => {
      const x = useTranslateX(chunk, id);
      return x !== null;
    });
    rows.push({
      system: i,
      clefIds: unique,
      drawnClefIds: drawn,
      clefCount: drawn.length,
      staffStartX: staffStartX(chunk),
      clefXs: Object.fromEntries(
        drawn.map((id) => [id, useTranslateX(chunk, id)])
      ),
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

function relativeInset(sys, clefId) {
  if (!sys || sys.staffStartX == null) return null;
  const x = sys.clefXs?.[clefId];
  if (x == null) return null;
  return x - sys.staffStartX;
}

function firstDrawnId(sys) {
  return sys?.drawnClefIds?.[0] || null;
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

// Control: ordinary continuation inset from c2 (same toolkit/options).
function continuationControlInset() {
  const mei = fs.readFileSync(path.join(fixtures, "c2-continuation-only.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const id = firstDrawnId(s1);
  return relativeInset(s1, id);
}

let result;
if (caseName === "c1_explicit_at_sb_line") {
  const controlInset = continuationControlInset();
  const mei = fs.readFileSync(path.join(fixtures, "c1-explicit-at-sb.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const explicitInset = relativeInset(s1, "explicit-c1");
  const alignOk =
    controlInset != null &&
    explicitInset != null &&
    Math.abs(explicitInset - controlInset) <= 8;
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    hasExplicit: s1?.drawnClefIds?.includes("explicit-c1") || false,
    controlInset,
    explicitInset,
    alignOk,
    pass:
      s1?.clefCount === 1 &&
      s1?.drawnClefIds?.includes("explicit-c1") &&
      alignOk,
    redoStable:
      stages.load.systems[1]?.clefCount === stages.redo1.systems[1]?.clefCount &&
      stages.redo1.systems[1]?.clefCount === stages.redo2.systems[1]?.clefCount &&
      stages.load.systems[1]?.drawnClefIds?.includes("explicit-c1") &&
      stages.redo2.systems[1]?.drawnClefIds?.includes("explicit-c1"),
    stages: {
      load: { pages: stages.load.pages, systems: stages.load.systems },
      redo1: { pages: stages.redo1.pages, systems: stages.redo1.systems },
      redo2: { pages: stages.redo2.pages, systems: stages.redo2.systems },
    },
  };
} else if (caseName === "c2_continuation_only_line") {
  const mei = fs.readFileSync(path.join(fixtures, "c2-continuation-only.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const id = firstDrawnId(s1);
  const inset = relativeInset(s1, id);
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    inset,
    pass: s1?.clefCount === 1 && inset != null && inset > 0,
    redoStable:
      stages.load.systems[1]?.clefCount === 1 &&
      stages.redo1.systems[1]?.clefCount === 1 &&
      stages.redo2.systems[1]?.clefCount === 1,
    stages: {
      load: { pages: stages.load.pages, systems: stages.load.systems },
      redo1: { pages: stages.redo1.pages, systems: stages.redo1.systems },
      redo2: { pages: stages.redo2.pages, systems: stages.redo2.systems },
    },
  };
} else if (caseName === "c3_mid_system_clef_line") {
  const mei = fs.readFileSync(path.join(fixtures, "c3-mid-system-clef.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const laterX = s1?.clefXs?.["later-c1"];
  const startId = s1?.drawnClefIds?.find((id) => id !== "later-c1");
  const startX = startId != null ? s1.clefXs[startId] : null;
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    hasLater: s1?.drawnClefIds?.includes("later-c1") || false,
    laterAfterStart: laterX != null && startX != null && laterX > startX,
    pass:
      s1?.clefCount === 2 &&
      s1?.drawnClefIds?.includes("later-c1") &&
      laterX != null &&
      startX != null &&
      laterX > startX,
    redoStable:
      stages.load.systems[1]?.clefCount === stages.redo2.systems[1]?.clefCount,
    stages: {
      load: { pages: stages.load.pages, systems: stages.load.systems },
      redo1: { pages: stages.redo1.pages, systems: stages.redo1.systems },
      redo2: { pages: stages.redo2.pages, systems: stages.redo2.systems },
    },
  };
} else if (caseName === "c5_next_system_state_line") {
  const controlInset = continuationControlInset();
  const mei = fs.readFileSync(path.join(fixtures, "c5-next-system-state.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const s2 = stages.redo2.systems[2];
  const explicitInset = relativeInset(s1, "explicit-c1");
  const contId = firstDrawnId(s2);
  const contInset = relativeInset(s2, contId);

  function clefLineOffset(sysChunk, clefId) {
    const staffY = (sysChunk.match(/path d="M[\d.]+ ([\d.]+)/) || [])[1];
    const clefY = (
      sysChunk.match(
        new RegExp(
          `id="${clefId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}"[\\s\\S]{0,220}?translate\\([^,]+,\\s*([^)]+)\\)`
        )
      ) || []
    )[1];
    if (staffY == null || clefY == null) return null;
    return parseFloat(clefY) - parseFloat(staffY);
  }

  const parts = stages.redo2.svg.split(/<g[^>]*class="system"[^>]*>/);
  const s1chunk = parts[2] || "";
  const s2chunk = parts[3] || "";
  const s1Off = clefLineOffset(s1chunk, "explicit-c1");
  const s2Off = contId ? clefLineOffset(s2chunk, contId) : null;
  // Control C2 continuation on system 0 of c2 fixture for comparison baseline.
  const c2mei = fs.readFileSync(path.join(fixtures, "c2-continuation-only.mei"), "utf8");
  const c2stages = runStages(tk, c2mei, lineOpts);
  const c2parts = c2stages.redo2.svg.split(/<g[^>]*class="system"[^>]*>/);
  const c2s1 = c2parts[2] || "";
  const c2id = firstDrawnId(c2stages.redo2.systems[1]);
  const c2Off = c2id ? clefLineOffset(c2s1, c2id) : null;

  // System C continuation must match promoted C1 line offset, NOT old C2.
  const matchesNewC1 =
    s1Off != null && s2Off != null && Math.abs(s1Off - s2Off) <= 2;
  const differsFromOldC2 =
    c2Off != null && s2Off != null && Math.abs(s2Off - c2Off) > 2;

  const alignOk =
    controlInset != null &&
    explicitInset != null &&
    Math.abs(explicitInset - controlInset) <= 8;
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    system2ClefCount: s2?.clefCount,
    hasExplicit: s1?.drawnClefIds?.includes("explicit-c1") || false,
    controlInset,
    explicitInset,
    contInset,
    s1Off,
    s2Off,
    c2Off,
    matchesNewC1,
    differsFromOldC2,
    alignOk,
    pass:
      s1?.clefCount === 1 &&
      s1?.drawnClefIds?.includes("explicit-c1") &&
      s2?.clefCount === 1 &&
      alignOk &&
      matchesNewC1 &&
      differsFromOldC2,
    redoStable:
      stages.load.systems[1]?.clefCount === stages.redo2.systems[1]?.clefCount &&
      stages.load.systems[2]?.clefCount === stages.redo2.systems[2]?.clefCount,
    stages: {
      load: { pages: stages.load.pages, systems: stages.load.systems },
      redo1: { pages: stages.redo1.pages, systems: stages.redo1.systems },
      redo2: { pages: stages.redo2.pages, systems: stages.redo2.systems },
    },
  };
} else if (caseName === "c6_two_staff_line") {
  const controlInset = continuationControlInset();
  const mei = fs.readFileSync(path.join(fixtures, "c6-two-staff.mei"), "utf8");
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const explicitInset = relativeInset(s1, "explicit-c1-staff1");
  const otherIds = (s1?.drawnClefIds || []).filter((id) => id !== "explicit-c1-staff1");
  const otherInset = otherIds.length ? relativeInset(s1, otherIds[0]) : null;
  const alignOk =
    otherInset != null &&
    explicitInset != null &&
    Math.abs(explicitInset - otherInset) <= 8;
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    hasExplicit: s1?.drawnClefIds?.includes("explicit-c1-staff1") || false,
    controlInset,
    explicitInset,
    otherInset,
    alignOk,
    pass:
      s1?.clefCount === 2 &&
      s1?.drawnClefIds?.includes("explicit-c1-staff1") &&
      otherIds.length === 1 &&
      alignOk,
    redoStable:
      stages.load.systems[1]?.clefCount === stages.redo2.systems[1]?.clefCount,
    stages: {
      load: { pages: stages.load.pages, systems: stages.load.systems },
      redo1: { pages: stages.redo1.pages, systems: stages.redo1.systems },
      redo2: { pages: stages.redo2.pages, systems: stages.redo2.systems },
    },
  };
} else if (caseName === "c7_second_layer_leading_clef_line") {
  const controlInset = continuationControlInset();
  const mei = fs.readFileSync(
    path.join(fixtures, "c7-second-layer-leading-clef.mei"),
    "utf8"
  );
  const stages = runStages(tk, mei, lineOpts);
  const s1 = stages.redo2.systems[1];
  const layer2Inset = relativeInset(s1, "layer2-c1");
  const contIds = (s1?.drawnClefIds || []).filter((id) => id !== "layer2-c1");
  const contInset = contIds.length ? relativeInset(s1, contIds[0]) : null;
  const continuationAtStart =
    controlInset != null &&
    contInset != null &&
    Math.abs(contInset - controlInset) <= 8;
  result = {
    case: caseName,
    breaks: "line",
    system1ClefCount: s1?.clefCount,
    hasLayer2Clef: s1?.drawnClefIds?.includes("layer2-c1") || false,
    controlInset,
    layer2Inset,
    contInset,
    continuationAtStart,
    pass:
      s1?.clefCount === 2 &&
      s1?.drawnClefIds?.includes("layer2-c1") &&
      continuationAtStart,
    redoStable:
      stages.load.systems[1]?.clefCount === stages.redo2.systems[1]?.clefCount,
    stages: {
      load: { pages: stages.load.pages, systems: stages.load.systems },
      redo1: { pages: stages.redo1.pages, systems: stages.redo1.systems },
      redo2: { pages: stages.redo2.pages, systems: stages.redo2.systems },
    },
  };
} else {
  console.error("unknown case", caseName);
  process.exit(2);
}

console.log(JSON.stringify(result));
