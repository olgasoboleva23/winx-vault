import { Platform } from "obsidian";
import { html } from "../../core/html.js";
import { TaskRow } from "../components.js";
import { T } from "../data.js";
import { dateFor } from "../state.js";
import { M, PART, Part } from "./part.js";

// ── the days: 7 columns (week) or a month grid; a day's 🔁 entries fold into one "🔁 2/5" box ──
const TIMES = [["morning", "🌅 morning"], ["evening", "🌙 evening"], [null, "🔁 other"]];
export class Grid extends Part {
  on = {
    // a click on the box's edge, its pill or a group heading folds / unfolds the day (not a task in it)
    fold: (e, box) => {
      if (!e.target.matches(".winx-cal__routine, .winx-cal__routine-pill, .winx-cal__routine-pill *, .winx-cal__routine-time")) return;
      const d = box.dataset.day, u = this.ctx.unfolded;
      u.has(d) ? u.delete(d) : u.add(d);
      this.ctx.saveUnfolded(); this.show(box); this.ctx.syncRepeats();
    },
    // month: a click on the day's number or empty space opens its week; on the phone it picks the day shown under the grid
    day: (e, cell) => {
      if (!(e.target === cell || e.target.matches(".winx-cal__num, .winx-cal__marks, .winx-cal__marks *, .winx-cal__dots, .winx-cal__dots *"))) return;
      if (Platform.isMobile) return this.store.set({ picked: cell.dataset.day });
      this.store.set({ date: dateFor(cell.dataset.day, "week", this.ctx.today), view: "week" });
    },
  };
  show(box) {
    const open = this.ctx.unfolded.has(box.dataset.day);
    box.classList.toggle("winx-cal__routine--open", open);
    box.querySelector(".winx-cal__routine-list").toggle(open);
    box.querySelector(".winx-cal__routine-pill").toggle(!open);
  }
  fill(d, compact) {
    const { model, shown, TASKS } = this.ctx;
    const { rows, routine, routineRows, hidden, routineHidden } = model.dayParts(d, shown);
    const marks = es => es.length ? html`<div class="winx-cal__marks"><span title="${es.map(e => this.view.info(e.t).label).join("\n")}">✓${es.length}</span></div>` : "";
    const time = e => T((e.follows ?? e).t).time;   // a task after another goes in that one's group
    const row = e => new TaskRow({ after: !!e.follows, task: this.view.info(e.t), kind: e.kind, compact, tick: !!TASKS });
    const groups = TIMES.map(([tag, name]) => [name, routineRows.filter(e => time(e) === tag || (!tag && !TIMES.some(([g]) => g && time(e) === g)))]).filter(([, es]) => es.length);
    return html`${rows.map(row)}${routine.length ? html`<div class="winx-cal__routine" data-action="fold" data-day="${d}"><div class="winx-cal__routine-pill" title="${routine.map(e => this.view.info(e.t).label).join("\n")}"><span>🔁 ${routine.filter(e => e.kind === "done").length}/${routine.length}</span></div><div class="winx-cal__routine-list">${groups.map(([name, es]) => html`<div class="winx-cal__routine-time">${name}</div>${es.map(row)}`)}${marks(routineHidden)}</div></div>` : ""}${marks(hidden)}`;
  }
  zones(d) {
    return html`<div class="winx-cal__zones">${d <= this.ctx.today ? html`<div class="winx-cal__zone winx-cal__zone--done" data-drop="${d}" data-done="1">✓</div>` : ""}<div class="winx-cal__zone winx-cal__zone--plan" data-drop="${d}">📅 ${M(d).format("D MMM")}</div></div>`;
  }
  // the phone's month cell: a dot per task (open pink, done gold), 3 at most and "+N"
  dots(d) {
    const es = this.ctx.model.byDay[d].filter(e => e.kind !== "ghost" && this.ctx.shown[e.kind]);
    return html`<div class="winx-cal__dots">${es.slice(0, 3).map(e => html`<i class="winx-cal__dot winx-cal__dot--${e.kind}"></i>`)}${es.length > 3 ? html`<span class="winx-cal__dots-more">+${es.length - 3}</span>` : ""}</div>`;
  }
  // the phone's month: the grid with dots, the picked day (today, or the month's first) as a day card under it
  phoneMonth() {
    const { days, today, base } = this.ctx;
    const { picked: chosen } = this.ctx.state;
    const picked = days.includes(chosen) ? chosen : days.includes(today) && today.slice(0, 7) === base.slice(0, 7) ? today : base.slice(0, 8) + "01";
    return html`<div class="winx-cal__phone-month"${PART("grid")}><div class="winx-cal__month">${days.slice(0, 7).map(d => html`<div class="winx-cal__weekday">${M(d).format("dd")}</div>`)}${days.map(d => html`<div class="winx-cal__cell${d === today ? " winx-cal__cell--today" : ""}${d === picked ? " winx-cal__cell--picked" : ""}${d.slice(0, 7) !== base.slice(0, 7) ? " winx-cal__cell--outside" : ""}" data-action="day" data-day="${d}"><div class="winx-cal__num">${String(+d.slice(8))}</div>${this.dots(d)}${this.zones(d)}</div>`)}</div>
      <div class="winx-cal__day${picked === today ? " winx-cal__day--today" : ""}"><div class="winx-cal__head">${M(picked).format("dddd D MMMM")}</div>${this.fill(picked, false)}${this.zones(picked)}</div></div>`;
  }
  render() {
    const { days, today, base, view } = this.ctx;
    if (view === "month" && Platform.isMobile) return this.phoneMonth();
    if (view === "week") return html`<div class="winx-cal__week"${PART("grid")}>${days.map(d => html`<div class="winx-cal__day${d === today ? " winx-cal__day--today" : ""}"><div class="winx-cal__head">${M(d).format("ddd D")}</div>${this.fill(d, false)}${this.zones(d)}</div>`)}</div>`;
    return html`<div class="winx-cal__month"${PART("grid")}>${days.slice(0, 7).map(d => html`<div class="winx-cal__weekday">${M(d).format("ddd")}</div>`)}${days.map(d => html`<div class="winx-cal__cell${d === today ? " winx-cal__cell--today" : ""}${d.slice(0, 7) !== base.slice(0, 7) ? " winx-cal__cell--outside" : ""}" data-action="day" data-day="${d}"><div class="winx-cal__num">${String(+d.slice(8))}</div>${this.fill(d, true)}${this.zones(d)}</div>`)}</div>`;
  }
  // the folds as the state has them; every box's refresh for the 🔁 repeats button
  mount(root) {
    const boxes = [...root.querySelectorAll(".winx-cal__routine")];
    this.ctx.shows = boxes.map(box => () => this.show(box));
    this.ctx.shows.forEach(f => f());
    this.ctx.syncRepeats();
  }
}
