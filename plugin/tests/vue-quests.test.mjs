import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { TASKS } from "#/helpers/paths.js";

let mount, QuestsCard, loadQuests, taskStore;
const MASTER = `${TASKS}/Master.md`;
const dv = day => ({ current: () => ({ date: { toFormat: () => day } }) });
const tick = () => new Promise(r => setTimeout(r));

before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-09" });
  ({ taskStore } = await import("#/store/tasks.js"));
  ({ mount } = await import("@vue/test-utils"));
  QuestsCard = (await import("#/components/pages/dashboard/widgets/quests/index.vue")).default;
  ({ loadQuests } = await import("#/controllers/widgets/quests.js"));
});

const NOTE = [
  "- [ ] t3 [due:: 2026-11-09]", "- [ ] t2 [due:: 2026-11-09]", "- [ ] t1 [due:: 2026-11-10]",
  "- [x] t4 [due:: 2026-11-09] [completion:: 2026-11-09]",
].join("\n");
const seed = () => {
  taskStore.put(MASTER, NOTE);
  taskStore.putRecords({
    t1: { name: "later" }, t2: { name: "Walk", area: "#area/body" },
    t3: { name: "Read", area: "#area/mind" }, t4: { name: "Tea", area: "#area/rest" },
  });
};

test("loadQuests: the day's open tasks (by area, then name), then its done ones", async () => {
  seed();
  const q = await loadQuests({ dv: dv("2026-11-09") });
  assert.equal(q.day, "2026-11-09");
  assert.deepEqual(q.open.map(r => r.label), ["🌺 Walk", "🔮 Read"]);
  assert.deepEqual(q.done.map(r => [r.label, r.done]), [["🌙 Tea", true]]);
});

test("QuestsCard: a row per task, a tick toggles the line through Tasks; an empty day says so", async () => {
  const { files, app } = vault({ [MASTER]: NOTE });
  app.plugins = { plugins: { "obsidian-tasks-plugin": { apiV1: {
    executeToggleTaskDoneCommand: line => line.replace("[ ]", "[x]"),
  } } } };
  seed();
  const data = await loadQuests({ dv: dv("2026-11-09") });
  const w = mount(QuestsCard, { props: { state: { data } } });
  assert.equal(w.findAll(".winx-quests__row").length, 3);
  assert.equal(w.findAll(".winx-quests__row--done").length, 1);
  await w.find(".winx-quests__row .winx-check").trigger("click"); await tick(); await tick();
  assert.equal(files[MASTER].split("\n")[1], "- [x] t2 [due:: 2026-11-09]");
  const empty = mount(QuestsCard, { props: { state: { data: { day: "x", open: [], done: [] } } } });
  assert.ok(empty.find(".winx-empty").exists());
});
