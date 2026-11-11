import { SuggestModal, type App } from "obsidian";

// A search window over a list: type to narrow it, pick one with a tap or Enter.
// find(query) gives the rows, render(item, el) draws one. Search.pick(...) resolves to the picked
// item, null when closed. Search.pickGrouped(...): rows by group (a header over each group's first
// row), each its name and a note on the right; a typed new one ("+ new: …") has neither.
// a grouped search's row: a found item, or the typed name as a new one
type Choice = { name: string; isNew?: boolean; header?: boolean; [key: string]: any };

export class Search<T> extends SuggestModal<T> {
  private resolve: (v: T | null) => void = () => {};
  private find: (query: string) => T[];
  private render: (item: T, el: HTMLElement) => void;

  // plain fields, not constructor parameter properties: node's tests run .ts by only stripping its
  // types
  constructor(
    app: App, placeholder: string,
    find: (query: string) => T[], render: (item: T, el: HTMLElement) => void,
  ) {
    super(app);
    this.find = find;
    this.render = render;
    this.setPlaceholder(placeholder);
  }
  static pick<T>(
    app: App, placeholder: string,
    find: (query: string) => T[], render: (item: T, el: HTMLElement) => void,
  ): Promise<T | null> {
    const s = new Search(app, placeholder, find, render);

    return new Promise(resolve => { s.resolve = resolve; s.open(); });
  }
  static pickGrouped(
    app: App, placeholder: string, find: (query: string) => Choice[],
    { groupOf, label, note }: {
      groupOf: (c: Choice) => unknown; label: (group: unknown) => string;
      note: (c: Choice) => string;
    },
  ): Promise<Choice | null> {
    const rows = (q: string) => find(q).map((c, i, all) =>
      ({ ...c, header: !c.isNew && (i === 0 || groupOf(c) !== groupOf(all[i - 1])) }));

    return Search.pick(app, placeholder, rows, (c, el) => {
      if (c.header) el.createDiv({ cls: "winx-search__group", text: label(groupOf(c)) });
      const row = el.createDiv({ cls: "winx-search__row winx-row winx-between winx-gap-l" });

      row.createSpan({ text: c.isNew ? `+ new: ${c.name}` : c.name });
      row.createSpan({ cls: "winx-search__note winx-nowrap", text: c.isNew ? "" : note(c) });
    });
  }

  getSuggestions(query: string) { return this.find(query); }
  renderSuggestion(item: T, el: HTMLElement) { this.render(item, el); }
  onChooseSuggestion(item: T) { this.resolve(item); }
  // Obsidian closes the window before it reports the pick: wait a tick, so a pick isn't lost to the
  // null
  onClose() { window.setTimeout(() => this.resolve(null)); }
}
