import { ItemView, TAbstractFile, WorkspaceLeaf, sanitizeHTMLToDom } from "obsidian";
import { H } from "../lib/helpers.js";
import { actionOf } from "../widgets/parse.js";
import { T, collect, missed } from "./data.js";
import { baseDate, readState, shownDays } from "./state.js";
import { makeActions } from "./actions.js";
import { Grid, Header, Missed, Panel } from "./parts.js";

// The calendar tab: the week (7 day columns) or the month around a date, the tasks of 02 Areas/Personal/Tasks on
// their days, "Missed?" above, and the No date | Regulars | Pool panel below. Its state (date, view, tab, folds)
// is the tab's own: Obsidian saves it with the layout, so a pinned calendar comes back as it was.
// The parts are classes (parts.js): markup in html``, handlers by data-action. One set of listeners on the tab
// handles every click, tick, drag and swipe, and finds the task by the element's data-task key.
// Parts redraw on their own: a tab or a fold the panel; a date, the week/month or ✓ done everything, from
// fresh data; a change to the tasks (Dataview's index) everything too.
export const VIEW_TYPE = "winx-calendar";
const TASKS_DIR = "02 Areas/Personal/Tasks/";
const POOL = "02 Areas/Personal/Tasks/Pool.md";
type PartName = "header" | "missed" | "grid" | "panel";
const PARTS: PartName[] = ["header", "missed", "grid", "panel"];

export class CalendarView extends ItemView {
  private state = readState(undefined);
  private root!: HTMLElement;
  private els = new Map<PartName, Element[]>();
  private parts: Record<PartName, any> = { header: new Header(this), missed: new Missed(this), grid: new Grid(this), panel: new Panel(this) };
  ctx: any = null;
  actions: any = null;
  private stale = false;   // the tasks changed while the tab was hidden: redraw when it shows
  private dragged: any = null;
  private sounds = { move: new H.AudioEngine("00 System/Assets/winx music/snd_scroll_menu.wav"), gem: new H.AudioEngine("00 System/Assets/winx music/snd_pickup_gem01.wav") };

  constructor(leaf: WorkspaceLeaf) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Calendar"; }
  getIcon() { return "calendar-days"; }

  getState() { return { ...this.state }; }
  async setState(saved: unknown, result: any) {
    this.state = readState(saved);
    await super.setState(saved, result);
    if (this.root) this.draw();
  }

