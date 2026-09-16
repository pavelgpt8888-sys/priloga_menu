import { describe, expect, it } from "vitest";

import { combineQuantities, formatIngredientQuantity, formatQuantity, parseQuantity } from "../quantity";

function quantity(amount: number | string, unit: string) {
  const parsed = parseQuantity({ amount, unit });
  if (parsed.status !== "ok") throw new Error(`Expected resolved quantity: ${String(amount)} ${unit}`);
  return parsed.quantity;
}

describe("quantity parsing and normalization", () => {
  it("normalizes kilograms and grams before aggregation", () => {
    expect(combineQuantities(quantity(1, "кг"), quantity(500, "г"))).toMatchObject({ amount: 1.5, unit: "кг", dimension: "mass" });
  });

  it("normalizes litres and millilitres before aggregation", () => {
    expect(combineQuantities(quantity(750, "мл"), quantity("0,5", "л"))).toMatchObject({ amount: 1.25, unit: "л", dimension: "volume" });
  });

  it("combines compatible counts only", () => {
    expect(combineQuantities(quantity(2, "штуки"), quantity(3, "шт"))).toMatchObject({ amount: 5, unit: "шт", dimension: "count" });
  });

  it("keeps incompatible dimensions separate", () => {
    expect(combineQuantities(quantity(1, "кг"), quantity(1, "л"))).toBeUndefined();
  });

  it("does not guess a conversion for household units", () => {
    const packs = quantity(2, "пач");

    expect(packs).toMatchObject({ amount: 2, unit: "пач", dimension: "unknown", unresolved: true });
    expect(combineQuantities(packs, quantity(500, "г"))).toBeUndefined();
  });

  it("accepts comma decimals and fractional values", () => {
    expect(quantity("0,75", "л")).toMatchObject({ amount: 0.75, unit: "л" });
    expect(quantity(".5", "кг")).toMatchObject({ amount: 0.5, unit: "кг" });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, "", "не число"])("keeps invalid amount %p unresolved", (amount) => {
    expect(parseQuantity({ amount, unit: "кг", rawQuantity: String(amount) })).toMatchObject({ status: "unresolved", rawQuantity: String(amount) });
  });

  it("keeps a missing unit unresolved instead of guessing count", () => {
    expect(parseQuantity({ amount: "2", unit: "", rawQuantity: "2" })).toEqual({ status: "unresolved", rawQuantity: "2", reason: "missing-unit" });
  });

  it("rounds repeated aggregation without floating-point display noise", () => {
    const total = Array.from({ length: 10 }, () => quantity(0.1, "кг"))
      .reduce((sum, next) => combineQuantities(sum, next) ?? sum);

    expect(total.amount).toBe(1);
    expect(formatQuantity(combineQuantities(quantity(0.1, "кг"), quantity(0.2, "кг"))!)).toBe("0.3 кг");
  });

  it("shows preserved raw quantity text for unresolved recipe input", () => {
    expect(formatIngredientQuantity({ amount: 0, unit: "ложка", rawQuantity: "примерно две", quantityStatus: "unresolved" })).toBe("примерно две ложка");
  });
});
