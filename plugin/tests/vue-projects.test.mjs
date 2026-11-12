import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { setApp } from "#/helpers/app.js";

// The Projects tab: its list of project cards (cover, status, description, progress, the next task)
const MASTER = "00 System/Data/Tasks/Master.md";
let vue, Projects, taskStore, PLACEHOLDER;
before(async () => {
  GlobalRegistrator.register();
  setApp({
    vault: { getFileByPath: p => (p === "Media/shed.webp" ? { path: p } : null), getResourcePath: f => `app://x/${f.path}` },
    plugins: { plugins: {} },
  });
  vue = await import("vue");
  ({ taskStore } = await import("#/store/tasks.js"));
  ({ PLACEHOLDER } = await import("#/components/pages/projects/cover.js"));
  Projects = (await import("#/components/pages/projects/index.vue")).default;
});

// made-up projects: Garden (3 of 8 done, its first stage complete), Shed (no stages), Poem, Kite
beforeEach(() => {
  taskStore.put(MASTER, ["- [x] t1", "- [x] t2", "- [x] t3", "- [ ] t4", "- [ ] t5", "- [ ] t6", "- [ ] t7", "- [ ] t8"].join("\n"));
  taskStore.putRecords(Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(i => [`t${i}`, { name: `step ${i}` }])));
  taskStore.putProjects({
    p1: { name: "Garden", status: "active", description: "beds by the wall", cover: null,
      stages: [{ name: "A", tasks: ["t1", "t2", "t3"] }, { name: "B", tasks: ["t4", "t5", "t6", "t7", "t8"] }] },
    p2: { name: "Shed", status: "paused", description: "", cover: "Media/shed.webp", stages: [] },
    p3: { name: "Poem", status: "idea", description: "", cover: null, stages: [] },
    p4: { name: "Kite", status: "done", description: "", cover: null, stages: [] },
  });
});

function mount(over = {}) {
  const view = { state: vue.reactive({ open: null, filter: "all", ...over }), version: vue.ref(0) };
  const el = document.body.appendChild(document.createElement("div"));
  vue.createApp(Projects).provide("projects", view).mount(el);
  return { el, view };
}
const cards = el => [...el.querySelectorAll(".winx-projects__card")];
const names = el => cards(el).map(c => c.querySelector(".callout-title-inner").textContent);

test("the list: a card per project in file order with its status pill, description, 3/8 and the next task", () => {
  const { el } = mount();
  assert.deepEqual(names(el), ["Garden", "Shed", "Poem", "Kite"]);
  const garden = cards(el)[0];
  assert.equal(garden.querySelector(".winx-projects__status").className, "winx-projects__status winx-projects__status--active");
  assert.equal(garden.querySelector(".winx-projects__status").textContent, "active");
  assert.equal(garden.querySelector(".winx-projects__description").textContent, "beds by the wall");
  const bar = garden.querySelector("progress.winx-projects__progress");
  assert.equal([bar.value, bar.max].join("/"), "3/8");
  assert.equal(garden.querySelector(".winx-projects__count").textContent, "3/8");
  assert.ok(garden.querySelector(".winx-projects__next .winx-check"));
  assert.equal(garden.querySelector(".winx-projects__next-text").textContent, "step 4");
  assert.equal(el.querySelector(".winx-tabs").textContent, "All · 4Idea · 1Active · 1Paused · 1Done · 1");
});

test("Filter Paused shows only paused projects; All shows every status, Idea and Done too", async () => {
  const { el, view } = mount({ filter: "paused" });
  assert.deepEqual(names(el), ["Shed"]);
  [...el.querySelectorAll(".winx-tabs__tab")].find(b => b.dataset.tab === "all").click();
  await vue.nextTick();
  assert.equal(view.state.filter, "all");
  assert.deepEqual(names(el), ["Garden", "Shed", "Poem", "Kite"]);
});

test("A project with no tasks has no progress bar", () => {
  const shed = cards(mount().el)[1];
  assert.equal(shed.querySelector(".winx-projects__progress"), null);
  assert.equal(shed.querySelector(".winx-projects__next"), null);
});

test("No cover: the placeholder picture; a cover: its resource path", () => {
  const [garden, shed] = cards(mount().el);
  assert.equal(garden.querySelector(".winx-widget__cover").getAttribute("src"), PLACEHOLDER);
  assert.equal(shed.querySelector(".winx-widget__cover").getAttribute("src"), "app://x/Media/shed.webp");
  assert.match(PLACEHOLDER, /^data:image\/svg\+xml,/);
});

test("Clicking a card sets state.open", () => {
  const { el, view } = mount();
  cards(el)[1].click();
  assert.equal(view.state.open, "p2");
});

test("An open key that isn't in the store shows the list", () => {
  assert.deepEqual(names(mount({ open: "p9" }).el), ["Garden", "Shed", "Poem", "Kite"]);
});

test("No projects: WinxEmpty 'No projects yet'", () => {
  taskStore.putProjects({});
  const { el } = mount();
  assert.equal(el.querySelector(".winx-empty").textContent, "✦ No projects yet");
});
