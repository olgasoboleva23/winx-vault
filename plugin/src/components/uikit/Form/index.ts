import { Component, Modal, type App, type TFile } from "obsidian";
import { h, ref } from "vue";
import WinxTabs from "#/components/uikit/WinxTabs/index.vue";
import { useVueApp } from "#/composables/vueApp.ts";

// One window of fields instead of a chain of prompts. Each row is
//   { name, key, options: [{ label, value, img? }] }  buttons, the chosen one lit (mod-cta)
//   { name, key, text: placeholder, number?, lines?, color? }   a text box (lines: several lines
//                                                   of text; color: the colour picker, "#rrggbb")
//   { name, key, check: description }               a checkbox
//   { name, key, list: rows, required? }            groups of those rows, + adds one, × takes it
//                                                   off; the value: an array of the groups' values.
//                                                   Rows of text boxes and checkboxes only: a group
//                                                   is one line under the rows' names
// Any row can have `tab`: the window then shows its tabs (WinxTabs) and one tab's rows at a time.
// `values` has the starting ones; the keys in `required` must be set before the button works (it's
// greyed out; a list: one group at least, each with its own required keys). Form.ask(...) resolves
// to the values on the button (or Enter), null when closed.
type Tab = { tab?: string };

export type Row = Tab & (
  | { name: string; key: string; options: { label: string; value: unknown; img?: TFile }[] }
  | { name: string; key: string; text: string; number?: boolean; lines?: boolean; color?: boolean }
  | { name: string; key: string; check: string }
  | { name: string; key: string; list: Row[]; required?: string[] });

export type Values = Record<string, any>;
type Options = { values?: Values; required?: string[]; submit?: string };

export class Form extends Modal {
  private title: string;
  private rows: Row[];
  private values: Values;
  private required: string[];
  private submit: string;
  private done = false;
  private button!: HTMLButtonElement;
  private resolve: (v: Values | null) => void = () => {};
  private owner = new Component();   // the tabs' Vue app unmounts with the window

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

  private get ready() {
    const set = (v: unknown) => ![null, undefined, ""].includes(v as any);
    const ok = (r: Row | undefined, v: unknown) => r && "list" in r
      ? Array.isArray(v) && v.length > 0
        && v.every(g => (r.required ?? []).every(k => set(g[k])))
      : set(v);

    return this.required.every(k => ok(this.rows.find(r => r.key === k), this.values[k]));
  }
  private update()    { this.button.disabled = !this.ready; }
  private send()      { if (this.ready) { this.done = true; this.close(); } }

