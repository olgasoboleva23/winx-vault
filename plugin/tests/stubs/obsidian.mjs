// The few parts of Obsidian's API that modules under test import (npm test maps "obsidian" here: hooks.mjs)
export class MarkdownRenderChild { constructor(el) { this.containerEl = el; } register() {} registerEvent() {} registerDomEvent() {} }
export const debounce = fn => Object.assign(fn, { cancel() {} });
export const sanitizeHTMLToDom = html => html;
export class Notice { constructor(text) { Notice.last = text; } }
export const Platform = { isMobile: false };
