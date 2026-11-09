import { test } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { loadFinance, loadFinanceLine } from "#/controllers/widgets/finance.js";
import { LEDGER } from "#/helpers/paths.js";

const row = (d, sum) => `| ${d} | 10:00 | ${sum} | Food | shop |`;
const head = "| date | time | amount | category | description |\n| --- | --- | --- | --- | --- |\n";

// the stub's adapter: a folder listing, a modification time per file, and a count of the reads
function ledgerVault(files) {
  const v = vault(files), mtimes = {}, reads = [];
  const { adapter } = v.app.vault;
  const read = adapter.read;

  adapter.list = async () => ({ files: Object.keys(files).filter(f => f.startsWith(`${LEDGER}/`)) });
  adapter.stat = async p => ({ mtime: mtimes[p] ?? 1 });
  adapter.read = async p => { reads.push(p); return read(p); };
  return { ...v, mtimes, reads };
}

test("Finance: a month's note is read again only when it changed, the widgets share the read", async () => {
  const a = `${LEDGER}/2026-09.md`, b = `${LEDGER}/2026-10.md`;
  const { app, files, mtimes, reads } = ledgerVault({
    [a]: head + row("2026-09-02", "-100"), [b]: head + row("2026-10-02", "-200"),
  });

  await loadFinance({ app });
  await loadFinanceLine({ app });
  assert.deepEqual(reads, [a, b]);
  files[b] = head + row("2026-10-02", "-250");
  mtimes[b] = 2;
  const line = await loadFinanceLine({ app });
  assert.deepEqual(reads, [a, b, b]);
  assert.match(line.spent, /250/);
});
