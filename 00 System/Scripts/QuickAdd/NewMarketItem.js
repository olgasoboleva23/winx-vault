module.exports = async () => {
  const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
  const Form = (app.__winxForm ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/form.js")));
  const { marketCategories } = await H.loadConfig();

  // category and name in one window
  const v = await Form.ask("✦ New market item", [
    { name: "Category", key: "category", options: marketCategories.map(c => ({ label: c.label, value: c.tag })) },
    { name: "Name", key: "name", text: "item name" },
  ], { required: ["category", "name"], submit: "Add" });
  if (!v) return;
  const { category, name } = v;

  const file = app.vault.getAbstractFileByPath("00 System/Data/Celestial Market.md");
  if (!file) {
    new Notice("✦ 00 System/Data/Celestial Market.md not found — item not saved");
    return;
  }
  await app.vault.process(file, content => content + `\n- [ ] ${name} ${category}`);
};
