import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { COURSES } from "#/helpers/paths.js";

let mount, reactive, MedsPage, loadMeds, Form, Notice;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-08" });
  ({ mount } = await import("@vue/test-utils"));
  ({ reactive } = await import("vue"));
  MedsPage = (await import("#/components/pages/meds/index.vue")).default;
  ({ loadMeds } = await import("#/controllers/meds.js"));
  ({ Form } = await import("#/components/uikit/Form/index.ts"));
  ({ Notice } = await import("obsidian"));
});

// two made-up courses: c1 running (today is its day 2 of 3), c2 over
const C1 = {
  start: "2026-11-07",
  meds: [
    { name: "Аевит", code: "АЕ", dose: "1 таблетка", times: [], meal: "after", days: 2 },
    { name: "Магний 2 таблетки", code: "МГ", dose: "", times: ["morning", "evening"], meal: "before", days: 3 },
  ],
  notes: "После еды\nЗапивать водой",
  marks: {
    "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" },
    "2026-11-08": { "МГ☀️": "✅" },
  },
  dayNotes: { "2026-11-08": "сегодня" },
};
const C2 = {
  start: "2026-10-01",
  meds: [{ name: "Цинк", code: "ЦИ", dose: "", times: [], meal: "any", days: 2 }],
  notes: "", marks: { "2026-10-01": { "ЦИ": "✅" } }, dayNotes: {},
};
const tick = () => new Promise(r => setTimeout(r));
const read = files => JSON.parse(files[COURSES]);

// the page over the stub's courses.json, as its block draws it
async function page(recs = { c2: C2, c1: C1 }) {
  const stub = vault({ [COURSES]: JSON.stringify(recs) });
  const state = reactive({ data: await loadMeds() });

  return { ...stub, state, w: mount(MedsPage, { props: { state } }) };
}

test("MedsPage: a tab per course in one row, the running one first and shown", async () => {
  const { w } = await page();
  const tabs = w.findAll(".winx-tabs__tab");

  assert.ok(w.find(".winx-tabs").classes("winx-tabs--scroll"));
  assert.deepEqual(tabs.map(t => t.text()), ["Аевит, Магний · 7 ноя", "Цинк · 1 окт"]);
  assert.ok(tabs[0].classes("winx-tabs__tab--on"));
  assert.equal(w.find(".winx-meds__sum").text().replace(/\s+/g, " "),
    "день 2 из 3 · принято 3 из 6");
  await tabs[1].trigger("click");
  assert.equal(w.find(".winx-meds__sum").text().replace(/\s+/g, " "),
    "день 3 из 2 · принято 1 из 2");
});

test("MedsCourse: Приём, Заметки when there are notes, the counts, chips, grid and legend", async () => {
  const { w } = await page();

  assert.deepEqual(w.findAll(".winx-meds__intake").map(e => e.text()),
    ["☀️ утро, перед едой: Магний 2 таблетки", "🌙 на ночь, перед едой: Магний 2 таблетки",
      "в любое время, после еды: Аевит 1 таблетка"]);
  assert.ok(w.findAll(".callout-title-inner").map(e => e.text()).includes("Заметки"));
  assert.equal(w.find(".winx-meds__notes").element.textContent, C1.notes);
  assert.deepEqual(w.findAll(".winx-meds__chip").map(c => [c.text(), c.attributes("data-mark")]),
    [["Магний", "✅"], ["Магний", "☐"], ["Аевит", "☐"]]);
  assert.equal(w.findAll(".winx-table__row").length, 3);
  assert.deepEqual(w.findAll(".winx-meds__legend")[0].findAll("span")
    .map(e => e.text().replace(/\s+/g, " ")), ["АЕ Аевит", "МА Магний", "☀️ утро", "🌙 на ночь"]);
  assert.equal(w.findAll(".winx-meds__row--today").length, 1);
  assert.equal(w.findAll(".winx-meds__tick").length, 8);   // Аевит's last day is blank
  assert.equal(w.find(".winx-meds__row--past .winx-meds__tick").classes("winx-check--on"), true);
  await w.findAll(".winx-tabs__tab")[1].trigger("click");
  assert.ok(!w.findAll(".callout-title-inner").map(e => e.text()).includes("Заметки"));
});

test("MedsCourse: a tick or a chip goes round at once and writes its key; a note as typed", async () => {
  const { w, files } = await page();
  const todayTicks = w.find(".winx-meds__row--today").findAll(".winx-meds__tick");

  await todayTicks[0].trigger("click"); await tick();
  assert.equal(todayTicks[0].attributes("data-mark"), "✅");
  assert.equal(read(files).c1.marks["2026-11-08"]["АЕ"], "✅");
  assert.equal(w.findAll(".winx-meds__chip")[2].attributes("data-mark"), "✅");   // the chip follows
  // a chip: ✅ → ❌, the grid's cell follows
  await w.findAll(".winx-meds__chip")[0].trigger("click");
  assert.equal(w.findAll(".winx-meds__chip")[0].attributes("data-mark"), "❌");
  await tick();
  assert.equal(read(files).c1.marks["2026-11-08"]["МГ☀️"], "❌");
  assert.equal(todayTicks[1].attributes("data-mark"), "❌");
  const input = w.find(".winx-meds__row--future .winx-meds__note-input");

  input.element.value = "забыла | поездка";
  await input.trigger("change"); await tick();
  assert.equal(read(files).c1.dayNotes["2026-11-09"], "забыла | поездка");
});

test("MedsCourse: a write that fails puts the mark and the note back, and says so", async () => {
  const { w, state, app } = await page();
  const error = console.error, process = app.vault.process;
  const failOnce = () => {
    app.vault.process = async () => {
      app.vault.process = process;
      throw new Error("disk");
    };
  };

  console.error = () => {};
  failOnce();
  await w.find(".winx-meds__row--future .winx-meds__tick").trigger("click"); await tick(); await tick();
  assert.equal(w.find(".winx-meds__row--future .winx-meds__tick").attributes("data-mark"), "☐");
  assert.match(Notice.last, /^✦ Not saved/);
  failOnce();
  const input = w.find(".winx-meds__row--future .winx-meds__note-input");

  input.element.value = "забыла";
  await input.trigger("change"); await tick(); await tick();
  assert.equal(state.data.data.c1.rows[2].note, "");
  console.error = error;
});

test("MedsCourse: a course deleted meanwhile: the mark goes back, said", async () => {
  const { w, files } = await page();

  files[COURSES] = JSON.stringify({ c2: C2 });
  await w.find(".winx-meds__row--future .winx-meds__tick").trigger("click"); await tick(); await tick();
  assert.equal(w.find(".winx-meds__row--future .winx-meds__tick").attributes("data-mark"), "☐");
  assert.equal(Notice.last, "✦ that course is gone");
});

test("MedsCourse: ✎ in the Курс card edits the course shown", async () => {
  const { w } = await page();
  const ask = Form.ask;
  let title = null;

  Form.ask = async (app, t) => { title = t; return null; };
  try {
    await w.findAll(".winx-tabs__tab")[1].trigger("click");
    const card = w.findAll(".winx-widget").find(c => c.find(".winx-meds__sum").exists());

    await card.find(".winx-widget__title .winx-widget__add").trigger("click"); await tick();
    assert.equal(title, "✦ Edit medication course");
  } finally { Form.ask = ask; }
});

test("MedsPage: no courses yet says how to make one", async () => {
  const { w } = await page({});

  assert.match(w.find(".winx-empty").text(), /New medication course/);
});
