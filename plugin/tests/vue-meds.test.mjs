import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { tableData } from "#/models/course.js";

let mount, reactive, MedsCourse, loadMeds;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-08" });
  ({ mount } = await import("@vue/test-utils"));
  ({ reactive } = await import("vue"));
  MedsCourse = (await import("#/components/pages/meds/index.vue")).default;
  ({ loadMeds } = await import("#/controllers/meds.js"));
});
const P = "00 System/Data/Medication/Аевит, Магний.md";
const TABLE = `| Дата | АЕ | МА☀️ | МА🌙 | Заметки |
| --- | :-: | :-: | :-: | --- |
| 2026-11-07 | ✅ | ✅ | ✅ |  |
| 2026-11-08 | ☐ | ✅ | ☐ | сегодня |
| 2026-11-09 |  | ☐ | ☐ |  |`;
const NOTE = `---
type: meds
---

> [!card] Легенда
> | Код | Препарат |
> | --- | --- |
> | АЕ | аевит |
> | МА | магний |

\`\`\`winx
meds
card: Курс
${TABLE}
\`\`\`
`;
const tick = () => new Promise(r => setTimeout(r));

test("loadMeds: the course from the block's text, the names from the note's meds property, today's", async () => {
  vault({ [P]: NOTE }, { props: { [P]: { type: "meds", meds: [{ name: "аевит 1 капсула" }, { name: "магний" }] } } });
  const d = await loadMeds({ source: `meds\ncard: Курс\n${TABLE}`, sourcePath: P });

  assert.deepEqual(d.columns.map(c => c.name), ["аевит", "магний", "магний"]);
  assert.deepEqual([d.day, d.days, d.taken, d.due], [2, 3, 4, 6]);
  assert.deepEqual(d.today.map(g => g.label), ["☀️ утро", "🌙 на ночь", "в любое время"]);
});

test("MedsCourse: the counts, today's chips, the grid; a click on a tick or a chip goes round and writes the cell", async () => {
  const { files } = vault({ [P]: NOTE });
  const state = reactive({ data: tableData(TABLE, { "АЕ": "аевит", "МА": "магний" }, "2026-11-08") });
  const w = mount(MedsCourse, { props: { state }, global: { provide: { sourcePath: P } } });

  assert.equal(w.find(".winx-meds__sum").text().replace(/\s+/g, " "), "день 2 из 3 · принято 4 из 6");
  assert.deepEqual(w.findAll(".winx-meds__chip").map(c => [c.text(), c.attributes("data-mark")]),
    [["магний", "✅"], ["магний", "☐"], ["аевит", "☐"]]);
  assert.equal(w.findAll(".winx-table__row").length, 3);
  assert.deepEqual(w.findAll(".winx-meds__legend")[0].findAll("span").map(e => e.text().replace(/\s+/g, " ")), ["АЕ аевит", "МА магний", "☀️ утро", "🌙 на ночь"]);
  assert.equal(w.findAll(".winx-meds__row--today").length, 1);
  assert.equal(w.findAll(".winx-meds__tick").length, 8);   // Аевит's last day is blank
  assert.equal(w.find(".winx-meds__row--past .winx-meds__tick").classes("winx-check--on"), true);
  // the grid: today's АЕ ☐ → ✅, written into the note's table (padding kept)
  const todayTicks = w.find(".winx-meds__row--today").findAll(".winx-meds__tick");

  await todayTicks[0].trigger("click"); await tick();
  assert.equal(todayTicks[0].attributes("data-mark"), "✅");
  assert.match(files[P], /\n\| 2026-11-08 \| ✅ \| ✅ \| ☐ \| сегодня \|\n/);
  assert.equal(w.findAll(".winx-meds__chip")[2].attributes("data-mark"), "✅");   // the chip follows
  // a chip: ✅ → ❌, the grid's cell follows
  await w.findAll(".winx-meds__chip")[0].trigger("click"); await tick();
  assert.match(files[P], /\n\| 2026-11-08 \| ✅ \| ❌ \| ☐ \| сегодня \|\n/);
  assert.equal(todayTicks[1].attributes("data-mark"), "❌");
  // a note typed into the last column
  const input = w.find(".winx-meds__row--future .winx-meds__note-input");

  input.element.value = "забыла | поездка";
  await input.trigger("change"); await tick();
  assert.match(files[P], /\n\| 2026-11-09 \|  \| ☐ \| ☐ \| забыла \/ поездка \|\n/);
});

test("MedsCourse: a write that fails puts the mark and the note back, and says so", async () => {
  const { app } = vault({ [P]: NOTE });
  const { Notice } = await import("obsidian");
  const state = reactive({ data: tableData(TABLE, { "АЕ": "аевит", "МА": "магний" }, "2026-11-08") });
  const w = mount(MedsCourse, { props: { state }, global: { provide: { sourcePath: P } } });

  app.vault.process = async () => { throw new Error("disk"); };
  const error = console.error;

  console.error = () => {};
  const box = w.find(".winx-meds__row--future .winx-meds__tick");

  await box.trigger("click"); await tick(); await tick();
  assert.equal(w.find(".winx-meds__row--future .winx-meds__tick").attributes("data-mark"), "☐");
  assert.match(Notice.last, /Not saved/);
  const input = w.find(".winx-meds__row--future .winx-meds__note-input");

  input.element.value = "забыла";
  await input.trigger("change"); await tick(); await tick();
  assert.equal(state.data.rows[2].note, "");
  console.error = error;
});
