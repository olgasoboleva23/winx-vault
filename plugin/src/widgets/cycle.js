// Cycle: the day of the cycle on the page's date, the next start forecast, "started / ended today" and the dates.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { Button } from "../ui/component.js";
import { Widget } from "./widget.js";

const CYCLE_PATH = "02 Areas/Health & Body/Cycle.md";

export class Cycle extends Widget {
  on = {
    dates: () => this.app.workspace.openLinkText(CYCLE_PATH, "", false),
    mark: async (e, el) => {
      const line = `- ${el.dataset.kind}:: ${el.dataset.day}`;
      const file = this.app.vault.getAbstractFileByPath(CYCLE_PATH);
      if (!file) {
        await this.app.vault.createFolder(CYCLE_PATH.split("/").slice(0, -1).join("/")).catch(() => {});
        await this.app.vault.create(CYCLE_PATH, `period:: 8\n\n${line}\n`);
      } else {
        await this.app.vault.process(file, c => c.split("\n").includes(line) ? c : `${c.replace(/\s+$/, "")}\n${line}\n`);
      }
    },
  };
  async data() {
    const day = H.ymd(H.pageDay(this.dv)), page = this.dv.page(CYCLE_PATH);
    if (!page) return { day, page: null };
    const pick = key => page.file.lists.map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1]).where(Boolean).array();
    return { day, page, info: L.cycleInfo(pick("start"), day, page.period ?? 8, pick("end")) };
  }
  view({ day, page, info }) {
    const ending = info?.isPeriod && !info.ended;
    const [, mm, dd] = info?.nextStart.split("-") ?? [];
    const when = info && (info.daysUntil >= 0 ? `in ${info.daysUntil} d` : `${-info.daysUntil} d late`);
    return html`<div class="winx-cycle">
      ${!page ? html`<div>Create ${CYCLE_PATH}</div>`
        : !info ? html`<div>no data yet</div>`
        : html`<div class="winx-cycle-day${info.isPeriod ? " period" : ""}">day ${info.day}</div><div class="winx-cycle-next">next ~${dd}.${mm}, ${when}</div>`}
      <div class="winx-cycle-btns">
        ${new Button({ text: ending ? "ended today" : "started today", action: "mark", kind: "pill", cls: "winx-open-note-btn", data: { kind: ending ? "end" : "start", day } })}
        ${new Button({ text: "dates", action: "dates", kind: "pill", cls: "winx-open-note-btn" })}
      </div>
    </div>`;
  }
}
