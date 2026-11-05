// Cycle: the day of the cycle on the page's date, the next start forecast, then one of two tabs:
// the current cycle and the 3 before it as rows of day pills (the period, the fertile window and
// the ovulation marked), or the last 10 cycles' lengths and period lengths as columns with their
// average; "started / ended today", the dates. Folded (the default; a click on the head toggles it,
// kept per device): only the head and the buttons. The markup: CycleWidget.vue, the
// writes: controllers/cycle.js.
import { CycleLog } from "../../models/cycleLog.js";
import { dm, pageDay, ymd } from "../../core/dates.js";
import { mana, mpLine, mpTable } from "../xp/vitals.js";

export const CYCLE_PATH = "00 System/Data/Cycle.md";

// the log of Cycle.md (null without the note): also the period days shaded under the Weight
// widget's log
export function cycleLog(dv) {
  const page = dv.page(CYCLE_PATH);

  if (!page) return null;
  const pick = key => page.file.lists
    .map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1])
    .where(Boolean).array();

  return new CycleLog(pick("start"), pick("end"), page.period ?? 8);
}

// a day of a cycle: period, ovulation, fertile (the 5 days before the ovulation) or none
const pill = (c, n) => n <= (c.period ?? 0) ? "period"
  : n === c.ovulation ? "ovulation"
  : c.ovulation && n >= c.ovulation - 5 && n < c.ovulation ? "fertile"
  : "plain";

// columns of `values` against their largest, a line at their average (labelled "avg N d")
function chart(values) {
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return {
    avg: `avg ${avg} d`,
    line: avg / max * 100,
    cols: values.map(v => ({ v, height: v / max * 100 })),
  };
}

export async function loadCycle({ dv }) {
  const day = ymd(pageDay(dv)), log = cycleLog(dv);
  const mark = { kind: "start", text: "started today" };

  if (!log) return { day, page: false, info: false, mark, rows: [] };
  const info = log.on(day);
  // the current cycle with no end yet: its days so far are the period while it lasts
  const cycles = log.recent(4, day)
    .map(c => c.current && c.period === null && info?.isPeriod ? { ...c, period: c.days } : c);
  const stats = log.last(10), m = info && mana(info);
  const lengths = stats.map(c => c.length);
  const periods = stats.filter(c => c.period).map(c => c.period);

  return {
    day, page: true, info: !!info,
    mark: info?.isPeriod && !info.ended ? { kind: "end", text: "ended today" } : mark,
    head: info && {
      day: info.day, period: info.isPeriod, phase: m.phase,
      title: `${mpLine(m)}\n\n${mpTable(m)}`,
      next: dm(info.nextStart),
      when: info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`,
    },
    rows: cycles.map(c => ({
      start: c.start,
      when: `${dm(c.start)} – ${c.current ? "now" : dm(c.end)}`,
      length: `${c.period ? `${c.period} d period · ` : ""}${c.days} d`
        + (c.current ? " so far" : ""),
      pills: Array.from({ length: c.days }, (_, i) => pill(c, i + 1)),
    })),
    charts: [
      lengths.length && { title: "cycle", kind: "len", ...chart(lengths) },
      periods.length && { title: "period", kind: "per", ...chart(periods) },
    ].filter(Boolean),
  };
}
