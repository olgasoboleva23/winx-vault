// The weight log: "- YYYY-MM-DD 70.5" lines (tested by tests/lib.test.mjs).
// Weight log lines: "- YYYY-MM-DD 70.5" (comma decimals accepted). Sorted by date.
const WEIGHT_LINE = /^- (\d{4}-\d{2}-\d{2}) (\d+(?:[.,]\d+)?)\s*$/;
export const parseWeights = text => text.split("\n")
  .map(l => l.trim().match(WEIGHT_LINE)).filter(Boolean)
  .map(m => ({ date: m[1], kg: Number(m[2].replace(",", ".")) }))
  .sort((a, b) => a.date.localeCompare(b.date));

// Set the weight for a day: replace that day's line or append a new one.
export const upsertWeight = (text, date, kg) => {
  const line = `- ${date} ${kg}`;
  const lines = text.replace(/\s+$/, "").split("\n").filter((l, i, a) => !(a.length === 1 && l === ""));
  const i = lines.findIndex(l => l.trim().match(WEIGHT_LINE)?.[1] === date);
  if (i >= 0) lines[i] = line; else lines.push(line);
  return lines.join("\n") + "\n";
};
