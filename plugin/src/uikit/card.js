import { html } from "../core/html.js";
import { Component } from "./component.js";

// a dashboard card (block winx-widget): the markup Obsidian draws for a "> [!card] Title" callout, so the card
// styles apply as they are, with the block's classes on top.
// meta: the callout's metadata words ("scroll", "tall"); body: the widget's markup; button: one next to the title
export class Card extends Component {
  view({ title, body, meta = [], button = "" }) {
    return html`<div class="callout winx-widget" data-callout="card" data-callout-metadata="${meta.join(" ")}" data-callout-fold=""><div class="callout-title winx-widget__title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">${title}</div>${button}</div><div class="callout-content winx-widget__body">${body}</div></div>`;
  }
}
