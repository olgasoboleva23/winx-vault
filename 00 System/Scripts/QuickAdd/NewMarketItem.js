module.exports = async (params) => {
  const { quickAddApi } = params;

  const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
  const { marketCategories } = await H.loadConfig();

  const category = await quickAddApi.suggester(
    marketCategories.map((c) => c.label),
    marketCategories.map((c) => c.tag),
  );
  if (!category) return;

  const name = await quickAddApi.inputPrompt("Item name");
  if (!name) return;

  const file = app.vault.getAbstractFileByPath("00 System/Data/Celestial Market.md");
  if (!file) {
    new Notice("✦ 00 System/Data/Celestial Market.md not found — item not saved");
    return;
  }
  await app.vault.process(file, content => content + `\n- [ ] ${name} ${category}`);
};
