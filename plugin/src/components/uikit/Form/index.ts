import { Component, Modal, type App, type TFile } from "obsidian";
import { computed, h, reactive } from "vue";
import FormView from "./index.vue";
import { useVueApp } from "#/composables/vueApp.ts";

// One window of fields instead of a chain of prompts. Each row is
//   { name, key, options: [{ label, value, img? }] }  buttons, the chosen one lit (mod-cta)
//   { name, key, text: placeholder, number?, lines?, color? }   a text box (lines: several lines
//                                                   of text; color: the colour picker, "#rrggbb")
//   { name, key, check: description }               a checkbox
//   { name, key, label: true }                      its value as text, not edited
//   { name, key, list: rows, required?, fixed? }    groups of those rows, + adds one, × takes it
//                                                   off (fixed: neither, the groups as given);
//                                                   the value: an array of the groups' values.
//                                                   Rows of text boxes, checkboxes and labels
//                                                   only: a table, a group a line under the names
// Any row can have `tab`: the window then shows its tabs (WinxTabs) and one tab's rows at a time.
// `values` has the starting ones; the keys in `required` must be set before the button works (it's
// greyed out; a list: one group at least, each with its own required keys). Form.ask(...) resolves
// to the values on the button (or Enter), null when closed. Drawn by index.vue (a row:
// FormRow.vue), its look: index.scss (block winx-form).
type Tab = { tab?: string };
type Choice = { label: string; value: unknown; img?: TFile };

export type Row = Tab & (
  | { name: string; key: string; options: Choice[] | ((values: Values) => Choice[]) }
  | {
    name: string; key: string; text: string; number?: boolean; lines?: boolean; color?: boolean;
    readonly?: (values: Values) => boolean;
  }
  | { name: string; key: string; check: string }
  | { name: string; key: string; label: true }
  | { name: string; key: string; list: Row[]; required?: string[]; fixed?: boolean });

export type Values = Record<string, any>;
type Options = { values?: Values; required?: string[]; submit?: string };

// a list's value is set when its groups are an array of one at least, each with its required keys
const isSet = (v: unknown) => ![null, undefined, ""].includes(v as any);
const ready = (rows: Row[], required: string[], values: Values) => required.every(k => {
  const r = rows.find(row => row.key === k);
  const v = values[k];

  return r && "list" in r
    ? Array.isArray(v) && v.length > 0 && v.every(g => (r.required ?? []).every(q => isSet(g[q])))
    : isSet(v);
});

export class Form extends Modal {
  private title: string;
  private rows: Row[];
  private values: Values;
  private required: string[];
  private submit: string;
  private done = false;
  private resolve: (v: Values | null) => void = () => {};
  private owner = new Component();   // the window's Vue app unmounts with it

  constructor(
    app: App, title: string, rows: Row[],
    { values = {}, required = [], submit = "Next →" }: Options = {},
  ) {
    super(app);
    this.title = title;
    this.rows = rows;
    this.values = { ...values };
    this.required = required;
    this.submit = submit;
  }
  static ask(app: App, title: string, rows: Row[], options?: Options): Promise<Values | null> {
    const form = new Form(app, title, rows, options);

    return new Promise(resolve => { form.resolve = resolve; form.open(); });
  }

  onOpen() {
    this.titleEl.setText(this.title);
    this.contentEl.addClass("winx-form");
    this.owner.load();
    // edits land in this.values itself (reactive wraps it, no copy): onClose resolves to it
    const values = reactive(this.values);
    const ok = computed(() => ready(this.rows, this.required, values));
    const resourcePath = (file: TFile) => this.app.vault.getResourcePath(file);
    const send = () => { if (ok.value) { this.done = true; this.close(); } };

    useVueApp(this.owner, this.contentEl, {
      render: () => h(FormView, {
        rows: this.rows, values, ready: ok.value, submit: this.submit, onSubmit: send,
      }),
    }, { provide: { resourcePath } });
    this.scope.register([], "Enter", e => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;   // a new line there
      e.preventDefault();
      send();
    });
  }
  onClose() {
    this.owner.unload();
    this.resolve(this.done ? this.values : null);
  }
}
