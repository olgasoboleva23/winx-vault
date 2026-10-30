// The widgets, by the name a note's block asks for: await winx.render("weight", dv, input)
import pomodoro from "./pomodoro.js";

export const widgets = { pomodoro };
export const render = (name, dv, input) => widgets[name] ? widgets[name](dv, input) : dv.el("div", `winx: no widget "${name}"`);
