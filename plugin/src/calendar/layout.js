// The calendar's parts in their order (the keys of `parts`) under one root: mount() puts them all, redraw(name)
// one in its place, the others kept. A part's render() may give several top elements (toNodes: markup → them).
import { sanitizeHTMLToDom } from "obsidian";

export class PartsLayout {
  constructor(parts, toNodes = html => [...sanitizeHTMLToDom(html).children]) {
    Object.assign(this, { parts, toNodes, els: new Map(), root: null });
  }
  mount(root) {
    this.root = root; this.els.clear();
    for (const name of Object.keys(this.parts)) this.place(name, null);
  }
  redraw(name) {
    const order = Object.keys(this.parts);
    const next = order.slice(order.indexOf(name) + 1).map(q => this.els.get(q)?.[0]).find(Boolean) ?? null;   // what follows it
    this.els.get(name)?.forEach(e => e.remove());
    this.place(name, next);
  }
  // a part's markup before `next` (or at the end)
  place(name, next) {
    const made = this.toNodes(this.parts[name].render().html);
    for (const e of made) this.root.insertBefore(e, next);
    this.els.set(name, made);
  }
}
