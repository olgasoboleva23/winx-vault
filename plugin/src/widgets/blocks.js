// The ```winx block: the widget classes by name, and what the plugin does with a block.
import { parseBlock } from "./parse.js";

// name → class; each widget adds itself here as it moves to a class
export const blocks = {};

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  const Widget = blocks[name];
  if (!Widget) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(new Widget(el, ctx.sourcePath, args));
};
