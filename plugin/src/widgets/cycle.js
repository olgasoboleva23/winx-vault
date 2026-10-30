// Cycle: the day of the cycle on the page's date, the next start forecast, "started / ended today" and the dates.
import { html } from "../ui/html.js";
import { Button } from "../ui/component.js";
import { Widget } from "./widget.js";
import { cycleInfo } from "../lib/cycle.js";
import { dm, pageDay, ymd } from "../lib/dates.js";
import { appendLine } from "../lib/files.js";

const CYCLE_PATH = "02 Areas/Health & Body/Cycle.md";

export class Cycle extends Widget {
  on = {
    dates: () => this.app.workspace.openLinkText(CYCLE_PATH, "", false),
    mark: (e, el) => appendLine(CYCLE_PATH, `- ${el.dataset.kind}:: ${el.dataset.day}`, { header: "period:: 8\n\n", unique: true }),
  };
  async data() {
    const day = ymd(pageDay(this.dv)), page = this.dv.page(CYCLE_PATH);
    if (!page) return { day, page: null };
    const pick = key => page.file.lists.map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1]).where(Boolean).array();
    return { day, page, info: cycleInfo(pick("start"), day, page.period ?? 8, pick("end")) };
  }
  view({ day, page, info }) {
    const ending = info?.isPeriod && !info.ended;
    const when = info && (info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`);
    return html`<div class="winx-cycle">
      ${!page ? html`<div>Create ${CYCLE_PATH}</div>`
        : !info ? html`<div>no data yet</div>`
        : html`<div class="winx-cycle-day${info.isPeriod ? " period" : ""}">day ${info.day}</div><div class="winx-cycle-next">next ~${dm(info.nextStart)}, ${when}</div>`}
      <div class="winx-cycle-btns">
        ${new Button({ text: ending ? "ended today" : "started today", action: "mark", kind: "pill", data: { kind: ending ? "end" : "start", day } })}
        ${new Button({ text: "dates", action: "dates", kind: "pill" })}
      </div>
    </div>`;
  }
}
