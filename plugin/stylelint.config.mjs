// npm run lint:css: Stylelint's standard rules for SCSS, with our BEM class names
// (winx-block__element--modifier, CLAUDE.md "Styles: the rules"; Obsidian's own kebab-case names pass too)
const KEBAB = "[a-z0-9]+(?:-[a-z0-9]+)*";
export default {
  extends: ["stylelint-config-standard-scss"],
  ignoreFiles: ["dist/**", "src/styles/_assets.scss"],   // generated: the background picture as a data URI
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
  },
};
