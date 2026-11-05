// A Vue app owned by an Obsidian component (a widget's VueHost, the calendar tab, the dashboard's
// page): mounted on `el` now, unmounted when the owner unloads (or by the unmount() given back,
// once). Every error inside the app — a component's setup, a hook, a watcher, an async one too (a
// chart that fails to draw) — goes to onError, so its owner can say so (a widget's "couldn't draw"
// with retry).
import type { Component } from "obsidian";
import { createApp, type Component as VueComponent } from "vue";

interface Options {
  provide?: Record<string, unknown>;   // what the components inject
  onError?: (error: Error) => void;
}

interface Mounted { unmount: () => void }

export function useVueApp(
  owner: Component, el: HTMLElement, root: VueComponent,
  { provide = {}, onError = e => console.error(e) }: Options = {},
): Mounted {
  const app = createApp(root);

  for (const [key, value] of Object.entries(provide)) app.provide(key, value);
  app.config.errorHandler = error => onError(error as Error);
  app.mount(el);

  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
  };

  owner.register(unmount);
  return { unmount };
}