  async onOpen() {
    // a note in reading view (fonts, margins), with the dashboard pages' background and fonts on top
    this.contentEl.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard", "winx-cal-view"]);
    this.root = this.contentEl.createEl("div");
    this.listen();
    // a cold start: Dataview reads the vault only once the layout is ready, after this tab opens; draw when it has
    this.registerEvent((this.app.metadataCache as any).on("dataview:index-ready", () => this.draw()));
    this.draw();
    // a task file changed in Dataview's index: new data, every part (a hidden tab waits until it shows)
    let timer = 0;
    this.registerEvent((this.app.metadataCache as any).on("dataview:metadata-change", (_type: string, file: TAbstractFile) => {
      if (!file?.path?.startsWith(TASKS_DIR)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => this.contentEl.isShown() ? this.draw() : (this.stale = true), 100);
    }));
    // a write to a task file: the calendar dims with a spinning ✦ until the redraw; 5 s at most
    this.registerEvent(this.app.vault.on("modify", f => {
      if (!f.path.startsWith(TASKS_DIR)) return;
      this.ctx?.root.classList.add("busy");
      window.setTimeout(() => this.ctx?.root.classList.remove("busy"), 5000);
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.catchUp()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.catchUp()));   // a sidebar or split shown
    // a new day: following today, the days move on; and "today" in every action is the new one
    this.registerInterval(window.setInterval(() => {
      if (this.ctx && this.ctx.today !== H.today()) this.contentEl.isShown() ? this.draw() : (this.stale = true);
    }, 60_000));
  }
  onResize() { this.catchUp(); }
  // a hidden tab that missed changes, drawn when it shows
  private catchUp() { if (this.stale && this.contentEl.isShown()) this.draw(); }
  async onClose() { this.contentEl.empty(); this.ctx = null; }

  private dataview(): any { return (this.app as any).plugins.plugins.dataview?.api; }

  // what a component needs about a task; each task gets a key (data-task) in this draw's map
  info(t: any) {
    const ctx = this.ctx, known = ctx.infos.get(t);
    if (known) return known;
    const task = T(t), key = ctx.tasks.size, area = task.area;
    ctx.tasks.set(String(key), t);
    const i = {
      key, area: area?.slice(6) ?? null, difficulty: task.difficulty, text: task.text, pool: !!t.pool,
      label: `${ctx.config.areaIcons[area] ?? ""} ${task.text}`.trim(),
      stickers: task.stickers.map((name: string) => this.app.metadataCache.getFirstLinkpathDest(name, t.path)).filter(Boolean).map((f: any) => this.app.vault.getResourcePath(f)),
      canSkip: this.actions.canSkip(t),
    };
    ctx.infos.set(t, i);
    return i;
  }
  taskOf(el: Element) { return this.ctx.tasks.get((el.closest("[data-task]") as HTMLElement)?.dataset.task); }

  // the whole calendar, with fresh data
  private async draw() {
    this.stale = false;
    const dv = this.dataview();
    const say = (text: string) => { this.ctx = null; this.root.empty(); this.root.setText(text); };   // no calendar to redraw in place
    if (!dv) return say("✦ the calendar needs the Dataview plugin");
    if (!dv.index?.initialized) return say("✦ waiting for Dataview…");   // index-ready draws again
    const today = H.today(), days = shownDays(this.state, today);
    const tasks = dv.pages(`"${TASKS_DIR.slice(0, -1)}"`).file.tasks.array();
    const poolLines = (dv.page(POOL)?.file.lists.array() ?? []).filter((l: any) => !l.task);
    const config = await H.loadConfig();
    const old = this.ctx?.root;
    const root = createDiv({ cls: `winx-cal ${this.state.view}` });
    const ctx: any = this.ctx = {
      root, state: this.state, today, days, base: baseDate(this.state, today), view: this.state.view,
      shown: { open: true, ghost: true, done: this.state.showDone },
      model: collect({ tasks, poolLines, days, today }), missed: missed(tasks, today),
      config, TASKS: (this.app as any).plugins.plugins["obsidian-tasks-plugin"]?.apiV1,
      tasks: new Map(), infos: new Map(),
      unfolded: new Set(this.state.unfolded), shows: [], syncRepeats: () => {},
      saveUnfolded: () => { this.state.unfolded = [...ctx.unfolded]; this.app.workspace.requestSaveLayout(); },
      set: (patch: object, parts: PartName[]) => this.set(patch, parts),
    };
    this.actions = makeActions(ctx);
    this.els.clear();
    for (const p of PARTS) this.place(p, null);
    this.parts.header.mount(root);
    this.parts.grid.mount(root);
    old ? old.replaceWith(root) : (this.root.empty(), this.root.appendChild(root));   // first time: over "waiting…"
  }

  // a part's markup into the calendar, before `next` (or at the end)
  private place(p: PartName, next: Element | null) {
    const made = [...sanitizeHTMLToDom(this.parts[p].render().html).children];
    for (const e of made) this.ctx.root.insertBefore(e, next);
    this.els.set(p, made);
  }

  // a view change: the new state, saved with the layout, and only the parts it touches drawn again, in place.
  // The date, the week/month and ✓ done also change the days (and the data they need): those redraw from fresh data.
  private set(patch: object, parts: PartName[]) {
    Object.assign(this.state, patch);
    this.app.workspace.requestSaveLayout();
    if (parts.includes("grid")) return this.draw();
    for (const p of parts) {
      const next = PARTS.slice(PARTS.indexOf(p) + 1).map(q => this.els.get(q)?.[0]).find(Boolean) ?? null;   // what follows it
      this.els.get(p)?.forEach(e => e.remove());
      this.place(p, next);
    }
  }

  // ── the task's own buttons, the same in every part ──
  private ticks = new WeakMap<Element, number>();
  private taskOn: Record<string, (e: Event, el: HTMLElement) => any> = {
    difficulty: (e, el) => { e.stopPropagation(); this.difficultyPicker(el, this.taskOf(el)); },
    edit: (e, el) => this.actions.edit(this.taskOf(el)),
    skip: (e, el) => { const t = this.taskOf(el); el.closest("[data-task]")?.remove(); this.actions.skip(t); },
    // 🗑: the first click arms it for 3 s, the second removes the task's line (with undo)
    remove: async (e, el) => {
      if (!el.classList.contains("armed")) {
        el.classList.add("armed"); el.textContent = "✓?"; el.title = "click again to delete";
        window.setTimeout(() => { el.classList.remove("armed"); el.textContent = "🗑"; el.title = "delete task"; }, 3000);
        return;
      }
      const t = this.taskOf(el);
      el.closest("[data-task]")?.remove();
      await this.actions.remove(t);
    },
    // a tick waits 2 s (struck through, a gold shimmer) before it's written: unticking in time leaves the file alone.
    // The sound comes from installSounds (it listens to every .task-list-item-checkbox)
    tick: (e, box) => {
      const row = box.closest(".winx-cal-task") as HTMLElement, cb = box as HTMLInputElement;
      row.classList.toggle("ticking", cb.checked);
      window.clearTimeout(this.ticks.get(row));
      if (cb.checked) this.ticks.set(row, window.setTimeout(() => {
        cb.disabled = true; row.classList.add("done"); row.querySelector(".winx-board-btns")?.remove();
        this.actions.tick(this.taskOf(row));
      }, 2000));
    },
  };

  // small panel under the stars: one row per difficulty and "none"; the choice rewrites the tag (with undo)
  private difficultyPicker(anchor: HTMLElement, t: any) {
    document.querySelector(".winx-cal-picker")?.remove();
    const box = document.body.createEl("div", { cls: "winx-cal-picker" });
    const r = anchor.getBoundingClientRect();
    Object.assign(box.style, { left: `${Math.min(r.left, innerWidth - 170)}px`, top: `${r.bottom + 4}px` });
    for (const { label, tag } of [...this.ctx.config.difficulties, { label: "☆ none", tag: null }])
      box.createEl("button", { text: label }).onclick = async () => { box.remove(); await this.actions.setDifficulty(t, tag); };
    const close = (e: Event) => { if (!box.contains(e.target as Node)) { box.remove(); document.removeEventListener("pointerdown", close, true); } };
    window.setTimeout(() => document.addEventListener("pointerdown", close, true));
  }

  // one set of listeners for the whole tab: actions, ticks, drags, swipes
  private listen() {
    const el = this.contentEl;
    const act = (e: Event) => {
      if (!this.ctx) return;
      const target = actionOf(e.type, e.target, el);
      if (!target) return;
      const name = target.dataset.action, part = (target.closest("[data-part]") as HTMLElement)?.dataset.part as PartName;
      const fn = this.parts[part]?.on[name] ?? this.taskOn[name];
      if (fn) fn(e, target);
    };
    this.registerDomEvent(el, "click", act);
    this.registerDomEvent(el, "change", act);

    // drag a task (data-drag) onto a day's zone, a chip of the drop bar, or the panel (data-drop; "" = no date)
    const zone = (e: Event) => (e.target as HTMLElement).closest?.("[data-drop]") as HTMLElement | null;
    this.registerDomEvent(el, "dragstart", e => {
      const src = (e.target as HTMLElement).closest?.("[data-drag]") as HTMLElement | null;
      if (!src || !this.ctx) return;
      this.dragged = this.taskOf(src);
      e.dataTransfer?.setData("text/plain", "");
      window.setTimeout(() => this.ctx?.root.classList.add("dragging"));   // later: zones covering the card at dragstart cancel the drag
    });
    this.registerDomEvent(el, "dragend", () => this.ctx?.root.classList.remove("dragging"));
    this.registerDomEvent(el, "dragover", e => { const z = zone(e); if (z) { e.preventDefault(); z.classList.add("over"); } });
    this.registerDomEvent(el, "dragleave", e => zone(e)?.classList.remove("over"));
    this.registerDomEvent(el, "drop", async e => {
      const z = zone(e);
      if (!z) return;
      e.preventDefault(); e.stopPropagation();
      z.classList.remove("over");
      if (!this.dragged) return;
      const t = this.dragged, done = z.dataset.done === "1";
      this.dragged = null;
      if (!H.isMuted()) (done ? this.sounds.gem : this.sounds.move).play({ gain: 0.25 });
      await this.actions.place(t, z.dataset.drop || null, done);
    });

    // phone: swipe a row right = done (a day's row: its checkbox; a Missed row: its ✓; a panel card: ticked, a pool
    // card: added to today), left = skip a 🔁 task / take an open one's date off. Only a mostly-sideways swipe
    // counts, so scrolling still works (touch-action: pan-y in the styles)
    const swipes = new WeakMap<Element, { x0: number; y0: number; dx: number; on: boolean }>();
    const row = (e: Event) => document.body.classList.contains("is-mobile") ? (e.target as HTMLElement).closest?.("[data-swipeable]") as HTMLElement | null : null;
    this.registerDomEvent(el, "touchstart", e => {
      const r = row(e); if (!r) return;
      swipes.set(r, { x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, on: false });
    }, { passive: true });
    this.registerDomEvent(el, "touchmove", e => {
      const r = row(e), s = r && swipes.get(r); if (!r || !s) return;
      const t = this.taskOf(r), left = this.left(t);
      const mx = e.touches[0].clientX - s.x0, my = e.touches[0].clientY - s.y0;
      if (!s.on && Math.abs(mx) > 12 && Math.abs(mx) > 1.5 * Math.abs(my)) s.on = true;
      if (!s.on || (mx < 0 && !left)) return;
      s.dx = mx; r.style.transform = `translateX(${mx}px)`; r.dataset.swipe = mx > 0 ? "done" : this.actions.canSkip(t) ? "skip" : "nodate";
    }, { passive: true });
    this.registerDomEvent(el, "touchend", e => {
      const r = row(e), s = r && swipes.get(r); if (!r || !s) return;
      r.style.transform = ""; delete r.dataset.swipe;
      const t = this.taskOf(r);
      if (s.on && s.dx > 80) this.right(r, t); else if (s.on && s.dx < -80) this.left(t)?.();
    });
  }
  private left(t: any) { return this.actions.canSkip(t) ? () => this.actions.skip(t) : T(t).date ? () => this.actions.unplan(t) : null; }
  private right(r: HTMLElement, t: any) {
    if (r.matches(".winx-yesterday-row")) return (r.querySelector('[data-action="missedDone"]') as HTMLElement)?.click();
    if (r.matches(".winx-cal-task")) { const box = r.querySelector('input[data-action="tick"]') as HTMLInputElement; if (box && !box.checked) box.click(); return; }
    if (t.pool) return this.actions.fromPool(t, this.ctx.today, false);
    if (this.ctx.TASKS) { r.remove(); this.actions.tick(t); }
  }
}
