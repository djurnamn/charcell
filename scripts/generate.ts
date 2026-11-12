#!/usr/bin/env node
/**
 * post-render generation. Runs after `scaffold-ui-kit build` (which renders
 * `src/components/*.ts` to `dist/<target>/`) and produces:
 *
 *   dist/charcell.css          base + components (`charcell/css`)
 *   dist/charcell.base.css     base alone (`charcell/css/base`), for a page
 *                              whose components link their own sheets
 *   dist/charcell.preflight.css the reset + page canvas (`charcell/css/preflight`)
 *   dist/charcell.full.css     all of it (`charcell/css/full`)
 *   dist/fonts/                the self-hosted faces (Overpass mono, and Lilex
 *                              italic for the italic) and their licenses, next to the
 *                              stylesheets so `@font-face` `url("./fonts/...")`
 *                              resolves
 *   dist/svelte/actions/*.svelte.js and .d.ts
 *                              the Svelte drivers' rune modules, compiled from
 *                              their `.svelte.ts`
 *
 * The per-target barrels are the scaffolder's: under `stylesheetLink: 'both'`
 * it writes `dist/<target>/index.ts` over the linked faces (each component
 * importing its compiled sheets) and `dist/<target>/unlinked/index.ts` over the
 * components as they are, and `dist/<target>/_index.scss` over every component
 * sheet, which the kit's stylesheets take for their components (React is the
 * CSS source of truth; the targets' SCSS is identical).
 */

import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { kitPackageImporter } from "scaffold-ui-kit";
import * as sass from "sass";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(__dirname, "../src");
const DIST = resolve(__dirname, "../dist");
const STYLES = resolve(SOURCE, "styles");
const FONTS_SOURCE = resolve(SOURCE, "styles/fonts");
const FONTS_OUT = resolve(DIST, "fonts");

// Every component's props interface is public api: a consumer wrapping Button
// writes `import type { ButtonProps } from 'charcell/react'`. The engine
// declares the interface without `export`, so the kit
// adds it; the barrels already star-export each module. React and Vue only:
// a Svelte component types its props inline, and `ComponentProps<typeof
// Button>` is the idiomatic route there.
const PROPS_INTERFACE_TARGETS: Record<string, string> = {
  react: ".tsx",
  vue: ".vue",
};

function exportPropsInterfaces() {
  for (const [target, extension] of Object.entries(PROPS_INTERFACE_TARGETS)) {
    const directory = resolve(DIST, target);
    if (!existsSync(directory)) continue;
    let exported = 0;
    for (const file of readdirSync(directory).filter((name) =>
      name.endsWith(extension),
    )) {
      const path = resolve(directory, file);
      const source = readFileSync(path, "utf8");
      const rewritten = source.replace(
        /^interface (\w+Props)\b/gm,
        (_, name) => {
          exported += 1;
          return `export interface ${name}`;
        },
      );
      if (rewritten !== source) writeFileSync(path, rewritten, "utf8");
    }
    console.log(`  ✓ ${target} props interfaces exported (${exported})`);
  }
}

// Each entry compiles on its own, so each one states the layer order first.
const STYLESHEETS: Record<string, string> = {
  "charcell.css": "index.scss",
  "charcell.base.css": "base.scss",
  "charcell.preflight.css": "preflight.scss",
  "charcell.full.css": "full.scss",
};

function buildStylesheets() {
  for (const [output, entry] of Object.entries(STYLESHEETS)) {
    const { css } = sass.compile(resolve(STYLES, entry), {
      loadPaths: [SOURCE],
      // The component sheets load the shared styles as a copy of them would,
      // through the package (`pkg:charcell/styles/...`).
      importers: [
        ...[kitPackageImporter(resolve(__dirname, ".."))].filter(
          (importer) => importer !== undefined,
        ),
        new sass.NodePackageImporter(),
      ],
      style: "compressed",
    });
    writeFileSync(resolve(DIST, output), css, "utf8");
  }
  if (existsSync(FONTS_SOURCE)) {
    cpSync(FONTS_SOURCE, FONTS_OUT, { recursive: true });
  }
  console.log(`  ✓ ${Object.keys(STYLESHEETS).join(", ")} (+ fonts)`);
}

// The Svelte drivers' rune modules ship as JavaScript with declarations
// beside them, as Svelte libraries do: vite's dependency optimizer compiles a
// `.svelte.ts` in a dependency as JavaScript, and its types would stop a
// consumer's dev server. The drivers import them without the extension.
const SVELTE_ACTIONS = resolve(DIST, "svelte/actions");

function compileSvelteModules() {
  if (!existsSync(SVELTE_ACTIONS)) return;
  const modules = readdirSync(SVELTE_ACTIONS)
    .filter((name) => name.endsWith(".svelte.ts"))
    .map((name) => resolve(SVELTE_ACTIONS, name));
  const program = ts.createProgram(modules, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    types: ["svelte"],
    strict: true,
    skipLibCheck: true,
    verbatimModuleSyntax: true,
    declaration: true,
    emitDeclarationOnly: true,
  });
  // The modules' own declarations; the scripts they import keep their source.
  const result = program.emit(undefined, (name, text) => {
    if (dirname(name) === SVELTE_ACTIONS) writeFileSync(name, text, "utf8");
  });
  const problems = [
    ...ts.getPreEmitDiagnostics(program),
    ...result.diagnostics,
  ].filter((diagnostic) => modules.includes(diagnostic.file?.fileName ?? ""));
  if (problems.length > 0) {
    throw new Error(
      ts.formatDiagnostics(problems, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => "\n",
      }),
    );
  }
  for (const module of modules) {
    const { outputText } = ts.transpileModule(readFileSync(module, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        verbatimModuleSyntax: true,
      },
    });
    writeFileSync(module.replace(/\.ts$/, ".js"), outputText, "utf8");
    rmSync(module);
  }
  console.log(`  ✓ svelte rune modules compiled (${modules.length})`);
}

console.log("charcell: generating barrels + stylesheet...");
exportPropsInterfaces();
buildStylesheets();
compileSvelteModules();
