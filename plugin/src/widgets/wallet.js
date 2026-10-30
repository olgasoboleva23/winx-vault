// Gold left to spend (earned from tasks minus Purchases.md) and a link to the shop. Not on a page now.
import { H } from "../lib/helpers.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

export class Wallet extends Widget {
  async data() { return { balance: await H.Wallet.balance(this.dv, await H.loadConfig()) }; }
  view({ balance }) {
    return html`<div class="winx-wallet">
      <span class="winx-wallet-amount">✨ Gold: ${balance}</span><a class="internal-link winx-wallet-link" href="00 System/Data/Shop.md">🛍 Shop</a>
    </div>`;
  }
}
