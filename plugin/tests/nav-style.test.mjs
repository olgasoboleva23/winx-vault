import { test } from "node:test";
import assert from "node:assert/strict";
import * as sass from "sass";

// the nav's labels open for the keyboard only: a mouse click focuses the button but must not keep
// the pill open, and a shut pill (--shut) stays folded even with focus inside
test("WinxNav: labels open on :focus-visible, not on any focus, and not when shut", () => {
  const css = sass.compile(new URL("../src/components/uikit/WinxNav/index.scss", import.meta.url).pathname,
    { loadPaths: [new URL("../src/styles", import.meta.url).pathname] }).css;

  assert.doesNotMatch(css, /:focus-within/);
  assert.match(css, /\.winx-rail:not\(\.winx-rail--shut\):has\(:focus-visible\) \.winx-rail__label/);
});
