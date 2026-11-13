import { FINANCE_PAGE, SHOP, SUPPLIES } from "#/helpers/paths.js";

export const WINX_VIEW = "winx";

export const pages = {
  dashboard: { title: "Dashboard", icon: "✦", main: true },
  calendar: { title: "Calendar", icon: "🗓", main: true },
  projects: { title: "Projects", icon: "📁" },
  finance: { title: "Finance", icon: "💰", widget: "finance", card: true, note: FINANCE_PAGE },
  shop: { title: "Shop", icon: "🛍", widget: "shop", note: `${SHOP}.md` },
  supplies: {
    title: "Supplies", icon: "📦", widget: "supplies", card: true, note: `${SUPPLIES}.md`,
  },
  meds: { title: "Medication", icon: "💊", widget: "meds" },
  food: { title: "Food", icon: "🍽", widget: "food", card: true },
};

// Existing links to the old page notes still select their Vue page.
export function pageOf(path) {
  return Object.entries(pages).find(([, p]) => "note" in p &&
    p.note.replace(/\.md$/, "") === path.replace(/\.md$/, ""))?.[0] ?? null;
}
