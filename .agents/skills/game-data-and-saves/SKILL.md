---
name: game-data-and-saves
description: Maintain Woodland Cafe serializable state, save compatibility, migrations and integrity. Use for persisted fields, inventory or crop records, checkpoints, load failures and evolving content IDs.
---

# State and saves

Follow [AGENTS.md](../../../AGENTS.md). Never reset progress, clear storage or replace damaged saves to make a feature/test work.

## Workflow

1. Trace fields through `src/logic/gameState.ts`, `createNewGame`, mutations, `src/logic/save.ts`, `src/storage/saveSlot.ts` and readers. Inspect current `SAVE_VERSION` and legacy tests.
2. Define valid shape, defaults, older-save meaning and derived invariants.
3. Extend immutable transitions and compatible loading together. Bump the save version for schema changes; reuse migration and unknown-ID policies.
4. Inspect `src/scenes/gameStore.ts`; preserve subscriptions and checkpoint behaviour through domain helpers.
5. Test round trips, representative legacy versions, missing fields, invalid data and migration invariants with `memorySaveSlot`.
6. Run root gates; report compatibility limitations explicitly.

## Constraints and conventions

- Plain JSON state only: no Phaser objects, functions or Maps. Follow existing readonly conventions.
- Progress and audio settings have separate persistence; changing one must not reset the other.
- Preserve rejection of damaged, unreadable or future saves and the original stored data. Do not autosave a new game over rejected data.
- Validate finite/safe counts, balances, canonical IDs, ownership and placement using existing defaults/filtering.
- Crop counts are authoritative. Sparse weight batches omit standard-weight specimens; missing legacy weights retain their implicit weight, not zero crops.
- Discoveries/heaviest records survive sales and display moves; migrations must not duplicate crops or rewards.
- Garden, museum and Christmas purchase helpers reconcile live state with pre-day checkpoints. Generic `setGameState`/`saveNow` must not accidentally persist provisional cafe earnings/cooking costs. Museum spending respects checkpoint-safe Leaves.

## Validation and examples

Use save tests and `gameStore.test.ts` fake-registry/in-memory patterns. Verify rejected loads retain stored data; exercise blocked-storage behaviour when changing storage handling.

- Add a seasonal record with new-game defaults, legacy loading and best-weight round trips.
- Harvest during cafe service; reload and verify the harvest persists without committing unfinished cafe progress.
- Rename content IDs through compatible mappings or an approved removal policy, never silent loss of owned items.
