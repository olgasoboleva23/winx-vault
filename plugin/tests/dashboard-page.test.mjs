import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createRequire } from "node:module";
import { setApp } from "#/helpers/app.js";

const require = createRequire(import.meta.url);
let vue, mount, Dashboard, DashboardDate, todayYmd;
const triggered = [];
before(async () => {
  GlobalRegistrator.register();
  window.moment = require("moment");
  setApp({ vault: { on: () => ({}) }, workspace: {
    on: () => ({}), trigger: name => triggered.push(name),
  } });
  vue = await import("vue");
  ({ mount } = await import("@vue/test-utils"));
  Dashboard = (await import("#/components/pages/dashboard/index.vue")).default;
  DashboardDate = (await import("#/components/pages/dashboard/DashboardDate.vue")).default;
  ({ todayYmd } = await import("#/helpers/dates.js"));
});

function page() {
  const state = vue.reactive({ date: "2026-11-10" });
  const wrapper = mount(Dashboard, { props: { state }, global: { stubs: { WinxWidget: true } } });
  return { state, wrapper };
}

test("dashboard date: today saves null; the new date is in the DOM before widgets reload", async () => {
  const { state, wrapper } = page();
  assert.equal(wrapper.attributes("data-date"), "2026-11-10");
  assert.ok(wrapper.find(".winx-dash__date input").exists());
  wrapper.findComponent(DashboardDate).vm.$emit("go", todayYmd());
  await vue.nextTick();
  assert.equal(state.date, null);
  assert.equal(wrapper.attributes("data-date"), todayYmd());
  assert.deepEqual(triggered, ["winx:date"]);
  wrapper.unmount();
});

test("a dashboard date restored by Back / Forward is drawn", async () => {
  const { state, wrapper } = page();
  state.date = "2026-11-05";
  await vue.nextTick();
  assert.equal(wrapper.attributes("data-date"), "2026-11-05");
  wrapper.unmount();
});
