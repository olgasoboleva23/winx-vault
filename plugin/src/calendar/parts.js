// The calendar's parts, each a class: view(ctx) → its markup (html``), on = { action(e, el) } for the elements
// with data-action inside it. The view puts data-part on a part's top elements, finds the part an event came
// from and calls its handler (task buttons — ✏️ 🗑 ⏭ ⭐ ✓ — are the view's own, the same everywhere).
// No whitespace between tags: inline elements must lay out as the old createEl calls did.
import { html } from "../core/html.js";
import { busyPill } from "../uikit/busy.js";
import { Button } from "../uikit/button.js";
import { TaskButtons, TaskCard, TaskRow, TaskText } from "./components.js";
import { T } from "./data.js";
import { dateFor } from "./state.js";
import { addDays, addMonths, dm } from "../core/dates.js";
import { ruleText } from "../tasks/repeats.js";
import { AudioEngine, isMuted, toggleMute } from "../core/sounds.js";

const M = d => window.moment(d);
const PART = name => html` data-part="${name}"`;

export class Part {
  constructor(view) { this.view = view; }
  get ctx() { return this.view.ctx; }
  on = {};
  render() { return html``; }
}

// ── the top: the drop bar (while dragging), the busy pill, date / sounds / ＋ task / legend, the navigation ──
export class Header extends Part {
  on = {
    date: (e, el) => el.value && this.ctx.set({ date: dateFor(el.value, this.ctx.view, this.ctx.today) }, ["header", "missed", "grid"]),
    mute: (e, el) => { toggleMute(); el.textContent = isMuted() ? "🔇" : "🔊"; },
    newTask: () => app.commands.executeCommandById("winx:new-task"),
    prev: () => this.step(-1),
    next: () => this.step(1),
    today: () => this.go(null),   // null: follow today again
    switchView: () => this.ctx.set({ view: this.ctx.view === "week" ? "month" : "week" }, ["header", "missed", "grid"]),
    showDone: () => this.ctx.set({ showDone: !this.ctx.state.showDone }, ["header", "grid"]),
    // unfold / fold every day's 🔁 box at once (lit while all are open)
    repeats: (e, el) => {
      const open = !el.classList.contains("on");
      for (const d of this.routineDays()) open ? this.ctx.unfolded.add(d) : this.ctx.unfolded.delete(d);
      this.ctx.saveUnfolded();
      this.ctx.shows.forEach(f => f()); this.ctx.syncRepeats();
    },
  };
  go(date) { this.ctx.set({ date: dateFor(date, this.ctx.view, this.ctx.today) }, ["header", "missed", "grid"]); }
  step(n) { const { view, base } = this.ctx; this.go(view === "week" ? addDays(base, 7 * n) : addMonths(base, n)); }
  routineDays() { return this.ctx.days.filter(d => this.ctx.model.byDay[d].some(e => T(e.t).isRecurring)); }
  render() {
    const { state, days, today, base, view, model, shown } = this.ctx;
    const { areaIcons, areaMap } = this.ctx.config;
    // while dragging, a bar of 7 days sticks to the top: the shown week, or in the month view the next 7 days
    const chips = view === "week" ? days : Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const legend = Object.keys(areaIcons).filter(g => days.some(d => model.byDay[d].some(e => shown[e.kind] && T(e.t).area === g)));
    const other = view === "week" ? "month" : "week";
    return html`<div class="winx-cal-dropbar"${PART("header")}><div class="winx-cal-dropbar-in">${chips.map(d => html`<div class="winx-cal-chip${d === today ? " today" : ""}" data-drop="${d}">${M(d).format("ddd D")}</div>`)}</div></div>${busyPill(PART("header"))}<div class="winx-cal-top"${PART("header")}><div class="mb-input-type-date"><input type="date" value="${base}" data-action="date"></div><button class="winx-cal-mute" title="sounds on/off" aria-label="sounds on/off" data-action="mute">${isMuted() ? "🔇" : "🔊"}</button>${new Button({ text: "＋ task", kind: "chip", title: "new task (Winx: New task)", action: "newTask" })}<div class="winx-cal-legend">${legend.map(g => html`<span data-area="${g.slice(6)}">${areaMap[g] ?? g.slice(6)}</span>`)}</div></div><div class="winx-cal-nav"${PART("header")}>${new Button({ icon: "‹", kind: "nav", title: "previous", action: "prev" })}<span class="winx-cal-title">${view === "week" ? `${M(days[0]).format("D MMM")} – ${M(days.at(-1)).format("D MMM YYYY")}` : M(base).format("MMMM YYYY")}</span>${new Button({ icon: "›", kind: "nav", title: "next", action: "next" })}${days.includes(today) ? "" : new Button({ text: "today", kind: "chip", action: "today" })}${new Button({ text: view, kind: "chip", title: `switch to the ${other} view`, action: "switchView" })}${new Button({ text: "✓ done", kind: "toggle", on: state.showDone, action: "showDone" })}${new Button({ text: "🔁 repeats", kind: "toggle", title: "unfold / fold every day's 🔁 box", action: "repeats" })}</div>`;
  }
  // after the grid: the repeats button lit while every routine day is unfolded
  mount(root) {
    const repeats = root.querySelector('[data-action="repeats"]');
    this.ctx.syncRepeats = () => repeats?.classList.toggle("on", this.routineDays().every(d => this.ctx.unfolded.has(d)));
  }
}

