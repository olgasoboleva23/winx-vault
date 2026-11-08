import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, FinanceMonths, FinanceLine;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  FinanceMonths = (await import("#/components/pages/finance/index.vue")).default;
  FinanceLine = (await import("#/components/pages/dashboard/widgets/finance/index.vue")).default;
});

const month = (title, prev, next, over) => ({
  title, prev, next, transfers: null, trend: [], latest: [],
  totals: [{ label: "Spent", value: "900 ₽", sign: "neg" }],
  categories: [{ name: "Food", over, amount: "900 ₽ / 1 000 ₽ · 90%", width: 90, fill: "var(--winx-pink)" }],
});

test("Finance: starts on its month; ◀ ▶ step through the months there are, without reading again", async () => {
  const data = { start: "2026-11", byMonth: {
    "2026-10": month("October 2026", null, "2026-11", true), "2026-11": month("November 2026", "2026-10", null, false),
  } };
  const w = mount(FinanceMonths, { props: { state: { data } } });
  const [prev, next] = w.findAll(".winx-fin__nav-btn");
  assert.equal(w.find(".winx-fin__title").text(), "November 2026");
  assert.equal(next.attributes("disabled"), "");
  await prev.trigger("click");
  assert.equal(w.find(".winx-fin__title").text(), "October 2026");
  assert.ok(w.find(".winx-fin__amt").classes().includes("winx-fin__amt--over"));
  assert.equal(w.findAll(".winx-fin__nav-btn")[0].attributes("disabled"), "");
});

test("Finance: an empty ledger says where the notes go; the dashboard's line", () => {
  const e = mount(FinanceMonths, { props: { state: { data: { empty: true, path: "x/Ledger" } } } });
  assert.equal(e.find(".winx-fin__empty").text(), "The ledger is empty: a note per month goes to x/Ledger");
  const l = mount(FinanceLine, { props: { state: { data: { month: "November", spent: "50 ₽", income: "72 000 ₽" } } } });
  assert.equal(l.find(".winx-fin-month > div").text(), "November: spent 50 ₽ · income 72 000 ₽");
});
