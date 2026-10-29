// A purchase in one window (name, cost), logged to 00 System/Data/Purchases.md (the wallet's spent).
module.exports = async () => {
  const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
  const Form = (app.__winxForm ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/form.js")));
  const v = await Form.ask("✦ Buy reward", [
    { name: "Name", key: "name", text: "what you bought" },
    { name: "Cost", key: "cost", text: "coins", number: true },
  ], { required: ["name", "cost"], submit: "Buy" });
  if (v) await H.PurchaseLog.append(v.name, v.cost);
};
