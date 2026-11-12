import { Component, ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { reactive, ref, watch } from "vue";
import { useRedraw } from "#/composables/use.js";
import { app } from "#/helpers/app.js";
import { useVueApp } from "#/composables/vueApp.ts";
import { taskStore } from "#/store/tasks.js";
import { PROJECTS_VIEW, SAVED, readState } from "#/store/projects.js";
import ProjectsTab from "./index.vue";

// The Projects tab: the list of projects (00 System/Data/Projects/projects.json) or one project's
// page, drawn by Vue (index.vue and its parts). Its state (the open project, the list's filter) is
// reactive and saved with the layout, as the calendar's is. The parts read the store's projects
// and tasks; `version` is bumped when they change (a hidden tab waits until it shows).
export { PROJECTS_VIEW };

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

export class ProjectsView extends ItemView {
  state = reactive(readState(undefined));
  private page: ProjectsPage | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    const saved = () => JSON.stringify(SAVED.map(k => (this.state as any)[k]));
    this.register(watch(saved, () => this.app.workspace.requestSaveLayout()));
  }
  getViewType() { return PROJECTS_VIEW; }
  getDisplayText() { return "Projects"; }
  getIcon() { return "folder-kanban"; }

  getState() { return Object.fromEntries(SAVED.map(k => [k, (this.state as any)[k]])); }
  async setState(saved: unknown, result: any) {
    Object.assign(this.state, readState(saved));
    await super.setState(saved, result);
  }

  async onOpen() {
    // a note in reading view, with the dashboard's photo and fonts, as the calendar
    this.contentEl.addClasses(
      ["markdown-preview-view", "markdown-rendered", "dashboard", "winx-projects-tab"],
    );
    this.page = this.addChild(new ProjectsPage(this.state, this.contentEl.createDiv()));
  }
  onResize() { this.page?.catchUp(); }
  async onClose() {
    if (this.page) this.removeChild(this.page);
    this.page = null;
    this.contentEl.empty();
  }
}
