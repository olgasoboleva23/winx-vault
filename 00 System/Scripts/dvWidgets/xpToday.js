const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const { xpMap, levels, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = await H.loadConfig();

const sel   = dv.current().date ?? dv.date("today");
const start = sel.startOf("month");
const end   = sel.endOf("month");

const getLevel = xpVal => levels.find(l => xpVal <= l.max) ?? levels.at(-1);

// Pre-bucket task XP by completion date → O(tasks) instead of O(tasks × days)
const xpByDay = new Map();
for (const t of dv.pages('"02 Areas/Personal/Tasks"').file.tasks.where(t => t.completed && t.completion)) {
  const day = t.completion.toFormat("yyyy-MM-dd");
  xpByDay.set(day, (xpByDay.get(day) ?? 0) + H.taskXp(t, xpMap));
}

const habitBonus = Object.values(H.collectHabitDays(dv, start, end))
  .filter(h => h.days.size >= HABIT_BONUS_THRESHOLD)
  .length * HABIT_BONUS_XP;

// Generate all days in the month via Array.from — replaces for loop
const days = Array.from(
  { length: Math.floor(end.diff(start, "days").days) + 1 },
  (_, i) => start.plus({ days: i }).toFormat("yyyy-MM-dd")
);

// 7-day average over the week *ending at the selected date* — slicing the
// month array would average future (zero-XP) days mid-month.
const last7 = Array.from({ length: 7 }, (_, i) => sel.minus({ days: 6 - i }).toFormat("yyyy-MM-dd"));
const avg   = Math.round(last7.reduce((a, d) => a + (xpByDay.get(d) ?? 0), 0) / 7);

const todayStr = sel.toFormat("yyyy-MM-dd");
const todayXP  = (xpByDay.get(todayStr) ?? 0) + habitBonus;
const aura     = getLevel(todayXP).name;
const vals     = days.map(d => levels.indexOf(getLevel(xpByDay.get(d) ?? 0)));

const legendHTML = levels.map(l =>
  `<div class="leg-item" data-tip="${l.name}">
     <span class="swatch ${l.cls}"></span>${l.max === Infinity ? "30+" : l.max}
   </div>`
).join("");

const bonusBadge = habitBonus > 0
  ? `<div class="winx-bonus">🏅 +${habitBonus} habit bonus</div>`
  : "";

dv.container.innerHTML = `
<div class="winx-xp">
  <div class="winx-header">
    <div class="winx-aura">🔮 ${aura} • ${todayXP} XP</div>
    <div>${todayXP > avg ? "↑" : "↓"} 7d</div>
  </div>
  ${bonusBadge}
  <div class="winx-grid">
    ${vals.map(v => `<div class="winx-cell v${v}"></div>`).join("")}
  </div>
  <div class="winx-legend">${legendHTML}</div>
</div>`;
