// Shop: the gold balance and the rewards of Shop.md (name:: … cost:: …); an affordable one is bought with a click
// (logged to Purchases.md), the rest are greyed out.
import { Notice } from "obsidian";
import { html } from "../../ui/html.js";
import { Widget } from "../widget.js";
import { AudioEngine } from "../../core/sounds.js";
import { balance, logPurchase } from "./wallet.js";

export class Shop extends Widget {
  sound = new AudioEngine("00 System/Assets/star.wav");
  on = {
    buy: async (e, el) => {
      const { name } = el.dataset, cost = Number(el.dataset.cost);
      this.sound.play();
      await logPurchase(name, cost);
      new Notice(`✨ Bought ${name} for ${cost} gold`);
      await this.draw();
    },
  };
  async data() {
    const items = [];
    for (const list of this.dv.pages('"00 System/Data/Shop"').file.lists) {
      const name = list.text.match(/name::\s*(.+)/), cost = list.text.match(/cost::\s*(\d+)/);
      if (name && cost) items.push({ name: name[1].trim(), cost: Number(cost[1]) });
    }
    return { items, balance: balance(this.dv) };
  }
  view({ items, balance }) {
    return html`<div class="winx-shop-balance"><span class="winx-shop-balance-icon">✨</span><span>Gold</span><span class="winx-shop-balance-amount">${balance}</span></div>
      <div class="winx-shop-items">${items.map(({ name, cost }) => html`<button class="winx-shop-item"${balance >= cost ? html` data-action="buy" data-name="${name}" data-cost="${cost}"` : html` disabled`}><span class="winx-shop-item-name">${name}</span><span class="winx-shop-item-cost">${cost} ✨</span></button>`)}</div>`;
  }
  after(root) { root.addClass("winx-shop"); }
}
