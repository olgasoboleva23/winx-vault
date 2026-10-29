const L = winx.L;
const H = winx.H;
const { xpMap } = await H.loadConfig();

const selected    = H.pageDay(dv);
const selectedStr = H.ymd(selected);

const tasks = dv.pages('"02 Areas/Personal/Tasks"').file.tasks
  .where(t => t.completed && H.ymd(t.completion) <= selectedStr);

const total = tasks.array().reduce((sum, t) => sum + H.taskXp(t, xpMap), 0);

const { level, progress, cost } = L.levelInfo(total);

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
