// A test's task in the id format, written as a readable spec in the old one-line form:
// "#⭐easy #area/body #time/morning #goal/x walk ![[a.webp|28]] [due:: …]" → the line's text
// "t<n> [due:: …]" and its record { name: "walk", difficulty, area, daytime, goal, tags, sticker,
// after: null }. The same name (any case) gets the same id: copies of a task share it.
const ids = new Map();
const FIELD = /\[\w+:: [^\]]*\]/g;

export function idTask(spec) {
  const tags = spec.match(/#[^\s#]+/gu) ?? [];
  const tag = prefix => tags.find(t => t.startsWith(prefix)) ?? null;
  const name = spec.replace(FIELD, "").replace(/!\[\[[^\]]*\]\]|#\S+/gu, "")
    .replace(/\s+/g, " ").trim();
  const id = ids.get(name.toLowerCase()) ?? `t${ids.size + 1}`;

  ids.set(name.toLowerCase(), id);
  return {
    text: [id, ...spec.match(FIELD) ?? []].join(" "),
    rec: {
      name, difficulty: tag("#⭐"), area: tag("#area/"), daytime: tag("#time/")?.slice(6) ?? null,
      goal: tag("#goal/"), tags: tags.filter(t => !/^#(⭐|area\/|time\/|goal\/)/u.test(t)),
      sticker: spec.match(/!\[\[([^\]|]+)/)?.[1] ?? null, after: null,
    },
  };
}
