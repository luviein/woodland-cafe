---
name: game-testing
description: Verify Woodland Cafe changes with focused Vitest unit and integration tests, regression checks, reproducible debugging and measured performance investigation. Use for bug reproduction, save/state regressions and browser interaction validation without test bloat.
---

# Testing and debugging

Follow [AGENTS.md](../../../AGENTS.md). Vitest runs in Node with co-located `src/**/*.test.ts`; no browser test runner is configured. Inspect current scripts/tools before assuming capabilities.

## Workflow

1. Reproduce the symptom; identify its state transition, renderer or input lifecycle. Read adjacent tests/design.
2. Choose the smallest useful layer: pure logic, data/art validation, game-store integration or actual browser inspection.
3. Use explicit fixtures, injected RNG/time and `memorySaveSlot`. Capture the reported regression without unrelated implementation coupling.
4. Fix the cause; run focused tests, then typecheck, full tests and build before commit. Broaden further only when evidence justifies it.
5. For UI, inspect rendering/inputs/viewports when tools permit, including repeated opens/closes. Node tests do not prove visual quality.
6. Report commands/results, reproduced conditions, measurements and unavailable checks. Do not weaken tests to hide failures.

## Constraints and conventions

- Test invariants: balances, unchanged rejected actions, item conservation, stable IDs, compatible loading and deterministic random boundaries.
- Use `gameStore.test.ts` fake-registry/in-memory patterns for checkpoints; inspect live state and reloaded saves.
- Keep meaningful rule/boundary/regression coverage. Avoid tests mirroring constants, redundant permutations and reversible cosmetic assertions.
- Keep Phaser/browser dependencies out of pure logic. No browser runner, DOM shim or profiler installation without justification.
- Inspect `src/debug/commands.ts`/`help` for syntax. Mutating commands need isolated data or a temporary browser profile; never clear player storage or run `wipesave` without approval.
- Do not start/restart the user's server. If unavailable, report rendered checks outstanding and give manual steps.
- Performance work needs repeatable before/after measurements: frame cost, allocations, textures, listeners or heap across scene visits. Avoid invented FPS targets, brittle timing tests and speculative optimisation.

## Woodland Cafe examples

- Populate case A, open empty B and try clearing B; A remains assigned and disabled B cannot change state.
- Harvest during cafe service; reload and verify harvest persistence without committing unfinished cafe progress.
- Serve with insufficient stock; verify rush delivery costs, consumption and unaffordable failure paths.
- Inspect every affected frog clothing view/pose; schema tests cannot prove hat alignment or readable plaque text.
