export type DishRole = "breakfast_base" | "breakfast_addon" | "main" | "side" | "salad" | "kids_vegetables" | "soup" | "dessert" | "snack" | "leftover_based" | "freezer_item";
export type MealKind = "breakfast" | "lunch" | "dinner" | "snack";
export type StoragePlace = "fridge" | "freezer" | "pantry";
export type ShoppingCategory = "овощи и фрукты" | "мясо и птица" | "рыба" | "молочные" | "хлеб" | "крупы и макароны" | "бакалея" | "заморозка" | "специи" | "сладкое" | "бытовое";

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  role: "adult" | "teen" | "child";
  dislikes?: string[];
  likes?: string[];
  favoriteDishes?: string[];
  restrictions?: string[];
  notes?: string;
}
export interface IngredientNeed { name: string; amount: number; unit: string; category: ShoppingCategory; }
export interface DishComponent { id: string; name: string; role: DishRole; effort: "easy" | "medium" | "weekend"; cost: "low" | "medium" | "high"; kidsFriendly: boolean; leftoverFriendly?: boolean; freezerFriendly?: boolean; sweetPastry?: boolean; ingredients: IngredientNeed[]; steps?: string[]; }
export interface MealComponent { slot: "base" | "addon" | "drink" | "main" | "side" | "salad" | "kidsVegetables" | "soup" | "dessert"; dishId: string; }
export interface MealPlan { id: string; date: string; kind: MealKind; title: string; components: MealComponent[]; notes?: string; source?: "generated" | "manual"; }
export interface InventoryItem { id: string; product: string; amount: number; unit: string; category: ShoppingCategory; place: StoragePlace; expiresAt?: string; urgent?: boolean; source: "manual" | "shopping" | "future_ai_photo"; }
export interface Leftover { id: string; name: string; amount: "мало" | "на 1 порцию" | "на 2 порции" | "много"; cookedAt: string; useBy: string; transformInto: string[]; linkedDishIds?: string[]; }
export interface FreezerItem { id: string; name: string; amount: string; frozenAt: string; useBy: string; serveWith: string[]; linkedDishIds?: string[]; }
export interface ShoppingItem { id: string; product: string; amount: number; unit: string; category: ShoppingCategory; checked: boolean; alreadyAtHome: boolean; manuallyAdded?: boolean; }
export interface RecipeEntry {
  id: string;
  title: string;
  url?: string;
  source?: string;
  categories: string[];
  photoUrl?: string;
  servings: number;
  prepMinutes?: number;
  cookMinutes?: number;
  rating: number;
  favorite: boolean;
  likedBy: string[];
  dislikedBy: string[];
  notes?: string;
  ingredients: IngredientNeed[];
  steps: string[];
  linkedDishIds?: string[];
  status: "draft" | "ready" | "ready_for_parser";
}
export interface CookingSession { mealId: string; doneSteps: number[]; timerSeconds: number; eaters: string[]; liked?: "yes" | "mixed" | "no"; leftoversNote?: string; }
export interface AppState { family: FamilyMember[]; dishes: DishComponent[]; meals: MealPlan[]; inventory: InventoryItem[]; leftovers: Leftover[]; freezer: FreezerItem[]; shopping: ShoppingItem[]; recipes: RecipeEntry[]; bannedDishIds: string[]; cooking?: CookingSession; }
