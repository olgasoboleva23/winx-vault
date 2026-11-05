// A task note's lines as the calendar's tasks and the pool's lines, read by the plugin itself (no
// Dataview): { path, line, text, status, parent }. status: the checkbox's character (" ", "x",
// "-"), null for a plain "- item" (a pool line); text: after the checkbox (what Task.of takes);
// parent: the line of the list item it's indented under (a line that isn't a list item, blank or
// not, ends the nesting). Only "- " items: Winx writes that form. Pure (tests/task-store.test.mjs).
const ITEM = /^(\s*)- (?:\[(.)\] )?(.*)$/;

export function parseNote(path, text) {
  const items = [], open = [];   // open: the items this one may be indented under, by indent

  text.split("\n").forEach((raw, line) => {
    const m = raw.match(ITEM);

    if (!m) { open.length = 0; return; }

    const indent = m[1].length;

    while (open.length && open.at(-1).indent >= indent) open.pop();
    const item = { path, line, text: m[3], status: m[2] ?? null, parent: open.at(-1)?.line };

    items.push(item);
    open.push({ indent, line });
  });

  return items;
}
