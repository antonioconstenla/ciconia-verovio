#!/usr/bin/env node
/**
 * Toolkit harness for Phase 6C3 RedoLayout encoded-break cases.
 * Usage:
 *   node redolayout_toolkit_harness.mjs --toolkit <wasm.js> --fixtures <dir> --case <name>
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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

function mapSvg(svg) {
  const systems = [...svg.matchAll(/<g[^>]*class="system"[^>]*>/g)].map((m) => m.index);
  const idToSys = {};
  const bounds = [...systems, svg.length];
  for (let i = 0; i < systems.length; i++) {
    const chunk = svg.slice(bounds[i], bounds[i + 1]);
    for (const m of chunk.matchAll(/id="([^"]+)"/g)) idToSys[m[1]] = i;
  }
  return { nsys: systems.length, idToSys };
}

function renderAll(tk) {
  let svg = "";
  const pages = tk.getPageCount();
  for (let p = 1; p <= pages; p++) svg += tk.renderToSVG(p);
  return { pages, ...mapSvg(svg), svg };
}

function boundaryOk(idToSys, pre, post) {
  const a = idToSys[pre];
  const b = idToSys[post];
  return a !== undefined && b !== undefined && a !== b;
}

function pageOf(tk, xmlId) {
  try {
    return tk.getPageWithElement(xmlId);
  } catch {
    return null;
  }
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

const base = {
  adjustPageHeight: false,
  svgViewBox: true,
  scale: 40,
  mdivAll: true,
  evenNoteSpacing: true,
};

function load(meiName, breaks) {
  const mei = fs.readFileSync(path.join(fixtures, meiName), "utf8");
  tk.resetOptions();
  tk.setOptions({ ...base, breaks });
  if (!tk.loadData(mei)) throw new Error("loadData failed " + meiName);
  return tk.getOptions(["breaks"]).breaks;
}

function emit(obj) {
  console.log(JSON.stringify(obj));
}

if (caseName === "r1_sb_encoded") {
  const breaks = load("sb-only.mei", "encoded");
  const loadMap = renderAll(tk);
  const loadPass = boundaryOk(loadMap.idToSys, "pre-b", "post-a");
  tk.redoLayout();
  const r1 = renderAll(tk);
  const redo1Pass = boundaryOk(r1.idToSys, "pre-b", "post-a");
  tk.redoLayout();
  const r2 = renderAll(tk);
  const redo2Pass = boundaryOk(r2.idToSys, "pre-b", "post-a");
  emit({
    case: caseName,
    breaks,
    loadPass,
    redo1Pass,
    redo2Pass,
    loadSystems: loadMap.nsys,
    redo1Systems: r1.nsys,
    redo2Systems: r2.nsys,
    load: { pre: loadMap.idToSys["pre-b"], post: loadMap.idToSys["post-a"] },
    redo1: { pre: r1.idToSys["pre-b"], post: r1.idToSys["post-a"] },
    redo2: { pre: r2.idToSys["pre-b"], post: r2.idToSys["post-a"] },
  });
} else if (caseName === "r2_pb_encoded") {
  const breaks = load("pb-only.mei", "encoded");
  const loadPages = tk.getPageCount();
  const loadPrePage = pageOf(tk, "pb-pre-b");
  const loadPostPage = pageOf(tk, "pb-post-a");
  const loadPass = loadPrePage !== null && loadPostPage !== null && loadPrePage !== loadPostPage;
  tk.redoLayout();
  const r1Pre = pageOf(tk, "pb-pre-b");
  const r1Post = pageOf(tk, "pb-post-a");
  const redo1Pass = r1Pre !== null && r1Post !== null && r1Pre !== r1Post;
  tk.redoLayout();
  const r2Pre = pageOf(tk, "pb-pre-b");
  const r2Post = pageOf(tk, "pb-post-a");
  const redo2Pass = r2Pre !== null && r2Post !== null && r2Pre !== r2Post;
  emit({
    case: caseName,
    breaks,
    loadPass,
    redo1Pass,
    redo2Pass,
    loadPages,
    pagesAfterRedo: tk.getPageCount(),
    load: { prePage: loadPrePage, postPage: loadPostPage },
    redo1: { prePage: r1Pre, postPage: r1Post },
    redo2: { prePage: r2Pre, postPage: r2Post },
  });
} else if (caseName === "r3_pb_sb_encoded") {
  load("pb-and-sb.mei", "encoded");
  const check = () => {
    const map = renderAll(tk);
    const sbPass = boundaryOk(map.idToSys, "combo-pre-b", "combo-mid-a");
    const prePage = pageOf(tk, "combo-mid-b");
    const postPage = pageOf(tk, "combo-post-a");
    const pbPass = prePage !== null && postPage !== null && prePage !== postPage;
    return { sbPass, pbPass, map, prePage, postPage };
  };
  const loadC = check();
  tk.redoLayout();
  const r1 = check();
  tk.redoLayout();
  const r2 = check();
  emit({
    case: caseName,
    sbPass: loadC.sbPass && r1.sbPass && r2.sbPass,
    pbPass: loadC.pbPass && r1.pbPass && r2.pbPass,
    redo1Pass: r1.sbPass && r1.pbPass,
    redo2Pass: r2.sbPass && r2.pbPass,
    load: loadC,
    redo1: { sbPass: r1.sbPass, pbPass: r1.pbPass, prePage: r1.prePage, postPage: r1.postPage },
    redo2: { sbPass: r2.sbPass, pbPass: r2.pbPass, prePage: r2.prePage, postPage: r2.postPage },
  });
} else if (caseName === "r4_encoded_nobreak") {
  load("no-break.mei", "encoded");
  const loadMap = renderAll(tk);
  tk.redoLayout();
  const r1 = renderAll(tk);
  tk.redoLayout();
  const r2 = renderAll(tk);
  emit({
    case: caseName,
    renders: loadMap.pages >= 1 && loadMap.nsys >= 1,
    pages: loadMap.pages,
    systems: loadMap.nsys,
    redoStable: r1.pages === loadMap.pages && r2.pages === loadMap.pages && r1.nsys === loadMap.nsys && r2.nsys === loadMap.nsys,
  });
} else if (caseName === "r5_sb_auto") {
  const breaks = load("sb-only.mei", "auto");
  const map = renderAll(tk);
  const forced = boundaryOk(map.idToSys, "pre-b", "post-a");
  tk.redoLayout();
  const r1 = renderAll(tk);
  const r1Forced = boundaryOk(r1.idToSys, "pre-b", "post-a");
  tk.redoLayout();
  const r2 = renderAll(tk);
  const r2Forced = boundaryOk(r2.idToSys, "pre-b", "post-a");
  emit({
    case: caseName,
    breaks,
    boundaryForced: forced,
    redo1BoundaryForced: r1Forced,
    redo2BoundaryForced: r2Forced,
    renders: map.pages >= 1,
  });
} else if (caseName === "r6_sb_smart") {
  const breaks = load("sb-only.mei", "smart");
  const map = renderAll(tk);
  tk.redoLayout();
  const r1 = renderAll(tk);
  emit({
    case: caseName,
    breaks,
    renders: map.pages >= 1 && map.nsys >= 1 && r1.pages >= 1,
  });
} else if (caseName === "r7_sb_none") {
  const breaks = load("sb-only.mei", "none");
  const map = renderAll(tk);
  tk.redoLayout();
  const r1 = renderAll(tk);
  emit({
    case: caseName,
    breaks,
    renders: map.pages >= 1 && map.nsys >= 1 && r1.pages >= 1,
    systems: map.nsys,
  });
} else {
  console.error("unknown case", caseName);
  process.exit(2);
}
