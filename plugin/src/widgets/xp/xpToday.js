// XP Today: the page's day's XP (with the habit bonus), its aura level, ↑/↓ against the 7-day average, and the
// month as a heatmap of daily levels.
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import config from "../../core/config.js";
import { pageDay, ymd } from "../../core/dates.js";
import { collectHabitDays, taskXp } from "./xp.js";

export class XpToday extends Widget {
  async data() {
    const { xpMap, levels, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = config;
    const sel = pageDay(this.dv), start = sel.startOf("month"), end = sel.endOf("month");
    const levelOf = xp => levels.find(l => xp <= l.max) ?? levels.at(-1);
    // task XP by completion day
    const xpByDay = new Map();
    for (const t of this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks.where(t => t.completed && t.completion)) {
      const day = ymd(t.completion);
      xpByDay.set(day, (xpByDay.get(day) ?? 0) + taskXp(t, xpMap));
    }
    const habitBonus = Object.values(collectHabitDays(this.dv, start, end)).filter(h => h.days.size >= HABIT_BONUS_THRESHOLD).length * HABIT_BONUS_XP;
    const days = Array.from({ length: Math.floor(end.diff(start, "days").days) + 1 }, (_, i) => ymd(start.plus({ days: i })));
    // the 7 days ending on the selected day (not the month's first week: future days would pull it down)
    const last7 = Array.from({ length: 7 }, (_, i) => ymd(sel.minus({ days: 6 - i })));
    const avg = Math.round(last7.reduce((a, d) => a + (xpByDay.get(d) ?? 0), 0) / 7);
    const todayXP = (xpByDay.get(ymd(sel)) ?? 0) + habitBonus;
    return { levels, habitBonus, avg, todayXP, aura: levelOf(todayXP).name, vals: days.map(d => levels.indexOf(levelOf(xpByDay.get(d) ?? 0))) };
  }
  view({ levels, habitBonus, avg, todayXP, aura, vals }) {
    return html`<div class="winx-xp">
      <div class="winx-xp__header"><div class="winx-xp__aura">🔮 ${aura} • ${todayXP} XP</div><div>${todayXP > avg ? "↑" : "↓"} 7d</div></div>
      ${habitBonus > 0 ? html`<div class="winx-xp__bonus">🏅 +${habitBonus} habit bonus</div>` : ""}
      <div class="winx-xp__grid">${vals.map(v => html`<div class="winx-xp__cell winx-xp__cell--v${v}"></div>`)}</div>
      <div class="winx-xp__legend">${levels.map(l => html`<div class="winx-xp__legend-item" data-tip="${l.name}"><span class="winx-xp__swatch winx-xp__swatch--${l.cls}"></span>${l.max === Infinity ? "30+" : l.max}</div>`)}</div>
    </div>`;
  }
}
