import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLedger, summarize, monthReport } from "../src/models/ledger.js";
import { amount } from "../src/helpers/format.js";

const note = `---
type: finance-ledger
---
| date       | time  | amount | category  | description |
| ---------- | ----- | ------ | --------- | ----------- |
| 2026-10-01 | 09:00 | 72000.00 | Salary | EMPLOYER |
| 2026-10-03 | 12:10 | -850.50 | Groceries | GREEN BASKET |
| 2026-10-04 |       | -300 | Cafes | cash |
| 2026-10-05 | 18:00 | -5000 | Переводы | to savings |
| 2026-10-06 | 10:00 | n/a | Groceries | broken row |
not a table line`;

test("a ledger note's rows: the table's lines, header and separator out, a cash row without a time kept", () => {
  const rows = parseLedger(note);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[2], { date: "2026-10-04", time: "", amount: -300, category: "Cafes", description: "cash" });
});

test("totals: spent and income by sign, transfers apart (not spending)", () => {
  assert.deepEqual(summarize(parseLedger(note)), { spent: 1150.5, income: 72000, transfers: 5000, categories: { Groceries: 850.5, Cafes: 300 } });
});

test("a month's report: categories biggest first, up to 6 months of spending, the latest 8 without transfers", () => {
  const ledger = {}, months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  months.forEach((m, i) => { ledger[m] = [{ date: `${m}-02`, time: "10:00", amount: -(i + 1) * 100, category: "Fun", description: "x" }]; });
  ledger["2026-10"] = parseLedger(note);
  const r = monthReport(ledger, months, "2026-10");
  assert.deepEqual(r.categories, [["Groceries", 850.5], ["Cafes", 300]]);
  assert.deepEqual(r.trend.map(t => t.month), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.equal(r.trend.at(-1).spent, 1150.5);
  assert.equal(r.peak, 1150.5);
  assert.deepEqual(r.latest.map(x => x.description), ["cash", "GREEN BASKET", "EMPLOYER"]);
  assert.equal(r.net, 72000 - 1150.5);
});

test("a row written by hand with a space and a comma counts", () => {
  assert.equal(parseLedger("| 2026-10-07 |  | −1 200,50 | Cafes | cash |")[0].amount, -1200.5);
});

test("amount: a number as people write it, the same rule wherever a sum is read or typed", () => {
  assert.equal(amount("20 000"), 20000);
  assert.equal(amount("2,5"), 2.5);
  assert.equal(amount(" 2.5 "), 2.5);
  assert.equal(amount("−300"), -300);
  assert.equal(amount("-1\u00a0200,50"), -1200.5);
  assert.equal(amount("+72000.00"), 72000);
  assert.equal(amount("n/a"), null);
  assert.equal(amount("1.2.3"), null);
  assert.equal(amount(""), null);
});