// ── "Missed?": open tasks whose day has passed, only while today is on screen ──
export class Missed extends Part {
  sounds = { done: new AudioEngine("00 System/Assets/winx music/snd_pickup_gem02.wav"), today: new AudioEngine("00 System/Assets/star.wav") };
  on = {
    missedDone: (e, el) => this.act(el, this.sounds.done, t => this.view.actions.doneOnItsDay(t)),
    missedToday: (e, el) => this.act(el, this.sounds.today, t => this.view.actions.toToday(t)),
  };
  async act(el, sound, write) {
    const row = el.closest(".winx-yesterday-row"), box = row.parentElement, t = this.view.taskOf(row);
    if (!t) return;
    row.remove();
    if (!box.querySelector(".winx-yesterday-row")) box.remove();
    sound.play({ gain: 0.25 });
    await write(t);
  }
  render() {
    const { days, today, model: { missed } } = this.ctx;
    if (!days.includes(today) || !missed.length) return html``;
    const row = t => { const task = this.view.info(t); return html`<div class="winx-yesterday-row"${task.area ? html` data-area="${task.area}"` : ""} data-task="${task.key}" draggable="true" data-drag="${task.key}" data-swipeable="${task.key}"><span>${T(t).isRecurring ? "🔁 " : ""}${new TaskText({ task })}</span><div class="winx-board-btns">${new TaskButtons({ task })}</div><em>${dm(T(t).date)}</em>${this.ctx.TASKS ? new Button({ icon: "✓", title: `done on ${T(t).date}`, action: "missedDone" }) : ""}${new Button({ icon: "☀️", title: "move to today", action: "missedToday" })}</div>`; };
    return html`<div class="winx-yesterday"${PART("missed")}><div class="winx-yesterday-head">Missed?</div>${missed.map(row)}</div>`;
  }
}

