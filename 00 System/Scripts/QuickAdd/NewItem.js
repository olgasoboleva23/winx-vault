// A new watch / read / game note in one window (title, type, status), made in its Collections folder and opened.
// The QuickAdd choice picks the kind in this script's settings ("Kind").
const KINDS = {
  watch: {
    folder: "03 Resources/Collections/Watchlist", icon: "🎬", title: "✦ New watch item", steps: ["Start", "Watch", "Finish"],
    types: [["Movie", "movie"], ["Cartoon", "cartoon"], ["Animated series", "animated_series"], ["TV Show", "tv"], ["Anime", "anime"], ["Documentary", "doc"], ["Other", "other"]],
    statuses: [["to watch", "to_watch"], ["watching", "watching"], ["completed", "completed"], ["dropped", "dropped"]],
  },
  read: {
    folder: "03 Resources/Collections/Readlist", icon: "📖", title: "✦ New read item", steps: ["Start", "Read", "Finish"],
    types: [["Fanfiction", "fanfiction"], ["Fiction", "fiction"], ["Scientific pop", "scientific_pop"], ["IT", "it"]],
    statuses: [["to read", "to_read"], ["reading", "reading"], ["completed", "completed"], ["dropped", "dropped"]],
  },
  game: {
    folder: "03 Resources/Collections/Gamelist", icon: "🎮", title: "✦ New game", steps: ["Start", "Play", "Complete"],
    statuses: [["to play", "to_play"], ["playing", "playing"], ["completed", "completed"], ["paused", "paused"], ["dropped", "dropped"]],
  },
};
const buttons = pairs => pairs.map(([label, value]) => ({ label, value }));

module.exports = {
  settings: { name: "New collection item", options: { Kind: { type: "dropdown", defaultValue: "watch", options: Object.keys(KINDS) } } },
  entry: async (params, settings) => {
    const kind = settings.Kind, k = KINDS[kind];
    const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
    const Form = (app.__winxForm ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/form.js")));
    const v = await Form.ask(k.title, [
      { name: "Title", key: "title", text: "title" },
      ...(k.types ? [{ name: "Type", key: "media_type", options: buttons(k.types) }] : [{ name: "Genre", key: "genre", text: "optional" }]),
      { name: "Status", key: "status", options: buttons(k.statuses) },
    ], { values: { status: k.statuses[0][1] }, required: ["title", "status", ...(k.types ? ["media_type"] : [])], submit: "Create" });
    if (!v) return;

    const fields = k.types ? `media_type: ${v.media_type}\nstatus: ${v.status}` : `status: ${v.status}\ngenre: ${v.genre ?? ""}`;
    const content = `---
type: ${kind}
title: "${v.title.replace(/"/g, '\\"')}"
${fields}
rating: ${kind === "game" ? "\nhours: " : ""}
created: ${H.today()}
tags:
---

# ${k.icon} ${v.title}

## Notes

## Progress
${k.steps.map(s => `- [ ] ${s}`).join("\n")}
`;
    const name = v.title.replace(/[\\/:*?"<>|#^[\]]/g, "").trim() || "Untitled";
    let path = `${k.folder}/${name}.md`;
    for (let i = 1; app.vault.getAbstractFileByPath(path); i++) path = `${k.folder}/${name} ${i}.md`;   // like QuickAdd's "increment"
    if (!app.vault.getFolderByPath(k.folder)) await app.vault.createFolder(k.folder);
    await app.workspace.getLeaf("tab").openFile(await app.vault.create(path, content));
  },
};
