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
  1. Wait in line at the counter (patience counting down)
  2. Order, **only once a clean seat is free**; ordering **reserves** that seat
  3. Get served and **pay** (patience stops)
  4. Walk to their reserved seat
  5. Eat
  6. Leave, leaving a **mess** behind
- **One line: the counter queue.** Customers wait at the counter, first come, first served. Line spots are marked in the layout data (`1` = front, `2`, `3`, ...).
  - **No free seat, no order.** The front customer can only order if a clean, unreserved seat is free. Taking their order reserves it. E.g. 2 customers waiting, 1 clean seat: the 1st orders and reserves it; the 2nd keeps waiting, even before the 1st reaches the table.
  - **Taking an order:** the player taps the front customer and walks to the counter spot (`P`, behind the counter across from the order spot `O`); the order is taken on arrival. With no clean seat, a "No clean seats!" message appears and the player must tap again after cleaning.
  - **Cooking:** taking the order opens the prep station on top of the floor. The floor keeps running (patience drops, others eat and leave). Serving stops their patience; they stay at the counter while reacting, and **start moving only when the prep screen closes**: perfect/close → they go to their seat; wrong → they leave, angry, unpaid, freeing the seat. If patience runs out mid-cook, they say so and the prep station closes.
  - So messy tables **block the queue**, and the whole queue keeps losing patience while the player cleans. That's the key tradeoff.
  - Because a seat is guaranteed before ordering, there's never any waiting for a seat after being served, so no one leaves unhappy after paying.
- **Messes are per seat.** A customer leaves a mess on **their own side** of the table. That **seat** can't be used until cleaned, but the other seats at the same table still can.
  - Customers never walk to a messy seat.
- **Cleaning:** tapping a table (or any of its seats) cleans **every mess on that table at the moment of the tap**. Wiping time is per mess: one mess takes 1.5s, two take 3s (config value). A mess that appears mid-wipe needs another tap.
- The **layout is data-driven**: a tile grid defined in a data file, so the cafe can be expanded later without code changes.
- **Player movement: click/tap to walk.** The player taps a tile (or a table, to clean it) and the character finds a path there around furniture. Works the same with mouse and touch, with no hover and no on-screen joystick needed.

### 2.2 Prep Scene (close-up)

- After the player takes an order at the counter, they go to a close-up prep screen (similar in feel to *Good Coffee, Great Coffee*).
- The customer's order appears **only as a speech bubble** (see §3.5 Dialogue). There is **no order ticket**: recipes are not shown with the order.
- A **Recipe Book** button sits at the **top right**. If the player can't remember a recipe, they open the book and look it up.
  - The book lists **only unlocked recipes** (ones the player can currently make), with their layer order. New recipes appear in it as ingredients are bought.
  - Looking things up costs time: once patience exists (milestone 3), it **keeps dropping while the book is open**.
- An order is a **recipe plus zero or more modifiers** (see §3).
- The player builds the dish **layer by layer, bottom to top**, and serves it.
- **Bread placement matters; filling order doesn't.**
  - Bread layers must be where the recipe puts them: at the bottom, and also on top for sandwiches. A Jam Sandwich must be bread > jam > bread.
  - The layers **between** breads (or above the bottom bread, for open breads) can go in **any order**. Tuna Tomato Sandwich accepts bread > tuna > tomato > bread **and** bread > tomato > tuna > bread. Spicy Tuna Bread accepts bread > tuna > chilli **and** bread > chilli > tuna.
  - Which ingredients are "fixed in place" (currently just bread) is a config value.
- The dish is scored on accuracy: **perfect / close / wrong**.
  - **Perfect:** every layer matches the recipe, with bread in the right places (fillings in any order).
  - **Close:** exactly **one mistake**:
    - one layer missing (bread > jam)
    - one layer extra (bread > jam > jam > bread)
    - one layer replaced (bread > mushroom > bread)
    - two neighbouring layers swapped (bread > bread > jam)
  - **Wrong:** two or more mistakes. An **empty dish is always wrong**.
  - Modifiers are checked separately (see §4 "Missing modifiers").
- **No result pop-up.** After serving, the customer **reacts in their speech bubble**, and that's how the player learns how they did:

  | Score   | Reaction    | Example |
  | ------- | ----------- | ------- |
  | Perfect | Happy       | "Just how I like it!" |
  | Close   | Indifferent | "Hmm... it'll do, I suppose." |
  | Wrong   | Angry       | "This isn't what I ordered!" |

  Reaction lines are data-driven (dialogue data file), several per score.

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

