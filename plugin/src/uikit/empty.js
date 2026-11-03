import { html } from "../core/html.js";
import { Component } from "./component.js";
import { Button } from "./button.js";

// an empty list's line with a sparkle: "✦ All bought"; no text: "✦ Nothing here yet";
// mod: a modifier (winx-empty--error), icon instead of ✦, slot: markup after the text (a button)
export class Empty extends Component {
  view({ text = "Nothing here yet", mod, icon = "✦", slot = "" }) {
    return html`<div class="winx-empty${mod ? ` winx-empty--${mod}` : ""}">${icon} ${text}${slot}</div>`;
  }
}

// a widget whose note isn't there: "Create 00 System/Data/Goals.md"
export class Missing extends Component {
  view({ path }) { return new Empty({ text: `Create ${path}` }); }
}

// a widget that couldn't draw: "⚠ couldn't draw: <why>" and ↻ retry (data-action="retry": the widget draws again)
export class Failed extends Component {
  view({ text }) {
    const retry = new Button({ text: "retry", action: "retry", kind: "chip", cls: "winx-empty__retry" });
    return new Empty({ text: `couldn't draw: ${text}`, mod: "error", icon: "⚠", slot: retry });
  }
}
