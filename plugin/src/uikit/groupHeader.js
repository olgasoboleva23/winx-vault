import { html } from "../core/html.js";
import { Component } from "./component.js";

// a group's heading (block winx-group-header): its label and, when given, how many it has (the market's categories)
export class GroupHeader extends Component {
  view({ label, count }) { return html`<div class="winx-group-header"><span>${label}</span>${count == null ? "" : html`<span class="winx-group-header__count">${count}</span>`}</div>`; }
}
