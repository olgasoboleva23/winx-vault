// The writes of the cycle: "started / ended today" in Cycle.md.
import { appendLine } from "../core/files.js";
import { CYCLE_PATH } from "../widgets/body/cycle.js";

// "started / ended today": a line in Cycle.md (once)
export const cycleActions = () => ({
  mark: (kind, day) =>
    appendLine(CYCLE_PATH, `- ${kind}:: ${day}`, { header: "period:: 8\n\n", unique: true }),
});
