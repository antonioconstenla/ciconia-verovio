# Ciconia WASM build plan

This is a **pre-build audit**. Emscripten was not installed for this repository
bootstrap, and Ciconia Viewer is not implemented yet.

No official Verovio affiliation is claimed.

## Required software

- Emscripten SDK ≥ 3.1.27 (`em++`, `emcmake`, `emmake`), with `emsdk_env` sourced
- Perl (`emscripten/buildToolkit` is a Perl script)
- CMake and Make
- gzip
- Node.js / npm if producing the npm package (`emscripten/buildNpmPackage`)
- A POSIX-like shell (`which`, `mkdir -p`, `cp -r`)

A native Windows Build Tools environment is **not** sufficient for this path.

## Official Verovio build path

From a POSIX environment, at Ciconia HEAD:

```bash
source /path/to/emsdk/emsdk_env.sh
cd emscripten
./buildToolkit -w
```

`-w` selects the WASM toolkit. Humdrum is enabled by default and forces WASM;
`-H` disables Humdrum (`-DNO_HUMDRUM_SUPPORT=ON`). Do **not** pass
`-x Bravura`: E959/E95B exist only as Bravura resources.

Optional npm distribution:

```bash
./buildNpmPackage
```

CMake is invoked as `emcmake cmake ../cmake -DBUILD_AS_WASM=ON`.

## Expected artifacts (gitignored)

- `emscripten/build/verovio.js` (Emscripten output; default WASM uses
  `-s SINGLE_FILE=1`)
- Toolkit glue rename typically yields `verovio-toolkit-wasm.js` plus `.gz`
- npm: `emscripten/npm/dist/` (`verovio-toolkit-wasm.js`, ESM wrappers)

## Resource / font packaging

`buildToolkit` copies `data/` then links with `--embed-file data/`. New files
`data/Bravura/E959.xml` and `data/Bravura/E95B.xml` are included automatically.
No JS glue, `exports.txt`, or `c_wrapper` changes are required for these C++
patches.

Ordinary Leipzig glyphs remain Leipzig. Bravura is required only for the two
missing extSym glyphs.

## Version / build provenance

`tools/get_git_commit.sh` runs during the toolkit build and stamps `GIT_COMMIT`
into `vrv::GetVersion()`. Native Windows NMake in this bootstrap printed
`Verovio 6.3.0-dev[undefined]` because that script was not used. A WASM build
should expose `6.3.0-dev` plus the Ciconia HEAD / upstream base SHA in
downstream documentation even if the upstream version string is left unchanged.

Recommended future display (not implemented):

```
Ciconia 0.1.0
Verovio upstream fb5c4db7 / 6.3.0-dev
```

## Loading the toolkit from a static page

Serve the toolkit over HTTP (not `file://`). Minimal future viewer:

1. Host `verovio-toolkit-wasm.js` (or ESM `createVerovioModule` + `VerovioToolkit`)
2. Wait for `onRuntimeInitialized` / module promise
3. `loadData(mei)` → `renderToSVG(page)`
4. Open local MEI, previous/next page, zoom, optional save SVG
5. No editor

```html
<script src="./verovio-toolkit-wasm.js"></script>
<script>
verovio.module.onRuntimeInitialized = function () {
  const tk = new verovio.toolkit();
  tk.loadData(meiText);
  document.body.innerHTML = tk.renderToSVG(1, {});
};
</script>
```

A local static server is enough, for example `python -m http.server`.

## Shared-core inclusion

Commits 1 and 2 change `src/`, `libmei/addons`, and `data/`. The WASM toolkit
compiles the same C++ core. Once Emscripten is available, no additional
renderer work is required for these two patches.

## Not done here

- Emscripten install
- WASM compile
- npm publish
- Ciconia Viewer implementation
