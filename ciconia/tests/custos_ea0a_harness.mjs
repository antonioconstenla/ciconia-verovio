#!/usr/bin/env node
/**
 * Toolkit harness for mensural custos EA0A default cases.
 * Usage:
 *   node custos_ea0a_harness.mjs --toolkit <wasm.js> --fixtures <dir> --case <name>
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

function normalizeHref(value) {
  if (!value) return null;
  return value.replace(/^#/, "");
}

/** Collect <use> href/xlink:href codepoint prefixes near a custos group. */
function custosGlyphCodes(svg) {
  const results = [];
  const re =
    /<g[^>]*(?:class="[^"]*custos[^"]*"[^>]*id="([^"]+)"|id="([^"]+)"[^>]*class="[^"]*custos[^"]*")[^>]*>([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const id = m[1] || m[2];
    const body = m[3];
    const uses = [
      ...body.matchAll(/<(?:use|USE)\b[^>]*(?:href|xlink:href)="([^"]+)"/g),
    ];
    const codes = uses
      .map((u) => normalizeHref(u[1]))
      .filter(Boolean)
      .map((h) => {
        const mm = h.match(/^([0-9A-Fa-f]{4,5})-/);
        return mm ? mm[1].toUpperCase() : null;
      })
      .filter(Boolean);
    results.push({ id, codes, uses: uses.map((u) => u[1]) });
  }
  return results;
}

function resourceHasCode(svgDefsOrFull, code) {
  const upper = code.toUpperCase();
  // Symbol/path id patterns used by Verovio SVG output / embedded resources.
  const patterns = [
    new RegExp(`id="${upper}"`),
    new RegExp(`id="${upper}-`),
    new RegExp(`href="#${upper}-`),
    new RegExp(`xlink:href="#${upper}-`),
  ];
  return patterns.some((re) => re.test(svgDefsOrFull));
}

function renderAll(tk) {
  let svg = "";
  for (let p = 1; p <= tk.getPageCount(); p++) svg += tk.renderToSVG(p);
  return svg;
}

const toolkitPath = arg("--toolkit");
const fixtures = arg("--fixtures");
const caseName = arg("--case");
const fontName = arg("--font", "Leipzig");
if (!toolkitPath || !fixtures || !caseName) {
  console.error("missing --toolkit/--fixtures/--case");
  process.exit(2);
}

const verovio = require(path.resolve(toolkitPath));
await waitModule(verovio.module);
const tk = new verovio.toolkit();

const baseOpts = {
  adjustPageHeight: false,
  svgViewBox: true,
  scale: 40,
  mdivAll: true,
  evenNoteSpacing: true,
  font: fontName,
};

function loadMei(name) {
  return fs.readFileSync(path.join(fixtures, name), "utf8");
}

function emit(obj) {
  console.log(JSON.stringify(obj));
}

function expectCodes(svg, expected) {
  const found = custosGlyphCodes(svg);
  const flat = found.flatMap((c) => c.codes);
  return {
    found,
    flat,
    match:
      flat.length > 0 &&
      flat.every((c) => c === expected) &&
      found.length >= 1,
    expected,
  };
}

const cases = {
  t1_mensural_default() {
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, breaks: "auto" });
    tk.loadData(loadMei("t1-mensural-default.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const check = expectCodes(svg, "EA0A");
    emit({
      case: caseName,
      pass: check.match,
      font: fontName,
      ...check,
    });
  },
  t2_glyph_num_override() {
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, breaks: "auto" });
    tk.loadData(loadMei("t2-glyph-num-override.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const check = expectCodes(svg, "EA02");
    emit({
      case: caseName,
      pass: check.match,
      font: fontName,
      ...check,
    });
  },
  t3_glyph_name_override() {
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, breaks: "auto" });
    tk.loadData(loadMei("t3-glyph-name-override.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const check = expectCodes(svg, "EA02");
    emit({
      case: caseName,
      pass: check.match,
      font: fontName,
      ...check,
    });
  },
  t4_neume_default() {
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, breaks: "auto" });
    tk.loadData(loadMei("t4-neume-default.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const check = expectCodes(svg, "EA06");
    emit({
      case: caseName,
      pass: check.match,
      font: fontName,
      ...check,
    });
  },
  t5_cmn_default() {
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, breaks: "auto" });
    tk.loadData(loadMei("t5-cmn-default.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const check = expectCodes(svg, "EA02");
    emit({
      case: caseName,
      pass: check.match,
      font: fontName,
      ...check,
    });
  },
  t6_leipzig_resource() {
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, font: "Leipzig", breaks: "auto" });
    tk.loadData(loadMei("t1-mensural-default.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const check = expectCodes(svg, "EA0A");
    emit({
      case: caseName,
      pass: check.match && resourceHasCode(svg, "EA0A"),
      font: "Leipzig",
      resourcePresent: resourceHasCode(svg, "EA0A"),
      ...check,
    });
  },
  t7_bravura_resource() {
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, font: "Bravura", breaks: "auto" });
    tk.loadData(loadMei("t1-mensural-default.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const check = expectCodes(svg, "EA0A");
    emit({
      case: caseName,
      pass: check.match && resourceHasCode(svg, "EA0A"),
      font: "Bravura",
      resourcePresent: resourceHasCode(svg, "EA0A"),
      ...check,
    });
  },
  t8_gootville_fallback_resolution() {
    // Gootville has no native EA0A; Resources tertiary falls back to Bravura.
    // Actual contract: EA0A if Resources resolves it (via Bravura), else EA02.
    tk.resetOptions();
    tk.setOptions({ ...baseOpts, font: "Gootville", breaks: "auto" });
    tk.loadData(loadMei("t1-mensural-default.mei"));
    tk.redoLayout();
    const svg = renderAll(tk);
    const found = custosGlyphCodes(svg);
    const flat = found.flatMap((c) => c.codes);
    const resolved = flat[0] || null;
    const ok =
      found.length >= 1 &&
      flat.length >= 1 &&
      (resolved === "EA0A" || resolved === "EA02") &&
      !flat.includes(null);
    emit({
      case: caseName,
      pass: ok,
      font: "Gootville",
      resolved,
      note:
        resolved === "EA0A"
          ? "Resources resolved EA0A (expected via Bravura tertiary)"
          : "Resources did not resolve EA0A; rendered EA02 fallback",
      found,
      flat,
    });
  },
};

if (!cases[caseName]) {
  console.error("unknown case", caseName);
  process.exit(2);
}
cases[caseName]();
