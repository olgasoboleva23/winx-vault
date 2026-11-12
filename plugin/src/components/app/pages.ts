// The Winx tab's pages: each one's title and icon (the nav), main (in the pill / bar; else under
// Other), keep (switched away, hidden and kept, not unloaded), and make: the page as a Component
// drawn into `el`, on the tab's own state for it (a reactive object, only ever assigned into).
import type { Component } from "obsidian";
import { CalendarPage } from "#/components/pages/calendar/view.ts";
import { DashboardPage } from "#/components/pages/dashboard/view.ts";
import { ProjectsPage } from "#/components/pages/projects/view.ts";
import type { WinxView } from "./view.ts";

export interface PageDef {
  title: string;
  icon: string;
  main: boolean;
  keep: boolean;
  note?: string;   // the note this page draws: a link to it switches to the page
  make(tab: WinxView, el: HTMLElement): Component & { catchUp?(): void };
}

export const pages: Record<string, PageDef> = {
  dashboard: {
    title: "Dashboard", icon: "✦", main: true, keep: true,
    make: (tab, el) => new DashboardPage(tab.state.dashboard, el),
  },
  calendar: {
    title: "Calendar", icon: "🗓", main: true, keep: true,
    // a note in reading view around it (fonts, margins), as its own tab had
    make: (tab, el) => {
      el.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard"]);
      return new CalendarPage(tab.state.calendar, el.createDiv());
    },
  },
  projects: {
    title: "Projects", icon: "📁", main: false, keep: false,
    make: (tab, el) => {
      el.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard"]);
      return new ProjectsPage(tab.state.projects, el.createDiv(),
        (key, e) => void tab.go("projects", { open: key }, e));
    },
  },
};

// the page that draws the note at `path` (a link's target, with or without .md), if any
export function pageOf(path: string): string | null {
  const bare = (p: string) => p.replace(/\.md$/, "");

  return Object.keys(pages).find(k => pages[k].note && bare(pages[k].note) === bare(path)) ?? null;
}
