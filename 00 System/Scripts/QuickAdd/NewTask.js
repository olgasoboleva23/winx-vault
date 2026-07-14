module.exports = async (params) => {
  const { quickAddApi } = params;

  const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
  const { difficulties, areas } = await H.loadConfig();

  const difficulty = await quickAddApi.suggester(
    difficulties.map(d => `${d.label} (${d.xp} XP)`),
    difficulties.map(d => d.tag)
  );
  if (!difficulty) return;

  const area = await quickAddApi.suggester(
    areas.map(a => a.label),
    areas.map(a => a.tag)
  );
  if (!area) return;

  const tasksApi = app.plugins.plugins["obsidian-tasks-plugin"].apiV1;
  const result = await tasksApi.editTaskLineModal(`- [ ] ${difficulty} ${area} `);
  if (!result) return;

  const file = app.vault.getAbstractFileByPath("02 Areas/Personal/Tasks/Master.md");
  if (!file) {
    new Notice("✦ 02 Areas/Personal/Tasks/Master.md not found — task not saved");
    return;
  }
  await app.vault.process(file, content => result + "\n" + content);
};
