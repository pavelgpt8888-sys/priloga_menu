import { ChefHat } from "lucide-react";

import type { DishComponent } from "@/lib/types";

export function DishVisual({ dish, compact = false }: { dish: DishComponent; compact?: boolean }) {
  const tone = dish.role === "main" || dish.role === "freezer_item" ? "from-[#fff0d9] via-[#fffaf2] to-[#edf7ed]" : dish.role === "soup" ? "from-[#ffe8d7] via-[#fffaf2] to-[#fff3d6]" : dish.role === "salad" || dish.role === "kids_vegetables" ? "from-[#edf7ed] via-[#fffdf6] to-[#fff3d6]" : "from-[#fff3d6] via-[#fffdf6] to-[#edf7ed]";
  const ingredients = dish.ingredients.map((item) => item.name).slice(0, compact ? 2 : 4).join(" · ");
  return <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#ead7bd] bg-gradient-to-br ${tone} p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${compact ? "size-14" : "h-44 w-full"}`}>
    <div className="relative space-y-1">
      <ChefHat className={`mx-auto text-[#f47b58] ${compact ? "size-6" : "size-5"}`} />
      {!compact && <><p className="text-base font-black leading-tight text-[#263238]">{dish.name}</p><p className="text-xs font-semibold text-[#5f6b66]">{ingredients}</p></>}
    </div>
  </div>;
}
