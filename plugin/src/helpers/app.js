// Obsidian's app, set once by the plugin (main.ts onload): modules without a component of their own
// (files.js, plugins.js, sounds.js, the task window…) take it from here instead of the global
// window.app.
/** @type {import("obsidian").App} */
export let app = /** @type {any} */ (null);   // set before any use

export const setApp = a => { app = a; };
