// Builds the plugin: src/main.ts → main.js, styles/main.scss → styles.css, plus manifest.json.
//   npm run build   into dist/
//   npm run dev     into $WINX_VAULT/.obsidian/plugins/winx/ (default: this repo's vault), again on every save
import esbuild from "esbuild";
import * as sass from "sass";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here  = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
const out   = watch ? resolve(process.env.WINX_VAULT ?? resolve(here, ".."), ".obsidian/plugins/winx") : resolve(here, "dist");
mkdirSync(out, { recursive: true });

const styles = () => writeFileSync(resolve(out, "styles.css"), sass.compile(resolve(here, "styles/main.scss")).css);
const extras = {
  name: "winx-extras",   // styles and manifest go with every JS build
  setup(build) {
    build.onEnd(result => {
      if (result.errors.length) return;
      try { styles(); } catch (e) { console.error(e.message); }
      copyFileSync(resolve(here, "manifest.json"), resolve(out, "manifest.json"));
      if (watch) console.log(`winx → ${out}`);
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: [resolve(here, "src/main.ts")],
  outfile: resolve(out, "main.js"),
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2022",
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  sourcemap: watch ? "inline" : false,
  logLevel: "warning",
  plugins: [extras],
});
if (watch) {
  await ctx.watch();
  // esbuild doesn't see .scss: rebuild when one changes
  const { watch: watchDir } = await import("node:fs");
  watchDir(resolve(here, "styles"), { recursive: true }, () => { try { styles(); } catch (e) { console.error(e.message); } });
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
