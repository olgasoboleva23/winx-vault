// npm run lint:css: Stylelint's standard rules for SCSS, with our BEM class names
// (winx-block__element--modifier, CLAUDE.md "Styles: the rules"; Obsidian's own kebab-case names pass too)
const KEBAB = "[a-z0-9]+(?:-[a-z0-9]+)*";
export default {
  extends: ["stylelint-config-standard-scss"],
  ignoreFiles: ["dist/**", "src/styles/_assets.scss"],   // generated: the background picture as a data URI
  overrides: [{
    files: ["src/styles/_tokens.scss", "src/styles/_themes.scss"],
    rules: { "color-hex-length": "long" },
  }, {
    files: ["src/components/**/*.scss", "src/styles/_{busy,syncing,scroll-cards,tooltip}.scss"],
    rules: { "color-no-hex": true, "function-disallowed-list": ["rgb", "rgba"] },
  }, {
    files: ["src/components/pages/dashboard/widgets/xp/LevelToday/index.scss"],
    rules: { "color-no-hex": null, "function-disallowed-list": null },
  }],
  rules: {
    "selector-class-pattern": [`^${KEBAB}(?:__${KEBAB})?(?:--${KEBAB})?$`, { message: s => `Expected "${s}" to be a BEM name: winx-block__element--modifier` }],
    // our layout: a short rule on one line (`&__x { a: 1; b: 2; }`), related rules without blank lines between
    "declaration-block-single-line-max-declarations": null,
    "rule-empty-line-before": null,
    "comment-empty-line-before": null,
    "declaration-empty-line-before": null,
    "at-rule-empty-line-before": null,
    "scss/dollar-variable-empty-line-before": null,
    "scss/double-slash-comment-empty-line-before": null,
    // spacing and type from the scale ($space-*, $text-*): no px of 2 and more in them; a size tied to
    // something else (the wings, an arrow) is written from that size, or disabled with the reason
    "declaration-property-value-disallowed-list": [
      { "/^(gap|row-gap|column-gap|padding|margin|font-size)/": ["/(^|[^\\w.$])([2-9]|\\d{2,})(\\.\\d+)?px/"] },
      { message: (p, v) => `"${p}: ${v}": use the scale ($space-*, $text-*) or a size it's tied to` },
    ],
  },
};
