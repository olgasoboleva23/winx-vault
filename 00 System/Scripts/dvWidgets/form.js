// One window of fields instead of a chain of prompts (QuickAdd's own ask one thing at a time). Each row is
//   { name, key, options: [{ label, value, img? }] }  a row of buttons, the chosen one highlighted (mod-cta)
//   { name, key, text: placeholder, number? }       a text box
//   { name, key, check: description }               a checkbox
// `values` has the starting ones; the keys in `required` must be set before the button works (it's greyed out).
// Load it like the Task class and ask; resolves to the values on the button (or Enter), null when closed:
//   const Form = (app.__winxForm ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/form.js")));
//   const v = await Form.ask("✦ Buy reward", [{ name: "Name", key: "name", text: "what" }], { required: ["name"] });
(() => {
// Obsidian's Modal (Dataview code can't import "obsidian"): the root of the settings window's classes; the ones
// between can open as a separate window
let Modal = app.setting.constructor;
while (Object.getPrototypeOf(Modal).prototype?.open) Modal = Object.getPrototypeOf(Modal);

class Form extends Modal {
  constructor(title, rows, { values = {}, required = [], submit = "Next →" } = {}) {
    super(app);
    Object.assign(this, { title, rows, required, submit, values: { ...values }, done: false });
  }
  static ask(...args) { return new Form(...args).result(); }

  // opens the window; the values once submitted, null when closed
  result() {
    return new Promise(resolve => { this.resolve = resolve; this.open(); });
  }
  get ready() { return this.required.every(k => ![null, undefined, ""].includes(this.values[k])); }
  update()    { this.button.disabled = !this.ready; }
  send()      { if (this.ready) { this.done = true; this.close(); } }

  onOpen() {
    this.titleEl.setText(this.title);
    for (const r of this.rows) this.row(r);
    this.button = this.contentEl.createDiv("modal-button-container").createEl("button", { cls: "mod-cta", text: this.submit });
    this.button.onclick = () => this.send();
    this.update();
    this.scope.register([], "Enter", e => { e.preventDefault(); this.send(); });
    this.contentEl.querySelector("input:not([type=checkbox])")?.focus();
  }
  onClose() { this.resolve?.(this.done ? this.values : null); }

  row(r) {
    const vals = this.values;
    const item = this.contentEl.createDiv("setting-item");
    const info = item.createDiv({ cls: "setting-item-info", attr: { style: "flex-shrink: 0" } });
    info.createDiv({ cls: "setting-item-name", text: r.name });
    if (r.check) info.createDiv({ cls: "setting-item-description", text: r.check });
    const ctl = item.createDiv({ cls: "setting-item-control", attr: { style: "flex-wrap: wrap" } });
    if (r.options) {
      const buttons = r.options.map(({ label, value, img }) => {
        const b = ctl.createEl("button", { text: img ? "" : label, attr: { title: label } });
        if (img) b.createEl("img", { attr: { src: app.vault.getResourcePath(img), style: "height: 24px" } });
        b.toggleClass("mod-cta", value === vals[r.key]);
        b.onclick = () => { vals[r.key] = value; buttons.forEach(x => x.toggleClass("mod-cta", x === b)); this.update(); };
        return b;
      });
    } else if (r.check) {
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
return Form;
})()
