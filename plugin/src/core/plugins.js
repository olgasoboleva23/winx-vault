// The other plugins' APIs winx uses (undefined while one is off)
import { app } from "./app.js";
export const dataview = () => app.plugins.plugins.dataview?.api;
export const tasksApi = () => app.plugins.plugins["obsidian-tasks-plugin"]?.apiV1;
