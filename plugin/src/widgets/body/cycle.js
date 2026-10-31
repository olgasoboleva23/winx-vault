// Cycle: the day of the cycle on the page's date, the next start forecast, "started / ended today" and the dates.
import { html } from "../../core/html.js";
import { Button } from "../../uikit/button.js";
import { Widget } from "../widget.js";
import { CycleLog } from "./cycleLog.js";
import { dm, pageDay, ymd } from "../../core/dates.js";
import { appendLine } from "../../core/files.js";
import { Empty, Missing } from "../../uikit/empty.js";
import { NoteLink } from "../../uikit/noteLink.js";

const CYCLE_PATH = "02 Areas/Health & Body/Cycle.md";

export class Cycle extends Widget {
  on = {
    mark: (e, el) => appendLine(CYCLE_PATH, `- ${el.dataset.kind}:: ${el.dataset.day}`, { header: "period:: 8\n\n", unique: true }),
  };
  async data() {
    const day = ymd(pageDay(this.dv)), page = this.dv.page(CYCLE_PATH);
    if (!page) return { day, page: null };
    const pick = key => page.file.lists.map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1]).where(Boolean).array();
    return { day, page, info: new CycleLog(pick("start"), pick("end"), page.period ?? 8).on(day) };
  }
  view({ day, page, info }) {
    const ending = info?.isPeriod && !info.ended;
    const when = info && (info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`);
    return html`<div class="winx-cycle">
      ${!page ? new Missing({ path: CYCLE_PATH })
        : !info ? new Empty({ text: "no data yet" })
        : html`<div class="winx-cycle-day${info.isPeriod ? " period" : ""}">day ${info.day}</div><div class="winx-cycle-next">next ~${dm(info.nextStart)}, ${when}</div>`}
      <div class="winx-cycle-btns">
        ${new Button({ text: ending ? "ended today" : "started today", action: "mark", kind: "pill", data: { kind: ending ? "end" : "start", day } })}
        ${new NoteLink({ text: "dates", path: CYCLE_PATH })}
      </div>
    </div>`;
  }
}
