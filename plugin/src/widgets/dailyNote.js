// "✦ Open": the daily note of the page's date; made if it's missing (notes/kinds.js daily). The
// markup: DailyNoteOpen.vue, the opening: controllers/dailyNote.js.
import { Platform } from "obsidian";
import { ymd } from "../core/dates.js";

// the page's date (none: nothing shown) and the button's text: on the phone only the ✦ (the word
// didn't fit next to the date row)
export const loadDailyNote = async ({ dv }) =>
  ({ date: ymd(dv.current()?.date), text: Platform.isMobile ? "✦" : "✦ Open" });
