import { Component, Notice } from "obsidian";
import { ref, watch } from "vue";
import { useRedraw } from "#/composables/use.js";
import { app } from "#/helpers/app.js";
import { useVueApp } from "#/composables/vueApp.ts";
import { taskStore } from "#/store/tasks.js";
import { readState } from "#/store/projects.js";
import ProjectsTab from "./index.vue";

// The Projects page of the Winx tab: the list of projects (00 System/Data/Projects/projects.json)
// or one project's page, drawn by Vue (index.vue and its parts). Its state (the open project, the
// list's filter) is the tab's, saved with the layout. The parts read the store's projects and
// tasks; `version` is bumped when they change (a hidden page waits until it shows).
type ProjectsState = ReturnType<typeof readState>;
type Open = (key: string | null, e?: MouseEvent) => void;

// The projects themselves: their Vue app on `el`, their redraws. The tab around them (or any
// owner) gives the state and adds the page as a child, so it all goes when the owner does.
// `open` shows a project (null: the list); by default it sets the state's open key.
export class ProjectsPage extends Component {
  app = app;   // for the composables (useRedraw: the workspace's events)
  version = ref(0);
  state: ProjectsState;
  open: Open;
  private el: HTMLElement;
  private redraws: ReturnType<typeof useRedraw> | null = null;

  constructor(state: ProjectsState, el: HTMLElement, open?: Open) {
    super();
    this.state = state;
    this.el = el;
    this.open = open ?? (key => { this.state.open = key; });
  }

  onload() {
    useVueApp(this, this.el, ProjectsTab, {
      provide: { projects: this },
      onError: e => {
        console.error(e);
        new Notice(`Projects: couldn't draw: ${e.message}`);
      },
    });
    this.redraws = useRedraw(this, () => this.el.isShown(), () => { this.version.value++; });
    this.register(watch(taskStore.version, this.redraws.redraw));
  }

  // a hidden page that missed changes, drawn when it shows
  catchUp() { this.redraws?.catchUp(); }
}
