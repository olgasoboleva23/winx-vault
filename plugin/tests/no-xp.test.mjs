import { test } from "node:test";
import assert from "node:assert/strict";
import config, { applyConfig } from "#/helpers/config.js";
import { taskXp } from "#/models/xp.js";
import { vitals } from "#/models/vitals.js";
import { settingsValues, toConfig } from "#/models/settings.js";

test("No XP keeps experience at zero and allows configuring gold", () => {
  try {
    applyConfig();
    const noXp = config.difficulties.find(d => d.key === "none");
    assert.ok(noXp);
    assert.equal(noXp.xp, 0);
    assert.equal(noXp.gold, 0);
    applyConfig({ difficulties: { none: { xp: 50, gold: 2 } } });
    assert.equal(taskXp({ difficulty: "none" }, config.xpMap), 0);
    assert.equal(config.difficulties.find(d => d.key === "none").gold, 2);
    assert.deepEqual(toConfig(settingsValues(config)).difficulties.none, { xp: 0, gold: 2 });
  } finally {
    applyConfig();
  }
});

test("No XP has no HP effect; existing difficulty HP amounts stay unchanged", () => {
  applyConfig();
  const missed = ["none", "easy", "medium", "hard", "epic"].map(difficulty => ({ difficulty }));
  const doneToday = [{ difficulty: "none" }];
  assert.deepEqual(vitals({ missed, doneToday }), { hp: 30, hpMax: 50, damage: 20, heal: 0 });
});
