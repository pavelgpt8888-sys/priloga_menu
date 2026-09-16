# Validation Plan — before monetization and heavy AI

Status: 2026-09-16

## Why this exists

The meal-planning/shopping category is competitive, but fragmented. We should not assume either “the market is saturated” or “our idea is unique”. The next decision should come from household behavior, not feature-count comparisons.

## Product hypothesis

A family will repeatedly use the product if it makes this weekly job easier than Notes/Telegram/paper:

`family habits → realistic week menu → cook once / eat twice where sensible → probable stock → shopping delta → shared execution`

The product wins only if users mostly **approve/correct** a prepared week instead of manually maintaining another database.

## Pilot

Start with 10–30 households.

Run for 4–8 weeks.

Do not require payment initially. Do not add retail integrations for the pilot.

## Minimum pilot product

- Today / selected day with breakfast, lunch, dinner;
- Week menu;
- family restrictions/preferences;
- family repertoire;
- replace / pin / move / never suggest;
- cook-once-eat-twice / leftovers;
- automatic shopping list;
- shared household state when persistence is ready;
- simple “have / ran out” signals;
- no mandatory exact pantry accounting.

Optional later in pilot:

- text/voice command adapter;
- Telegram input;
- probabilistic pantry confidence.

## Metrics

Track:

- Week 1 → Week 4 household retention;
- Week 4 → Week 8 retention if sample allows;
- time to approve/edit a weekly plan;
- accepted vs replaced meals;
- shopping-list manual edits;
- number of “pantry clarification” questions;
- second household member activity;
- cook-once-eat-twice usage;
- “never suggest” usage;
- frequency of opening Today vs Menu vs Shopping;
- qualitative “what would you use instead if this disappeared?”.

## Working decision gates

These are product hypotheses, not external benchmarks.

Continue/invest more if:

- around half or more of pilot households still use the weekly loop by week 4;
- users report clear time/mental-load savings over their previous method;
- users voluntarily return without repeated reminders;
- requested improvements are about workflow depth, not basic confusion;
- second household member/shared shopping creates additional recurring use.

Rework/narrow if:

- menu generation creates more editing than planning manually;
- shopping list requires large manual cleanup;
- users refuse to maintain pantry state;
- household sharing/sync is unreliable;
- AI output needs constant correction.

Stop or pivot if:

- after UX cleanup the core weekly loop is still not used repeatedly;
- users consistently prefer Notes/Telegram/paper because it is faster;
- retention depends only on reminders from us.

## Monetization gate

Only test pricing after repeated weekly use is visible.

Possible later experiments:

- free core + Smart subscription;
- Smart + Saver tier;
- annual family plan;
- one-time purchase for some utility features;
- B2B/retailer monetization only after scale and purchase-intent data justify it.

Do not introduce an aggressive paywall before the first useful week is experienced.

## Implementation rule

Codex should not start monetization, retailer, advertising, complex AI or checkout tasks until this validation gate is explicitly reopened by the product decision-makers.
