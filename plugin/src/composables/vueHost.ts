// Only Markdown code blocks need their own Vue app. SPA pages render Widget directly.
import { MarkdownRenderChild } from "obsidian";
import { useVueApp } from "./vueApp.ts";
import Widget from "#/components/WinxWidget.vue";

export class VueHost extends MarkdownRenderChild {
  private mounted: ReturnType<typeof useVueApp> | null = null;
  private view: any;
  private opts: any;
  constructor(el: HTMLElement, view: any, opts: any) {
    super(el);
    this.view = view;
    this.opts = opts;
  }
  get state() { return this.mounted?.instance.state; }
  refresh() { return this.mounted?.instance.refresh(); }
  onload() {
    this.mounted = useVueApp(this, this.containerEl, Widget, {
      props: { definition: { view: this.view, ...this.opts } },
    });
  }
}
