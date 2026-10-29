// Run inside Obsidian (obsidian eval): opens each page (live preview), waits for its widgets, and writes the computed styles of
// every visible element (and its ::before / ::after) to OUT as JSON, keyed by the element's path in the page.
// Two snapshots (old snippets on / plugin styles on) must match: tests/obsidian/compare-snapshots.mjs.
(async (OUT, PAGES) => {
  const PROPS = ["display", "position", "top", "left", "width", "height", "margin", "padding", "color", "background-color",
    "background-image", "border", "border-radius", "box-shadow", "font-family", "font-size", "font-weight", "line-height",
    "text-transform", "letter-spacing", "opacity", "transform", "filter", "gap", "flex-direction", "justify-content",
    "align-items", "grid-template-columns", "z-index", "visibility", "content", "text-shadow", "outline", "overflow"];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const freeze = document.head.createEl("style", { text: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
  const shot = {};
  // live preview: the reading view isn't drawn while the window is hidden behind others
  const leaf = app.workspace.getLeaf(false), was = leaf.getViewState();
  for (const page of PAGES) {
    const file = app.metadataCache.getFirstLinkpathDest(page, "");
    await leaf.setViewState({ type: "markdown", state: { file: file.path, mode: "source" } });
    await wait(5000);
    const root = leaf.view.containerEl.querySelector(".markdown-source-view");
    const els = [...root.querySelectorAll("*")].filter(e => e.getClientRects().length);
    const path = e => { const p = []; for (; e && e !== root; e = e.parentElement) p.unshift(`${e.tagName}${[...e.classList].filter(c => /^winx|^callout|^dashboard|^task|^block/.test(c)).map(c => "." + c).join("")}:${[...e.parentElement.children].indexOf(e)}`); return p.join(">"); };
    for (const e of els) {
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(e, pseudo);
        if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
        shot[`${page} ${path(e)}${pseudo ?? ""}`] = PROPS.map(p => cs.getPropertyValue(p)).join("|");
      }
    }
  }
  freeze.remove();
  await leaf.setViewState(was);
  require("fs").writeFileSync(OUT, JSON.stringify(shot));
  return Object.keys(shot).length;
})
