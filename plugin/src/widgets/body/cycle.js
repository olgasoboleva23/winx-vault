// Cycle: the day of the cycle on the page's date, the next start forecast, then one of two tabs: the current cycle and
// the 3 before it as rows of day pills (the period, the fertile window and the ovulation marked), or the last 10
// cycles' lengths and period lengths as columns with their average; "started / ended today", the dates.
import { html } from "../../core/html.js";
import { Button } from "../../uikit/button.js";
import { Widget } from "../widget.js";
import { CycleLog } from "./cycleLog.js";
import { dm, pageDay, ymd } from "../../core/dates.js";
import { appendLine } from "../../core/files.js";
import { Empty, Missing } from "../../uikit/empty.js";
import { NoteLink } from "../../uikit/noteLink.js";

const CYCLE_PATH = "00 System/Data/Cycle.md";

// the log of Cycle.md (null without the note): also the period days shaded under the Weight widget's log
export function cycleLog(dv) {
  const page = dv.page(CYCLE_PATH);
  if (!page) return null;
  const pick = key => page.file.lists.map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1]).where(Boolean).array();
  return new CycleLog(pick("start"), pick("end"), page.period ?? 8);
}

// a day of a cycle: period, ovulation, fertile (the 5 days before the ovulation) or none
const pill = (c, n) => n <= (c.period ?? 0) ? "period" : n === c.ovulation ? "ovulation" : c.ovulation && n >= c.ovulation - 5 && n < c.ovulation ? "fertile" : "";

export class Cycle extends Widget {
  tab = "days";   // or "stats"
  on = {
    tab: (e, el) => { this.tab = el.dataset.tab; this.draw(); },
    mark: (e, el) => appendLine(CYCLE_PATH, `- ${el.dataset.kind}:: ${el.dataset.day}`, { header: "period:: 8\n\n", unique: true }),
  };
  async data() {
    const day = ymd(pageDay(this.dv)), log = cycleLog(this.dv);
    if (!log) return { day, page: null };
    const info = log.on(day);
    // the current cycle with no end yet: its days so far are the period while it lasts
    const cycles = log.recent(4, day).map(c => c.current && c.period === null && info?.isPeriod ? { ...c, period: c.days } : c);
    return { day, page: true, info, cycles, stats: log.last(10) };
  }
  // columns of `values` against their largest, a line at their average labelled on the right
  columns(title, values, cls) {
    const max = Math.max(...values), avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    return html`<div class="winx-cycle-chart ${cls}"><div class="winx-cycle-chart-title">${title}<span>avg ${avg} d</span></div>
      <div class="winx-cycle-cols"><b style="bottom: ${avg / max * 100}%"></b>${values.map(v => html`<i style="height: ${v / max * 100}%"><span>${v}</span></i>`)}</div></div>`;
  }
  view({ day, page, info, cycles = [], stats = [] }) {
    const ending = info?.isPeriod && !info.ended;
    const when = info && (info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`);
    return html`<div class="winx-cycle">
      ${!page ? new Missing({ path: CYCLE_PATH })
        : !info ? new Empty({ text: "no data yet" })
        : html`<div class="winx-cycle-day${info.isPeriod ? " period" : ""}">day ${info.day}</div><div class="winx-cycle-next">next ~${dm(info.nextStart)}, ${when}</div>`}
      ${cycles.length ? html`<div class="winx-cycle-tabs">${new Button({ text: "days", kind: "toggle", on: this.tab === "days", action: "tab", data: { tab: "days" } })}${new Button({ text: "stats", kind: "toggle", on: this.tab === "stats", action: "tab", data: { tab: "stats" } })}</div>` : ""}
      ${!cycles.length ? "" : this.tab === "stats"
        ? html`${stats.length ? this.columns("cycle", stats.map(c => c.length), "len") : ""}${stats.some(c => c.period) ? this.columns("period", stats.filter(c => c.period).map(c => c.period), "per") : ""}`
        : html`<div class="winx-cycle-rows">${cycles.map(c => html`<div class="winx-cycle-row">
        <div class="winx-cycle-when"><span>${dm(c.start)} – ${c.current ? "now" : dm(c.end)}</span><span>${c.period ? `${c.period} d period · ` : ""}${c.days} d${c.current ? " so far" : ""}</span></div>
        <div class="winx-cycle-pills">${Array.from({ length: c.days }, (_, i) => html`<i class="${pill(c, i + 1)}"></i>`)}</div>
      </div>`)}</div>`}
      <div class="winx-cycle-btns">
        ${new Button({ text: ending ? "ended today" : "started today", action: "mark", kind: "pill", data: { kind: ending ? "end" : "start", day } })}
        ${new NoteLink({ text: "dates", path: CYCLE_PATH })}
      </div>
    </div>`;
  }
}
