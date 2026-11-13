// One Vue app per Obsidian tab or Markdown block; unmounted with its owner.
import { Component } from "obsidian";
import { app as obsidian } from "#/helpers/app.js";
import { createApp, onScopeDispose, type Component as VueComponent } from "vue";

interface Options {
  props?: Record<string, unknown>;
  provide?: Record<string, unknown>;   // what the components inject
  onError?: (error: Error) => void;
}

interface Mounted { unmount: () => void; instance: any }

export function useVueApp(
  owner: Component, el: HTMLElement, root: VueComponent,
  { props = {}, provide = {}, onError = e => console.error(e) }: Options = {},
): Mounted {
  const app = createApp(root, props);

  for (const [key, value] of Object.entries(provide)) app.provide(key, value);
  app.config.errorHandler = error => onError(error as Error);
  const instance = app.mount(el);

  let mounted = true;
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    app.unmount();
  };

  owner.register(unmount);
  return { unmount, instance };
}

// Existing Obsidian event helpers can be used inside Vue without a class for every page.
export function useObsidian() {
  const owner = Object.assign(new Component(), { app: obsidian });

  owner.load();
  onScopeDispose(() => owner.unload());
  return owner;
}
