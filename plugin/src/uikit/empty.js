import { html } from "../core/html.js";
import { Component } from "./component.js";

// an empty list's line: "✨ All bought"
export class Empty extends Component {
  view({ text }) { return html`<div class="winx-empty">${text}</div>`; }
}

// a widget whose note isn't there: "Create 02 Areas/Personal/Goals.md"
export class Missing extends Component {
  view({ path }) { return new Empty({ text: `Create ${path}` }); }
}
