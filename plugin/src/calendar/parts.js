// The calendar's parts, each a class: view(ctx) → its markup (html``), on = { action(e, el) } for the elements
// with data-action inside it. The view puts data-part on a part's top elements, finds the part an event came
// from and calls its handler (task buttons — ✏️ 🗑 ⏭ ⭐ ✓ — are the view's own, the same everywhere).
// No whitespace between tags: inline elements must lay out as the old createEl calls did.
import { Platform } from "obsidian";
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

// ── the top: the drop bar (while dragging), the busy pill, date / sounds / ＋ task / ✦ to the dashboard (the phone), the navigation,
// the week's balance by area ──
export class Header extends Part {
  on = {
    date: (e, el) => this.go(el.value || null),   // emptied (the phone's "Reset"): today
    // a piece of the balance bar: only that area's tasks; again: all
    area: (e, el) => { const a = `#area/${el.dataset.area}`; this.view.area = a === this.view.area ? null : a; this.ctx.set({}, ["grid"]); },
    mute: (e, el) => { toggleMute(); el.textContent = isMuted() ? "🔇" : "🔊"; },
    newTask: () => app.commands.executeCommandById("winx:new-task"),
    dashboard: () => app.commands.executeCommandById("winx:open-dashboard"),
    prev: () => this.step(-1),
    next: () => this.step(1),
    today: () => this.go(null),   // null: follow today again
    switchView: () => this.ctx.set({ view: this.ctx.view === "week" ? "month" : "week" }, ["header", "missed", "grid"]),
    showDone: () => this.ctx.set({ showDone: !this.ctx.state.showDone }, ["header", "grid"]),
    // unfold / fold every day's 🔁 box at once (lit while all are open)
    repeats: (e, el) => {
      const open = !el.classList.contains("winx-btn--on");
      for (const d of this.routineDays()) open ? this.ctx.unfolded.add(d) : this.ctx.unfolded.delete(d);
      this.ctx.saveUnfolded();
      this.ctx.shows.forEach(f => f()); this.ctx.syncRepeats();
    },
  };
  go(date) { this.ctx.set({ date: dateFor(date, this.ctx.view, this.ctx.today) }, ["header", "missed", "grid"]); }
  step(n) { const { view, base } = this.ctx; this.go(view === "week" ? addDays(base, 7 * n) : addMonths(base, n)); }
  // one bar of the week's tasks split by area (the six of the areas list), each piece labelled with its icon and
  // done / all, the done part brighter;
  // an area with none this week a grey icon after it
  balance() {
    const { areas } = this.ctx.config, b = (this.ctx.everything ?? this.ctx.model).balance(areas.map(a => a.tag)), picked = this.view.area;
    const name = tag => areas.find(a => a.tag === tag).label, has = b.filter(x => x.planned), none = b.filter(x => !x.planned);
    return html`<div class="winx-cal__balance"${PART("header")}><div class="winx-cal__balance-bar${picked ? " winx-cal__balance-bar--picked" : ""}">${has.map(x => html`<div class="winx-cal__area${x.area === picked ? " winx-cal__area--on" : ""}" data-area="${x.area.slice(6)}" data-action="area" style="flex: ${x.planned}" title="${name(x.area)}: ${x.done} of ${x.planned} done"><span class="winx-cal__area-label">${name(x.area).split(" ")[0]} ${x.done}/${x.planned}</span><b class="winx-cal__area-track"><i class="winx-cal__area-fill" style="width: ${Math.round(x.done / x.planned * 100)}%"></i></b></div>`)}</div>${none.length ? html`<div class="winx-cal__balance-none" title="nothing this week">${none.map(x => html`<span title="${name(x.area)}: nothing this week">${name(x.area).split(" ")[0]}</span>`)}</div>` : ""}</div>`;
  }
  routineDays() { return this.ctx.days.filter(d => this.ctx.model.byDay[d].some(e => T(e.t).isRecurring)); }
  render() {
    const { state, days, today, base, view, model, shown } = this.ctx;
    // while dragging, a bar of 7 days sticks to the top: the shown week, or in the month view the next 7 days
    const chips = view === "week" ? days : Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const other = view === "week" ? "month" : "week";
    return html`<div class="winx-cal__dropbar"${PART("header")}><div class="winx-cal__dropbar-in">${chips.map(d => html`<div class="winx-cal__chip${d === today ? " winx-cal__chip--today" : ""}" data-drop="${d}">${M(d).format("ddd D")}</div>`)}</div></div>${busyPill(PART("header"))}<div class="winx-cal__top"${PART("header")}><div class="mb-input-type-date"><input type="date" value="${base}" data-action="date"></div><button class="winx-cal__mute" title="sounds on/off" aria-label="sounds on/off" data-action="mute">${isMuted() ? "🔇" : "🔊"}</button>${new Button({ text: "＋ task", kind: "chip", title: "new task (Winx: New task)", action: "newTask" })}${new Button({ text: "✦", title: "dashboard", kind: "chip", cls: "winx-cal__to-dash winx-is-phone-only", action: "dashboard" })}</div><div class="winx-nav"${PART("header")}>${new Button({ icon: "‹", kind: "nav", title: "previous", action: "prev" })}<span class="winx-nav__title">${view === "week" ? `${M(days[0]).format("D MMM")} – ${M(days.at(-1)).format("D MMM YYYY")}` : M(base).format("MMMM YYYY")}</span>${new Button({ icon: "›", kind: "nav", title: "next", action: "next" })}${days.includes(today) ? "" : new Button({ text: Platform.isMobile ? "☀️" : "today", title: "today", kind: "chip", action: "today" })}${new Button({ text: view, kind: "chip", title: `switch to the ${other} view`, action: "switchView" })}${new Button({ text: "✓ done", kind: "toggle", on: state.showDone, action: "showDone" })}${new Button({ text: "🔁 repeats", kind: "toggle", title: "unfold / fold every day's 🔁 box", action: "repeats" })}</div>${view === "week" ? this.balance() : ""}`;
  }
  // after the grid: the repeats button lit while every routine day is unfolded
  mount(root) {
    const repeats = root.querySelector('[data-action="repeats"]');
    this.ctx.syncRepeats = () => repeats?.classList.toggle("winx-btn--on", this.routineDays().every(d => this.ctx.unfolded.has(d)));
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
    const row = el.closest(".winx-missed__row"), box = row.parentElement, t = this.view.taskOf(row);
    if (!t) return;
    row.remove();
    if (!box.querySelector(".winx-missed__row")) box.remove();
    sound.play({ gain: 0.25 });
    await write(t);
  }
  render() {
    const { days, today, model: { missed } } = this.ctx;
    if (!days.includes(today) || !missed.length) return html``;
    const row = t => { const task = this.view.info(t); return html`<div class="winx-missed__row"${task.area ? html` data-area="${task.area}"` : ""} data-task="${task.key}" draggable="true" data-drag="${task.key}" data-swipeable="${task.key}"><span class="winx-missed__text">${T(t).isRecurring ? "🔁 " : ""}${new TaskText({ task })}</span><div class="winx-task-btns">${new TaskButtons({ task })}</div><em class="winx-missed__date">${dm(T(t).date)}</em>${this.ctx.TASKS ? new Button({ icon: "✓", title: `done on ${T(t).date}`, action: "missedDone" }) : ""}${new Button({ icon: "☀️", title: "move to today", action: "missedToday" })}</div>`; };
    return html`<div class="winx-missed"${PART("missed")}><div class="winx-missed__head">Missed?</div>${missed.map(row)}</div>`;
  }
}

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
      if (Platform.isMobile) { this.view.picked = cell.dataset.day; return this.ctx.set({}, ["grid"]); }
      this.ctx.set({ date: dateFor(cell.dataset.day, "week", this.ctx.today), view: "week" }, ["header", "missed", "grid"]);
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
    const all = model.byDay[d], routine = all.filter(e => T(e.t).isRecurring);
    const row = e => new TaskRow({ task: this.view.info(e.t), kind: e.kind, compact, tick: !!TASKS });
    const groups = TIMES.map(([tag, name]) => [name, routine.filter(e => T(e.t).time === tag || (!tag && !TIMES.some(([g]) => g && T(e.t).time === g)))]).filter(([, es]) => es.length);
    const hidden = all.filter(e => e.kind === "done" && !shown.done && !routine.includes(e));
    return html`${all.filter(e => shown[e.kind] && !routine.includes(e)).map(row)}${routine.length ? html`<div class="winx-cal__routine" data-action="fold" data-day="${d}"><div class="winx-cal__routine-pill" title="${routine.map(e => this.view.info(e.t).label).join("\n")}"><span>🔁 ${routine.filter(e => e.kind === "done").length}/${routine.length}</span></div><div class="winx-cal__routine-list">${groups.map(([name, es]) => html`<div class="winx-cal__routine-time">${name}</div>${es.map(row)}`)}</div></div>` : ""}${hidden.length ? html`<div class="winx-cal__marks"><span title="${hidden.map(e => this.view.info(e.t).label).join("\n")}">✓${hidden.length}</span></div>` : ""}`;
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
    const picked = days.includes(this.view.picked) ? this.view.picked : days.includes(today) && today.slice(0, 7) === base.slice(0, 7) ? today : base.slice(0, 8) + "01";
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
    } else if (state.tab === "pool") {
      // by area, the longest since last done first (never done at the top)
      const plus = t => new Button({ icon: "+📅", title: "add to today", action: "toToday" });
      list = pool.length ? byArea(pool, t => new TaskCard({ task: info(t), meta: model.poolMeta(t), extra: plus(t) }))
        : html`<div class="winx-cal__empty">Empty: ✦ New task with «To pool» adds one here</div>`;
    } else {
      // birthdays (a fixed yearly rule) fold into one card; the rest by area, the most neglected first; paused last
      const { rest, bdays } = regulars;
      const next = t => T(t).date;
      const meta = t => html`${ruleText(T(t).rule)}  ·  ${next(t) ? html`<span${next(t) < today ? html` class="winx-cal__late"` : ""}>next ${dm(next(t))}</span>` : html`<span>⏸ paused</span>`}  ·  ${model.regularHistory(t)}`;
      const pause = t => next(t)
        ? new Button({ icon: "⏸", title: "pause: drop its dates", action: "pause" })
        : new Button({ icon: "▶", title: "resume: from today, on the first day its rule allows", action: "pause" });
      list = byArea(rest, t => new TaskCard({ task: info(t), meta: meta(t), extra: pause(t), cls: next(t) ? "" : "winx-task-card--paused" }));
      if (bdays.length) {
        const open = state.bdaysOpen;
        const more = !open && bdays.length > 3 ? html`<button class="winx-cal__more" data-action="bdays">+${bdays.length - 3} more</button>` : open ? html`<button class="winx-cal__more" data-action="bdays">show less</button>` : "";
        list = html`${list}<div class="winx-cal__group-card winx-cal__group-card--dashed"><div class="winx-cal__group winx-cal__fold" title="${open ? "fold" : "show all"}" data-action="bdays">🎂 Birthdays · ${bdays.length}</div>${(open ? bdays : bdays.slice(0, 3)).map(t => new TaskCard({ task: info(t), meta: `yearly · ${dm(next(t))}` }))}${more}</div>`;
      }
    }
    const tabs = [["nodate", `No date · ${backlog.length}`], ["regulars", `Regulars · ${regulars.rest.length + regulars.bdays.length}`], ["pool", `Pool · ${pool.length}`]];
    return html`<div class="winx-cal__backlog winx-board-backlog" data-drop=""${PART("panel")}><div class="winx-cal__tabs">${tabs.map(([key, text]) => html`<button class="winx-cal__tab${key === state.tab ? " winx-cal__tab--on" : ""}" data-action="tab" data-tab="${key}">${text}</button>`)}</div><div class="winx-cal__backlog-grid">${list}</div>${after}</div>`;
  }
}
