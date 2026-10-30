// The widgets, by the name a note's block asks for: await winx.render("weight", dv, input)
import celestialMarket from "./celestialMarket.js";
import finance from "./finance.js";
import mobileShopping from "./mobileShopping.js";
import pomodoro from "./pomodoro.js";
import shop from "./shop.js";
import week from "./week.js";
import weight from "./weight.js";
import xpToday from "./xpToday.js";

export const widgets = { celestialMarket, finance, mobileShopping, pomodoro, shop, week, weight, xpToday };
export const render = (name, dv, input) => widgets[name] ? widgets[name](dv, input) : dv.el("div", `winx: no widget "${name}"`);
