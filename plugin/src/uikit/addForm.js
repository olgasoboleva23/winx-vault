import { html } from "../core/html.js";
import { Component } from "./component.js";

// one field, maybe a select (extra), and a submit button, a finger's height: the widget's `on[action]` gets the form.
// input: the field's attributes ({ name, type, placeholder, … })
export class AddForm extends Component {
  view({ action, input, extra = "", submit }) {
    const attrs = Object.entries(input).map(([k, v]) => html` ${k}="${v}"`);
    return html`<form class="winx-add-form" data-action="${action}"><input${attrs}>${extra}<button type="submit">${submit}</button></form>`;
  }
}
