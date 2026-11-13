import { test } from "node:test";
import assert from "node:assert/strict";
import * as sass from "sass";

// the nav's labels open for the keyboard only: a mouse click focuses the button but must not keep
// the pill open, and a shut pill (--shut) stays folded even with focus inside
test("WinxNav: labels open on :focus-visible, not on any focus, and not when shut", () => {
  const css = sass.compile(new URL("../src/components/uikit/WinxNav/index.scss", import.meta.url).pathname,
    { loadPaths: [new URL("../src/styles", import.meta.url).pathname] }).css;

  assert.doesNotMatch(css, /:focus-within/);
  assert.match(css, /\.winx-rail:not\(\.winx-rail--phone, \.winx-rail--shut\):has\(:focus-visible\) \.winx-rail__label/);
});

test("WinxNav: the selected phone icon gets the gold glow", async () => {
  const { GlobalRegistrator } = await import("@happy-dom/global-registrator");
  GlobalRegistrator.register();
  const { mount } = await import("@vue/test-utils");
  const { default: Nav } = await import("#/components/uikit/WinxNav/index.vue");
  const { default: postcss } = await import("postcss");
  const css = sass.compile(new URL("../src/components/uikit/WinxNav/index.scss", import.meta.url).pathname,
    { loadPaths: [new URL("../src/styles", import.meta.url).pathname] }).css;
  const items = [{ key: "dashboard", text: "Dashboard", icon: "✦" },
    { key: "calendar", text: "Calendar", icon: "🗓" }];
  const nav = mount(Nav, { props: { items, current: "dashboard", phone: true } });
  const glows = [];
  postcss.parse(css).walkRules(rule => {
    if (rule.nodes.some(d => d.prop === "filter" && d.value.includes("drop-shadow")))
      glows.push(rule.selector);
  });
  const glowing = () => [...nav.element.querySelectorAll(glows.join(","))].map(e => e.textContent);
  try {
    assert.deepEqual(glowing(), ["✦"]);
    await nav.setProps({ current: "calendar" });
    assert.deepEqual(glowing(), ["🗓"]);
    await nav.setProps({ phone: false });
    assert.deepEqual(glowing(), []);
  } finally {
    nav.unmount();
    GlobalRegistrator.unregister();
  }
});
