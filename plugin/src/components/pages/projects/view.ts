import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { reactive, ref, watch } from "vue";
import { useRedraw } from "#/composables/use.js";
import { useVueApp } from "#/composables/vueApp.ts";
import { taskStore } from "#/store/tasks.js";
import { PROJECTS_VIEW, SAVED, readState } from "#/store/projects.js";
import ProjectsTab from "./index.vue";

// The Projects tab: the list of projects (00 System/Data/Projects/projects.json) or one project's
// page, drawn by Vue (index.vue and its parts). Its state (the open project, the list's filter) is
// reactive and saved with the layout, as the calendar's is. The parts read the store's projects
// and tasks; `version` is bumped when they change (a hidden tab waits until it shows).
export { PROJECTS_VIEW };

export class ProjectsView extends ItemView {
  state = reactive(readState(undefined));
  version = ref(0);
  private unmount = () => {};   // the tab's Vue app (useVueApp), gone on close
  private catchUp = () => {};   // a hidden tab that missed changes, drawn when it shows

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
    ({ unmount: this.unmount } = useVueApp(this, this.contentEl.createDiv(), ProjectsTab, {
      provide: { projects: this },
      onError: e => {
        console.error(e);
        new Notice(`Projects: couldn't draw: ${e.message}`);
      },
    }));
    const { redraw, catchUp } = useRedraw(
      this, () => this.contentEl.isShown(), () => { this.version.value++; },
    );
    this.catchUp = catchUp;
    this.register(watch(taskStore.version, redraw));
  }
  onResize() { this.catchUp(); }
  async onClose() { this.unmount(); this.contentEl.empty(); }
}
