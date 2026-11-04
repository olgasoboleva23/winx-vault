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
  register(fn) { this._cleanups.push(fn); }
  registerEvent(ref) { this._cleanups.push(() => ref?.off?.()); }
  registerDomEvent(el, type, fn) { el.addEventListener?.(type, fn); this._cleanups.push(() => el.removeEventListener?.(type, fn)); }
  registerInterval(id) { this._cleanups.push(() => clearInterval(id)); return id; }
}
export class MarkdownRenderChild extends Component { constructor(el) { super(); this.containerEl = el; } }
export const debounce = fn => Object.assign(fn, { cancel() {} });
export const sanitizeHTMLToDom = html => html;
export class Notice { constructor(text) { Notice.last = text; } }
export const Platform = { isMobile: false };
export const Keymap = { isModEvent: () => false };
export class Modal { constructor(app) { this.app = app; } open() {} close() {} }
export class SuggestModal extends Modal { setPlaceholder() {} }