// ── the days: 7 columns (week) or a month grid; a day's 🔁 entries fold into one "🔁 2/5" box ──
const TIMES = [["morning", "🌅 morning"], ["evening", "🌙 evening"], [null, "🔁 other"]];
export class Grid extends Part {
  on = {
    // a click on the box's edge, its pill or a group heading folds / unfolds the day (not a task in it)
    fold: (e, box) => {
      if (!e.target.matches(".winx-cal-routine, .winx-cal-routine-pill, .winx-cal-routine-pill *, .winx-cal-routine-time")) return;
      const d = box.dataset.day, u = this.ctx.unfolded;
      u.has(d) ? u.delete(d) : u.add(d);
      this.ctx.saveUnfolded(); this.show(box); this.ctx.syncRepeats();
    },
    // month: a click on the day's number or empty space opens its week
    day: (e, cell) => {
      if (e.target === cell || e.target.matches(".winx-cal-num, .winx-cal-marks, .winx-cal-marks *"))
        this.ctx.set({ date: dateFor(cell.dataset.day, "week", this.ctx.today), view: "week" }, ["header", "missed", "grid"]);
    },
  };
  show(box) {
    const open = this.ctx.unfolded.has(box.dataset.day);
    box.classList.toggle("open", open);
    box.querySelector(".winx-cal-routine-list").toggle(open);
    box.querySelector(".winx-cal-routine-pill").toggle(!open);
  }
  fill(d, compact) {
    const { model, shown, TASKS } = this.ctx;
    const all = model.byDay[d], routine = all.filter(e => T(e.t).isRecurring);
    const row = e => new TaskRow({ task: this.view.info(e.t), kind: e.kind, compact, tick: !!TASKS });
    const groups = TIMES.map(([tag, name]) => [name, routine.filter(e => T(e.t).time === tag || (!tag && !TIMES.some(([g]) => g && T(e.t).time === g)))]).filter(([, es]) => es.length);
    const hidden = all.filter(e => e.kind === "done" && !shown.done && !routine.includes(e));
    return html`${all.filter(e => shown[e.kind] && !routine.includes(e)).map(row)}${routine.length ? html`<div class="winx-cal-routine" data-action="fold" data-day="${d}"><div class="winx-cal-routine-pill" title="${routine.map(e => this.view.info(e.t).label).join("\n")}"><span>🔁 ${routine.filter(e => e.kind === "done").length}/${routine.length}</span></div><div class="winx-cal-routine-list">${groups.map(([name, es]) => html`<div class="winx-cal-routine-time">${name}</div>${es.map(row)}`)}</div></div>` : ""}${hidden.length ? html`<div class="winx-cal-marks"><span title="${hidden.map(e => this.view.info(e.t).label).join("\n")}">✓${hidden.length}</span></div>` : ""}`;
  }
  zones(d) {
    return html`<div class="winx-cal-zones">${d <= this.ctx.today ? html`<div class="winx-cal-zone done" data-drop="${d}" data-done="1">✓</div>` : ""}<div class="winx-cal-zone plan" data-drop="${d}">📅 ${M(d).format("D MMM")}</div></div>`;
  }
  render() {
    const { days, today, base, view } = this.ctx;
    if (view === "week") return html`<div class="winx-cal-week"${PART("grid")}>${days.map(d => html`<div class="winx-cal-day${d === today ? " today" : ""}"><div class="winx-cal-head">${M(d).format("ddd D")}</div>${this.fill(d, false)}${this.zones(d)}</div>`)}</div>`;
    return html`<div class="winx-cal-month"${PART("grid")}>${days.slice(0, 7).map(d => html`<div class="winx-cal-wd">${M(d).format("ddd")}</div>`)}${days.map(d => html`<div class="winx-cal-cell${d === today ? " today" : ""}${d.slice(0, 7) !== base.slice(0, 7) ? " outside" : ""}" data-action="day" data-day="${d}"><div class="winx-cal-num">${String(+d.slice(8))}</div>${this.fill(d, true)}${this.zones(d)}</div>`)}</div>`;
  }
  // the folds as the state has them; every box's refresh for the 🔁 repeats button
  mount(root) {
    const boxes = [...root.querySelectorAll(".winx-cal-routine")];
    this.ctx.shows = boxes.map(box => () => this.show(box));
    this.ctx.shows.forEach(f => f());
    this.ctx.syncRepeats();
  }
}

