// The few parts of Obsidian's API that modules under test import (npm test maps "obsidian" here: hooks.mjs)
// Component: its children and what's registered on it, all let go on unload (like Obsidian's)
export class Component {
  _children = []; _cleanups = []; _loaded = false;
  load() { this._loaded = true; this.onload?.(); this._children.forEach(c => c.load()); }
  unload() {
    this._children.forEach(c => c.unload()); this._cleanups.splice(0).forEach(f => f()); this._loaded = false;
    this.onunload?.();
  }
  addChild(c) { this._children.push(c); if (this._loaded) c.load(); return c; }
  removeChild(c) { this._children = this._children.filter(x => x !== c); c.unload(); return c; }
  register(fn) { this._cleanups.push(fn); }
  registerEvent(ref) { this._cleanups.push(() => ref?.off?.()); }
  registerDomEvent(el, type, fn) { el.addEventListener?.(type, fn); this._cleanups.push(() => el.removeEventListener?.(type, fn)); }
  registerInterval(id) { this._cleanups.push(() => clearInterval(id)); return id; }
}
export class MarkdownRenderChild extends Component { constructor(el) { super(); this.containerEl = el; } }
// rendering markdown: the dashboard layout's date slot only (its ```winx blocks aren't drawn here)
// `calls`: what it was asked to draw, [md, sourcePath, the component it draws under]
export const MarkdownRenderer = {
  calls: [],
  render: async (app, md, el, path, child) => {
    MarkdownRenderer.calls.push([md, path, child]);
    el.innerHTML = md.includes("winx-dash__date") ? '<div class="winx-dash__date"></div>' : "";
  },
};
// where a note's text starts after its properties
export const getFrontMatterInfo = text => {
  const end = text.startsWith("---\n") ? text.indexOf("\n---\n", 3) : -1;
  return { contentStart: end < 0 ? 0 : end + 5 };
};
export const debounce = fn => Object.assign(fn, { cancel() {} });
export class Notice { constructor(text) { Notice.last = text; } }
export const Platform = { isMobile: false };
export const Keymap = { isModEvent: e => !!e?.mod };
// fuzzy: the letters of the query in order
export const prepareFuzzySearch = q => text => {
  let i = 0;
  for (const c of text.toLowerCase()) if (c === q.toLowerCase()[i]) i++;
  return i === q.length ? { score: 0, matches: [] } : null;
};
// a tooltip: its text as aria-label, its classes noted
export const setTooltip = (el, text, o = {}) => { el.setAttribute("aria-label", text); if (o.classes) el.dataset.tip = o.classes.join(" "); };
export class Modal { constructor(app) { this.app = app; } open() {} close() {} }
export class SuggestModal extends Modal { setPlaceholder() {} }
// a tab: its leaf's app, its content element; the layout's state saved by Obsidian (setState: nothing here)
export class ItemView extends Component {
  constructor(leaf) { super(); this.leaf = leaf; this.app = leaf?.app; this.contentEl = globalThis.document?.createElement("div"); }
  async setState() {}
}
export class WorkspaceLeaf {}
// a context menu: its items ({ title, checked, click }) kept; the last one shown is Menu.last
export class Menu {
  items = [];
  addItem(fn) {
    const item = {};
    Object.assign(item, {
      setTitle: t => { item.title = t; return item; }, setIcon: () => item,
      setChecked: c => { item.checked = c; return item; }, onClick: f => { item.click = f; return item; },
    });
    fn(item); this.items.push(item); return this;
  }
  showAtMouseEvent() { Menu.last = this; }
}
