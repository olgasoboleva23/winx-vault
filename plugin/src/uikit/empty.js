import { html } from "../core/html.js";
import { Component } from "./component.js";

// an empty list's line with a sparkle: "✦ All bought"; no text: "✦ Nothing here yet"
export class Empty extends Component {
  view({ text = "Nothing here yet" }) { return html`<div class="winx-empty">✦ ${text}</div>`; }
}

// a widget whose note isn't there: "Create 00 System/Data/Goals.md"
export class Missing extends Component {
  view({ path }) { return new Empty({ text: `Create ${path}` }); }
}
