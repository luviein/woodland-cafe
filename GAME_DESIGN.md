# Woodland Cafe — Game Design

A cozy 2D pixel-art cafe game. The cafe is run by woodland creatures and serves woodland creature customers.

**Tech:** Phaser 3 + TypeScript, built with Vite, unit-tested with Vitest.

---

## 1. Currency: Leaves

- **Leaves** are the game's currency.
- Payments and tips are earned in Leaves.
- Leaves can also be picked up from the ground in outdoor areas (Forest, Marketplace).

---

## 2. Core Scenes

### 2.1 Cafe Floor (top-down pixel view)

- A **counter** with a **customer queue**, plus **tables and seats** laid out on a tile grid.
- Customer lifecycle:
  1. Wait in line at the counter
  2. Order
  3. Get served
  4. Find a seat
  5. Eat
  6. Leave, leaving a **mess** behind
- **Dirty tables can't seat new customers** until the player cleans them.
- The **layout is data-driven**: a tile grid defined in a data file, so the cafe can be expanded later without code changes.
- Player movement style: *to be decided in milestone 2*.

### 2.2 Prep Scene (close-up)

- After the player takes an order at the counter, they go to a close-up prep screen (similar in feel to *Good Coffee, Great Coffee*).
- An order is a **combination of ingredients** (e.g. acorn bread ×1, berry jam ×2).
- The player assembles the dish and serves it.
- The dish is scored on accuracy: **perfect / close / wrong**.

---

## 3. Patience & Tips

- Every customer in the counter queue has a **patience timer**.
- Patience **always counts down at one fixed rate**, no matter what the player is doing: cleaning, preparing an order, or anything else.
- Patience **keeps dropping at the same rate after the order is taken**, while the player prepares it.
- If patience hits **0 before the order is served**, the customer leaves the queue and the cafe unhappy and **doesn't pay**.
- When an order is served, the **tip (in Leaves) is based on remaining patience**, using thresholds:

  | Patience left | Tip          |
  | ------------- | ------------ |
  | > 75%         | Full tip     |
  | 50–75%        | Reduced tip  |
  | 25–50%        | Small tip    |
  | < 25%         | No tip       |

- Patience rate, thresholds, and tip amounts live in a **data/config file** so they're easy to tune.

### Key tradeoff

The player can leave the counter **before taking an order** to clean messes, but the whole queue keeps losing patience meanwhile. Clean tables mean more seating; an unattended queue means lost tips and lost customers.

---

## 4. Day Cycle & World Map

### 4.1 Day cycle

- One cafe **run is one day**.
- When a run ends, the game shows a **day summary**, and the player can then **exit the cafe**, which opens the world map.

### 4.2 World map

- **Style:** a single-screen, top-down pixel-art illustration of a **grassy woodland island surrounded by water**, with decorative trees.
- Each location is a **small landmark** (building, tree grove, market stalls) with a **clickable signpost-style label** above it.
- The **player's current location** is highlighted in a different colour.
- **Dotted paths** connect the locations.
- **Locked locations** show a **lock icon** on their label.
- Locations are a **data-driven list**, so more can be added later. Each entry has:
  - name
  - position on the map
  - scene to open
  - locked / unlocked
- Until the art milestone, the island and landmarks are **placeholder shapes**.

### 4.3 Locations (initial)

| Location        | Purpose |
| --------------- | ------- |
| **Cafe**        | Return here to start the next day. |
| **Forest**      | Grassy outdoor area. Some ingredients can be **foraged** (clicked/collected and added to the player's inventory). |
| **Marketplace** | Grassy outdoor area with **shops** where the player spends Leaves on upgrades and furniture. |

### 4.4 Leaf pickups

- In both the Forest and the Marketplace, **Leaves randomly spawn on the ground**.
- Picking one up gives **+1 Leaf**.
- **Spawn rate** and **max leaves on screen** live in a config file.

---

## 5. Game State

- All player state lives in **one central, serializable state object**, so it can be saved and loaded later:
  - Leaves
  - Inventory
  - Owned furniture / upgrades
  - Cafe layout
  - Unlocked locations
- "Serializable" means plain data only (no Phaser objects, class instances, or functions), so it can be converted to JSON and back without losing anything.

---

## 6. Later Features

- Expanding the cafe layout with purchased furniture
- Hiring employees who clean or serve automatically

---

## 7. Art Direction

- Pixel art with Phaser `pixelArt: true` (no texture smoothing).
- Fixed **16×16 tile size**.
- **Integer scaling** only, so pixels stay crisp.
- **Colored placeholder shapes** until the art milestone; real art comes last (including the illustrated island map).

---

## 8. Platform & Input

- **Primary target:** PC in the browser (also the main testing setup).
- **Touch-friendly**, so mobile is possible later.
- **All interactions work with mouse clicks and with touch.** No hover-only actions.
- **Optional PC keyboard shortcuts**, e.g.:
  - Number keys: add ingredients
  - Enter: serve
  - Backspace: reset
- **Display:** a fixed base resolution with Phaser's Scale Manager (`FIT` mode, centered), using integer scaling where possible, so the game fits any window size and pixels stay crisp.
- **Later milestone:** package as a downloadable desktop app (Tauri or Electron).

---

## 9. Milestones

1. **Prep station core loop**
2. **Cafe floor:** customers sit, eat, and leave messes; the player cleans messes (player movement style to be decided)
3. **Connect** the counter queue, patience timers, tip thresholds, and the two scenes
4. **Leaves currency and day cycle** (a run ends, show day summary)
5. **World map** with Cafe, Forest (foraging + leaf pickups) and Marketplace (leaf pickups)
6. **Marketplace shop:** buy upgrades and furniture; place furniture to expand the cafe
7. **Employees**
8. **Saving and loading**
9. **Pixel art, animation, sound** (including the illustrated island map)
10. **Desktop build** (Tauri or Electron)

### Milestone 1 scope: Prep Station

- A random **order ticket** built from **3 to 4 ingredients** (e.g. acorn bread ×1, berry jam ×2).
- Click/tap ingredients to add them; show the **current dish**; **Serve** and **Reset** buttons.
- Score the dish against the order (**perfect / close / wrong**), then show the next order.
- Recipes and ingredients live in a **separate data file**.
- The comparison logic is a **pure function with Vitest unit tests**.
- Nothing from later milestones (no patience, Leaves, floor scene, world map, game state, etc.).
