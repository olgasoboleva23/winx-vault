import { bem, html } from "../../core/html.js";
import { Button } from "../../uikit/button.js";
import { Empty } from "../../uikit/empty.js";
import { TaskCard } from "../components.js";
import { T } from "../data.js";
import { diffDays, dm } from "../../core/dates.js";
import { ruleText } from "../../tasks/repeats.js";
import { M, PART, Part } from "./part.js";

// ── the bottom panel: No date | Regulars | Pool, one card per area; a drop here takes the date off ──
const SHOWN = 8;
const EMPTY_POOL = "New task with «To pool» adds one here";
const RESUME = "resume: from today, on the first day its rule allows";
export class Panel extends Part {
  static watches = ["tab", "backlogOpen"];
  on = {
    tab: (e, el) => this.store.set({ tab: el.dataset.tab }),
    more: () => this.store.set({ backlogOpen: !this.ctx.state.backlogOpen }),
    toToday: (e, el) => {
      const t = this.view.taskOf(el);
      if (t) this.view.actions.fromPool(t, this.ctx.today, false);
    },
    // at once; the redraw follows the write
    pause: (e, el) => {
      const t = this.view.taskOf(el);
      if (!t) return;
      el.closest(".winx-task-card")?.toggleClass("winx-task-card--paused", !T(t).isPaused); el.disabled = true;
      this.view.actions.pauseOrResume(t);
    },
  };
  // a group card's title, as on the Life Areas chart
  areaTitle(g) {
    const { areaIcons, areaMap } = this.ctx.config;
    const name = areaMap[g] ?? (g ? g.slice(6) : "other");
    return `${areaIcons[g] ?? "✦"} ${name[0].toUpperCase()}${name.slice(1)}`;
  }
  group(title, cards) {
    return html`<div class="winx-cal__group-card">
      <div class="winx-cal__group">${title}</div>${cards}
    </div>`;
  }
  // the cards of `items`, one group card per run of the same area
  byArea(items, card) {
    const runs = [];
    for (const t of items) {
      const a = T(t).area;
      if (!runs.length || runs.at(-1).a !== a) runs.push({ a, items: [] });
      runs.at(-1).items.push(t);
    }
    return runs.map(r => this.group(this.areaTitle(r.a), r.items.map(card)));
  }
  info(t) { return this.view.info(t); }

  // No date: longest-waiting first (➕ created); 8 of them until "show all"
  noDateTab() {
    const { state, model } = this.ctx, { backlog } = model;
    const cut = backlog.length > SHOWN && !state.backlogOpen;
    const list = this.byArea(cut ? backlog.slice(0, SHOWN) : backlog,
      t => new TaskCard({ task: this.info(t), meta: model.backlogMeta(t) }));
    const more = cut ? `show all ${backlog.length}` : "show less";
    const after = backlog.length > SHOWN
      ? html`<button class="winx-cal__more" data-action="more">${more}</button>`
      : "";
    return { list, after };
  }
  // Ahead: after this week, a card per month, the tasks under their dates (the old Kanban's
  // month / year / future)
  aheadTab() {
    const { model } = this.ctx;
    if (!model.ahead.length) return { list: new Empty() };
    return { list: model.ahead.map(m => this.month(m)) };
  }
  month({ month, items }) {
    const { today } = this.ctx;
    const format = month.startsWith(today.slice(0, 4)) ? "MMMM" : "MMMM YYYY";
    const title = M(month + "-01").format(format);
    // a date heading over the first task of each day
    const heading = (t, i) => i && T(items[i - 1]).date === T(t).date ? "" : this.date(t);
    const day = (t, i) => html`${heading(t, i)}${this.aheadCard(t)}`;
    return this.group(`${title} · ${items.length}`, items.map(day));
  }
  date(t) {
    const day = M(T(t).date).format("D MMM · ddd");
    return html`<div class="winx-cal__date">📅 ${day}</div>`;
  }
  aheadCard(t) {
    const { today } = this.ctx;
    const what = T(t).isBirthday ? "🎂 Birthday" : this.areaTitle(T(t).area);
    const meta = `${what} · in ${diffDays(T(t).date, today)} d`;
    return new TaskCard({ task: this.info(t), meta });
  }
  // Pool: by area, the longest since last done first (never done at the top)
  poolTab() {
    const { model } = this.ctx;
    const plus = new Button({ icon: "+📅", title: "add to today", action: "toToday" });
    if (!model.pool.length) return { list: new Empty({ text: EMPTY_POOL }) };
    const card = t => new TaskCard({ task: this.info(t), meta: model.poolMeta(t), extra: plus });
    return { list: this.byArea(model.pool, card) };
  }
  // Regulars: by area, the most neglected first; paused last
  regularsTab() {
    return { list: this.byArea(this.ctx.model.regulars, t => this.regular(t)) };
  }
  regular(t) {
    const next = T(t).date;
    const pause = next
      ? new Button({ icon: "⏸", title: "pause: drop its dates", action: "pause" })
      : new Button({ icon: "▶", title: RESUME, action: "pause" });
    const rule = ruleText(T(t).rule), history = this.ctx.model.regularHistory(t);
    const meta = html`${rule}  ·  ${this.when(next)}  ·  ${history}`;
    const cls = next ? "" : "winx-task-card--paused";
    return new TaskCard({ task: this.info(t), meta, extra: pause, cls });
  }
  // a regular's next day (late: in red), or ⏸ paused
  when(next) {
    if (!next) return html`<span>⏸ paused</span>`;
    const late = next < this.ctx.today ? html` class="winx-cal__late"` : "", day = dm(next);
    return html`<span${late}>next ${day}</span>`;
  }
  tab([key, text]) {
    const cls = bem("winx-cal__tab", { on: key === this.ctx.state.tab });
    return html`<button class="${cls}" data-action="tab" data-tab="${key}">${text}</button>`;
  }
  render() {
    const { state, model } = this.ctx;
    const { backlog, regulars, pool } = model;
    const { list, after = "" } = state.tab === "nodate" ? this.noDateTab()
      : state.tab === "ahead" ? this.aheadTab()
      : state.tab === "pool" ? this.poolTab()
      : this.regularsTab();
    const tabs = [
      ["nodate", `No date · ${backlog.length}`],
      ["ahead", `Ahead · ${model.ahead.flatMap(g => g.items).length}`],
      ["regulars", `Regulars · ${regulars.length}`],
      ["pool", `Pool · ${pool.length}`],
    ];
    return html`<div class="winx-cal__backlog winx-board-backlog" data-drop=""${PART("panel")}>
      <div class="winx-cal__tabs">${tabs.map(t => this.tab(t))}</div>
      <div class="winx-cal__backlog-grid">${list}</div>
      ${after}
    </div>`;
  }
}
