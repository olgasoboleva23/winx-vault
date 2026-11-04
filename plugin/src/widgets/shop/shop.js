// Shop: the gold balance and the rewards of Shop.md (name:: … cost:: …); an affordable one is bought with a click
// (logged to Purchases.md), the rest are greyed out.
import { Notice } from "obsidian";
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { AudioEngine } from "../../core/sounds.js";
import { balance, logPurchase } from "./wallet.js";
import { AMOUNT, amount } from "../../core/format.js";

export class Shop extends Widget {
  sound = new AudioEngine("00 System/Assets/star.wav");
  on = {
    buy: async (e, el) => {
      const { name } = el.dataset, cost = Number(el.dataset.cost);
      this.sound.play();
      if (!await logPurchase(name, cost)) return void new Notice(`✦ Not enough gold for ${name}`);
      new Notice(`✨ Bought ${name} for ${cost} gold`);
      await this.draw();
    },
  };
  async data() {
    const gold = balance(this.dv), items = [];
    for (const list of this.dv.pages('"00 System/Data/Shop"').file.lists) {
      const name = list.text.match(/name::\s*(.+)/);
      const cost = list.text.match(new RegExp(`cost::\\s*(${AMOUNT.source})`));
      if (name && cost) items.push({ name: name[1].trim(), cost: amount(cost[1]) });
    }
    return { balance: gold, items: items.map(i => ({ ...i, affordable: gold >= i.cost })) };
  }
  // a reward: bought with a click when the gold covers it, greyed out when it doesn't
  item({ name, cost, affordable }) {
    const buy = affordable
      ? html` data-action="buy" data-name="${name}" data-cost="${cost}"`
      : html` disabled`;
    return html`
      <button class="winx-shop__item"${buy}>
        <span class="winx-shop__item-name">${name}</span>
        <span class="winx-shop__item-cost">${cost} ✨</span>
      </button>`;
  }
  view({ items, balance }) {
    return html`<div class="winx-shop__balance">
        <span class="winx-shop__balance-icon">✨</span>
        <span>Gold</span>
        <span class="winx-shop__balance-amount">${balance}</span>
      </div>
      <div class="winx-shop__items">${items.map(i => this.item(i))}
      </div>`;
  }
  after(root) { root.addClass("winx-shop"); }
}
