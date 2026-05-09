const config = eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/config.js"));
const { Wallet } = eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js"));

const balance = await Wallet.balance(dv, config);

const wallet = dv.container.createEl("div", { cls: "winx-wallet" });
wallet.createEl("span", { text: `✨ Gold: ${balance}`, cls: "winx-wallet-amount" });
wallet.createEl("a", {
  text: "🛍 Shop",
  href: "00 System/Data/Shop.md",
  cls: "internal-link winx-wallet-link",
});
