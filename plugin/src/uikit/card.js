import { html } from "../core/html.js";
import { Component } from "./component.js";

// a dashboard card: the markup Obsidian draws for a "> [!card] Title" callout, so the card styles apply as they are.
// meta: the callout's metadata words ("scroll", "tall"); body: the widget's markup
export class Card extends Component {
  view({ title, body, meta = [] }) {
    return html`<div class="callout" data-callout="card" data-callout-metadata="${meta.join(" ")}" data-callout-fold=""><div class="callout-title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">${title}</div></div><div class="callout-content">${body}</div></div>`;
  }
}
