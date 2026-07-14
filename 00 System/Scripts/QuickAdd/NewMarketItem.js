module.exports = async (params) => {
  const { quickAddApi } = params;

  const { marketCategories } = eval(
    await app.vault.adapter.read("00 System/Scripts/dvWidgets/config.js"),
  );

  const category = await quickAddApi.suggester(
    marketCategories.map((c) => c.label),
    marketCategories.map((c) => c.tag),
  );

  if (!category) return;

  const name = await quickAddApi.inputPrompt("Item name");
  if (!name) return;

  const file = app.vault.getAbstractFileByPath(
    "00 System/Data/Celestial Market.md",
  );
  const content = await app.vault.read(file);
  await app.vault.modify(file, content + `\n- [ ] ${name} ${category}`);
};
