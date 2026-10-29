// The widgets, by the name a note's block asks for: await winx.render("calendar", dv, input)
import calendar from "./calendar.js";
import celestialMarket from "./celestialMarket.js";
import cycle from "./cycle.js";
import dailyNote from "./dailyNote.js";
import finance from "./finance.js";
import goals from "./goals.js";
import habits from "./habits.js";
import levelToday from "./levelToday.js";
import lifeAreas from "./lifeAreas.js";
import mobileHome from "./mobileHome.js";
import mobileShopping from "./mobileShopping.js";
import pomodoro from "./pomodoro.js";
import shop from "./shop.js";
import supplies from "./supplies.js";
import wallet from "./wallet.js";
import week from "./week.js";
import weeklyState from "./weeklyState.js";
import weight from "./weight.js";
import xpToday from "./xpToday.js";
import yesterday from "./yesterday.js";

export const widgets = { calendar, celestialMarket, cycle, dailyNote, finance, goals, habits, levelToday, lifeAreas, mobileHome, mobileShopping, pomodoro, shop, supplies, wallet, week, weeklyState, weight, xpToday, yesterday };
export const render = (name, dv, input) => widgets[name] ? widgets[name](dv, input) : dv.el("div", `winx: no widget "${name}"`);
