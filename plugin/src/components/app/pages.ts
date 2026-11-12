// The Winx tab's pages: each one's title and icon (the nav), main (in the pill / bar; else under
// Other), keep (switched away, hidden and kept, not unloaded), and make: the page as a Component
// drawn into `el`, on the tab's own state for it (a reactive object, only ever assigned into).
import type { Component } from "obsidian";
import { CalendarPage } from "#/components/pages/calendar/view.ts";
import { DashboardPage } from "#/components/pages/dashboard/view.ts";
import type { WinxView } from "./view.ts";

export interface PageDef {
  title: string;
  icon: string;
  main: boolean;
  keep: boolean;
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
};
