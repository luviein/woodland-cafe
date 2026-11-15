---
name: game-systems
description: Implement Woodland Cafe mechanics, progression, inventory transactions, economy and unlocks using existing pure logic. Use for gardening, harvests, shops, stock, seasonal events and museum placement rules.
---

# Gameplay systems

Follow [AGENTS.md](../../../AGENTS.md) and [GAME_DESIGN.md](../../../GAME_DESIGN.md).

## Workflow

1. Trace the scene/panel action through `src/scenes/gameStore.ts` to `src/logic/` and typed `src/data/` configs. Read related tests.
2. Establish eligibility, costs, rewards and rejected-action behaviour. Follow the root design-first rule for behaviour changes.
3. Extend existing pure, immutable transactions and guards such as `canBuy*`. Keep rules out of scenes; inject random draws and timestamps.
4. Validate all inputs before changing balances/items. Preserve existing domain rejection conventions: throwing or unchanged state.
5. Use the appropriate game-store helper; garden, museum and Christmas purchases have special cafe-day checkpoint behaviour.
6. Add meaningful boundary/regression tests and run root validation gates.

## Constraints and conventions

- Read current prices/odds from configs; distinguish unlocks, ownership and stock.
- Reject invalid quantities, non-finite numbers and unsafe balances atomically. Prevent duplicate rewards from repeated input.
- Reuse stock planning/consumption: shortages can incur rush delivery costs rather than simply blocking orders.
- Preserve seasonal calendar boundaries, exclusive mutation draws and independent double-yield rolls.
- Keep crop counts and weight batches consistent. Reuse specimen selection order; sales retain discoveries and heaviest records.
- Museum cases use stable IDs. Clearing/moving one preserves other cases and existing exhibit uniqueness rules.
- Placement preserves collision, reachability, furniture surfaces and rug rules using existing helpers.

## Validation and examples

Test success/rejection, exact funds, quantity boundaries, unlocks, deterministic RNG boundaries and unchanged input state. Verify checkpoint effects for persisted actions.

- Seasonal seeds: guarantee seasonal outcomes without altering ordinary mutation draws.
- Christmas sales: verify weighted ticket credit, batch removal and retained records as one transaction.
- Museum movement: rejected placement preserves the original case and all other exhibits.
