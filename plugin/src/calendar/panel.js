// The bottom panel: No date | Regulars | Pool, one translucent card per area, the cards in masonry columns.
// Dropping a task on the panel takes its date off.
import { L } from "../lib/goalsLib.js";
import { T, dm, sortBacklog, sortPool, sortRegulars, backlogMeta, poolMeta, regularHistory } from "./data.js";

const SHOWN = 8;   // No date: the first ones, then "show all"

export function drawPanel(ctx, actions, drag, cards) {
  const { root, state, today, model } = ctx;
  const { areaIcons, areaMap } = ctx.config;
  const AREAS = Object.keys(areaIcons);
  const { backlog, regulars, pool, done, skips } = model;

  const box  = root.createEl("div", { cls: "winx-cal-backlog winx-board-backlog" });   // the board card look
  const tabs = box.createEl("div", { cls: "winx-cal-tabs" });
  for (const [key, text] of [["nodate", `No date · ${backlog.length}`], ["regulars", `Regulars · ${regulars.length}`], ["pool", `Pool · ${pool.length}`]])
    tabs.createEl("button", { text, cls: "winx-cal-head" + (key === state.tab ? " on" : "") }).onclick = () => ctx.set({ tab: key }, ["panel"]);
  const list = box.createEl("div", { cls: "winx-cal-backlog-grid" });

  const groupCard = title => {
    const g = list.createEl("div", { cls: "winx-cal-groupcard" });
    g.createEl("div", { cls: "winx-cal-group", text: title });
    return g;
  };
  // as on the Life Areas chart
  const areaTitle = g => { const name = areaMap[g] ?? (g ? g.slice(6) : "other"); return `${areaIcons[g] ?? "✦"} ${name[0].toUpperCase()}${name.slice(1)}`; };
  // the cards of `items`, one group card per area run
  const byArea = (items, card) => {
    let group, groupEl;
    for (const t of items) {
      if (!groupEl || cards.area(t) !== group) groupEl = groupCard(areaTitle(group = cards.area(t)));
      card(groupEl, t);
    }
  };

  if (state.tab === "nodate") {
    // longest-waiting first (➕ created)
    const sorted = sortBacklog(backlog, AREAS);
    const cut = sorted.length > SHOWN && !state.backlogOpen;
    byArea(cut ? sorted.slice(0, SHOWN) : sorted, (g, t) => cards.taskCard(g, t, m => m.setText(backlogMeta(t, done, today))));
    if (sorted.length > SHOWN) box.createEl("button", { text: cut ? `show all ${sorted.length}` : "show less", cls: "winx-cal-more" })
      .onclick = () => ctx.set({ backlogOpen: cut }, ["panel"]);
  } else if (state.tab === "pool") {
    // by area, the longest since last done first (never done at the top)
    if (!pool.length) list.createEl("div", { cls: "winx-board-meta", text: "Empty: ✦ New task with «To pool» adds one here" });
    byArea(sortPool(pool, AREAS, done), (g, t) => cards.taskCard(g, t, m => m.setText(poolMeta(t, done, today)), btns => {
      btns.createEl("button", { text: "+📅", attr: { title: "add to today", "aria-label": "add to today" } }).onclick = () => actions.fromPool(t, today, false);
    }));
  } else {
    // birthdays (a fixed yearly rule) fold into one card; the rest by area, the most neglected first; paused ones last
    const { rest, bdays } = sortRegulars(regulars, AREAS, done, today);
    const next = t => T(t).date;
    const regularMeta = t => m => {
      m.appendText(L.ruleText(T(t).rule) + "  ·  ");
      if (next(t)) m.createEl("span", { text: `next ${dm(next(t))}`, cls: next(t) < today ? "winx-cal-late" : "" });
      else m.createEl("span", { text: "⏸ paused" });
      m.appendText("  ·  " + regularHistory(t, done, skips));
    };
    const pauseBtn = t => btns => {
      const paused = !next(t);
      const b = btns.createEl("button", { text: paused ? "▶" : "⏸", attr: { title: paused ? "resume: from today, on the first day its rule allows" : "pause: drop its dates", "aria-label": paused ? "resume" : "pause" } });
      b.onclick = () => {
        b.closest(".winx-board-card")?.toggleClass("paused", !paused); b.disabled = true;   // at once; the redraw follows the write
        actions.pauseOrResume(t);
      };
    };
    byArea(rest, (g, t) => cards.taskCard(g, t, regularMeta(t), pauseBtn(t)).toggleClass("paused", !next(t)));
    if (bdays.length) {
      const g = groupCard(`🎂 Birthdays · ${bdays.length}`);
      g.addClass("dashed");
      const open = state.bdaysOpen;
      const head = g.querySelector(".winx-cal-group");
      head.addClass("winx-cal-fold"); head.title = open ? "fold" : "show all";
      head.onclick = () => ctx.set({ bdaysOpen: !open }, ["panel"]);
      // folded: the next three, then "+N more"
      for (const t of open ? bdays : bdays.slice(0, 3)) cards.taskCard(g, t, m => m.setText(`yearly · ${dm(next(t))}`));
      if (!open && bdays.length > 3) g.createEl("button", { text: `+${bdays.length - 3} more`, cls: "winx-cal-more" }).onclick = head.onclick;
      if (open) g.createEl("button", { text: "show less", cls: "winx-cal-more" }).onclick = head.onclick;
    }
  }
  drag.dropOn(box, null);
  return [box];
}
