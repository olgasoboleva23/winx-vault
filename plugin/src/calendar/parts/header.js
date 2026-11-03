import { Platform } from "obsidian";
import { html } from "../../core/html.js";
import { busyPill } from "../../uikit/busy.js";
import { Button } from "../../uikit/button.js";
import { T } from "../data.js";
import { dateFor } from "../state.js";
import { addDays, addMonths } from "../../core/dates.js";
import { isMuted, toggleMute } from "../../core/sounds.js";
import { app } from "../../core/app.js";
import { M, PART, Part } from "./part.js";

// ── the top: the drop bar (while dragging), the busy pill, date / sounds / ＋ task / ✦ to the dashboard (the phone), the navigation,
// the week's balance by area ──
export class Header extends Part {
  on = {
    date: (e, el) => this.go(el.value || null),   // emptied (the phone's "Reset"): today
    // a piece of the balance bar: only that area's tasks; again: all
    area: (e, el) => { const a = `#area/${el.dataset.area}`; this.store.set({ area: a === this.ctx.state.area ? null : a }); },
    mute: (e, el) => { toggleMute(); el.textContent = isMuted() ? "🔇" : "🔊"; },
    newTask: () => app.commands.executeCommandById("winx:new-task"),
    dashboard: () => app.commands.executeCommandById("winx:open-dashboard"),
    prev: () => this.step(-1),
    next: () => this.step(1),
    today: () => this.go(null),   // null: follow today again
    switchView: () => this.store.set({ view: this.ctx.view === "week" ? "month" : "week" }),
    showDone: () => this.store.set({ showDone: !this.ctx.state.showDone }),
    // unfold / fold every day's 🔁 box at once (lit while all are open)
    repeats: (e, el) => {
      const open = !el.classList.contains("winx-btn--on");
      for (const d of this.routineDays()) open ? this.ctx.unfolded.add(d) : this.ctx.unfolded.delete(d);
      this.ctx.saveUnfolded();
      this.ctx.shows.forEach(f => f()); this.ctx.syncRepeats();
    },
  };
  go(date) { this.store.set({ date: dateFor(date, this.ctx.view, this.ctx.today) }); }
  step(n) { const { view, base } = this.ctx; this.go(view === "week" ? addDays(base, 7 * n) : addMonths(base, n)); }
  // one bar of the week's tasks split by area (the six of the areas list), each piece labelled with its icon and
  // done / all, the done part brighter;
  // an area with none this week a grey icon after it
  balance() {
    const { areas } = this.ctx.config, b = (this.ctx.everything ?? this.ctx.model).balance(areas.map(a => a.tag)), picked = this.ctx.state.area;
    const name = tag => areas.find(a => a.tag === tag).label, has = b.filter(x => x.planned), none = b.filter(x => !x.planned);
    return html`<div class="winx-cal__balance"${PART("header")}><div class="winx-cal__balance-bar${picked ? " winx-cal__balance-bar--picked" : ""}">${has.map(x => html`<div class="winx-cal__area${x.area === picked ? " winx-cal__area--on" : ""}" data-area="${x.area.slice(6)}" data-action="area" style="flex: ${x.planned}" title="${name(x.area)}: ${x.done} of ${x.planned} done"><span class="winx-cal__area-label">${name(x.area).split(" ")[0]} ${x.done}/${x.planned}</span><b class="winx-cal__area-track"><i class="winx-cal__area-fill" style="width: ${Math.round(x.done / x.planned * 100)}%"></i></b></div>`)}</div>${none.length ? html`<div class="winx-cal__balance-none" title="nothing this week">${none.map(x => html`<span title="${name(x.area)}: nothing this week">${name(x.area).split(" ")[0]}</span>`)}</div>` : ""}</div>`;
  }
  routineDays() { return this.ctx.days.filter(d => this.ctx.model.byDay[d].some(e => T(e.t).isRecurring)); }
  render() {
    const { state, days, today, base, view } = this.ctx;
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
