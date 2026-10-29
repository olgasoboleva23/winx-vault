import { App, Modal, TFile } from "obsidian";

// One window of fields instead of a chain of prompts. Each row is
//   { name, key, options: [{ label, value, img? }] }  a row of buttons, the chosen one highlighted (mod-cta)
//   { name, key, text: placeholder, number? }       a text box
//   { name, key, check: description }               a checkbox
// `values` has the starting ones; the keys in `required` must be set before the button works (it's greyed out).
// Form.ask(...) resolves to the values on the button (or Enter), null when closed.
export type Row =
  | { name: string; key: string; options: { label: string; value: unknown; img?: TFile }[] }
  | { name: string; key: string; text: string; number?: boolean }
  | { name: string; key: string; check: string };
export type Values = Record<string, any>;
type Options = { values?: Values; required?: string[]; submit?: string };

export class Form extends Modal {
  private values: Values;
  private required: string[];
  private submit: string;
  private done = false;
  private button!: HTMLButtonElement;
  private resolve: (v: Values | null) => void = () => {};

  constructor(app: App, private title: string, private rows: Row[], { values = {}, required = [], submit = "Next →" }: Options = {}) {
    super(app);
    this.values = { ...values };
    this.required = required;
    this.submit = submit;
  }
  static ask(app: App, title: string, rows: Row[], options?: Options): Promise<Values | null> {
    const form = new Form(app, title, rows, options);
    return new Promise(resolve => { form.resolve = resolve; form.open(); });
  }

  private get ready() { return this.required.every(k => ![null, undefined, ""].includes(this.values[k])); }
  private update()    { this.button.disabled = !this.ready; }
  private send()      { if (this.ready) { this.done = true; this.close(); } }

  onOpen() {
    this.titleEl.setText(this.title);
    for (const r of this.rows) this.row(r);
    this.button = this.contentEl.createDiv("modal-button-container").createEl("button", { cls: "mod-cta", text: this.submit });
    this.button.onclick = () => this.send();
    this.update();
    this.scope.register([], "Enter", e => { e.preventDefault(); this.send(); });
    this.contentEl.querySelector<HTMLInputElement>("input:not([type=checkbox])")?.focus();
  }
  onClose() { this.resolve(this.done ? this.values : null); }

  private row(r: Row) {
    const vals = this.values;
    const item = this.contentEl.createDiv("setting-item");
    const info = item.createDiv({ cls: "setting-item-info", attr: { style: "flex-shrink: 0" } });
    info.createDiv({ cls: "setting-item-name", text: r.name });
    if ("check" in r) info.createDiv({ cls: "setting-item-description", text: r.check });
    const ctl = item.createDiv({ cls: "setting-item-control", attr: { style: "flex-wrap: wrap" } });
    if ("options" in r) {
      const buttons = r.options.map(({ label, value, img }) => {
        const b = ctl.createEl("button", { text: img ? "" : label, attr: { title: label } });
        if (img) b.createEl("img", { attr: { src: this.app.vault.getResourcePath(img), style: "height: 24px" } });
        b.toggleClass("mod-cta", value === vals[r.key]);
        b.onclick = () => { vals[r.key] = value; buttons.forEach(x => x.toggleClass("mod-cta", x === b)); this.update(); };
        return b;
      });
    } else if ("check" in r) {
      const box = ctl.createEl("input", { type: "checkbox" });
      box.checked = !!vals[r.key];
      box.onchange = () => { vals[r.key] = box.checked; };
    } else {
      const input = ctl.createEl("input", { type: r.number ? "number" : "text", attr: { placeholder: r.text } });
      input.value = vals[r.key] ?? "";
      input.oninput = () => { vals[r.key] = r.number ? (input.value === "" ? null : Number(input.value)) : input.value.trim(); this.update(); };
    }
  }
}
