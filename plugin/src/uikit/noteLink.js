import { Component } from "./component.js";
import { Button } from "./button.js";

// a button that opens a note: the widget base handles its "open" action (data-path); kind: as Button's
export class NoteLink extends Component {
  view({ text, path, kind = "pill", cls }) { return new Button({ text, kind, action: "open", data: { path }, cls }); }
}
