// The writes of the cycle: "started / ended today" in Cycle.md.
import { appendLine } from "../core/files.js";
import { CYCLE_PATH, cycleLog } from "../widgets/body/cycle.js";

// "started / ended today": a line in Cycle.md (once); started: today, ended: yesterday was the last
// day of the period (CycleLog.endFor)
export const cycleActions = ({ dv }) => ({
  mark: (kind, day) => {
    const log = kind === "end" && cycleLog(dv);
    const date = log ? log.endFor(day) : day;

    const line = `- ${kind}:: ${date}`;

    return appendLine(CYCLE_PATH, line, { header: "period:: 8\n\n", unique: true });
  },
});
