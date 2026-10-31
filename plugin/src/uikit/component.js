// The base of the reusable parts of the markup (src/uikit/): props in, markup out. An instance goes into an
// html`` template as it is: html`<div>${new Button({ icon: "🗑", action: "remove" })}</div>`.
import { html } from "../core/html.js";

export class Component {
  constructor(props = {}) { this.props = props; }
  view(props) { return html``; }   // a subclass returns its markup
  get html() { return this.view(this.props).html; }
}
