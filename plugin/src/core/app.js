// Obsidian's app, set once by the plugin (main.ts onload): modules without a component of their own
// (files.js, plugins.js, sounds.js, the task window…) take it from here instead of the global
// window.app.
export let app = null;

export const setApp = a => { app = a; };
