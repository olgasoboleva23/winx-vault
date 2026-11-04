// Amounts as the widgets show them ("12 000 ₽") and as people write them (amount)
export const money = n =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽";

// a number as people write it: "20 000", "2,5", "−300", "-1 200.50" (spaces of any kind); null when
// it isn't one. The one rule for a sum wherever it's typed, written or read back (purchases,
// deposits, the ledger, weight)
export const AMOUNT = /[-+−]?\d[\d\s]*(?:[.,]\d+)?/;

export const amount = text => {
  const s = String(text ?? "").replace(/\s/g, "").replace("−", "-").replace(",", ".");

  return /^[-+]?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};
