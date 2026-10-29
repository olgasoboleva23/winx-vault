// The calendar's top: the drop bar (while dragging), the busy pill, the date / sounds / ＋ task / legend row,
// and the navigation: ‹ period › today, week|month, ✓ done, 🔁 repeats.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { T } from "./data.js";

export function drawHeader(ctx, drag) {
  const { root, state, days, today, base, view, model, shown } = ctx;
  const { areaIcons, areaMap } = ctx.config;
  const M = d => window.moment(d);
  const els = [];
  // while dragging, a bar of 7 days sticks to the top of the screen, so a task from far down (the backlog) can be
  // dropped on a day without scrolling: the shown week, or in the month view the next 7 days
  const barOut = root.createEl("div", { cls: "winx-cal-dropbar" }); els.push(barOut);
  const bar = barOut.createEl("div", { cls: "winx-cal-dropbar-in" });
  for (const d of view === "week" ? days : Array.from({ length: 7 }, (_, i) => L.addDays(today, i)))
    drag.dropOn(bar.createEl("div", { cls: "winx-cal-chip" + (d === today ? " today" : ""), text: M(d).format("ddd D") }), d);
  // while .busy (a write, until the redraw), a pink pill with a spinning ✦ sticks to the top, like the Kanban's arrow
  const busy = root.createEl("div", { cls: "winx-cal-busy" }); els.push(busy);
  busy.createEl("div", { cls: "winx-cal-busy-pill", attr: { title: "saving…" } }).createEl("span", { text: "✦" });

  // the shown date, sounds on/off (the one switch for all winx sounds), a new task, the legend
  const top  = root.createEl("div", { cls: "winx-cal-top" }); els.push(top);
  const pick = top.createEl("div", { cls: "mb-input-type-date" }).createEl("input", { type: "date", value: base });   // Meta Bind's date look
  pick.onchange = () => pick.value && ctx.set({ date: pick.value }, ["header", "missed", "grid"]);
  const mute = top.createEl("button", { text: H.isMuted() ? "🔇" : "🔊", cls: "winx-cal-mute", attr: { title: "sounds on/off", "aria-label": "sounds on/off" } });
  top.createEl("button", { text: "＋ task", cls: "winx-cal-today", attr: { title: "new task (Winx: New task)" } }).onclick = () => app.commands.executeCommandById("winx:new-task");
  mute.onclick = () => { app.saveLocalStorage("winx-mute", H.isMuted() ? null : "1"); mute.textContent = H.isMuted() ? "🔇" : "🔊"; };
  // legend: the areas of the tasks shown, as colored dots, named as on the Life Areas chart
  const legend = top.createEl("div", { cls: "winx-cal-legend" });
  for (const g of Object.keys(areaIcons).filter(g => days.some(d => model.byDay[d].some(e => shown[e.kind] && T(e.t).area === g))))
    legend.createEl("span", { attr: { "data-area": g.slice(6) }, text: areaMap[g] ?? g.slice(6) });

  const nav  = root.createEl("div", { cls: "winx-cal-nav" }); els.push(nav);
  const go   = date => ctx.set({ date }, ["header", "missed", "grid"]);
  const step = n => go(view === "week" ? L.addDays(base, 7 * n) : L.addMonths(base, n));
  nav.createEl("button", { text: "‹", attr: { "aria-label": "previous" } }).onclick = () => step(-1);
  nav.createEl("span", { cls: "winx-cal-title", text: view === "week"
    ? `${M(days[0]).format("D MMM")} – ${M(days.at(-1)).format("D MMM YYYY")}`
    : M(base).format("MMMM YYYY") });
  nav.createEl("button", { text: "›", attr: { "aria-label": "next" } }).onclick = () => step(1);
  if (!days.includes(today)) nav.createEl("button", { text: "today", cls: "winx-cal-today" }).onclick = () => go(null);   // null: follow today again
  const other = view === "week" ? "month" : "week";
  nav.createEl("button", { text: view, cls: "winx-cal-today", attr: { title: `switch to the ${other} view`, "aria-label": `switch to the ${other} view` } })
    .onclick = () => ctx.set({ view: other }, ["header", "missed", "grid"]);
  nav.createEl("button", { text: "✓ done", cls: "winx-cal-filter" + (state.showDone ? " on" : "") })
    .onclick = () => ctx.set({ showDone: !state.showDone }, ["header", "grid"]);
  // unfold / fold every day's 🔁 box at once (lit while all are open)
  const repeats = nav.createEl("button", { text: "🔁 repeats", cls: "winx-cal-filter", attr: { title: "unfold / fold every day's 🔁 box" } });
  const routineDays = () => days.filter(d => model.byDay[d].some(e => T(e.t).isRecurring));
  ctx.syncRepeats = () => repeats.classList.toggle("on", routineDays().every(d => ctx.unfolded.has(d)));
  repeats.onclick = () => {
    const open = !repeats.classList.contains("on");
    for (const d of routineDays()) open ? ctx.unfolded.add(d) : ctx.unfolded.delete(d);
    ctx.saveUnfolded();
    ctx.shows.forEach(f => f()); ctx.syncRepeats();
  };
  return els;
}
