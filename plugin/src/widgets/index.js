// The widgets, by the name a note's block asks for: await winx.render("weight", dv, input)

export const widgets = { };
export const render = (name, dv, input) => widgets[name] ? widgets[name](dv, input) : dv.el("div", `winx: no widget "${name}"`);
