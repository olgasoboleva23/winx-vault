import { Component, Modal, type App, type TFile } from "obsidian";
import { h, ref } from "vue";
import WinxTabs from "#/components/uikit/WinxTabs/index.vue";
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
// to the values on the button (or Enter), null when closed. Its look: index.scss (block winx-form).
type Tab = { tab?: string };
type Choice = { label: string; value: unknown; img?: TFile };

export type Row = Tab & (
  | { name: string; key: string; options: Choice[] | ((values: Values) => Choice[]) }
  | { name: string; key: string; text: string; number?: boolean; lines?: boolean; color?: boolean }
  | { name: string; key: string; check: string }
  | { name: string; key: string; label: true }
  | { name: string; key: string; list: Row[]; required?: string[]; fixed?: boolean });

export type Values = Record<string, any>;
type Options = { values?: Values; required?: string[]; submit?: string };

export class Form extends Modal {
  private title: string;
  private rows: Row[];
  private values: Values;
  private required: string[];
  private submit: string;
  private done = false;
  private refreshChoices: (() => void)[] = [];
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
  private update() {
    this.refreshChoices.forEach(refresh => refresh());
    this.button.disabled = !this.ready;
  }
  private send()      { if (this.ready) { this.done = true; this.close(); } }

  onOpen() {
    this.titleEl.setText(this.title);
    this.contentEl.addClass("winx-form");
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
  onClose() {
    this.refreshChoices = [];
    this.owner.unload();
    this.resolve(this.done ? this.values : null);
  }

  private row(r: Row, vals: Values, parent: HTMLElement) {
    if ("list" in r) return this.list(r, vals, parent);
    const item = parent.createDiv("setting-item");
    // a long name wraps (the field stays in the window), but many buttons never squeeze it
    const info = item.createDiv("setting-item-info winx-form__info");
    info.createDiv({ cls: "setting-item-name", text: r.name });
    if ("check" in r) info.createDiv({ cls: "setting-item-description", text: r.check });
    const ctl = item.createDiv("setting-item-control winx-form__control");

    this.control(r, vals, ctl);
  }

  // a row's own control (buttons, a checkbox, a text box) in `ctl`
  private control(r: Exclude<Row, { list: Row[] }>, vals: Values, ctl: HTMLElement) {
    if ("options" in r) {
      const draw = () => {
        ctl.empty();
        const options = typeof r.options === "function" ? r.options(vals) : r.options;
        const buttons = options.map(({ label, value, img }) => {
          const b = ctl.createEl("button", { text: img ? "" : label, attr: { title: label } });

          if (img) {
            const src = this.app.vault.getResourcePath(img);

            b.createEl("img", { cls: "winx-form__img", attr: { src } });
          }

          b.toggleClass("mod-cta", value === vals[r.key]);
          b.onclick = () => {
            vals[r.key] = value;
            buttons.forEach(x => x.toggleClass("mod-cta", x === b));
            this.update();
          };

          return b;
        });
      };

      draw();
      if (typeof r.options === "function") this.refreshChoices.push(draw);
    } else if ("label" in r) {
      ctl.createSpan({ cls: "winx-form__label", text: vals[r.key] ?? "" });
    } else if ("check" in r) {
      const box = ctl.createEl("input", { type: "checkbox" });
      box.checked = !!vals[r.key];
      box.onchange = () => { vals[r.key] = box.checked; };
    } else if (r.lines) {
      const attr = { placeholder: r.text, rows: 4 };
      const area = ctl.createEl("textarea", { cls: "winx-form__textarea", attr });

      area.value = vals[r.key] ?? "";
      area.oninput = () => { vals[r.key] = area.value; this.update(); };
    } else {
      const input = ctl.createEl("input", {
        type: r.number ? "number" : r.color ? "color" : "text", attr: { placeholder: r.text },
        cls: r.color ? "" : "winx-form__input",   // fills a list's cell (a colour: its own size)
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

  // the groups of a list row, each its rows and a ×, then a + for one more (fixed: neither). Rows
  // of text boxes, checkboxes and labels only: one grid, a line of the rows' names (a checkbox's
  // description as its name's tooltip), then a line a group; a text box's column shares the width,
  // the others fit what's in them, so the names stand over their fields. Other rows: the groups
  // stacked, each its own rows. A list named as its tab has no heading of its own
  private list(r: Extract<Row, { list: Row[] }>, vals: Values, parent: HTMLElement) {
    const groups: Values[] = (vals[r.key] ??= []);
    const line = r.list.every(s => ("text" in s && !s.lines) || "check" in s || "label" in s);
    const narrow = (s: Row) => "check" in s || ("color" in s && !!s.color);
    const wide = (s: Row) => "text" in s && !s.color;
    const cell = (on: HTMLElement, small: boolean) =>
      on.createDiv(small ? "winx-form__cell winx-form__cell--narrow" : "winx-form__cell");

    if (r.name !== r.tab) {
      parent.createDiv("setting-item").createDiv({ cls: "setting-item-info" })
        .createDiv({ cls: "setting-item-name", text: r.name });
    }

    const box = parent.createDiv(`winx-form__list${line ? " winx-form__list--lines" : ""}`);
    const cols = r.list.map(s => wide(s) ? "minmax(0, 1fr)" : "auto").concat(r.fixed ? [] : "auto");

    if (line) box.setCssProps({ "--winx-form-cols": cols.join(" ") });
    const draw = () => {
      box.empty();
      if (line && groups.length) {
        const head = box.createDiv("winx-form__line winx-form__line--head");

        for (const sub of r.list) {
          const name = cell(head, narrow(sub));

          name.setText(sub.name);
          if ("check" in sub) name.setAttr("title", sub.check);
        }

        if (!r.fixed) cell(head, true);
      }

      for (const g of groups) {
        const group = box.createDiv(line ? "winx-form__line" : "winx-form__group");

        for (const sub of r.list) {
          if (line) this.control(sub as Exclude<Row, { list: Row[] }>, g, cell(group, narrow(sub)));
          else this.row(sub, g, group);
        }

        if (r.fixed) continue;
        const off = (line ? cell(group, true) : group)
          .createEl("button", { text: "×", attr: { title: "Remove" } });

        off.onclick = () => { groups.splice(groups.indexOf(g), 1); draw(); this.update(); };
      }
    };

    if (!r.fixed) {
      const add = parent.createDiv("winx-form__more")
        .createEl("button", { text: "+", attr: { title: "One more" } });

      add.onclick = () => { groups.push({}); draw(); this.update(); };

      if (!groups.length) groups.push({});
    }

    draw();
  }
}
