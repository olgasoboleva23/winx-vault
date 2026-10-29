// The days: 7 columns (week) or a month grid. A day lists its shown entries; the hidden kinds (done one-offs
// while ✓ done is off) as counts with a tooltip. The day's 🔁 entries (done, open, faded repeats) fold into one
// pill "🔁 2/5" under the one-offs; a click unfolds them inside the pill's dashed box, grouped by time of day
// (#time/morning, #time/evening, the rest); a click on a group heading or the box's edge folds it back.
import { T } from "./data.js";
import { dateFor } from "./state.js";

const TIMES = [["morning", "🌅 morning"], ["evening", "🌙 evening"], [null, "🔁 other"]];

export function drawGrid(ctx, drag, cards) {
  const { root, days, today, base, view, model, shown } = ctx;
  const M = d => window.moment(d);
  ctx.shows = [];   // each box's refresh, for the 🔁 repeats button
  const fill = (parent, d, compact) => {
    const all = model.byDay[d];
    const routine = all.filter(e => T(e.t).isRecurring);
    for (const e of all) if (shown[e.kind] && !routine.includes(e)) cards.entry(parent, e, compact);
    if (routine.length) {
      const box  = parent.createEl("div", { cls: "winx-cal-routine" });
      const groups = TIMES.map(([tag, name]) => [name, routine.filter(e => T(e.t).time === tag || (!tag && !TIMES.some(([g]) => g && T(e.t).time === g)))])
        .filter(([, es]) => es.length);
      const pill = box.createEl("div", { cls: "winx-cal-routine-pill", attr: { title: routine.map(e => cards.label(e.t)).join("\n") } });
      pill.createEl("span", { text: `🔁 ${routine.filter(e => e.kind === "done").length}/${routine.length}` });
      const list = box.createEl("div", { cls: "winx-cal-routine-list" });
      for (const [name, es] of groups) {
        list.createEl("div", { cls: "winx-cal-routine-time", text: name });
        for (const e of es) cards.entry(list, e, compact);
      }
      const show = () => { const open = ctx.unfolded.has(d); box.classList.toggle("open", open); list.toggle(open); pill.toggle(!open); };
      box.onclick = e => {
        if (!e.target.matches(".winx-cal-routine, .winx-cal-routine-pill, .winx-cal-routine-pill *, .winx-cal-routine-time")) return;
        ctx.unfolded.has(d) ? ctx.unfolded.delete(d) : ctx.unfolded.add(d);
        ctx.saveUnfolded(); show(); ctx.syncRepeats();
      };
      show(); ctx.shows.push(show);
    }
    const hidden = all.filter(e => e.kind === "done" && !shown.done && !routine.includes(e));
    if (!hidden.length) return;
    parent.createEl("div", { cls: "winx-cal-marks" })
      .createEl("span", { text: `✓${hidden.length}`, attr: { title: hidden.map(e => cards.label(e.t)).join("\n") } });
  };

  let grid;
  if (view === "week") {
    grid = root.createEl("div", { cls: "winx-cal-week" });
    for (const d of days) {
      const col = grid.createEl("div", { cls: "winx-cal-day" + (d === today ? " today" : "") });
      col.createEl("div", { cls: "winx-cal-head", text: M(d).format("ddd D") });
      fill(col, d, false);
      drag.dropTarget(col, d);
    }
  } else {
    grid = root.createEl("div", { cls: "winx-cal-month" });
    for (const d of days.slice(0, 7)) grid.createEl("div", { cls: "winx-cal-wd", text: M(d).format("ddd") });
    for (const d of days) {
      const cell = grid.createEl("div", { cls: "winx-cal-cell" + (d === today ? " today" : "") + (d.slice(0, 7) !== base.slice(0, 7) ? " outside" : "") });
      cell.createEl("div", { cls: "winx-cal-num", text: String(+d.slice(8)) });
      fill(cell, d, true);
      cell.onclick = e => { if (e.target === cell || e.target.matches(".winx-cal-num, .winx-cal-marks, .winx-cal-marks *")) ctx.set({ date: dateFor(d, "week", today), view: "week" }, ["header", "missed", "grid"]); };
      drag.dropTarget(cell, d);
    }
  }
  ctx.syncRepeats();
  return [grid];
}
