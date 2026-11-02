// A note Winx makes, from plain data: its properties (YAML), its # title and its ## sections.
//   new Note({ props: { type: "recipe", tags: [] }, title: "Soup", sections: { Steps: "", Notes: "" } }).text
const PLAIN = /^[\p{L}\p{N}][\p{L}\p{N} _.,!?()&'-]*$/u;   // written as is; anything else in "quotes"
const value = v => typeof v === "number" ? String(v) : PLAIN.test(v) ? v : JSON.stringify(v);
const prop = (k, v) =>
  v == null || v === "" ? `${k}:`
  : Array.isArray(v) ? (v.length ? `${k}:\n${v.map(x => `  - ${value(x)}`).join("\n")}` : `${k}: []`)
  : `${k}: ${value(v)}`;

export class Note {
  constructor({ props = {}, title, sections = {} }) { Object.assign(this, { props, title, sections }); }
  get text() {
    const props = Object.entries(this.props).map(([k, v]) => prop(k, v)).join("\n");
    const sections = Object.entries(this.sections).map(([h, body]) => `## ${h}\n${body ? body + "\n" : ""}`).join("\n");
    return `---\n${props}\n---\n\n# ${this.title}\n\n${sections}`;
  }
}

// in the folder, without characters a file name can't have; " 1", " 2"… when taken (`exists(path)`)
export function notePath(folder, title, exists) {
  const name = title.replace(/[\\/:*?"<>|#^[\]]/g, "").trim() || "Untitled";
  let path = `${folder}/${name}.md`;
  for (let i = 1; exists(path); i++) path = `${folder}/${name} ${i}.md`;
  return path;
}

// the daily template's text for a day, as Obsidian's Daily notes fills it: {{date}} / {{date:FORMAT}} by
// format(FORMAT) (moment of that day), {{title}} the note's name
export const fillDaily = (text, format, title) =>
  text.replace(/{{date(?::([^}]+))?}}/g, (_, f) => format(f)).replace(/{{title}}/g, title);
