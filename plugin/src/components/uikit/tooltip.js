// v-tip="text": Obsidian's tooltip on hover (setTooltip: drawn on the body, so nothing clips
// it), in the Winx look (styles/_tooltip.scss: .tooltip.winx-tooltip): blue over the pink paper;
// v-tip.pink for a blue place (Missed, today); v-tip:bottom puts it below. The value may be
// { text, pink, placement } when a component decides (WinxButton). Nothing for an empty text;
// it comes after 100 ms (Obsidian's own is slower at first).
import { setTooltip } from "obsidian";

const tip = (el, { value, arg, modifiers }) => {
  const { text, pink = modifiers.pink, placement = arg ?? "top" } =
    typeof value === "object" && value ? value : { text: value };

  if (!text) return;

  const classes = ["winx-tooltip", ...(pink ? ["winx-tooltip--pink"] : [])];

  setTooltip(el, text, { classes, placement, delay: 100 });
};

export const vTip = { mounted: tip, updated: tip };
