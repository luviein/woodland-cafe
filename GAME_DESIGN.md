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
- The customer's order appears as a **speech bubble** (see §3.5 Dialogue) plus an **order ticket**.
- An order is a **recipe plus zero or more modifiers** (see §3).
- The player assembles the dish and serves it.
- The dish is scored on accuracy: **perfect / close / wrong**.

---

## 3. Ingredients, Recipes, Modifiers & Dialogue

All of these are **data-driven**, each in its **own data file**.

### 3.1 Ingredients

| Ingredient | How it's obtained |
| ---------- | ----------------- |
| Bread      | Starter |
| Mushroom   | Starter |
| Jam        | Starter |
| Chilli     | Bought at the Marketplace with Leaves |
| Tuna       | Bought at the Marketplace with Leaves |
| Tomato     | Bought at the Marketplace with Leaves |

### 3.2 Recipes

Each recipe lists its required ingredients. A recipe **only appears in orders once the player owns all of its ingredients**.

**Starter recipes**

| Recipe                | Ingredients              |
| --------------------- | ------------------------ |
| Plain Bread           | bread ×1                 |
| Jam Bread             | bread ×1, jam ×1         |
| Extra Jammy Bread     | bread ×1, jam ×2         |
| Mushroom Bread        | bread ×1, mushroom ×1    |
| Double Mushroom Bread | bread ×1, mushroom ×2    |
| Mushroom Sandwich     | bread ×2, mushroom ×1    |
| Jam Sandwich          | bread ×2, jam ×1         |

**Recipes unlocked by purchasable ingredients**

| Recipe               | Ingredients                      |
| -------------------- | -------------------------------- |
| Tomato Bread         | bread ×1, tomato ×1              |
| Tuna Sandwich        | bread ×2, tuna ×1                |
| Tuna Tomato Sandwich | bread ×2, tuna ×1, tomato ×1     |
| Spicy Tuna Bread     | bread ×1, tuna ×1, chilli ×1     |
| Spicy Mushroom Bread | bread ×1, mushroom ×1, chilli ×1 |

### 3.3 Modifiers

- Modifiers are **separate from recipes**. There are **no** combined recipes such as "Toasted Jam Bread".
- **Order = recipe + zero or more unlocked modifiers.**
- A modifier has:
  - an **id**
  - the **upgrade that unlocks it**
  - **which recipes it can apply to**
  - its own **dialogue lines**

### 3.4 Upgrades (equipment bought at the Marketplace)

| Upgrade          | Unlocks                                      | Applies to                    |
| ---------------- | -------------------------------------------- | ----------------------------- |
| Toaster          | "toasted" modifier                           | Bread recipes                 |
| Butter Churn     | "buttered" modifier                          | *TBD*                         |
| Cutting Board    | "cut in half" modifier                       | *TBD*                         |
| Grill Pan        | "grilled" modifier                           | Mushroom / tomato / tuna recipes |
| Sandwich Press   | "pressed" modifier                           | Sandwich recipes              |
| Seasoning Shaker | "seasoned" modifier                          | *TBD*                         |
| Wrapping Paper   | "to go" modifier                             | *TBD*                         |
| Serving Tray     | **Double orders** (×2 of the same order)     | Any order                     |

- The **Toaster is the first fully built upgrade**. The rest only need **placeholder data entries** for now.

### 3.5 Dialogue

- Every **recipe, ingredient and modifier** has several lines a customer might say, in two styles:

  | Style      | Example |
  | ---------- | ------- |
  | **Direct** | "One jam bread, please!" |
  | **Hint**   | "Something sweet on soft bread, please." |

- Example "toasted" lines:
  - "Make it toasty, please! My paws are freezing."
  - "I like my bread with a bit of crunch."
- Example chilli lines:
  - "Make it spicy! I want my ears to go pink."
  - "Give it a kick!"
- When an order is generated, the customer's **speech bubble is built from matching lines** (for the recipe, its ingredients, and any modifiers).
- The **ratio of hint to direct lines is a config value**, so difficulty can ramp up over days.
- The **order ticket is still shown** for now. Later, hint-only orders may hide it.

