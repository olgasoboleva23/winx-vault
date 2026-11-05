// Cycle: the day of the cycle on the page's date, the next start forecast, then one of two tabs: the current cycle and
// the 3 before it as rows of day pills (the period, the fertile window and the ovulation marked), or the last 10
// cycles' lengths and period lengths as columns with their average; "started / ended today", the dates.
// Folded (the default; a click on the head toggles it, kept per device): only the head and the buttons.
import { bem, html } from "../../core/html.js";
import { Button } from "../../uikit/button.js";
import { Widget } from "../widget.js";
import { CycleLog } from "./cycleLog.js";
import { dm, pageDay, ymd } from "../../core/dates.js";
import { appendLine } from "../../core/files.js";
import { Empty, Missing } from "../../uikit/empty.js";
import { NoteLink } from "../../uikit/noteLink.js";
import { mana, mpLine, mpTable } from "../xp/vitals.js";

const CYCLE_PATH = "00 System/Data/Cycle.md";

// the log of Cycle.md (null without the note): also the period days shaded under the Weight widget's log
export function cycleLog(dv) {
  const page = dv.page(CYCLE_PATH);
  if (!page) return null;
  const pick = key => page.file.lists
    .map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1]).where(Boolean).array();
  return new CycleLog(pick("start"), pick("end"), page.period ?? 8);
}

// a day of a cycle: period, ovulation, fertile (the 5 days before the ovulation) or none
const pill = (c, n) => n <= (c.period ?? 0) ? "period"
  : n === c.ovulation ? "ovulation"
  : c.ovulation && n >= c.ovulation - 5 && n < c.ovulation ? "fertile"
  : "plain";

export class Cycle extends Widget {
  tab = "days";   // or "stats"
  folded = this.app.loadLocalStorage("winx-cycle-open") !== "1";
  on = {
    fold: () => {
      this.folded = !this.folded;
      this.app.saveLocalStorage("winx-cycle-open", this.folded ? null : "1");
      this.draw();
    },
    tab: (e, el) => { this.tab = el.dataset.tab; this.draw(); },
    // started: today; ended: yesterday was the last day of the period (CycleLog.endFor)
    mark: (e, el) => {
      const { kind, day } = el.dataset, log = cycleLog(this.dv);
      const date = kind === "end" && log ? log.endFor(day) : day;
      return appendLine(CYCLE_PATH, `- ${kind}:: ${date}`, { header: "period:: 8\n\n", unique: true });
    },
  };
  async data() {
    const day = ymd(pageDay(this.dv)), log = cycleLog(this.dv);
    if (!log) return { day, page: null };
    const info = log.on(day);
    // the current cycle with no end yet: its days so far are the period while it lasts
    const cycles = log.recent(4, day)
      .map(c => c.current && c.period === null && info?.isPeriod ? { ...c, period: c.days } : c);
    const stats = log.last(10), m = info && mana(info);
    return {
      day, page: true, info, ending: info?.isPeriod && !info.ended,
      head: info && {
        day: info.day, period: info.isPeriod, phase: m.phase,
        title: `${mpLine(m)}\n\n${mpTable(m)}`,
        next: dm(info.nextStart),
        when: info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`,
      },
      rows: cycles.map(c => ({
        when: `${dm(c.start)} – ${c.current ? "now" : dm(c.end)}`,
        length: `${c.period ? `${c.period} d period · ` : ""}${c.days} d`
          + (c.current ? " so far" : ""),
        pills: Array.from({ length: c.days }, (_, i) => pill(c, i + 1)),
      })),
      lengths: stats.map(c => c.length), periods: stats.filter(c => c.period).map(c => c.period),
    };
  }
  // columns of `values` against their largest, a line at their average labelled on the right
  columns(title, values, kind) {
    const max = Math.max(...values), avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const line = avg / max * 100, cols = values.map(v => ({ v, height: v / max * 100 }));
    return html`<div class="winx-cycle__chart winx-cycle__chart--${kind}">
      <div class="winx-cycle__chart-title">${title}<span class="winx-cycle__chart-avg">avg ${avg} d</span></div>
      <div class="winx-cycle__cols">
        <b class="winx-cycle__avg-line" style="bottom: ${line}%"></b>
        ${cols.map(({ v, height }) => html`<i class="winx-cycle__col" style="height: ${height}%">
          <span class="winx-cycle__col-value">${v}</span>
        </i>`)}
      </div>
    </div>`;
  }
  // the day, its phase and the next start; a click folds the card
  head(h) {
    const title = this.folded ? "show the cycles" : "fold";
    return html`<div class="winx-cycle__head" data-action="fold" title="${title}">
      <div class="${bem("winx-cycle__day", { period: h.period })}" title="${h.title}">
        day ${h.day}<span class="winx-cycle__phase"> · ${h.phase}</span>
      </div>
      <div class="winx-cycle__next">next ~${h.next}, ${h.when}</div>
    </div>`;
  }
  tabBtn(tab) {
    const on = this.tab === tab;
    return new Button({ text: tab, kind: "toggle", on, action: "tab", data: { tab } });
  }
  row(r) {
    return html`<div class="winx-cycle__row">
      <div class="winx-cycle__when"><span>${r.when}</span><span>${r.length}</span></div>
      <div class="winx-cycle__pills">${r.pills.map(p =>
        html`<i class="winx-cycle__pill winx-cycle__pill--${p}"></i>`)}</div>
    </div>`;
  }
  // the tabs, then the rows of pills or the columns
  cycles({ rows = [], lengths, periods }) {
    if (!rows.length) return "";
    return html`<div class="winx-cycle__tabs">${this.tabBtn("days")}${this.tabBtn("stats")}</div>
      ${this.tab === "stats"
        ? html`${lengths.length ? this.columns("cycle", lengths, "len") : ""}
          ${periods.length ? this.columns("period", periods, "per") : ""}`
        : html`<div class="winx-cycle__rows">${rows.map(r => this.row(r))}</div>`}`;
  }
  view(d) {
    const { day, page, info, head, ending } = d;
    const mark = ending
      ? { text: "ended today", data: { kind: "end", day } }
      : { text: "started today", data: { kind: "start", day } };
    return html`<div class="${bem("winx-cycle", { folded: this.folded && info })}">
      ${!page ? new Missing({ path: CYCLE_PATH })
        : !info ? new Empty({ text: "No data yet" })
        : this.head(head)}
      ${this.folded && info ? "" : this.cycles(d)}
      <div class="winx-cycle__btns">
        ${new Button({ ...mark, action: "mark", kind: "pill" })}
        ${new NoteLink({ text: "dates", path: CYCLE_PATH })}
      </div>
    </div>`;
  }
}
