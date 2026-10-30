// The widgets, by the name a note's block asks for: await winx.render("weight", dv, input)
import finance from "./finance.js";
import mobileShopping from "./mobileShopping.js";
import pomodoro from "./pomodoro.js";
import week from "./week.js";
import weight from "./weight.js";

export const widgets = { finance, mobileShopping, pomodoro, week, weight };
export const render = (name, dv, input) => widgets[name] ? widgets[name](dv, input) : dv.el("div", `winx: no widget "${name}"`);