// ── the bottom panel: No date | Regulars | Pool, one card per area; a drop here takes the date off ──
const SHOWN = 8;
export class Panel extends Part {
  on = {
    tab: (e, el) => this.ctx.set({ tab: el.dataset.tab }, ["panel"]),
    more: () => this.ctx.set({ backlogOpen: !this.ctx.state.backlogOpen }, ["panel"]),
    bdays: () => this.ctx.set({ bdaysOpen: !this.ctx.state.bdaysOpen }, ["panel"]),
    toToday: (e, el) => { const t = this.view.taskOf(el); if (t) this.view.actions.fromPool(t, this.ctx.today, false); },
    // at once; the redraw follows the write
    pause: (e, el) => {
      const t = this.view.taskOf(el);
      if (!t) return;
      el.closest(".winx-board-card")?.toggleClass("paused", !T(t).isPaused); el.disabled = true;
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
    const group = (title, cards, extra = "", cls = "") => html`<div class="winx-cal-groupcard${cls}"><div class="winx-cal-group">${title}</div>${cards}${extra}</div>`;
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
      if (backlog.length > SHOWN) after = html`<button class="winx-cal-more" data-action="more">${cut ? `show all ${backlog.length}` : "show less"}</button>`;
    } else if (state.tab === "pool") {
      // by area, the longest since last done first (never done at the top)
      const plus = t => new Button({ icon: "+📅", title: "add to today", action: "toToday" });
      list = pool.length ? byArea(pool, t => new TaskCard({ task: info(t), meta: model.poolMeta(t), extra: plus(t) }))
        : html`<div class="winx-board-meta">Empty: ✦ New task with «To pool» adds one here</div>`;
    } else {
      // birthdays (a fixed yearly rule) fold into one card; the rest by area, the most neglected first; paused last
      const { rest, bdays } = regulars;
      const next = t => T(t).date;
      const meta = t => html`${ruleText(T(t).rule)}  ·  ${next(t) ? html`<span${next(t) < today ? html` class="winx-cal-late"` : ""}>next ${dm(next(t))}</span>` : html`<span>⏸ paused</span>`}  ·  ${model.regularHistory(t)}`;
      const pause = t => next(t)
        ? new Button({ icon: "⏸", title: "pause: drop its dates", action: "pause" })
        : new Button({ icon: "▶", title: "resume: from today, on the first day its rule allows", action: "pause" });
      list = byArea(rest, t => new TaskCard({ task: info(t), meta: meta(t), extra: pause(t), cls: next(t) ? "" : "paused" }));
      if (bdays.length) {
        const open = state.bdaysOpen;
        const more = !open && bdays.length > 3 ? html`<button class="winx-cal-more" data-action="bdays">+${bdays.length - 3} more</button>` : open ? html`<button class="winx-cal-more" data-action="bdays">show less</button>` : "";
        list = html`${list}<div class="winx-cal-groupcard dashed"><div class="winx-cal-group winx-cal-fold" title="${open ? "fold" : "show all"}" data-action="bdays">🎂 Birthdays · ${bdays.length}</div>${(open ? bdays : bdays.slice(0, 3)).map(t => new TaskCard({ task: info(t), meta: `yearly · ${dm(next(t))}` }))}${more}</div>`;
      }
    }
    const tabs = [["nodate", `No date · ${backlog.length}`], ["regulars", `Regulars · ${regulars.rest.length + regulars.bdays.length}`], ["pool", `Pool · ${pool.length}`]];
    return html`<div class="winx-cal-backlog winx-board-backlog" data-drop=""${PART("panel")}><div class="winx-cal-tabs">${tabs.map(([key, text]) => html`<button class="winx-cal-head${key === state.tab ? " on" : ""}" data-action="tab" data-tab="${key}">${text}</button>`)}</div><div class="winx-cal-backlog-grid">${list}</div>${after}</div>`;
  }
}
