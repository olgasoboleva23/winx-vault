// The calendar's parts, each a class: view(ctx) → its markup (html``), on = { action(e, el) } for the elements
// with data-action inside it. The view puts data-part on a part's top elements, finds the part an event came
// from and calls its handler (task buttons — ✏️ 🗑 ⏭ ⭐ ✓ — are the view's own, the same everywhere).
// No whitespace between tags: inline elements must lay out as the old createEl calls did.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { TaskButtons, TaskCard, TaskRow, TaskText } from "./components.js";
import { T, dm, sortBacklog, sortPool, sortRegulars, backlogMeta, poolMeta, regularHistory } from "./data.js";
import { dateFor } from "./state.js";

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
    mute: (e, el) => { app.saveLocalStorage("winx-mute", H.isMuted() ? null : "1"); el.textContent = H.isMuted() ? "🔇" : "🔊"; },
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
  step(n) { const { view, base } = this.ctx; this.go(view === "week" ? L.addDays(base, 7 * n) : L.addMonths(base, n)); }
  routineDays() { return this.ctx.days.filter(d => this.ctx.model.byDay[d].some(e => T(e.t).isRecurring)); }
  render() {
    const { state, days, today, base, view, model, shown } = this.ctx;
    const { areaIcons, areaMap } = this.ctx.config;
    // while dragging, a bar of 7 days sticks to the top: the shown week, or in the month view the next 7 days
    const chips = view === "week" ? days : Array.from({ length: 7 }, (_, i) => L.addDays(today, i));
    const legend = Object.keys(areaIcons).filter(g => days.some(d => model.byDay[d].some(e => shown[e.kind] && T(e.t).area === g)));
    const other = view === "week" ? "month" : "week";
    return html`<div class="winx-cal-dropbar"${PART("header")}><div class="winx-cal-dropbar-in">${chips.map(d => html`<div class="winx-cal-chip${d === today ? " today" : ""}" data-drop="${d}">${M(d).format("ddd D")}</div>`)}</div></div><div class="winx-cal-busy"${PART("header")}><div class="winx-cal-busy-pill" title="saving…"><span>✦</span></div></div><div class="winx-cal-top"${PART("header")}><div class="mb-input-type-date"><input type="date" value="${base}" data-action="date"></div><button class="winx-cal-mute" title="sounds on/off" aria-label="sounds on/off" data-action="mute">${H.isMuted() ? "🔇" : "🔊"}</button><button class="winx-cal-today" title="new task (Winx: New task)" data-action="newTask">＋ task</button><div class="winx-cal-legend">${legend.map(g => html`<span data-area="${g.slice(6)}">${areaMap[g] ?? g.slice(6)}</span>`)}</div></div><div class="winx-cal-nav"${PART("header")}><button aria-label="previous" data-action="prev">‹</button><span class="winx-cal-title">${view === "week" ? `${M(days[0]).format("D MMM")} – ${M(days.at(-1)).format("D MMM YYYY")}` : M(base).format("MMMM YYYY")}</span><button aria-label="next" data-action="next">›</button>${days.includes(today) ? "" : html`<button class="winx-cal-today" data-action="today">today</button>`}<button class="winx-cal-today" title="switch to the ${other} view" aria-label="switch to the ${other} view" data-action="switchView">${view}</button><button class="winx-cal-filter${state.showDone ? " on" : ""}" data-action="showDone">✓ done</button><button class="winx-cal-filter" title="unfold / fold every day's 🔁 box" data-action="repeats">🔁 repeats</button></div>`;
  }
  // after the grid: the repeats button lit while every routine day is unfolded
  mount(root) {
    const repeats = root.querySelector('[data-action="repeats"]');
    this.ctx.syncRepeats = () => repeats?.classList.toggle("on", this.routineDays().every(d => this.ctx.unfolded.has(d)));
  }
}

