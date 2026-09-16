# Design Direction — Native Family Food App

Status: 2026-09-16

## 1. Current direction

The strongest current UI direction is the **Bring-inspired native family app** approach, not the dashboard/bento approach.

User feedback to preserve:

- A / Bring Family was the strongest of the three concepts (~70–80% fit).
- B / Native Calm was not convincing.
- C / Family OS felt too bulky and dashboard-like.
- On Today, opening Wednesday should show **Wednesday**, with breakfast/lunch/dinner for that day.
- Of the latest color variants, **Tomato** is currently the preferred direction, but color is not final.

Bring! is a reference for interaction quality and native feeling, not a template to copy.

Mobbin is a research library for mature mobile patterns across food, shopping, family and productivity apps.

## 2. What “AI-generated UI” means here

Avoid common visual symptoms:

- every section is a rounded card;
- excessive pill-shaped controls/chips;
- equal visual weight for all blocks;
- decorative gradients without information meaning;
- large emoji as primary iconography;
- too many labels explaining obvious controls;
- identical spacing/radius everywhere;
- weak typography hierarchy;
- too much empty “marketing” space inside a utility app;
- dashboard metrics where a direct action/list would be better;
- too many top-level tabs;
- generic glassmorphism / startup-purple AI styling;
- action buttons detached from the content they affect.

A mature consumer app should have stronger rhythm: headers, rows, grouped lists, one emphasized task, contextual actions and fewer competing surfaces.

## 3. Recommended interaction style

Target feeling:

**warm + native + useful + quiet + fast**.

Use:

- grouped list rows for dense utility data;
- cards only where a card conveys a meaningful object/state;
- bottom sheets for contextual actions;
- native-feeling segmented controls;
- restrained elevation;
- one strong primary action per context;
- fixed/comfortable one-hand interaction zones;
- plain language, short labels;
- icon system from one family (e.g. Lucide/SF-like outline style), no emoji-first navigation.

## 4. Provisional Tomato palette

This palette is a working direction, not a locked brand identity.

- Primary Tomato: `#E35D4F`
- Primary hover: `#D85144`
- Primary pressed: `#C5463B`
- Primary subtle: `#FBE5E2`
- Background: `#F8F7F4`
- Surface: `#FFFFFF`
- Surface secondary: `#F1F0EC`
- Text primary: `#222523`
- Text secondary: `#6F746F`
- Border: `#DEDCD6`
- Success: `#64846D`
- Success subtle: `#E7F0E9`
- Warning: `#C09342`
- Warning subtle: `#F8EFDB`
- Error: `#B84A42`

Tomato should be used for:

- primary CTA;
- selected/high-priority meal;
- active navigation state;
- important accent/icon;
- focused control state.

Tomato should NOT be used as:

- background of every card;
- every label/chip;
- all icons;
- all status messages;
- large page-wide gradient.

Most of the interface should remain neutral; tomato is a directional signal.

## 5. Typography

Prefer a restrained system-font stack for a native feel.

Suggested hierarchy:

- Page title: 28–32 / semibold
- Section title: 20–22 / semibold
- Object title: 16–18 / semibold
- Body: 15–16 / regular
- Secondary/meta: 13–14 / regular/medium
- Small labels: 12–13 / medium, sparingly

Avoid all-caps utility labels and excessive bold text.

## 6. Spacing / radius / surfaces

Use an 8pt base rhythm with 4pt fine adjustments.

Recommended spacing tokens:

`4 / 8 / 12 / 16 / 24 / 32`

Radii:

- controls: 10–12px;
- cards/sheets: 16px;
- large hero surface: 20px only where justified;
- avoid making every element 20–24px rounded.

Borders before shadows. Shadows only for elevated/floating surfaces.

## 7. Mobile information architecture

Bottom navigation target:

1. Today
2. Menu
3. Shopping
4. More

More contains:

- Recipes / Dishes
- Smart Pantry / Kitchen
- Leftovers
- Freezer
- Family
- Settings

This avoids the current problem of many equal-priority sections.

## 8. Screen direction

### Today

Top to bottom:

- date + compact horizontal day selector;
- breakfast;
- lunch;
- dinner;
- one meal can be visually emphasized based on current time / importance;
- compact Shopping summary;
- “At home / needs checking” summary only if relevant;
- quick add / voice later.

Do not show the whole week as the main content here.

### Menu / Week

Primary job: accept and adjust the plan quickly.

Actions:

- replace one meal;
- pin meal;
- move meal/day;
- mark leftovers use;
- regenerate only unlocked slots;
- apply quick scenario: cheaper / simpler / use home stock / use freezer.

Avoid regenerating the whole week when the user only wants one local change.

### Shopping

Primary job: fast one-hand shopping.

Use:

- large tap targets;
- grouped categories;
- fast check-off;
- quantities visible but not visually dominant;
- quick add at thumb reach;
- purchased items collapse/de-emphasize;
- optional tile/list view only if testing proves both are useful.

AI must not interrupt shopping mode.

### Recipe / Dish

Focus on:

- name;
- family fit;
- time / effort / portions;
- ingredients;
- instructions;
- add to menu / shopping;
- family notes;
- history / last cooked later.

### Smart Pantry

Do not present a giant exact inventory ledger by default.

Show actionable states:

- likely have;
- likely running low;
- uncertain and relevant now;
- leftovers / freezer nearby.

Questions should be fast yes/no/quantity corrections.

### Family

Progressive onboarding, not a long questionnaire.

Start with:

- names/roles;
- hard restrictions;
- obvious dislikes/favorites.

Learn the rest from usage.

## 9. Research references

Use these as pattern sources, not cloning targets:

- Bring! — native shopping interaction and low-friction shared lists;
- AnyList — shared household lists / recipes;
- Mealime — guided meal planning;
- Paprika — recipe utility and planning;
- Samsung Food / Whisk — recipe + planning ecosystem;
- Todoist — mature list density, hierarchy and interaction states;
- Apple HIG — native mobile interaction principles;
- Material Design 3 — state/accessibility/component guidance;
- Mobbin — cross-category pattern research;
- KitchenOwl / Mealie / RecipeSage / Grocy — open-source domain flows.

## 10. Design rule before Codex implementation

Before implementing a screen, define:

- user job;
- one primary action;
- information priority;
- empty/loading/error states;
- mobile behavior;
- accessibility/tap target requirement;
- what NOT to show.

Codex should implement an approved screen spec, not invent the product hierarchy itself.
