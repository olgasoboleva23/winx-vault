// The current variant belongs to tasks.json. Tasks owns the lines, dates and recurrence;
// a completion with a generated next copy advances the JSON queue once.
import { Task } from "./task.js";

export const variantNames = text => text.split("\n").map(s => s.trim()).filter(Boolean);

export function variantsProblem(variants, next) {
  if (!Array.isArray(variants) || variants.some(v => typeof v !== "string" || !v.trim()))
    return "Variant names must be non-empty text";
  if (new Set(variants.map(v => v.toLowerCase())).size !== variants.length)
    return "Each variant needs a different name";
  if (variants.length && !variants.includes(next)) return "Choose the next variant";
  return null;
}

export function nextVariantAfter(before, after, record, others = []) {
  const current = new Task(before);
  const variants = record?.variants ?? [];

  if (!variants.length || !current.isOpen || !after) return null;
  const lines = after.split("\n"), tasks = lines.map(l => new Task(l));
  const done = tasks.filter(t => t.id === current.id && t.isDone);
  const open = tasks.filter(t => t.id === current.id && t.isOpen && t.isRecurring);

  if (!done.length || !open.length) return null;
  const variant = record.currVariant ?? variants[0];
  const problem = variantsProblem(variants, variant);

  if (problem) throw new Error(problem);
  if (done.length !== 1 || open.length !== 1)
    throw new Error(`Ambiguous variant copies for ${current.id}`);
  if (others.some(l => {
    const t = new Task(l);

    return t.isOpen && t.id === current.id;
  })) throw new Error("Task has another open copy; resolve it before completing");
  return variants[(variants.indexOf(variant) + 1) % variants.length];
}
