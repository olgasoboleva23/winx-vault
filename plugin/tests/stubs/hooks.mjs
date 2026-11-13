// node's module hooks for the tests: `import … from "obsidian"` gets tests/stubs/obsidian.mjs, a .vue file is
// compiled the way the build does it (unplugin-vue: <script setup> with the template inlined)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";

export const resolve = (spec, ctx, next) =>
  spec === "obsidian" ? { url: new URL("./obsidian.mjs", import.meta.url).href, shortCircuit: true } : next(spec, ctx);

export async function load(url, ctx, next) {
  if (!url.endsWith(".vue")) return next(url, ctx);
  const filename = fileURLToPath(url);
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const { content } = compileScript(descriptor, { id: filename, inlineTemplate: true });
  return { format: "module", source: content, shortCircuit: true };
}
