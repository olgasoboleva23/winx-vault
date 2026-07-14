const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const { AudioEngine, Wallet, PurchaseLog } = H;
const config = await H.loadConfig();

class ShopUI {
  constructor(container, dv, audio) {
    this.container = container;
    this.dv        = dv;
    this.audio     = audio;
  }

  async render() {
    this.container.innerHTML = "";
    const balance = await Wallet.balance(this.dv, config);

    const bal = this.container.createEl("div", { cls: "winx-shop-balance" });
    bal.createEl("span", { text: "✨", cls: "winx-shop-balance-icon" });
    bal.createEl("span", { text: "Gold" });
    bal.createEl("span", { text: balance, cls: "winx-shop-balance-amount" });

    const list = this.container.createEl("div", { cls: "winx-shop-items" });
    for (const item of this.#parseItems()) {
      this.#renderItem(list, item, balance);
    }
  }

  #parseItems() {
    const items = [];
    for (const list of this.dv.pages('"00 System/Data/Shop"').file.lists) {
      const nameMatch = list.text.match(/name::\s*(.+)/);
      const costMatch = list.text.match(/cost::\s*(\d+)/);
      if (!nameMatch || !costMatch) continue;
      items.push({ name: nameMatch[1].trim(), cost: Number(costMatch[1]) });
    }
    return items;
  }

  #renderItem(parent, { name, cost }, balance) {
    const affordable = balance >= cost;
    const btn = parent.createEl("button", { cls: "winx-shop-item" });
    btn.createEl("span", { text: name, cls: "winx-shop-item-name" });
    btn.createEl("span", { text: `${cost} ✨`, cls: "winx-shop-item-cost" });

    if (!affordable) { btn.disabled = true; return; }

    btn.onclick = async () => {
      this.audio.play();
      await PurchaseLog.append(name, cost);
      new Notice(`✨ Bought ${name} for ${cost} gold`);
      await this.render();
    };
  }
}

dv.container.classList.add("winx-shop");
const shop = new ShopUI(dv.container, dv, new AudioEngine("00 System/Assets/star.wav"));
await shop.render();