// ── "Missed?": open tasks whose day has passed, only while today is on screen ──
export class Missed extends Part {
  sounds = { done: new H.AudioEngine("00 System/Assets/winx music/snd_pickup_gem02.wav"), today: new H.AudioEngine("00 System/Assets/star.wav") };
  on = {
    missedDone: (e, el) => this.act(el, this.sounds.done, t => this.view.actions.doneOnItsDay(t)),
    missedToday: (e, el) => this.act(el, this.sounds.today, t => this.view.actions.toToday(t)),
  };
  async act(el, sound, write) {
    const row = el.closest(".winx-yesterday-row"), box = row.parentElement, t = this.view.taskOf(row);
    row.remove();
    if (!box.querySelector(".winx-yesterday-row")) box.remove();
    if (!H.isMuted()) sound.play({ gain: 0.25 });
    await write(t);
  }
  render() {
    const { days, today, missed } = this.ctx;
    if (!days.includes(today) || !missed.length) return html``;
    const row = t => { const task = this.view.info(t); return html`<div class="winx-yesterday-row"${task.area ? html` data-area="${task.area}"` : ""} data-task="${task.key}" draggable="true" data-drag="${task.key}" data-swipeable="${task.key}"><span>${T(t).isRecurring ? "🔁 " : ""}${new TaskText({ task })}</span><div class="winx-board-btns">${new TaskButtons({ task, star: false })}</div><em>${dm(T(t).date)}</em>${this.ctx.TASKS ? html`<button title="done on ${T(t).date}" data-action="missedDone">✓</button>` : ""}<button title="move to today" data-action="missedToday">☀️</button></div>`; };
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
    toToday: (e, el) => this.view.actions.fromPool(this.view.taskOf(el), this.ctx.today, false),
    // at once; the redraw follows the write
    pause: (e, el) => {
      const t = this.view.taskOf(el), paused = !T(t).date;
      el.closest(".winx-board-card")?.toggleClass("paused", !paused); el.disabled = true;
      this.view.actions.pauseOrResume(t);
    },
  };
  render() {
    const { state, today, model } = this.ctx;
    const { areaIcons, areaMap } = this.ctx.config;
    const AREAS = Object.keys(areaIcons);
    const { backlog, regulars, pool, done, skips } = model;
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
      const sorted = sortBacklog(backlog, AREAS), cut = sorted.length > SHOWN && !state.backlogOpen;
      list = byArea(cut ? sorted.slice(0, SHOWN) : sorted, t => new TaskCard({ task: info(t), meta: backlogMeta(t, done, today) }));
      if (sorted.length > SHOWN) after = html`<button class="winx-cal-more" data-action="more">${cut ? `show all ${sorted.length}` : "show less"}</button>`;
    } else if (state.tab === "pool") {
      // by area, the longest since last done first (never done at the top)
      const plus = t => html`<button title="add to today" aria-label="add to today" data-action="toToday">+📅</button>`;
      list = pool.length ? byArea(sortPool(pool, AREAS, done), t => new TaskCard({ task: info(t), meta: poolMeta(t, done, today), extra: plus(t) }))
        : html`<div class="winx-board-meta">Empty: ✦ New task with «To pool» adds one here</div>`;
    } else {
      // birthdays (a fixed yearly rule) fold into one card; the rest by area, the most neglected first; paused last
      const { rest, bdays } = sortRegulars(regulars, AREAS, done, today);
      const next = t => T(t).date;
      const meta = t => html`${L.ruleText(T(t).rule)}  ·  ${next(t) ? html`<span${next(t) < today ? html` class="winx-cal-late"` : ""}>next ${dm(next(t))}</span>` : html`<span>⏸ paused</span>`}  ·  ${regularHistory(t, done, skips)}`;
      const pause = t => next(t)
        ? html`<button title="pause: drop its dates" aria-label="pause" data-action="pause">⏸</button>`
        : html`<button title="resume: from today, on the first day its rule allows" aria-label="resume" data-action="pause">▶</button>`;
      list = byArea(rest, t => new TaskCard({ task: info(t), meta: meta(t), extra: pause(t), cls: next(t) ? "" : "paused" }));
      if (bdays.length) {
        const open = state.bdaysOpen;
        const more = !open && bdays.length > 3 ? html`<button class="winx-cal-more" data-action="bdays">+${bdays.length - 3} more</button>` : open ? html`<button class="winx-cal-more" data-action="bdays">show less</button>` : "";
        list = html`${list}<div class="winx-cal-groupcard dashed"><div class="winx-cal-group winx-cal-fold" title="${open ? "fold" : "show all"}" data-action="bdays">🎂 Birthdays · ${bdays.length}</div>${(open ? bdays : bdays.slice(0, 3)).map(t => new TaskCard({ task: info(t), meta: `yearly · ${dm(next(t))}` }))}${more}</div>`;
      }
    }
    const tabs = [["nodate", `No date · ${backlog.length}`], ["regulars", `Regulars · ${regulars.length}`], ["pool", `Pool · ${pool.length}`]];
    return html`<div class="winx-cal-backlog winx-board-backlog" data-drop=""${PART("panel")}><div class="winx-cal-tabs">${tabs.map(([key, text]) => html`<button class="winx-cal-head${key === state.tab ? " on" : ""}" data-action="tab" data-tab="${key}">${text}</button>`)}</div><div class="winx-cal-backlog-grid">${list}</div>${after}</div>`;
  }
  mount() {}
}
