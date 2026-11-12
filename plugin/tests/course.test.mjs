import { test } from "node:test";
import assert from "node:assert/strict";
import {
  columns, courseData, courseForm, courseList, courseOf, dayLabel, edited, forFood, intake, next,
  withDayNote, withMark,
} from "#/models/course.js";

test("a mark goes round ☐ → ✅ → ❌ → ☐; a day's label in Russian", () => {
  assert.deepEqual(["☐", "✅", "❌"].map(next), ["✅", "❌", "☐"]);
  assert.equal(dayLabel("2026-11-08"), "8 ноя, вс");
  assert.equal(dayLabel("2027-02-04"), "4 фев, чт");
});

// a course as a record (courses.json): made-up medicines, two days ticked, a stray key
const REC = {
  start: "2026-11-07",
  meds: [
    { name: "Аевит", code: "АЕ", dose: "1 таблетка", times: "any", meal: "after", days: 2 },
    { name: "Магний 2 таблетки", code: "МГ", dose: "", times: "both", meal: "before", days: 3 },
  ],
  notes: "",
  marks: {
    "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" },
    "2026-11-08": { "МГ☀️": "✅", "ХХ": "✅" },
  },
  dayNotes: { "2026-11-08": "сегодня" },
};

test("a record's course: a column per medicine and time, a row per day, today's groups, counts", () => {
  assert.deepEqual(columns(REC.meds).map(c => c.key), ["АЕ", "МГ☀️", "МГ🌙"]);
  const d = courseData(REC, "2026-11-08");

  assert.equal(d.rows.length, 3);
  assert.deepEqual(d.rows[2].marks, ["", "☐", "☐"]);   // Аевит's 2 days are over
  assert.deepEqual(d.rows[1].marks, ["☐", "✅", "☐"]);
  assert.equal(d.rows[1].note, "сегодня");
  assert.deepEqual(d.rows.map(r => r.when), ["past", "today", "future"]);
  assert.deepEqual(d.columns[1], { key: "МГ☀️", code: "МГ", time: "☀️", name: "Магний" });
  // the stray ХХ isn't counted
  assert.deepEqual([d.day, d.days, d.taken, d.due], [2, 3, 3, 6]);
  assert.deepEqual(d.today.map(g => g.label), ["☀️ утро", "🌙 на ночь", "в любое время"]);
  assert.deepEqual(d.today[0].items, [{ col: 1, key: "МГ☀️", name: "Магний", mark: "✅" }]);
  // before and after the course
  assert.deepEqual([courseData(REC, "2026-11-01").day, courseData(REC, "2026-11-01").today], [0, null]);
  assert.deepEqual([courseData(REC, "2026-11-20").day, courseData(REC, "2026-11-20").today], [4, null]);
});

test("withMark / withDayNote: a new record; ☐ or an empty text deletes, an empty day goes", () => {
  const copy = structuredClone(REC);

  assert.deepEqual(withMark(REC, "2026-11-08", "МГ☀️", "☐").marks["2026-11-08"], { "ХХ": "✅" });
  assert.deepEqual(withMark(REC, "2026-11-09", "АЕ", "✅").marks["2026-11-09"], { "АЕ": "✅" });
  const one = withMark(REC, "2026-11-09", "АЕ", "✅");

  assert.equal("2026-11-09" in withMark(one, "2026-11-09", "АЕ", "☐").marks, false);
  assert.equal("2026-11-08" in withDayNote(REC, "2026-11-08", "  ").dayNotes, false);
  assert.equal(withDayNote(REC, "2026-11-09", " тошнило ").dayNotes["2026-11-09"], "тошнило");
  assert.deepEqual(REC, copy);
});

test("intake: the Приём lines by time of day and meal, the doses", () => {
  assert.deepEqual(intake(REC.meds), [
    "☀️ утро, перед едой: Магний 2 таблетки",
    "🌙 на ночь, перед едой: Магний 2 таблетки",
    "в любое время, после еды: Аевит 1 таблетка",
  ]);
});

test("courseOf / edited: the window's values as a record, the marks kept through an edit", () => {
  assert.deepEqual(courseOf({ meds: [{ name: "Мастодинон 30 капель" }] }, "2026-11-10"), {
    start: "2026-11-10",
    meds: [{
      name: "Мастодинон 30 капель", code: "МА", dose: "", times: "any", meal: "any", days: 90,
    }],
    notes: "", marks: {}, dayNotes: {},
  });
  const meds = REC.meds.map(m => ({ ...m, dose: "3 капли" }));
  const rec = edited(REC, { meds, start: "", notes: "x" });

  assert.deepEqual([rec.start, rec.notes, rec.meds[0].dose], ["2026-11-07", "x", "3 капли"]);
  assert.deepEqual([rec.marks, rec.dayNotes], [REC.marks, REC.dayNotes]);
});

test("courseOf / edited: a code per medicine, unique, kept through a rename; the window's rows", () => {
  const three = [{ name: "Мастодинон" }, { name: "Магний" }, { name: "Масло" }];
  const rec = courseOf({ meds: three }, "2026-11-08");

  assert.deepEqual(rec.meds.map(m => m.code), ["МА", "МГ", "МС"]);
  const again = edited(rec, { meds: [
    { name: "Магний цитрат", code: "МГ" }, { name: "Мастодинон", code: "МА" }, { name: "Мелатонин" },
  ] });

  assert.deepEqual(again.meds.map(m => m.code), ["МГ", "МА", "МЕ"]);
  const { rows, required } = courseForm();

  assert.deepEqual(rows.map(r => r.key), ["meds", "start", "notes"]);
  assert.deepEqual(rows[0].list.map(r => r.key), ["name", "dose", "times", "meal", "days"]);
  assert.deepEqual([rows[0].required, required, rows[2].lines], [["name"], ["meds"], true]);
  assert.deepEqual(rows[0].list[2].options.map(o => o.label),
    ["утром", "утром и вечером", "днём", "вечером", "неважно"]);
  assert.deepEqual(rows[0].list[3].options.map(o => o.label),
    ["перед едой", "после еды", "перед сном", "неважно"]);
});

test("forFood: the codes taken by day; courseList: running first, then the newest", () => {
  const food = forFood("c1", REC);

  assert.deepEqual(food.taken.get("2026-11-07"), new Set(["АЕ", "МГ"]));
  assert.deepEqual([food.id, food.name, food.days], ["c1", "Аевит, Магний", 3]);
  const list = courseList({
    c1: REC, c2: { ...REC, start: "2026-11-09" }, c3: { ...REC, start: "2026-10-01" },
  }, "2026-11-08");

  assert.deepEqual(list.map(c => c.id), ["c1", "c2", "c3"]);
  assert.deepEqual(list.map(c => c.running), [true, false, false]);
  assert.equal(list[0].label, "Аевит, Магний · 7 ноя");
});
