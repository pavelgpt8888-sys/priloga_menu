import { combineQuantities, parseQuantity, quantityGroupKey, subtractQuantities, type NormalizedQuantity } from "./quantity";
import type { ShoppingItem } from "./types";

function normalizedProduct(item: ShoppingItem) {
  return item.product.trim().toLowerCase();
}

function resolvedQuantity(item: ShoppingItem): NormalizedQuantity | undefined {
  if (item.quantityStatus === "unresolved") return undefined;
  const parsed = parseQuantity({ amount: item.amount, unit: item.unit, rawQuantity: item.rawQuantity });
  if (parsed.status !== "ok" || parsed.quantity.unresolved) return undefined;
  return parsed.quantity;
}

function requirementKey(item: ShoppingItem, quantity: NormalizedQuantity) {
  return `${normalizedProduct(item)}:${quantityGroupKey(quantity)}`;
}

function isFulfilled(item: ShoppingItem) {
  return item.checked || item.alreadyAtHome;
}

function availableId(baseId: string, reservedIds: Set<string>) {
  if (!reservedIds.has(baseId)) return baseId;
  const outstandingId = `${baseId}-outstanding`;
  if (!reservedIds.has(outstandingId)) return outstandingId;
  let index = 2;
  while (reservedIds.has(`${outstandingId}-${index}`)) index += 1;
  return `${outstandingId}-${index}`;
}

/**
 * Reconciles computed requirements with user-owned shopping state.
 *
 * - manual rows are never interpreted or rewritten;
 * - checked/already-at-home resolved rows remain fulfillment facts;
 * - only the unfulfilled remainder is emitted as an outstanding row;
 * - unresolved rows are matched only by stable ID and never by guessed units.
 */
export function reconcileShoppingList(derivedRequirements: ShoppingItem[], existingRows: ShoppingItem[]): ShoppingItem[] {
  const manualRows = existingRows.filter((item) => item.manuallyAdded);
  const existingDerived = existingRows.filter((item) => !item.manuallyAdded);
  const reservedIds = new Set(existingRows.map((item) => item.id));
  const usedExisting = new Set<number>();
  const reconciled: ShoppingItem[] = [];

  derivedRequirements.forEach((derived) => {
    const derivedQuantity = resolvedQuantity(derived);

    if (!derivedQuantity) {
      const matchingIndex = existingDerived.findIndex((item, index) =>
        !usedExisting.has(index)
        && item.id === derived.id
        && !resolvedQuantity(item),
      );
      if (matchingIndex >= 0) {
        usedExisting.add(matchingIndex);
        const existing = existingDerived[matchingIndex];
        reconciled.push({ ...derived, id: existing.id, checked: false, alreadyAtHome: existing.alreadyAtHome });
      } else {
        reconciled.push({ ...derived, checked: false });
      }
      return;
    }

    const key = requirementKey(derived, derivedQuantity);
    const matchingIndexes = existingDerived.flatMap((item, index) => {
      if (usedExisting.has(index)) return [];
      const quantity = resolvedQuantity(item);
      return quantity && requirementKey(item, quantity) === key ? [index] : [];
    });
    matchingIndexes.forEach((index) => usedExisting.add(index));

    const fulfilledRows = matchingIndexes
      .map((index) => existingDerived[index])
      .filter(isFulfilled);
    fulfilledRows.forEach((item) => reconciled.push({ ...item }));

    const fulfilledQuantity = fulfilledRows.reduce<NormalizedQuantity | undefined>((total, item) => {
      const quantity = resolvedQuantity(item);
      if (!quantity) return total;
      return total ? combineQuantities(total, quantity) ?? total : quantity;
    }, undefined);
    const outstanding = fulfilledQuantity
      ? subtractQuantities(derivedQuantity, fulfilledQuantity) ?? derivedQuantity
      : derivedQuantity;

    if (outstanding.amount <= 0) return;

    const existingOutstanding = matchingIndexes
      .map((index) => existingDerived[index])
      .find((item) => !isFulfilled(item));
    const id = existingOutstanding?.id ?? availableId(derived.id, reservedIds);
    reservedIds.add(id);
    reconciled.push({
      ...derived,
      id,
      amount: outstanding.amount,
      unit: outstanding.unit,
      checked: false,
      alreadyAtHome: false,
    });
  });

  existingDerived.forEach((item, index) => {
    if (usedExisting.has(index)) return;
    if (isFulfilled(item) || !resolvedQuantity(item)) reconciled.push({ ...item });
  });

  return [...reconciled, ...manualRows.map((item) => ({ ...item }))];
}
