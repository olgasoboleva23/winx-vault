const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const { xpMap } = await H.loadConfig();

const selected    = dv.current().date ?? dv.date("today");
const selectedStr = selected.toFormat("yyyy-MM-dd");

const BASE = 100;
const STEP = 25;

// Level n costs BASE + (n-1)*STEP XP.
// Iterate until remaining XP can't afford the next level.
function getLevelInfo(totalXP) {
  let remaining = totalXP;
  for (let level = 1; ; level++) {
    const cost = BASE + (level - 1) * STEP;
    if (remaining < cost) return { level, progress: remaining, cost };
    remaining -= cost;
  }
}

const tasks = dv.pages('"02 Areas/Personal/Tasks"').file.tasks
  .where(t => t.completed && t.completion?.toFormat("yyyy-MM-dd") <= selectedStr);

const total = tasks.array().reduce((sum, t) => sum + H.taskXp(t, xpMap), 0);

const { level, progress, cost } = getLevelInfo(total);

dv.container.innerHTML = `
  <div class="winx-stat-card">
    <div class="winx-icon-circle"></div>
    <div class="winx-stat-body">
      <div class="winx-stat-text">Level: ${level} | Total XP: ${total}</div>
      <div class="winx-stat-text">Progress: ${progress}/${cost}</div>
      <div class="winx-progress-bar">
        <div class="winx-progress-fill" style="width:${(progress / cost * 100).toFixed(1)}%"></div>
      </div>
    </div>
  </div>
`;
