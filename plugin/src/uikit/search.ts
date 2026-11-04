import { SuggestModal, type App } from "obsidian";

// A search window over a list: type to narrow it, pick one with a tap or Enter.
// find(query) gives the rows, render(item, el) draws one. Search.pick(...) resolves to the picked item, null when
// closed.
export class Search<T> extends SuggestModal<T> {
  private resolve: (v: T | null) => void = () => {};
  private find: (query: string) => T[];
  private render: (item: T, el: HTMLElement) => void;

  // plain fields, not constructor parameter properties: node's tests run .ts by only stripping its types
  constructor(app: App, placeholder: string, find: (query: string) => T[], render: (item: T, el: HTMLElement) => void) {
    super(app);
    this.find = find;
    this.render = render;
    this.setPlaceholder(placeholder);
  }
  static pick<T>(
    app: App, placeholder: string, find: (query: string) => T[], render: (item: T, el: HTMLElement) => void,
  ): Promise<T | null> {
    const s = new Search(app, placeholder, find, render);
    return new Promise(resolve => { s.resolve = resolve; s.open(); });
  }

  getSuggestions(query: string) { return this.find(query); }
  renderSuggestion(item: T, el: HTMLElement) { this.render(item, el); }
  onChooseSuggestion(item: T) { this.resolve(item); }
  // Obsidian closes the window before it reports the pick: wait a tick, so a pick isn't lost to the null
  onClose() { window.setTimeout(() => this.resolve(null)); }
}