Each recipe is an **ordered list of layers, bottom to top**. A recipe **only appears in orders once the player owns all of its ingredients**.

**Starter recipes**

| Recipe                | Layers (bottom > top)     |
| --------------------- | ------------------------- |
| Plain Bread           | bread                     |
| Jam Bread             | bread > jam               |
| Extra Jammy Bread     | bread > jam > jam         |
| Mushroom Bread        | bread > mushroom          |
| Double Mushroom Bread | bread > mushroom > mushroom |
| Mushroom Sandwich     | bread > mushroom > bread  |
| Jam Sandwich          | bread > jam > bread       |

**Recipes unlocked by purchasable ingredients**

| Recipe               | Layers (bottom > top)            |
| -------------------- | -------------------------------- |
| Tomato Bread         | bread > tomato                   |
| Tuna Sandwich        | bread > tuna > bread             |
| Tuna Tomato Sandwich | bread > tuna > tomato > bread    |
| Spicy Tuna Bread     | bread > tuna > chilli            |
| Spicy Mushroom Bread | bread > mushroom > chilli        |

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
| Butter Churn     | "buttered" modifier                          | Any recipe                    |
| Cutting Board    | "cut in half" modifier                       | Any recipe                    |
| Grill Pan        | "grilled" modifier                           | Mushroom / tomato / tuna recipes |
| Sandwich Press   | "pressed" modifier                           | Sandwich recipes              |
| Seasoning Shaker | "seasoned" modifier                          | Any recipe                    |
| Wrapping Paper   | "to go" modifier                             | Any recipe                    |
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
- There is **no order ticket**. The speech bubble is the only clue, plus the Recipe Book for looking up layers. Hint lines therefore make orders genuinely harder to decode.

---

## 4. Patience & Tips

- Every customer in the counter queue has a **patience timer**.
- Patience **always counts down at one fixed rate**, no matter what the player is doing: cleaning, preparing an order, or anything else.
- Patience **keeps dropping at the same rate after the order is taken**, while the player prepares it.
- If patience hits **0 before the order is served**, the customer leaves the queue and the cafe unhappy and **doesn't pay**.
- **Patience stops once the order is served.** The customer **pays when served** (price + tip), then goes to the seat reserved for them.
- A **wrong** dish: the customer **leaves right away**, angry, without paying or eating (so no mess). Their reserved seat is freed.
- When an order is served, the **tip (in Leaves) is based on remaining patience**, using thresholds:

  | Patience left | Tip          |
  | ------------- | ------------ |
  | > 75%         | Full tip     |
  | 50–75%        | Reduced tip  |
  | 25–50%        | Small tip    |
  | < 25%         | No tip       |

- Patience rate, thresholds, and tip amounts live in a **data/config file** so they're easy to tune.
- **As built (placeholders):** dish prices are in `data/prices.ts` (more layers cost more: 2-5 Leaves). Tip settings are in `data/tipConfig.ts`: the full tip equals the price; the patience tiers give 100% / 60% / 30% / 0% of it (a value exactly on a boundary counts as the lower tier). Close ×0.5 and missing modifier ×0.2 apply on top. The tip is rounded to whole Leaves at the end, and a double order pays for two. The payment shows as "+X 🍃" at the prep station, and a temporary total sits top-left on the floor until the wallet arrives in milestone 4.

### Missing modifiers

- If the recipe's ingredients are right but a requested **modifier is missing** (e.g. the order was "toasted" but the bread wasn't toasted), the tip is **multiplied by 0.2** (the customer receives 20% of the tip they would otherwise get).
- The 0.2 penalty is applied **once**, however many modifiers are missing.
- **Extra modifiers** the customer didn't ask for carry **no penalty**.
- If the **whole order is wrong**, the result is **wrong**, regardless of modifiers. A wrong order **pays nothing** (no payment, no tip), like an unhappy customer.
- A **close** order gets a **reduced tip (0.5×)**.
- The 0.2 and 0.5 multipliers live in the **config file** with the other tip values.

### Key tradeoff

The player can leave the counter **before taking an order** to clean messes, but the whole queue keeps losing patience meanwhile. Clean tables mean more seating; an unattended queue means lost tips and lost customers.

---

## 5. Day Cycle & World Map

### 5.1 Day cycle

