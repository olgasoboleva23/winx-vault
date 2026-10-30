// Mobile home: big tiles with live counts, each opens a mobile page.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { Task } from "../lib/task.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

export class MobileHome extends Widget {
  on = { open: (e, el) => this.app.workspace.openLinkText(el.dataset.path, "", false) };
  async data() {
    const today = H.today();
    const wfile = this.app.vault.getAbstractFileByPath("02 Areas/Appearance/Weight.md");
    const lastW = wfile ? L.parseWeights(await this.app.vault.cachedRead(wfile)).at(-1) : null;
    const left  = this.dv.page("00 System/Data/Celestial Market")?.file.tasks.where(t => !t.completed).length ?? 0;
    const tasks = this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks.array()
      .map(t => ({ done: t.completed, recurring: Task.of(t).isRecurring, due: H.ymd(t.due), scheduled: H.ymd(t.scheduled) }));
    return { tiles: [
      { icon: "🛒", title: "Shopping", sub: `${left} left`, path: "Mobile/Shopping" },
      { icon: "☀️", title: "Tasks", sub: `${L.todayCount(tasks, today)} today`, path: "Mobile/Tasks" },
      { icon: "⚖️", title: "Weight", sub: lastW ? `${lastW.kg} kg` : "log", path: "Mobile/Weight" },
    ] };
  }
  view({ tiles }) {
    return html`<div class="winx-tiles">${tiles.map(t => html`
      <button class="winx-tile" data-action="open" data-path="${t.path}">
        <div class="winx-tile-icon">${t.icon}</div><div class="winx-tile-title">${t.title}</div><div class="winx-tile-sub">${t.sub}</div>
      </button>`)}
    </div>`;
  }
}
