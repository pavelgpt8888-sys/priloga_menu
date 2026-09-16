# Research Synthesis — Meal Planning, Pantry, UX, Open Source

Date: 2026-09-16

This document fixes the conclusions and working hypotheses discussed around the current `priloga_menu` product and the deep-research scope. It is a synthesis for product decisions and future Codex tasks, not a verbatim export of the Deep Research UI.

## 1. Open-source / reference projects

### KitchenOwl — `TomBursch/kitchenowl`

Observed product scope:

- smart grocery list;
- recipes;
- meal plan;
- multi-user real-time sync;
- partial offline support;
- household expense tracking;
- mobile/web/desktop clients;
- self-hosting.

License: AGPL-3.0.

Decision: **do not copy code into a proprietary/commercial product without deliberately accepting AGPL obligations**. Use product flows, architecture concepts and UX ideas as references.

High-value patterns to study:

- household/shared-list flows;
- shopping-first interaction;
- meal plan ↔ recipe ↔ shopping transitions;
- multi-device/offline behavior.

### Mealie — `mealie-recipes/mealie`

Observed product scope:

- recipe manager;
- URL recipe import;
- meal planner;
- shopping list;
- REST API;
- family-oriented use;
- Docker/self-hosting.

License: AGPL.

Decision: architecture and UX reference unless AGPL compatibility is deliberately chosen.

High-value patterns:

- URL/schema recipe import;
- recipe data model;
- meal plan to shopping aggregation;
- external API boundary.

### Grocy — `grocy/grocy`

Observed product scope:

- household stock/inventory;
- shopping lists;
- meal plans;
- barcode scanning;
- external barcode lookup including Open Food Facts;
- REST API;
- household-management features.

License: MIT.

Decision: **most permissive and reusable of the major references found**. Individual code reuse still requires checking the exact file/dependency licenses, but the main project license is suitable for commercial reuse with attribution/license compliance.

High-value patterns:

- stock/product/unit/barcode modeling;
- consumption events;
- inventory API concepts;
- barcode lookup workflow;
- feature flags.

Important product difference: Grocy behaves more like “ERP for the fridge”. Our target should preserve the useful data concepts without requiring users to maintain exact stock manually.

### RecipeSage — `julianpoy/RecipeSage`

Observed product scope:

- recipe import from URL/image/PDF/text;
- nutrition;
- AI cooking assistant;
- offline access;
- drag-and-drop meal planning;
- smart shopping list aggregation;
- recipe scaling/unit conversion;
- family sharing.

License position from project README:

- AGPL-3.0 for non-commercial usage;
- commercial usage requires a separate license.

Decision: **reference only unless a commercial license is intentionally obtained**.

High-value patterns:

- import workflow;
- shopping-item merging;
- meal-plan collaboration;
- recipe scaling/units;
- offline-first consumer UX.

### What's for Dinner? — `abigayleh/whats-for-dinner`

Observed product scope:

- family recipe box;
- weekly meal planner;
- smart grocery list;
- household sync;
- URL/photo recipe import;
- AI grocery categorization;
- modern Next.js/TypeScript stack.

License: proprietary / all rights reserved according to README.

Decision: **no code reuse**. Use only publicly observable architecture/UX ideas and high-level engineering patterns.

High-value reference because its stack and user journey are close to ours.

## 2. Reuse rule

For every external component before reuse:

1. check repository license;
2. check file/package-specific license if copied directly;
3. check dependency licenses;
4. preserve required notices/attribution;
5. if license is copyleft/proprietary/non-commercial and we do not want those obligations, take only general patterns and architecture concepts.

Speed does not justify creating a future licensing problem.

## 3. Product pattern conclusions

The common mature pattern is:

`recipe/meal plan → ingredient needs → shopping list`

Our differentiator should become:

`family context → repertoire → practical menu → leftovers/freezer/probable stock → shopping needs`

The strongest moat is not “having an LLM”. It is household context and the learning loop.

## 4. Smart Pantry research direction

Exact manual inventory is high-friction. The preferred model is probabilistic.

Suggested conceptual entities:

### PantryEstimate

- household_id
- canonical_product/category
- estimated_quantity or range
- confidence
- state: likely_have | uncertain | likely_low | likely_empty
- last_evidence_at
- decay_profile

### StockEvidence

Evidence types:

- purchase_checked;
- explicit_have;
- explicit_ran_out;
- meal_consumed;
- recurring_purchase_prediction;
- receipt;
- barcode;
- photo;
- manual_adjustment.

Rules:

- explicit user signal outranks inference;
- recent purchase increases confidence;
- meal consumption decreases probable quantity;
- confidence decays with time;
- staples decay slowly;
- perishables/menu-specific items decay faster;
- leftovers/freezer are explicit records, not merged blindly into generic stock;
- questions are triggered by decision relevance, not by database completeness.

Question principle:

`ask_score = uncertainty × item_cost_or_importance × relevance_to_current_menu`

A wrong assumption about salt should rarely interrupt the user. A wrong assumption about salmon, olive oil or a key dinner ingredient may justify one quick question.

## 5. Family repertoire conclusions

A useful family planner should rely heavily on known dishes.

Recommended signals:

- member likes/dislikes;
- hard restrictions;
- favorites;
- last cooked;
- repeat frequency;
- weekday fit;
- time/effort/cost;
- kids-friendly;
- leftovers/freezer suitability;
- season;
- accepted/replaced/cooked/skipped events.

