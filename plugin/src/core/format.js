// Amounts as the widgets show them: "12 000 ₽"
export const money = n => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽";
