// The weight card's controller: what it shows and its writes. Weight: a line chart of the last 30
// days, the last value, the change vs a week ago; the free journals (a note each in JOURNALS: its
// name the file's, its `reasons` and `lag` its properties): a level 0–3 and today's reasons, bars
// for 30 days (the reasons in the tooltip) over the cycle's period days. Writes: today's weight in
// Weight.md, today's level and reasons in a journal. The markup: widgets/weight.
import { addDays, dm, todayYmd } from "#/helpers/dates.js";
import { WeightLog } from "#/models/weightLog.js";
import { BodyLog } from "#/models/bodyLog.js";
import { readJournals } from "#/controllers/journals.js";
import { cycleLog } from "./cycle.js";
import { chartColor } from "#/helpers/chart.js";
import { edit } from "#/helpers/files.js";
import { amount } from "#/helpers/format.js";
import { WEIGHT } from "#/helpers/paths.js";

const DAYS = 30;

const read = async (app, path) => {
  const file = app.vault.getFileByPath(path);

  return file ? app.vault.cachedRead(file) : null;
};

// the weight's line over the 30 days, scaled to the values there are (null: none, no chart)
function weightChart(days, vals) {
  const seen = vals.filter(v => v !== null);

  return seen.length ? {
    type: "line",
    data: { labels: days.map(dm), datasets: [{
      label: "⚖️ Weight", data: vals, spanGaps: true, tension: 0.3,
      borderColor: chartColor("--winx-pink-deep"),
      backgroundColor: chartColor("--winx-pink-deep", 0.3),
    }] },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { suggestedMin: Math.min(...seen) - 0.5, suggestedMax: Math.max(...seen) + 0.5 },
      },
    },
  } : null;
}

// the log's levels as bars over the cycle's period days (shaded), the reasons in the tooltip
function logChart(days, entries, period) {
  return {
    type: "bar",
    data: { labels: days.map(dm), datasets: [
      {
        label: "level", data: entries.map(e => e?.level ?? null),
        backgroundColor: chartColor("--winx-pink-deep"), borderRadius: 4, order: 1,
      },
      {
        label: "period",
        data: period.map(p => p ? 3 : null),
        backgroundColor: chartColor("--winx-purple", 0.18),
        barPercentage: 1, categoryPercentage: 1, grouped: false, order: 2,
      },
    ] },
    options: {
      plugins: { legend: { display: false }, tooltip: {
        filter: i => i.datasetIndex === 0,
        callbacks: { label: i => {
          const e = entries[i.dataIndex];

          return e ? `${e.level}${e.reasons.length ? " · " + e.reasons.join(", ") : ""}` : "";
        } },
      } },
      scales: { y: { min: 0, max: 3, ticks: { stepSize: 1 } } },
    },
  };
}

// { weight: { missing } | { last, change, chart },
//   logs: [{ path, name, reasons, lag, now, chart }] };
// every mode at once, the card switches between them without loading
export async function loadWeight({ dv, app }) {
  const today = todayYmd();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - DAYS + 1));
  const weightText = await read(app, WEIGHT);
  let weight = { missing: true };

  if (weightText !== null) {
    const ws = new WeightLog(weightText).entries, last = ws.at(-1) ?? null;
    const ref = last && [...ws].reverse().find(w => w.date <= addDays(last.date, -7));
    const delta = ref ? +(last.kg - ref.kg).toFixed(1) : null;
    const byDay = new Map(ws.map(w => [w.date, w.kg]));
    weight = {
      missing: false, last,
      change: delta === null ? null : `${delta > 0 ? "+" : ""}${delta}`,   // vs a week ago
      chart: weightChart(days, days.map(d => byDay.get(d) ?? null)),
    };
  }

  const cycle = cycleLog(dv), period = days.map(d => !!cycle?.on(d)?.isPeriod);
  const logs = (await readJournals()).map(({ entries, ...j }) => ({
    ...j, day: today, now: entries.get(today) ?? null,   // today's entry
    chart: logChart(days, days.map(d => entries.get(d) ?? null), period),
  }));

  return { weight, logs };
}

// today's weight from what was typed; false when it isn't a weight
export async function logWeight(typed) {
  const kg = amount(typed);

  if (!kg || kg <= 0) return false;
  await edit(WEIGHT, c => new WeightLog(c).set(todayYmd(), kg));
  return true;
}

export const logBody = (path, level, reasons) =>
  edit(path, c => new BodyLog(c).set(todayYmd(), level, reasons));
