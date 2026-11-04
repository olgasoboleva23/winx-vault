import { Platform } from "obsidian";
import { bem, html } from "../../core/html.js";
import { TaskRow } from "../components.js";
import { T } from "../data.js";
import { dateFor } from "../state.js";
import { M, PART, Part } from "./part.js";

// ── the days: 7 columns (week) or a month grid; a day's 🔁 entries fold into one "🔁 2/5" box ──
const TIMES = [["morning", "🌅 morning"], ["evening", "🌙 evening"], [null, "🔁 other"]];
const sameMonth = (a, b) => a.slice(0, 7) === b.slice(0, 7);
export class Grid extends Part {
  on = {
    // a click on the box's edge, its pill or a group heading folds / unfolds the day (not a task in it)
    fold: (e, box) => {
      const edge = ".winx-cal__routine, .winx-cal__routine-pill, .winx-cal__routine-pill *, .winx-cal__routine-time";
      if (!e.target.matches(edge)) return;
      const d = box.dataset.day, u = this.ctx.unfolded;
      u.has(d) ? u.delete(d) : u.add(d);
      this.ctx.saveUnfolded(); this.show(box); this.ctx.syncRepeats();
    },
    // month: a click on the day's number or empty space opens its week; on the phone it picks the day shown under
    // the grid
    day: (e, cell) => {
      const empty = ".winx-cal__num, .winx-cal__marks, .winx-cal__marks *, .winx-cal__dots, .winx-cal__dots *";
      if (!(e.target === cell || e.target.matches(empty))) return;
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
  // the tasks' labels, one per line (a ✓N's or the 🔁 pill's title)
  labels(es) { return es.map(e => this.view.info(e.t).label).join("\n"); }
  // ✓N: the done ones hidden
  marks(es) {
    if (!es.length) return "";
    return html`<div class="winx-cal__marks"><span title="${this.labels(es)}">✓${es.length}</span></div>`;
  }
  row(e, compact) {
    const task = this.view.info(e.t);
    return new TaskRow({ after: !!e.follows, task, kind: e.kind, compact, tick: !!this.ctx.TASKS });
  }
  // the 🔁 box's groups by time of day: [name, entries]; a task after another goes in its group
  groups(es) {
    const time = e => T((e.follows ?? e).t).time;
    const inGroup = tag => e => time(e) === tag || (!tag && !TIMES.some(([g]) => g && time(e) === g));
    return TIMES.map(([tag, name]) => [name, es.filter(inGroup(tag))])
      .filter(([, list]) => list.length);
  }
  // a day's 🔁 box: its n/m pill (folded), the entries by time of day (unfolded)
  routineBox(d, routine, routineRows, routineHidden, compact) {
    const count = `${routine.filter(e => e.kind === "done").length}/${routine.length}`;
    const group = ([name, es]) =>
      html`<div class="winx-cal__routine-time">${name}</div>${es.map(e => this.row(e, compact))}`;
    return html`<div class="winx-cal__routine" data-action="fold" data-day="${d}">
      <div class="winx-cal__routine-pill" title="${this.labels(routine)}">
        <span>🔁 ${count}</span>
      </div>
      <div class="winx-cal__routine-list">
        ${this.groups(routineRows).map(group)}
        ${this.marks(routineHidden)}
      </div>
    </div>`;
  }
  fill(d, compact) {
    const parts = this.ctx.model.dayParts(d, this.ctx.shown);
    const { rows, routine, routineRows, hidden, routineHidden } = parts;
    const box = routine.length
      ? this.routineBox(d, routine, routineRows, routineHidden, compact)
      : "";
    return html`${rows.map(e => this.row(e, compact))}${box}${this.marks(hidden)}`;
  }
  doneZone(d) {
    const cls = "winx-cal__zone winx-cal__zone--done";
    return html`<div class="${cls}" data-drop="${d}" data-done="1">✓</div>`;
  }
  zones(d) {
    const label = M(d).format("D MMM");
    return html`<div class="winx-cal__zones">
      ${d <= this.ctx.today ? this.doneZone(d) : ""}
      <div class="winx-cal__zone winx-cal__zone--plan" data-drop="${d}">📅 ${label}</div>
    </div>`;
  }
  // the phone's month cell: a dot per task (open pink, done gold), 3 at most and "+N"
  dots(d) {
    const es = this.ctx.model.byDay[d].filter(e => e.kind !== "ghost" && this.ctx.shown[e.kind]);
    const more = es.length - 3;
    return html`<div class="winx-cal__dots">
      ${es.slice(0, 3).map(e => html`<i class="winx-cal__dot winx-cal__dot--${e.kind}"></i>`)}
      ${more > 0 ? html`<span class="winx-cal__dots-more">+${more}</span>` : ""}
    </div>`;
  }
  // a month's cell: today, the phone's picked day, a day of another month; its number, then `body`
  cell(d, picked, body) {
    const { today, base } = this.ctx;
    const cls = bem("winx-cal__cell", {
      today: d === today, picked: d === picked, outside: !sameMonth(d, base),
    });
    const num = String(+d.slice(8));
    return html`<div class="${cls}" data-action="day" data-day="${d}">
      <div class="winx-cal__num">${num}</div>${body}
    </div>`;
  }
  // the month's first row: the weekdays' names
  weekdays(format) {
    const names = this.ctx.days.slice(0, 7).map(d => M(d).format(format));
    return names.map(name => html`<div class="winx-cal__weekday">${name}</div>`);
  }
  // a day as a column (the week) or a card (under the phone's month): heading, tasks, drop zones
  day(d, format) {
    const head = M(d).format(format);
    return html`<div class="${bem("winx-cal__day", { today: d === this.ctx.today })}">
      <div class="winx-cal__head">${head}</div>
      ${this.fill(d, false)}${this.zones(d)}
    </div>`;
  }
  // the phone's month: the grid with dots, the picked day (today, or the month's first) as a day card under it
  phoneMonth() {
    const { days, today, base } = this.ctx;
    const { picked: chosen } = this.ctx.state;
    const picked = days.includes(chosen) ? chosen
      : days.includes(today) && sameMonth(today, base) ? today
      : base.slice(0, 8) + "01";
    return html`<div class="winx-cal__phone-month"${PART("grid")}>
      <div class="winx-cal__month">
        ${this.weekdays("dd")}
        ${days.map(d => this.cell(d, picked, html`${this.dots(d)}${this.zones(d)}`))}
      </div>
      ${this.day(picked, "dddd D MMMM")}
    </div>`;
  }
  render() {
    const { days, view } = this.ctx;
    if (view === "month" && Platform.isMobile) return this.phoneMonth();
    if (view === "week") return html`<div class="winx-cal__week"${PART("grid")}>
      ${days.map(d => this.day(d, "ddd D"))}
    </div>`;
    return html`<div class="winx-cal__month"${PART("grid")}>
      ${this.weekdays("ddd")}
      ${days.map(d => this.cell(d, null, html`${this.fill(d, true)}${this.zones(d)}`))}
    </div>`;
  }
  // the folds as the state has them; every box's refresh for the 🔁 repeats button
  mount(root) {
    const boxes = [...root.querySelectorAll(".winx-cal__routine")];
    this.ctx.shows = boxes.map(box => () => this.show(box));
    this.ctx.shows.forEach(f => f());
    this.ctx.syncRepeats();
  }
}
