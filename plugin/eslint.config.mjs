// npm run lint: ESLint with Obsidian's own rules (eslint-plugin-obsidianmd: its recommended set has ESLint's
// and typescript-eslint's type-checked rules too)
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

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
  // .vue files: Vue's recommended rules; the type-checked ones need a project that knows .vue (vue-tsc checks them)
  ...pluginVue.configs["flat/recommended"],
  { files: ["**/*.vue"], languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: [".vue"] } } },
  { files: ["**/*.vue"], ...tseslint.configs.disableTypeChecked },
  // a short element stays on one line: <span class="x">{{ v }}</span>
  // a short element stays on one line (<span class="x">{{ v }}</span>, up to 3 attributes), a longer one breaks
  // by attribute
  { files: ["**/*.vue"], rules: {
    "vue/singleline-html-element-content-newline": "off",
    // its fix puts an element's text on a line of its own, and Vue then draws a space before it (" day 3")
    "vue/multiline-html-element-content-newline": "off",
    "vue/max-attributes-per-line": ["warn", { singleline: { max: 3 } }],
  } },
  // a 🔁 rule is read by `(m = rule.match(…)) ? … :` chains, on purpose
  { files: ["src/tasks/repeats.js"], rules: { "no-cond-assign": "off" } },
]);