- One cafe **run is one day**.
- **Day clock:** a day runs from **8:00 to 17:00** in game time, which takes **3 real minutes** (config value). The clock is shown on the floor and at the prep station (it keeps ticking while cooking).
- **Closing time:** at 17:00 the doors close and **no new customers arrive**. Customers already inside stay: the queue can still be served, and patience keeps dropping as usual. The day is **over once the last customer has left**.
- When a run ends, the game shows a **day summary**: customers served (perfect / close / wrong), customers who gave up, Leaves earned (prices and tips), and the wallet total. The player can then **exit the cafe**, which opens the world map. (Until the world map exists, milestone 5, the summary has a **"Start next day"** button instead.)
- **Each day starts fresh:** clean floor, empty queue. Leaves and everything owned carry over.

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
- **Customer groups:** 2+ critters arriving together, ordering together and sharing a table (and leaving messes together). Planned once ordering and the counter queue exist (milestone 3 or later).

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
  - Number keys: add ingredients (each bin shows its number)
  - Enter: serve
  - Backspace: reset
  - R: open/close the Recipe Book; Esc: close it
- **Display:** a fixed base resolution of **640×360** (40×22.5 tiles; scales by whole numbers to 1280×720, 1920×1080 and 2560×1440) with Phaser's Scale Manager (`FIT` mode, centered), using integer scaling where possible, so the game fits any window size and pixels stay crisp.
- **Later milestone:** package as a downloadable desktop app (Tauri or Electron).

---

## 10. Milestones

1. **Prep station core loop**
2. **Cafe floor:** customers sit, eat, and leave messes; the player cleans messes (click/tap-to-walk movement)
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
- A random **order** is generated from the recipes the player can make. It's shown only as a **direct dialogue line in a speech bubble** (no order ticket).
- A **Recipe Book** button (top right) opens a list of unlocked recipes and their layers.
- Click/tap ingredients to add them as layers, bottom to top; show the **current dish** as a stack; **Serve** and **Reset** buttons.
- **Bread placement** is part of scoring; fillings between breads can be in any order.
- Score the dish against the order (**perfect / close / wrong**); the customer **reacts in the speech bubble** (happy / indifferent / angry), then the next order appears.
- Data files for **ingredients, recipes, modifiers, upgrades and dialogue** are set up **in their final shape**, with **placeholder entries for purchasable items**.
- **Order generation and comparison are pure functions with Vitest unit tests.**
- Nothing from later milestones (no modifiers in live orders, patience, Leaves, floor scene, world map, shop, etc.).

### Milestone 2 scope: Cafe Floor (as built)

- The cafe floor is drawn from a **text-grid layout** (`src/data/cafeLayout.ts`), validated on load.
- **Click/tap-to-walk** player with A* pathfinding.
- Customers **walk in, stop at the counter** (a timed stand-in for ordering), **sit, eat, and leave a mess on their own seat**.
- A **waiting line for seats** (first come, first served) with a **seat-wait timer**; customers who wait too long **leave upset**.
- **Cleaning:** tap a table to wipe every mess on it (time per mess), with a progress bar.
- Floor tuning values live in `src/data/floorConfig.ts`, and can be changed live with the dev console (`config`, `set`, `reset`).
- **Temporary in this milestone** (replaced in milestone 3):
  - Ordering is a short timer, and only one customer orders at a time.
  - The prep station is reached with a temporary button, and switching scenes resets the floor.

### Milestone 3 scope: Connected Cafe (as built)

- **One counter queue** on the order spot `O` and the queue spots `1-9`; arrivals stop while it's full.
- **Patience** (`patienceSeconds`, 45s) counts down at a fixed rate from joining the queue until served, shown as a bar over each waiting customer and at the prep station. At 0 they leave upset ("!!"), unpaid.
- **Taking orders:** tap the customer at the counter ("!") and the player walks to the counter spot `P`. The order is taken on arrival if a clean, unreserved seat is free (taking it reserves the seat). Otherwise "No clean seats!" appears ("?" over the customer).
- **Prep station as an overlay** (`scene.launch`): it shows the customer's real order, and the floor keeps running underneath. Serving stops patience; the customer reacts, and **starts walking only once the prep screen closes**: to their seat, or out angry for a wrong dish. If patience runs out mid-cook, they say so and prep closes.
- **Payment** when served: price (`data/prices.ts`) plus a patience-tier tip (`data/tipConfig.ts`), shown as "+X 🍃". (Milestone 4 put it into the real wallet.)
- **Dev console:** `serve [perfect|close|wrong]`, `mess` and `clean` were added for quick testing.
- **Not yet:** the wallet, day cycle and day summary (milestone 4). Ingredients are still the starters for everyone (`STARTER_OWNED`) until the central game state exists. Customer groups come later.
