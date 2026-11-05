// Weight: line chart of the last 30 days, the last value, change vs a week ago, a field to log
// today's weight, a button to the list. With a body log note (LOG_PATH: its `name` and `reasons`
// are the vault's own), a toggle switches the card to that log: a level 0–3 and the reasons for
// today, bars for 30 days (the reasons in the tooltip) over the cycle's period days. The markup:
// WeightCard.vue; the writes: controllers/weight.js.
import { addDays, dm, todayYmd } from "../../core/dates.js";
import { WeightLog } from "../../models/weightLog.js";
import { BodyLog } from "../../models/bodyLog.js";
import { cycleLog } from "./cycle.js";
import { chartColor } from "../../core/chart.js";

export const PATH = "00 System/Data/Weight.md";

export const LOG_PATH = "00 System/Data/Body log.md";
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

// { weight: { missing } | { last, change, chart }, log: { name, reasons, now, chart } | null };
// both modes at once, the card switches between them without loading
export async function loadWeight({ dv, app }) {
  const today = todayYmd();
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - DAYS + 1));
  const [weightText, logText] = await Promise.all([read(app, PATH), read(app, LOG_PATH)]);
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

  let log = null;

  if (logText !== null) {
    const props = app.metadataCache.getCache(LOG_PATH)?.frontmatter ?? {};
    const byDay = new Map(new BodyLog(logText).entries.map(e => [e.date, e])), cycle = cycleLog(dv);
    const entries = days.map(d => byDay.get(d) ?? null);
    log = {
      name: String(props.name ?? "log"), reasons: (props.reasons ?? []).map(String),
      now: byDay.get(today) ?? null,   // today's entry
      chart: logChart(days, entries, days.map(d => !!cycle?.on(d)?.isPeriod)),
    };
  }

  return { weight, log };
}
