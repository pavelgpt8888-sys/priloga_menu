import type { AppState, DishComponent } from "./types";

export type RestrictionBlockReason = "hard_restriction" | "restriction_needs_clarification";

export interface RestrictionIssue {
  reason: RestrictionBlockReason;
  memberId: string;
  memberName: string;
  restriction: string;
  dishId: string;
  dishName: string;
}

export type RestrictionValidation =
  | { status: "safe" }
  | { status: "blocked"; reason: "hard_restriction"; issues: RestrictionIssue[] }
  | { status: "unknown"; reason: "restriction_needs_clarification"; issues: RestrictionIssue[] };

function normalize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dishKnowledge(dish: DishComponent) {
  return normalize([
    dish.name,
    ...dish.ingredients.flatMap((ingredient) => [ingredient.name, ingredient.category]),
  ].join(" "));
}

// TASK-004 deliberately uses only text already present in the current model.
// No synonym, allergen, medical, or ingredient-containment inference happens
// here: an unknown rule is fail-closed and must be clarified by the family.
function matchesKnownText(text: string, restriction: string) {
  return Boolean(restriction) && text.includes(restriction);
}

export function validateDishRestrictions(state: AppState, dish: DishComponent): RestrictionValidation {
  const candidateKnowledge = dishKnowledge(dish);
  const catalogueKnowledge = state.dishes.map(dishKnowledge);
  const hardIssues: RestrictionIssue[] = [];
  const unknownIssues: RestrictionIssue[] = [];

  state.family.forEach((member) => {
    (member.restrictions ?? []).forEach((rawRestriction) => {
      const restriction = normalize(rawRestriction);
      if (!restriction) return;
      const base = {
        memberId: member.id,
        memberName: member.name,
        restriction: rawRestriction.trim(),
        dishId: dish.id,
        dishName: dish.name,
      };

      if (matchesKnownText(candidateKnowledge, restriction)) {
        hardIssues.push({ ...base, reason: "hard_restriction" });
        return;
      }

      if (!catalogueKnowledge.some((knowledge) => matchesKnownText(knowledge, restriction))) {
        unknownIssues.push({ ...base, reason: "restriction_needs_clarification" });
      }
    });
  });

  if (hardIssues.length) return { status: "blocked", reason: "hard_restriction", issues: hardIssues };
  if (unknownIssues.length) return { status: "unknown", reason: "restriction_needs_clarification", issues: unknownIssues };
  return { status: "safe" };
}

export function safeDishes(state: AppState, dishes: DishComponent[]) {
  return dishes.filter((dish) => validateDishRestrictions(state, dish).status === "safe");
}
