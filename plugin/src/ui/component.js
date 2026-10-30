// Reusable parts of the widgets' markup, as classes: props in, markup out. An instance goes into an html``
// template as it is: html`<div>${new Button({ icon: "🗑", action: "remove" })}</div>`.
// A button's data-action names the handler in the widget's `on` (any widget, the same Button).
import { html } from "./html.js";

export class Component {
  constructor(props = {}) { this.props = props; }
  view(props) { return html``; }   // a subclass returns its markup
  get html() { return this.view(this.props).html; }
}

// kind: "round" (an icon), "pill" (a word), "cta" (the main one); data: { name: "tea" } → data-name="tea"
export class Button extends Component {
  view({ icon, text, title, action, kind = "round", cls, data = {} }) {
    const label = title ? html` title="${title}" aria-label="${title}"` : "";
    const extra = Object.entries(data).map(([k, v]) => html` data-${k}="${v}"`);
    return html`<button class="winx-btn ${kind}${cls ? " " + cls : ""}"${action ? html` data-action="${action}"` : ""}${extra}${label}>${icon ?? text}</button>`;
  }
}

// a dashboard card: the markup Obsidian draws for a "> [!card] Title" callout, so the card styles apply as they are.
// meta: the callout's metadata words ("scroll", "tall"); body: the widget's markup
export class Card extends Component {
  view({ title, body, meta = [] }) {
    return html`<div class="callout" data-callout="card" data-callout-metadata="${meta.join(" ")}" data-callout-fold=""><div class="callout-title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">${title}</div></div><div class="callout-content">${body}</div></div>`;
  }
}
