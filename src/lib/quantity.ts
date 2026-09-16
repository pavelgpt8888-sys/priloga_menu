export type QuantityDimension = "mass" | "volume" | "count" | "unknown";

export interface NormalizedQuantity {
  amount: number;
  unit: string;
  dimension: QuantityDimension;
  unresolved: boolean;
}

export type QuantityParseResult =
  | { status: "ok"; quantity: NormalizedQuantity }
  | { status: "unresolved"; rawQuantity: string; reason: "invalid-amount" | "missing-unit" };

export interface QuantityInput {
  amount: number | string;
  unit?: string;
  rawQuantity?: string;
}

const unitAliases: Record<string, { unit: string; dimension: Exclude<QuantityDimension, "unknown">; factor: number }> = {
  "г": { unit: "кг", dimension: "mass", factor: 0.001 },
  "гр": { unit: "кг", dimension: "mass", factor: 0.001 },
  "грамм": { unit: "кг", dimension: "mass", factor: 0.001 },
  "грамма": { unit: "кг", dimension: "mass", factor: 0.001 },
  "граммов": { unit: "кг", dimension: "mass", factor: 0.001 },
  "кг": { unit: "кг", dimension: "mass", factor: 1 },
  "килограмм": { unit: "кг", dimension: "mass", factor: 1 },
  "килограмма": { unit: "кг", dimension: "mass", factor: 1 },
  "килограммов": { unit: "кг", dimension: "mass", factor: 1 },
  "ml": { unit: "л", dimension: "volume", factor: 0.001 },
  "мл": { unit: "л", dimension: "volume", factor: 0.001 },
  "миллилитр": { unit: "л", dimension: "volume", factor: 0.001 },
  "миллилитра": { unit: "л", dimension: "volume", factor: 0.001 },
  "миллилитров": { unit: "л", dimension: "volume", factor: 0.001 },
  "l": { unit: "л", dimension: "volume", factor: 1 },
  "л": { unit: "л", dimension: "volume", factor: 1 },
  "литр": { unit: "л", dimension: "volume", factor: 1 },
  "литра": { unit: "л", dimension: "volume", factor: 1 },
  "литров": { unit: "л", dimension: "volume", factor: 1 },
  "шт": { unit: "шт", dimension: "count", factor: 1 },
  "шт.": { unit: "шт", dimension: "count", factor: 1 },
  "штука": { unit: "шт", dimension: "count", factor: 1 },
  "штуки": { unit: "шт", dimension: "count", factor: 1 },
  "штук": { unit: "шт", dimension: "count", factor: 1 },
};

function normalizedUnit(unit?: string) {
  return (unit ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function rawQuantity(input: QuantityInput) {
  return input.rawQuantity ?? `${String(input.amount).trim()} ${input.unit?.trim() ?? ""}`.trim();
}

export function roundQuantity(amount: number) {
  return Number((amount + Number.EPSILON).toFixed(9));
}

export function parseQuantity(input: QuantityInput): QuantityParseResult {
  const raw = rawQuantity(input);
  const parsedAmount = typeof input.amount === "number"
    ? input.amount
    : /^\+?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(input.amount.trim())
      ? Number(input.amount.trim().replace(",", "."))
      : Number.NaN;
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return { status: "unresolved", rawQuantity: raw, reason: "invalid-amount" };

  const sourceUnit = normalizedUnit(input.unit);
  if (!sourceUnit) return { status: "unresolved", rawQuantity: raw, reason: "missing-unit" };
  const knownUnit = unitAliases[sourceUnit];
  if (!knownUnit) {
    return { status: "ok", quantity: { amount: roundQuantity(parsedAmount), unit: sourceUnit, dimension: "unknown", unresolved: true } };
  }
  return {
    status: "ok",
    quantity: {
      amount: roundQuantity(parsedAmount * knownUnit.factor),
      unit: knownUnit.unit,
      dimension: knownUnit.dimension,
      unresolved: false,
    },
  };
}

export function quantitiesCompatible(left: NormalizedQuantity, right: NormalizedQuantity) {
  if (left.dimension === "unknown" || right.dimension === "unknown") {
    return left.dimension === "unknown" && right.dimension === "unknown" && left.unit === right.unit;
  }
  return left.dimension === right.dimension;
}

export function quantityGroupKey(quantity: NormalizedQuantity) {
  return quantity.dimension === "unknown" ? `unknown:${quantity.unit}` : quantity.dimension;
}

export function combineQuantities(left: NormalizedQuantity, right: NormalizedQuantity): NormalizedQuantity | undefined {
  if (!quantitiesCompatible(left, right)) return undefined;
  return {
    amount: roundQuantity(left.amount + right.amount),
    unit: left.unit,
    dimension: left.dimension,
    unresolved: left.unresolved || right.unresolved,
  };
}

export function subtractQuantities(required: NormalizedQuantity, available: NormalizedQuantity): NormalizedQuantity | undefined {
  if (!quantitiesCompatible(required, available)) return undefined;
  return { ...required, amount: roundQuantity(Math.max(0, required.amount - available.amount)) };
}

export function formatQuantity(quantity: Pick<NormalizedQuantity, "amount" | "unit">) {
  return `${roundQuantity(quantity.amount).toString()} ${quantity.unit}`;
}

export function formatIngredientQuantity(input: { amount: number; unit: string; rawQuantity?: string; quantityStatus?: "unresolved" }) {
  if (input.quantityStatus === "unresolved") {
    const raw = input.rawQuantity?.trim() ?? "";
    const unit = input.unit.trim();
    if (!raw) return "Уточнить количество";
    if (!unit || raw.toLowerCase().endsWith(unit.toLowerCase())) return raw;
    return `${raw} ${unit}`;
  }
  return formatQuantity(input);
}