  onOpen() {
    this.titleEl.setText(this.title);
    this.owner.load();
    const tabs = [...new Set(this.rows.map(r => r.tab).filter(Boolean))] as string[];
    const head = tabs.length ? this.contentEl.createDiv() : null;
    const panes = new Map(tabs.map(t => [t, this.contentEl.createDiv()]));

    for (const r of this.rows) this.row(r, this.values, panes.get(r.tab ?? "") ?? this.contentEl);
    if (head) {
      const picked = ref(tabs[0]);
      const show = () => panes.forEach((pane, t) => { pane.toggle(t === picked.value); });
      const tabsOf = () => tabs.map(t => ({ key: t, text: t }));
      const pick = (t: string) => { picked.value = t; show(); };

      useVueApp(this.owner, head, {
        render: () =>
          h(WinxTabs, { tabs: tabsOf(), modelValue: picked.value, "onUpdate:modelValue": pick }),
      });
      show();
    }

    this.button = this.contentEl.createDiv("modal-button-container")
      .createEl("button", { cls: "mod-cta", text: this.submit });
    this.button.onclick = () => this.send();
    this.update();
    this.scope.register([], "Enter", e => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;   // a new line there
      e.preventDefault();
      this.send();
    });
    this.contentEl.querySelector<HTMLInputElement>("input:not([type=checkbox])")?.focus();
  }
  onClose() { this.owner.unload(); this.resolve(this.done ? this.values : null); }

  private row(r: Row, vals: Values, parent: HTMLElement) {
    if ("list" in r) return this.list(r, vals, parent);
    const item = parent.createDiv("setting-item");
    // a long name wraps (the field stays in the window), but many buttons never squeeze it
    const info = item.createDiv({ cls: "setting-item-info", attr: { style: "min-width: 8em" } });
    info.createDiv({ cls: "setting-item-name", text: r.name });
    if ("check" in r) info.createDiv({ cls: "setting-item-description", text: r.check });
    const ctl = item.createDiv({ cls: "setting-item-control", attr: { style: "flex-wrap: wrap" } });

    this.control(r, vals, ctl);
  }

  // a row's own control (buttons, a checkbox, a text box) in `ctl`
  private control(r: Exclude<Row, { list: Row[] }>, vals: Values, ctl: HTMLElement) {
    if ("options" in r) {
      const buttons = r.options.map(({ label, value, img }) => {
        const b = ctl.createEl("button", { text: img ? "" : label, attr: { title: label } });

        if (img) {
          const src = this.app.vault.getResourcePath(img);

          b.createEl("img", { attr: { src, style: "height: 24px" } });
        }

        b.toggleClass("mod-cta", value === vals[r.key]);
        b.onclick = () => {
          vals[r.key] = value;
          buttons.forEach(x => x.toggleClass("mod-cta", x === b));
          this.update();
        };

        return b;
      });
    } else if ("check" in r) {
      const box = ctl.createEl("input", { type: "checkbox" });
      box.checked = !!vals[r.key];
      box.onchange = () => { vals[r.key] = box.checked; };
    } else if (r.lines) {
      const attr = { placeholder: r.text, rows: 4, style: "width: 100%" };
      const area = ctl.createEl("textarea", { attr });

      area.value = vals[r.key] ?? "";
      area.oninput = () => { vals[r.key] = area.value; this.update(); };
    } else {
      const input = ctl.createEl("input", {
        type: r.number ? "number" : r.color ? "color" : "text", attr: { placeholder: r.text },
      });
      input.value = vals[r.key] ?? "";
      input.oninput = () => {
        vals[r.key] = !r.number ? input.value.trim()
          : input.value === "" ? null
          : Number(input.value);
        this.update();
      };
    }
  }

  // the groups of a list row, each its rows and a ×, then a + for one more. Rows of text boxes and
  // checkboxes only: one line a group, in columns under the rows' names (a checkbox's description
  // as its name's tooltip)
  private list(r: Extract<Row, { list: Row[] }>, vals: Values, parent: HTMLElement) {
    const groups: Values[] = (vals[r.key] ??= []);
    const item = parent.createDiv("setting-item");
    const line = r.list.every(s => ("text" in s && !s.lines) || "check" in s);
    const narrow = (s: Row) => "check" in s || ("color" in s && s.color);
    const cols = `${r.list.map(s => narrow(s) ? "auto" : "minmax(0, 1fr)").join(" ")} auto`;
    const grid = `display: grid; grid-template-columns: ${cols}; gap: 0.4em; align-items: center`;

    item.createDiv({ cls: "setting-item-info" })
      .createDiv({ cls: "setting-item-name", text: r.name });
    const box = parent.createDiv({ attr: { style: `margin-left: 1em${line ? `; ${grid}` : ""}` } });
    const more = parent.createDiv({ attr: { style: "margin: 0.4em 0 0 1em" } });
    const draw = () => {
      box.empty();
      if (line && groups.length) {
        for (const sub of r.list) {
          const tip = "check" in sub ? sub.check : "";
          const style = "font-size: var(--font-ui-smaller); color: var(--text-muted)";

          box.createDiv({ text: sub.name, attr: { title: tip, style } });
        }

        box.createDiv();
      }

      for (const g of groups) {
        const style = "border-left: 2px solid var(--background-modifier-border); padding-left: 1em";
        const group = line ? box : box.createDiv({ attr: { style } });

        for (const sub of r.list) {
          if (!line) { this.row(sub, g, group); continue; }

          const cell = box.createDiv();

          this.control(sub as Exclude<Row, { list: Row[] }>, g, cell);
          cell.querySelector("input:not([type=checkbox]):not([type=color])")
            ?.setAttr("style", "width: 100%");
        }

        const off = group.createEl("button", { text: "×", attr: { title: "Remove" } });

        off.onclick = () => { groups.splice(groups.indexOf(g), 1); draw(); this.update(); };
      }
    };

    const add = more.createEl("button", { text: "+", attr: { title: "One more" } });

    add.onclick = () => { groups.push({}); draw(); this.update(); };

    if (!groups.length) groups.push({});
    draw();
  }
}
