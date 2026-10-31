import { html } from "../core/html.js";
import { Component } from "./component.js";

// one field and a submit button, a finger's height (block winx-add-form): the widget's `on[action]` gets the form.
// input: the field's attributes ({ name, type, placeholder, … })
export class AddForm extends Component {
  view({ action, input, submit }) {
    const attrs = Object.entries(input).map(([k, v]) => html` ${k}="${v}"`);
    return html`<form class="winx-add-form" data-action="${action}"><input class="winx-add-form__input"${attrs}><button class="winx-add-form__submit" type="submit">${submit}</button></form>`;
  }
}
