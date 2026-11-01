// Collection notes (watch / read / game): what the window asks for each kind and the note it makes.
const pairs = list => list.map(([label, value]) => ({ label, value }));

export const KINDS = {
  watch: {
    folder: "03 Resources/Collections/Watchlist", icon: "🎬", title: "✦ New watch item", steps: ["Start", "Watch", "Finish"],
    types: pairs([["Movie", "movie"], ["Cartoon", "cartoon"], ["Animated series", "animated_series"], ["TV Show", "tv"], ["Anime", "anime"], ["Documentary", "doc"], ["Other", "other"]]),
    statuses: pairs([["to watch", "to_watch"], ["watching", "watching"], ["completed", "completed"], ["dropped", "dropped"]]),
  },
  read: {
    folder: "03 Resources/Collections/Readlist", icon: "📖", title: "✦ New read item", steps: ["Start", "Read", "Finish"],
    types: pairs([["Fanfiction", "fanfiction"], ["Fiction", "fiction"], ["Manga", "manga"], ["Scientific pop", "scientific_pop"], ["IT", "it"]]),
    statuses: pairs([["to read", "to_read"], ["reading", "reading"], ["completed", "completed"], ["dropped", "dropped"]]),
  },
  game: {
    folder: "03 Resources/Collections/Gamelist", icon: "🎮", title: "✦ New game", steps: ["Start", "Play", "Complete"],
    statuses: pairs([["to play", "to_play"], ["playing", "playing"], ["completed", "completed"], ["paused", "paused"], ["dropped", "dropped"]]),
  },
};

// the window's rows and required keys for a kind (a game asks for a genre instead of a type)
export const itemForm = kind => {
  const k = KINDS[kind];
  return {
    rows: [
      { name: "Title", key: "title", text: "title" },
      k.types ? { name: "Type", key: "media_type", options: k.types } : { name: "Genre", key: "genre", text: "optional" },
      { name: "Status", key: "status", options: k.statuses },
      // a rating 1–10, now or later (in the note's properties); the collection's _index.base shows it as stars
      { name: "Rating", key: "rating", options: Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: i + 1 })) },
    ],
    values: { status: k.statuses[0].value },
    required: ["title", "status", ...(k.types ? ["media_type"] : [])],
  };
};

export function itemNote(kind, v, today) {
  const k = KINDS[kind];
  const fields = k.types ? `media_type: ${v.media_type}\nstatus: ${v.status}` : `status: ${v.status}\ngenre: ${v.genre ?? ""}`;
  return `---
type: ${kind}
title: "${v.title.replace(/"/g, '\\"')}"
${fields}
rating: ${v.rating ?? ""}${kind === "game" ? "\nhours: " : ""}
created: ${today}
tags:
---

# ${k.icon} ${v.title}

## Notes

## Progress
${k.steps.map(s => `- [ ] ${s}`).join("\n")}
`;
}

// in the folder, without characters a file name can't have; " 1", " 2"… when taken (`exists(path)`)
export function itemPath(folder, title, exists) {
  const name = title.replace(/[\\/:*?"<>|#^[\]]/g, "").trim() || "Untitled";
  let path = `${folder}/${name}.md`;
  for (let i = 1; exists(path); i++) path = `${folder}/${name} ${i}.md`;
  return path;
}

// a template's text for a new note: QuickAdd's {{date}} / {{title}} and Templater's tp.file.title
export const fillTemplate = (text, title, today) =>
  text.replace(/{{date}}/g, today).replace(/{{title}}|<%\s*tp\.file\.title\s*%>/g, title);
