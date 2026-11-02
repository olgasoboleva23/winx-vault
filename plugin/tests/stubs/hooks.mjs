// node's module hook for the tests: `import … from "obsidian"` gets tests/stubs/obsidian.mjs
export const resolve = (spec, ctx, next) => spec === "obsidian" ? { url: new URL("./obsidian.mjs", import.meta.url).href, shortCircuit: true } : next(spec, ctx);
