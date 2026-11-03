// A calendar part: render() → its markup (html``), on = { action(e, el) } for the elements with data-action inside
// it, mount(root) for what markup can't do. The view puts data-part on a part's top elements (PART), finds the part
// an event came from and calls its handler (task buttons — ✏️ 🗑 ⏭ ⭐ ✓ — are taskButtons.js, the same everywhere).
// A part changes the tab's state through the store (this.store.set); `static watches` are the keys it alone shows
// (the panel's tab), redrawn in place. The data's keys (date, view, ✓ done, area, the phone's picked day) draw it all.
// No whitespace between tags: inline elements must lay out as the old createEl calls did.
import { html } from "../../core/html.js";

export const M = d => window.moment(d);
export const PART = name => html` data-part="${name}"`;

export class Part {
  static watches = [];
  constructor(view) { this.view = view; }
  get ctx() { return this.view.ctx; }
  get store() { return this.view.store; }
  on = {};
  render() { return html``; }
}