The weekly algorithm should be mostly deterministic and inspectable.

AI can help interpret vague requests, but should not decide whether a hard restriction is safe.

## 6. Review-mining / Voice of Customer direction

The deep-research scope explicitly includes public user feedback from Bring!, AnyList, Mealime, Paprika, Samsung Food/Whisk, SideChef, KitchenOwl, Mealie, RecipeSage, Grocy and other relevant apps.

The product decisions to validate through repeated-review patterns are:

- users value fast shared lists and low-friction collaboration;
- users dislike too many taps and overcomplicated inventory maintenance;
- sync reliability is more important than clever AI;
- shopping mode should remain fast and interruption-free;
- recipe import must be reviewable/correctable;
- quantities/units are a frequent source of friction;
- onboarding should be progressive, not questionnaire-heavy;
- paywalls should not break the basic household workflow.

These are working hypotheses until supported by repeated review evidence. Do not treat one review/anecdote as a product law.

## 7. Design research direction

Mobbin is used as a broad pattern library, not as a source to copy screens.

Important references:

- Bring! for native/simple shopping interaction;
- mature consumer/list apps for rhythm and density;
- Apple HIG / Material Design 3 for interaction states and accessibility;
- AnyList/Mealime/Paprika/Samsung Food/SideChef for domain patterns;
- Todoist/Airbnb and similar mature apps for hierarchy and polished utility UX.

Main anti-AI-generated conclusion:

A product looks “AI-generated” when it overuses interchangeable rounded cards, pills, gradients and decorative copy without a strong information hierarchy. Mature apps use more list/row structures, stronger typography, contextual actions, fewer equal-weight surfaces and deliberate state design.

Current preferred visual direction: **Bring-inspired native interaction + provisional Tomato accent**, with colors still open for refinement.

## 8. AI boundary conclusions

Use deterministic TypeScript for:

- planner rules;
- hard family constraints;
- menu state;
- shopping aggregation/deduplication;
- quantities/units;
- inventory confidence/evidence;
- history/learning events;
- permissions.

Use small/cheap model later for:

- intent classification;
- simple natural-language command parsing;
- fuzzy ingredient mapping.

Use larger model only where complexity justifies it:

- complex weekly constraints;
- nuanced recipe interpretation;
- multi-step substitutions/explanations.

Use OCR/vision only for high-value inputs:

- receipt/photo recipe import;
- occasional pantry/fridge refresh.

Do not run vision continuously to maintain stock.

## 9. Target architecture conclusion

Default target:

- Next.js / TypeScript modular monolith;
- PostgreSQL/Supabase persistence when leaving localStorage;
- Household-scoped domain model;
- server-side repositories/services;
- shared command/API boundary;
- PWA/web and Telegram Family Assistant reuse the same business logic.

Avoid infrastructure that does not solve a current product need.

## 10. Bring! monetization reference

Current public evidence (checked 2026-09-16):

- Bring! app is free and contains advertising/in-app purchases;
- App Store lists Bring! Premium subscriptions;
- Bring! Labs sells native advertising formats to brands, including Sponsored Product, Sponsored Post, Category Lead, Recommended Section, Special Campaign, Branding Ad Showcase and Hero Banner;
- Bring! Labs sells personalized retailer offers/brochures/feed-based flyers and positions the platform around first-party purchase-intent signals;
- Bring! Labs states Bring! + Profital support more than 21 million consumers worldwide and over 3.6 million active users in DACH for its commerce-media platform;
- Bring! Labs states Swiss Post acquired a majority stake in 2021.

Official/current references:

- https://www.bringlabs.com/en
- https://www.bringlabs.com/en/brands
- https://www.bringlabs.com/en/retail
- https://www.bringlabs.com/en/about-us
- https://apps.apple.com/us/app/bring-grocery-shopping-list/id580669177

Product implication for us:

Do not copy this monetization at launch. Bring! demonstrates that a free household utility can later monetize purchase intent through Premium + brands/retailers. Our architecture should keep Saver/Offers as a future bounded module, but MVP should optimize household value and retention first.

## 11. Decisions already agreed

- Codex is implementation labor, not decision-maker.
- Build the full target picture first, then an explicitly smaller initial release.
- Initial release does not need AI, recipe OCR, retailer APIs, SKU, promotions or checkout.
- Do not rewrite from scratch.
- Menu + shopping are the primary product.
- Smart Pantry should minimize user effort rather than maintain exact stock.
- Bring!-style native interaction is a stronger direction than dashboard/bento UI.
- Tomato is the current preferred palette direction, but not permanently locked.
- Future retailer/promotion functionality must not distort the core architecture today.

## 12. Research record

Deep-research sessions were launched on 2026-09-16 covering:

- open-source architecture/licensing;
- Voice of Customer / review mining;
- Mobbin/native design-pattern audit;
- anti-AI-generated UI analysis;
- Tomato design direction;
- Smart Pantry;
- family repertoire/menu algorithm;
- AI cost boundaries;
- architecture/migration/roadmap;
- Bring! monetization.

The detailed Deep Research UI output is not stored verbatim in this repository by this commit; this document records the working synthesis and decisions available to the project. If a final exported report is later available as text/file, store it separately under `docs/research/` as an immutable source document rather than replacing this synthesis.
