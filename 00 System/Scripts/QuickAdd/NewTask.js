module.exports = async () => {
  const H    = winx.H;
  const L    = winx.L;
  const Task = winx.Task;

  // difficulty, area, time of day, sticker (or "to pool") in one window; then the Tasks modal for the text and dates
  const pick = await H.taskWindow({}, true);
  if (!pick) return;

  const tasksApi = app.plugins.plugins["obsidian-tasks-plugin"].apiV1;
  const created = H.today();   // ➕ shows how long it waits on the board
  const result = await tasksApi.editTaskLineModal(`- [ ] ${pick.difficulty} ${pick.area}${pick.time ? " " + pick.time : ""}  ➕ ${created}`);
  if (!result) return;
  const line = new Task(result).setSticker(pick.sticker);   // after the text typed in the Tasks modal

  // a pool line (no checkbox, no dates) goes to the end of Pool.md, made on first use; a task to the top of Master.md
  if (pick.pool) {
    const path = "02 Areas/Personal/Tasks/Pool.md", poolLine = new Task(line).poolLine;
    const pool = app.vault.getAbstractFileByPath(path);
    if (pool) await app.vault.process(pool, content => content.trimEnd() + "\n" + poolLine + "\n");
    else await app.vault.create(path, "Tasks to pick when it's time: drag one from the calendar's Pool tab onto a day.\n\n" + poolLine + "\n");
    return;
  }
  const file = app.vault.getAbstractFileByPath("02 Areas/Personal/Tasks/Master.md");
  if (!file) {
    new Notice("✦ 02 Areas/Personal/Tasks/Master.md not found — task not saved");
    return;
  }
  await app.vault.process(file, content => line + "\n" + content);
};
