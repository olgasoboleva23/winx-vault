// The writes of the savings jars: a payday's deposit into a jar's note.
import { todayYmd } from "../core/dates.js";
import { edit } from "../core/files.js";
import { SavingsJar } from "../models/savingsJar.js";
import { Form } from "../uikit/form.ts";

// deposit(path): the payday's deposit into that jar's note; no per_payday ("your part"): it asks
// how much
export function savingsActions({ app }) {
  return {
    deposit: async path => {
      const props = app.metadataCache.getCache(path)?.frontmatter ?? {};
      const sum = props.per_payday ?? (await Form.ask(app, "✦ Deposit",
        [{ name: "Sum", key: "sum", text: "how much", number: true }],
        { values: { sum: null }, required: ["sum"], submit: "Put in" }))?.sum;

      if (sum > 0) await edit(path, c => new SavingsJar(c, props).deposit(todayYmd(), sum));
    },
  };
}
