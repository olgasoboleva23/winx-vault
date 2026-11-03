// npm run lint: ESLint with Obsidian's own rules (eslint-plugin-obsidianmd: its recommended set has ESLint's
// and typescript-eslint's type-checked rules too)
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";

export default defineConfig([
  { ignores: ["dist/", "node_modules/", "tests/", "esbuild.config.mjs", "eslint.config.mjs"] },
  ...obsidianmd.configs.recommended,
  { languageOptions: { parserOptions: { projectService: true } } },
  // Dataview and Tasks come without types: everything from them is `any`. Off until the types are written
  // (with checkJs in tsconfig.json)
  { rules: Object.fromEntries(["no-explicit-any", "no-unsafe-member-access", "no-unsafe-call", "no-unsafe-assignment",
    "no-unsafe-argument", "no-unsafe-return"].map(r => [`@typescript-eslint/${r}`, "off"])) },
  // sentence case, but the plugins' names keep their capital ("Tasks plugin is off")
  { rules: { "obsidianmd/ui/sentence-case": ["warn", { brands: [...DEFAULT_BRANDS, "Tasks", "Dataview"] }] } },
  // lines up to 120 characters: an html`` template breaks by element, a call by argument
  { rules: { "max-len": ["error", { code: 120, ignoreUrls: true }] } },
  // a 🔁 rule is read by `(m = rule.match(…)) ? … :` chains, on purpose
  { files: ["src/tasks/repeats.js"], rules: { "no-cond-assign": "off" } },
]);
