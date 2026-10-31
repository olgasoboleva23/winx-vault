import { html } from "../core/html.js";
import { Component } from "./component.js";

// A button's look is its kind, one block of styles each (styles/widgets/_buttons.scss):
//   round   an icon in a white circle (a task's ⭐ ⏭ ✏️ 🗑, Missed's ✓ ☀️, the panel's +📅 ⏸ ▶); bigger on the phone
//   nav     ‹ › in a circle: a chevron, mirrored for "next"
//   pill    a word on the pink Cinzel ticket (✦ Open, running low, dates)
//   chip    a small white pill (＋ task, today, week / month)
//   toggle  a chip that's dim until on (✓ done, 🔁 repeats)
//   text    a word in the text's colour, no frame (the market's ✦ open market)
// data: { name: "tea" } → data-name="tea"; cls: extra classes for a place's own tweaks
export class Button extends Component {
  view({ icon, text, title, action, kind = "round", on = false, cls, data = {} }) {
    const label = title ? html` title="${title}" aria-label="${title}"` : "";
    const extra = Object.entries(data).map(([k, v]) => html` data-${k}="${v}"`);
    return html`<button class="winx-btn ${kind}${on ? " on" : ""}${cls ? " " + cls : ""}"${action ? html` data-action="${action}"` : ""}${extra}${label}>${icon ?? text}</button>`;
  }
}