---

## 4. Patience & Tips

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

### Missing modifiers

- If the recipe's ingredients are right but a requested **modifier is missing** (e.g. the order was "toasted" but the bread wasn't toasted), the tip is **multiplied by 0.2** (the customer receives 20% of the tip they would otherwise get).
- If the **whole order is wrong**, the result is **wrong**, regardless of modifiers.
- The 0.2 multiplier lives in the **config file** with the other tip values.

### Key tradeoff

The player can leave the counter **before taking an order** to clean messes, but the whole queue keeps losing patience meanwhile. Clean tables mean more seating; an unattended queue means lost tips and lost customers.

---

## 5. Day Cycle & World Map

### 5.1 Day cycle

- One cafe **run is one day**.
- When a run ends, the game shows a **day summary**, and the player can then **exit the cafe**, which opens the world map.

### 5.2 World map

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

### 5.3 Locations (initial)

| Location        | Purpose |
| --------------- | ------- |
| **Cafe**        | Return here to start the next day. |
| **Forest**      | Grassy outdoor area. Some ingredients can be **foraged** (clicked/collected and added to the player's inventory). |
| **Marketplace** | Grassy outdoor area with **shops** where the player spends Leaves on ingredients, upgrades and furniture. |

### 5.4 Leaf pickups

- In both the Forest and the Marketplace, **Leaves randomly spawn on the ground**.
- Picking one up gives **+1 Leaf**.
- **Spawn rate** and **max leaves on screen** live in a config file.

---

## 6. Game State

- All player state lives in **one central, serializable state object**, so it can be saved and loaded later:
  - Leaves
  - Inventory
  - **Owned ingredients**
  - **Owned upgrades**
  - Owned furniture
  - Cafe layout
  - Unlocked locations
- "Serializable" means plain data only (no Phaser objects, class instances, or functions), so it can be converted to JSON and back without losing anything.

---

## 7. Later Features

- Expanding the cafe layout with purchased furniture
- Hiring employees who clean or serve automatically

---

## 8. Art Direction

- Pixel art with Phaser `pixelArt: true` (no texture smoothing).
- Fixed **16×16 tile size**.
- **Integer scaling** only, so pixels stay crisp.
- **Colored placeholder shapes** until the art milestone; real art comes last (including the illustrated island map).

---

## 9. Platform & Input

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

## 10. Milestones

1. **Prep station core loop**
2. **Cafe floor:** customers sit, eat, and leave messes; the player cleans messes (player movement style to be decided)
3. **Connect** the counter queue, patience timers, tip thresholds, and the two scenes
4. **Leaves currency and day cycle** (a run ends, show day summary)
5. **World map** with Cafe, Forest (foraging + leaf pickups) and Marketplace (leaf pickups)
6. **Marketplace shop:** buy ingredients and upgrades (Toaster first), unlocking new recipes, modifiers and dialogue; add hint-style dialogue
7. **Furniture and cafe expansion**
8. **Employees**
9. **Saving and loading**
10. **Pixel art, animation, sound** (including the illustrated island map)
11. **Desktop build** (Tauri or Electron)

### Milestone 1 scope: Prep Station

- Uses the **starter ingredients** (Bread, Mushroom, Jam) and **starter recipes**.
- A random **order** is generated from the recipes the player can make. It's shown as a **direct dialogue line in a speech bubble** alongside the **order ticket**.
- Click/tap ingredients to add them; show the **current dish**; **Serve** and **Reset** buttons.
- Score the dish against the order (**perfect / close / wrong**), then show the next order.
- Data files for **ingredients, recipes, modifiers, upgrades and dialogue** are set up **in their final shape**, with **placeholder entries for purchasable items**.
- **Order generation and comparison are pure functions with Vitest unit tests.**
- Nothing from later milestones (no modifiers in live orders, patience, Leaves, floor scene, world map, shop, etc.).
