import { html } from "../core/html.js";
import { Component } from "./component.js";

// a group's heading: its label and, when given, how many it has (the market's categories)
export class GroupHeader extends Component {
  view({ label, count }) { return html`<div class="market-group-header"><span>${label}</span>${count == null ? "" : html`<span class="market-count">${count}</span>`}</div>`; }
}
