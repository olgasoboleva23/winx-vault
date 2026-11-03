import { html } from "../../core/html.js";
import { Button } from "../../uikit/button.js";
import { Empty } from "../../uikit/empty.js";
import { TaskCard } from "../components.js";
import { T } from "../data.js";
import { diffDays, dm } from "../../core/dates.js";
import { ruleText } from "../../tasks/repeats.js";
import { M, PART, Part } from "./part.js";

// ── the bottom panel: No date | Regulars | Pool, one card per area; a drop here takes the date off ──
const SHOWN = 8;
export class Panel extends Part {
  static watches = ["tab", "backlogOpen"];
  on = {
    tab: (e, el) => this.store.set({ tab: el.dataset.tab }),
    more: () => this.store.set({ backlogOpen: !this.ctx.state.backlogOpen }),
    toToday: (e, el) => { const t = this.view.taskOf(el); if (t) this.view.actions.fromPool(t, this.ctx.today, false); },
    // at once; the redraw follows the write
    pause: (e, el) => {
      const t = this.view.taskOf(el);
      if (!t) return;
      el.closest(".winx-task-card")?.toggleClass("winx-task-card--paused", !T(t).isPaused); el.disabled = true;
      this.view.actions.pauseOrResume(t);
    },
  };
  render() {
    const { state, today, model } = this.ctx;
    const { areaIcons, areaMap } = this.ctx.config;
    const { backlog, regulars, pool } = model;
    const info = t => this.view.info(t);
    // as on the Life Areas chart
    const areaTitle = g => { const name = areaMap[g] ?? (g ? g.slice(6) : "other"); return `${areaIcons[g] ?? "✦"} ${name[0].toUpperCase()}${name.slice(1)}`; };
    const group = (title, cards) => html`<div class="winx-cal__group-card"><div class="winx-cal__group">${title}</div>${cards}</div>`;
    // the cards of `items`, one group card per run of the same area
    const byArea = (items, card) => {
      const runs = [];
      for (const t of items) { const a = T(t).area; if (!runs.length || runs.at(-1).a !== a) runs.push({ a, items: [] }); runs.at(-1).items.push(t); }
      return runs.map(r => group(areaTitle(r.a), r.items.map(card)));
    };
    let list = "", after = "";
    if (state.tab === "nodate") {
      // longest-waiting first (➕ created)
      const cut = backlog.length > SHOWN && !state.backlogOpen;
      list = byArea(cut ? backlog.slice(0, SHOWN) : backlog, t => new TaskCard({ task: info(t), meta: model.backlogMeta(t) }));
      if (backlog.length > SHOWN) after = html`<button class="winx-cal__more" data-action="more">${cut ? `show all ${backlog.length}` : "show less"}</button>`;
    } else if (state.tab === "ahead") {
      // after this week: a card per month, the tasks under their dates (the old Kanban's month / year / future)
      const year = today.slice(0, 4);
      const meta = t => `${T(t).isBirthday ? "🎂 Birthday" : areaTitle(T(t).area)} · in ${diffDays(T(t).date, today)} d`;
      const month = ({ month, items }) => {
        const title = M(month + "-01").format(month.startsWith(year) ? "MMMM" : "MMMM YYYY");
        const days = items.map((t, i) => html`${i && T(items[i - 1]).date === T(t).date ? "" : html`<div class="winx-cal__date">📅 ${M(T(t).date).format("D MMM · ddd")}</div>`}${new TaskCard({ task: info(t), meta: meta(t) })}`);
        return group(`${title} · ${items.length}`, days);
      };
      list = model.ahead.length ? model.ahead.map(month) : new Empty();
    } else if (state.tab === "pool") {
      // by area, the longest since last done first (never done at the top)
      const plus = t => new Button({ icon: "+📅", title: "add to today", action: "toToday" });
      list = pool.length ? byArea(pool, t => new TaskCard({ task: info(t), meta: model.poolMeta(t), extra: plus(t) }))
        : new Empty({ text: "New task with «To pool» adds one here" });
    } else {
      // by area, the most neglected first; paused last
      const next = t => T(t).date;
      const meta = t => html`${ruleText(T(t).rule)}  ·  ${next(t) ? html`<span${next(t) < today ? html` class="winx-cal__late"` : ""}>next ${dm(next(t))}</span>` : html`<span>⏸ paused</span>`}  ·  ${model.regularHistory(t)}`;
      const pause = t => next(t)
        ? new Button({ icon: "⏸", title: "pause: drop its dates", action: "pause" })
        : new Button({ icon: "▶", title: "resume: from today, on the first day its rule allows", action: "pause" });
      list = byArea(regulars, t => new TaskCard({ task: info(t), meta: meta(t), extra: pause(t), cls: next(t) ? "" : "winx-task-card--paused" }));
    }
    const tabs = [["nodate", `No date · ${backlog.length}`], ["ahead", `Ahead · ${model.ahead.flatMap(g => g.items).length}`], ["regulars", `Regulars · ${regulars.length}`], ["pool", `Pool · ${pool.length}`]];
    return html`<div class="winx-cal__backlog winx-board-backlog" data-drop=""${PART("panel")}><div class="winx-cal__tabs">${tabs.map(([key, text]) => html`<button class="winx-cal__tab${key === state.tab ? " winx-cal__tab--on" : ""}" data-action="tab" data-tab="${key}">${text}</button>`)}</div><div class="winx-cal__backlog-grid">${list}</div>${after}</div>`;
  }
}
