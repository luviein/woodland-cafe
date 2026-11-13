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
  1. Wait in line at the counter (patience stays full: they're happy to wait)
  2. Order, **only once a clean seat is free**; ordering **reserves** that seat and **starts their patience**
  3. Get served and **pay** (patience stops)
  4. Walk to their reserved seat
  5. Eat
  6. Leave, leaving a **mess** behind
- **One line: the counter queue.** Customers wait at the counter, first come, first served. Line spots are marked in the layout data (`1` = front, `2`, `3`, ...).
  - **No free seat, no order.** The front customer can only order if a clean, unreserved seat is free. Taking their order reserves it. E.g. 2 customers waiting, 1 clean seat: the 1st orders and reserves it; the 2nd keeps waiting, even before the 1st reaches the table.
  - **Taking an order:** the player taps the front customer and walks to the counter spot (`P`, behind the counter across from the order spot `O`); the order is taken on arrival. With no clean seat, a "No clean seats!" message appears and the player must tap again after cleaning.
  - **Cooking:** taking the order opens the prep station on top of the floor. The floor keeps running (patience drops, others eat and leave). Serving stops their patience; they stay at the counter while reacting, and **start moving only when the prep screen closes**: perfect/close → they go to their seat; wrong → they leave, angry, unpaid, freeing the seat. If patience runs out mid-cook, they say so and the prep station closes.
  - So messy tables **block the queue**: the queue doesn't lose patience while the player cleans, but every minute spent away from the counter is a minute less to serve before closing time (§5.1). That's the key tradeoff.
  - Because a seat is guaranteed before ordering, there's never any waiting for a seat after being served, so no one leaves unhappy after paying.
- **Messes are per seat.** A customer leaves a mess on **their own side** of the table. That **seat** can't be used until cleaned, but the other seats at the same table still can.
  - Customers never walk to a messy seat.
- **Cleaning:** tapping a table (or any of its seats) cleans **every mess on that table at the moment of the tap**. Wiping time is per mess: one mess takes 0.5s, two take 1s (config value). A mess that appears mid-wipe needs another tap.
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
  - A **modifier** that's missing or extra also counts as one mistake (see §4 "Modifier mistakes").
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

(Each ingredient's dish layer has its own colours, so stacks read at a glance, e.g. bread is cream with a crust, mushroom tan and brown.)

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

#### Optional extra ingredient

- Random orders have a 50% chance (extraIngredientChance) of requesting one extra ingredient in a supplementary sentence, e.g. "A tuna sandwich, please!" followed by "Add some mushrooms too!".
- Pick uniformly from owned ingredients absent from the recipe, excluding bread. Any combination is allowed. With no eligible ingredient, skip the extra request.
- Add one layer inside the top bread of a sandwich, or on top of open bread. Fillings work in either order; omitting the extra is one layer mistake.
- Extras use stock and rush deliveries normally, and add twice their ingredient unit price to the dish price. Double orders include the extra on both dishes. Eligibility means owned, regardless of current stock.
- The guided tutorial keeps its fixed Jam Bread order without extras. The recipe book lists base recipes; the customer supplies the extra request.
- Add Tuna Bread (bread > tuna), Tomato Sandwich (bread > tomato > bread), Mushroom Tomato Bread (bread > mushroom > tomato), and Spicy Tomato Bread (bread > tomato > chilli). They unlock when all ingredients are owned and have direct and hint dialogue.


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

#### Toasting (the Toaster at the prep station)

- Once the Toaster is bought (Tools stall, 🍃30, §5.6), it sits on the prep counter beside the plate, and customers can ask for **toasted** dishes.
- **Toasting is drag and drop, for the whole dish** (toasted is one modifier for the whole order):
  1. Build the dish (or part of it), then **drag it from the plate into the toaster**. The plate is left empty.
  2. The toaster works for a short while (**about 2 seconds**, config value) and shakes a little.
  3. The dish **pops up on top of the toaster**, toasted (its bread looks browner).
  4. **Drag it back onto the plate.** It counts as toasted from then on, even if more layers are added after.
- Dropping the dish anywhere else sends it back where it came from (the plate, or the top of the toaster).
- While the dish is **in or on the toaster**, the bins, Serve and Reset are greyed out: there's nothing on the plate to add to or serve.
- The toaster doesn't take an empty plate or a dish that's already toasted.
- **Reset** clears the toasting too. Toasting costs nothing; stock is still used on serving.
- Toasting a dish that wasn't asked for toasted is a mistake, like forgetting to toast one that was (§4 "Modifier mistakes"). It also wastes time: patience keeps dropping while toasting.
- **Keyboard:** `T` puts the dish in the toaster, and takes it back to the plate once it's done.

### 3.5 Dialogue

- Every **recipe and modifier** has several lines a customer might say, in two styles:

  | Style      | Example |
  | ---------- | ------- |
  | **Direct** | "One jam bread, please!" |
  | **Hint**   | "Something sweet on soft bread, please." |

- Example "toasted" lines:
  - "Make it toasty, please! My paws are freezing."
  - "I like my bread with a bit of crunch."
- When an order is generated, the customer's **speech bubble is built from matching lines**: one for the recipe, then one per modifier. Each part picks direct or hint on its own, so "One jam bread, please! I like my bread with a bit of crunch." can happen.
- **Hints describe the whole dish**, using the same clue words for each ingredient so they can be learned: sweet / sticky / berries = jam, earthy / forest floor / under the trees = mushroom, from the river / fishy = tuna, round and red / from the garden = tomato, spicy / fiery / a kick = chilli. "On a slice" means open bread; "between two slices" / "tucked inside" means a sandwich; "twice" / "more of it" means a doubled layer.
  - Every recipe needs its **own** hint lines. Building a hint ingredient by ingredient ("Something soft... Something earthy.") was dropped: it can't tell Mushroom Bread from Double Mushroom Bread or a Mushroom Sandwich. (Ingredients therefore have no lines of their own any more.)
  - Each hint must point to exactly one recipe.
- **Hints get more common day by day:** day 1 has none, each day adds **10%**, up to **50%** (day 6 on). Start, step and cap are config values (`data/hintConfig.ts`).
- There is **no order ticket**. The speech bubble is the only clue, plus the Recipe Book for looking up layers. Hint lines therefore make orders genuinely harder to decode.

### 3.6 Ingredient stock

- **Owning vs. stock:** *owning* an ingredient (starter, or bought once at the Marketplace) means its recipes can appear in orders. **Stock** is how many of it the cafe has. Both are part of the game state.
- **Starting stock:** 30 each of bread, mushroom and jam.
- **Unit price** (Marketplace and the base for everything else): bread, mushroom and jam 1 Leaf; tomato and chilli 2; tuna 3. In a data file, with the one-time unlock prices.
- **Using stock:** ingredients are used **when the dish is served**: whatever is on the plate, times the order quantity. Adding a layer only reserves it, so **Reset gives it back** for free. A **wrong dish still uses its ingredients**.
- **Rush delivery:** a layer with no stock left is **bought automatically with Leaves**, at **2× the unit price** (config value). That makes foraging and stocking up worth it.
- **Can't add it:** with no stock and not enough Leaves for a rush, the bin is greyed out ("Out of jam").
- **Prep bins** show the stock left ("×5"), or the rush price at 0 ("🍃2").
- **Out of stock = customer leaves:** when an order is taken, if the dish **can't be made** (stock plus the rush deliveries the wallet can pay for), the customer says so and **leaves upset, unpaid**. It counts in the day summary.
- **Dish prices** cover their ingredients: **price = 2 × ingredient cost + 2** (Plain Bread 4, Jam Bread 6, three-layer starters 8, Tuna Tomato Sandwich 16). So a right dish always earns something: from stock you keep cost + 2 (plus tip); fully rush-bought, 2 (plus tip).

---

## 4. Patience & Tips

- Every customer has a **patience timer**.
- **Waiting in the queue doesn't use patience.** It starts counting down only **when the player takes their order**. (Changed in milestone 6: before, it dropped from the moment they joined the queue.)
- From then on it counts down at **one fixed rate**, no matter what the player is doing: cooking, reading the Recipe Book, toasting, or anything else.
- If patience hits **0 before the order is served**, the customer leaves the cafe unhappy and **doesn't pay**.
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
- **As built (placeholders):** dish prices are in `data/prices.ts` (milestone 5 raised them to cover ingredients, see §3.6; before that, 2-5 Leaves by layer count). Tip settings are in `data/tipConfig.ts`: the full tip equals the price; the patience tiers give 100% / 60% / 30% / 0% of it (a value exactly on a boundary counts as the lower tier). Close ×0.5 applies on top (until milestone 6, a missing modifier also cut it ×0.2; now it's a scoring mistake instead). The tip is rounded to whole Leaves at the end, and a double order pays for two. The payment shows as "+X 🍃" at the prep station, and a temporary total sits top-left on the floor until the wallet arrives in milestone 4.

### Modifier mistakes

- A modifier counts like a layer: **each one that's wrong is one mistake** in the score (§2.2).
  - **Missing:** the customer asked for it and didn't get it (asked for toasted, got plain bread).
  - **Extra:** the customer got it without asking (toasted when they wanted it soft).
- So a dish with the right layers but one modifier wrong is **close** (indifferent reaction, tip ×0.5). A layer mistake plus a modifier mistake is two mistakes: **wrong**, which pays nothing.
- (Changed in milestone 6. Before, a missing modifier only cut the tip to 20% and kept the score, and an extra one had no penalty at all. That made toasting "just in case" free, and a perfect reaction for a dish the customer didn't ask for felt wrong.)
- A **wrong** order **pays nothing** (no payment, no tip), like an unhappy customer.
- A **close** order gets a **reduced tip (0.5×)**, a config value with the other tip settings.

### Key tradeoff

The player can leave the counter **before taking an order** to clean messes; the queue waits patiently. But the day is short: clean tables mean more seating, and an unattended queue means fewer customers served before closing time, when everyone still waiting goes home. Once an order is taken, the clock is on: patience (and the tip) drops until it's served.

---

## 5. Day Cycle & World Map

### 5.1 Day cycle

- One cafe **run is one day**.
- **Day clock:** a day runs from **8:00 to 17:00** in game time, which takes **3 real minutes** (config value). The clock is shown on the floor and at the prep station (it keeps ticking while cooking).
- **Closing time:** at 17:00 the doors close and **no new customers arrive**. Everyone **still waiting in the queue goes home** (calmly: unpaid, but not counted as giving up). A customer whose order has been taken can still be served, and seated customers finish eating. The day is **over once the last customer has left**.
- When a run ends, the game shows a **day summary**: customers served (perfect / close / wrong), customers who gave up or left because an ingredient ran out, Leaves earned (prices and tips), ingredients used (from stock / rush-bought), Leaves spent on rush deliveries, the day's net, and the wallet total. The player can then **exit the cafe**, which opens the world map.
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
| **Cafe**        | Return here to start the next day. Tapping it on the map first asks "Start Day N at the cafe?" (**Open cafe** / **Not yet**), so a new day never starts by surprise. |
| **Forest**      | Grassy outdoor area. Some ingredients can be **foraged** (clicked/collected and added to the player's stock, §5.5). |
| **Marketplace** | Grassy outdoor area with **shops** where the player spends Leaves on ingredients, upgrades and furniture (§5.6). |

### 5.4 Leaf pickups

- In both the Forest and the Marketplace, **Leaves randomly spawn on the ground**.
- Picking one up gives **+1 Leaf**.
- **Spawn rate** and **max leaves on screen** live in a config file.
- **Daily cap:** at most **15 Leaves a day** from the ground, counted across the Forest and the Marketplace together (config value). It resets when the next day starts. Outdoors, "Leaves today: 6/15" shows the count; at the cap no new leaves appear, and a line says the ground is bare until tomorrow. This keeps the cafe the main way to earn: leaf pickups are a bonus, not a farm. (A per-visit cap was rejected: leaving and coming straight back would get around it.)

### 5.5 Foraging

- The **Forest** has forage spots, a data list (place, position, ingredient, amount), so more can be added later (e.g. chilli bushes once chilli can be owned):

  | Spot           | Gives       | In the Forest |
  | -------------- | ----------- | ------------- |
  | Mushroom patch | +2 mushroom | 4 |
  | Berry bush (the cafe makes jam from the berries) | +2 jam | 2 |

- **Gathering:** tap a spot; the player walks next to it and gathers for about 1 second (config value), with a progress bar like cleaning. Then "+2 Mushroom" floats up and it goes into **stock**. Tapping elsewhere cancels.
- **Regrowth:** each spot can be gathered **once a day** and grows back the next day. A gathered spot looks bare (no mushrooms, no berries). Gathered spots are kept in the game state, so going to the map and back doesn't regrow them.
- **Worth:** all six spots give 12 stock a day (about 12 Leaves at the unit price, 24 at the rush price), about the same as the daily leaf pickup cap. A bonus, not a replacement for the cafe.
- The Marketplace has no forage spots; its shops come in milestone 6 (§5.6).

### 5.6 Marketplace shops

- The Marketplace has **five stalls**: the three below, plus the Carpenter (§5.7) and the Notice Board (§5.8). In December a sixth, the **Christmas stall** (§5.10), stands on its own below them. Tapping one walks the player to its counter and opens its **shop panel**; Close (or `Esc`) shuts it. The Marketplace keeps running under the panel (leaves keep falling); the player just stands at the stall.

  | Stall | Sells |
  | ----- | ----- |
  | **Pantry** | Stock of every **owned** ingredient, at its unit price (§3.6) |
  | **Specialty** | One-time **unlocks** for chilli (15), tomato (10) and tuna (20). Once unlocked, its recipes appear in orders, its bin shows at the prep station, and the Pantry sells its stock. Bought ones show "Owned". |
  | **Tools** | **Upgrades** (§3.4). For now only the Toaster (30, see "Toasting" in §3.4); the others aren't listed until they're built. Bought ones show "Owned". |

- **Each stall has its own look**, from the player's drawings: the Pantry (green awning, a loaf sign, a basket), Specialty (gold, a star), Tools (blue, a hammer), the Carpenter (rust, a saw) and the Notice Board (a corkboard on legs with notes pinned up). Their open middles are backed with dark wood. The world map keeps the small plain stall as the Marketplace's icon.
- **Buying stock is one unit at a time:** each ingredient row has a **+1** and a **+10** button. Each tap buys straight away (no basket, no checkout) and shows the new stock. A button is greyed out when the wallet can't pay for it, so +10 can be grey while +1 still works.
- A newly unlocked ingredient starts with **0 stock**: buy some at the Pantry, or the first dishes are rush deliveries.
- **Spending** never takes the wallet below 0; a purchase that can't be paid for does nothing (the buttons are greyed out anyway).

### 5.7 Furniture and decorating

- **Pieces:** for now, **tables** (🍃30) and **chairs** (🍃10), each one tile. A chair is a seat: customers sit on it and eat at the table it touches. More kinds (bigger tables, decorations) can come later.
- **Starting furniture:** the cafe opens with today's 4 tables and 8 chairs already placed.
- **Buying:** the **Carpenter** stall at the Marketplace sells them one at a time (**+1**). Bought pieces go into **storage**, not straight into the cafe.
- **Decorating:** tapping **Cafe** on the world map offers **Open cafe**, **Decorate** or **Not yet**. Decorate shows the empty cafe (no customers) with the storage tray:
  - Tap **Table** or **Chair** in the tray, then tap a floor tile to place it there. It stays selected, so several can be placed in a row.
  - **Tap a placed piece** to open a small menu over it with two icon buttons: **Move** (four arrows) and **Put away** (a storage crate). Tapping anywhere else, or `Esc`, closes it.
    - **Move** lifts just that piece: its see-through copy follows the pointer, and the next tap on the floor puts it down there, by the same rules as dragging. `Esc` puts it back where it was.
    - **Put away** returns just that piece to storage, even a table: its chairs stay where they are (a chair with no table is allowed, just unused), the same as moving.
  - **Drag** a placed piece to another tile to move it. Only that piece moves, even a table: its chairs stay where they are. A see-through copy follows the pointer or finger, snapped to the tiles, and turns red where it can't go; a refused drop says why and leaves everything where it was. (A press without dragging is a tap, which opens the menu.)
  - Pieces can also be **dragged straight from the tray** onto the floor, as well as tap-then-tap.
  - **Moving is free.** Only buying costs Leaves.
  - **Done** goes back to the map.
- **Placement rules** (a refused tap says why, e.g. "A chair needs a table next to it"):
  - Only on plain floor: not the door, the counter, the player's counter spot, the order spot or the queue spots.
  - A chair can touch **at most one** table (so it's clear where its customer eats). A table can't go where it would make a chair touch two.
  - Nothing may cut the floor into pieces: everywhere walkable must stay connected, and every table and chair must have floor next to it, so customers can reach their seat and the player can clean.
- A table with no chairs, or a chair with no table next to it, is allowed but unused: nobody can sit there. (So moving a table away from its chairs just leaves them standing.)
- **Furniture is in the game state** (§6): what's placed where, and how many of each are in storage. The room itself (walls, door, counter, queue) also lives in the player save and has its finishes edited with **Wallpaper** and **Floor** in Decorate (§9.3).
- Decorating is only between days, from the map, so nobody is ever sitting at a table that moves.

### 5.8 Employees

- **A quiet start:** a new customer arrives every **9-15s** (`spawnIntervalMin` / `Max` in `data/floorConfig.ts`), about 15 a day. Busier days are something the player grows into by hiring the Mascot.
- **Roles** (one of each for now; placeholder wages in `data/employees.ts`):

  | Role | Does | Wage |
  | ---- | ---- | ---- |
  | **Mascot** | Dances outside the cafe, seen on the world map next to the cafe. While the doors are open, the gap between arrivals is multiplied by `mascotIntervalMultiplier` (**0.6**, so 9-15s becomes about 5-9s). | 🍃20 / day |
  | **Cleaner** | Walks to the nearest mess and wipes it (a little slower than the player). Never goes for a table the player is already heading to clean. | 🍃15 / day |

- **Progression:** the Mascot brings more customers, more customers make more messes, and that makes the Cleaner worth hiring.
- **Hiring:** at the **Notice Board** stall in the Marketplace, in the same kind of shop panel. Each role has **Hire** or **Let go**. Hiring and letting go are free; employees start working from the next day opened.
- **Wages** are paid at the end of each day and shown on the day summary ("Wages -🍃N"). If the wallet can't pay someone in full, they quit unpaid (the summary says so) and can be hired again later.
- **Employees are in the game state** (§6): which roles are hired.

---

### 5.9 Tutorial and mini story

- **The story:** the player (the hedgehog) arrives on Woodland Island to take over an old cafe from **Grandma Badger**, who is retiring. She hands over the keys and **30 of each starter ingredient** from her pantry (the starting stock, §3.6), shows them the ropes on their first day, then leaves them to it: "The cafe's yours now, dear."
- **The story box:** Grandma Badger's portrait (her 16x24 sprite, larger) beside a few short lines of text, at the bottom of the screen, with **Next** for story lines and **Skip tutorial** (which asks first). A **bouncing arrow** points at whatever the line is about. Story lines wait for Next; "do this" lines stay up until the player does it.
- **Only on a new game.** Saves from before the tutorial existed count as already past it.
- **The steps** (each starts when the one before is done):
  | Step | Where | Grandma says (roughly) | Done when |
  | --- | --- | --- | --- |
  | intro | cafe, Day 1 | welcome, the keys, the 30 of each ingredient | Next on the last line |
  | takeOrder | cafe | a customer is here: tap them at the counter (arrow on them) | their order is taken |
  | prep | prep station | what they want, **listen for little extras** (e.g. toasted: getting them right earns a bigger tip), the Recipe Book, then build it: the arrow goes to each bin in turn (Bread, then Jam) and then to Serve | the dish is served |
  | clean | cafe | they ate and left a mess: tap the table to wipe it | that mess is wiped |
  | freePlay | cafe | customers will keep coming until closing: off you go! | Next |
  | summary | day summary | how the day went: takings, stock used, wages later on | Exit cafe |
  | map | world map | every place, with the arrow on its sign: the **Cafe** (opens the next day; **Decorate** to arrange tables and chairs), the **Marketplace** (Pantry: stock; Specialty: new ingredients; Tools: equipment; Carpenter: furniture; Notice Board: staff), the **Forest** (Leaves and foraging) | Next on the last line |
  | explore | Marketplace, Forest | the first time the player walks into each: the **Marketplace** guide (the arrow on each stall in turn, with what it sells) and the **Forest** guide (picking up Leaves, gathering mushrooms and berries, the arrow on a patch) | both guides seen (in either order, any day) |
  | farewell | world map | you've seen it all; the **?** button appears and she points at it: tap it any time to read her notes; goodbye | Next on the last line: the tutorial is done |
- **The guided start of Day 1:** during intro, takeOrder, prep and clean, the **day clock is paused** and only **one** customer comes: they arrive once the intro is over, are always the same critter (the mouse), always order **Jam Bread**, and their **patience doesn't run out**. From freePlay on, Day 1 runs as normal (the clock starts, customers arrive as usual).
- **Next, or wait for the player, per line:** in steps that wait for the player to do something (the first customer, the prep station, cleaning, the day summary, the explore reminder), one line is the **waiting** line: it shows without Next until the player does it. Which line that is, is chosen per line in the text editor (none chosen: the last line). Lines **after** the waiting line show once the player has done it, each with Next, then the tutorial moves on (acting early jumps straight to them). That only works where the screen stays put after the action (cleaning); elsewhere the screen changes right away, so the waiting line must be last there. Steps with nothing to wait for only have Next.
- **At the prep station during the guided first order,** the bins and Serve are locked while Grandma is still explaining, until she reaches her waiting (instruction) line, so her lines can't be skipped by just making the dish (the Recipe Book stays open to use). Then only the bin of the next right layer can be tapped (Bread, then Jam), and **Serve** works only once the dish is complete: nobody can get the first dish wrong while learning. Grandma's arrow follows the same: the next bin, then Serve.
- **Skip tutorial** ends it at once: Day 1 just carries on as a normal day. It also skips the Decorate tips below.
- **Decorate tips, the first time only:** the first time the player opens Decorate, Grandma explains the storage tray, placing a piece (tap or drag), the Move / Put away menu on a placed piece, dragging, and the rules (chairs at one table at most, keep the way clear). Seen once (or skipped), never again. Remembered in the game state with any other one-off tips.
- **Grandma's notes:** a **?** button next to the speaker, on every screen once the tutorial is over (it first appears at the farewell, when she points at it), opens a notebook of everything she explained, by topic (the cafe, the prep station and extras, cleaning, the day summary, the map and its places, decorating, staff), to read again any time. The game pauses while it's open.
- **The story box layout:** Skip tutorial sits under the portrait and Next at the right, so they never overlap, whatever the box's width. Boxes along the bottom start right of the corner buttons (the speaker and **?**), so those never cover Grandma.
- **Places stay locked during the tutorial:** until the player finishes Grandma's map lines, the Forest, the Marketplace (and any place added later) show a lock on their signpost; her last map line unlocks them (the map redraws). The **Cafe** (opening the next day, and Decorate) stays locked until the whole tutorial is over, i.e. after both place guides and her farewell, so Day 2 can't start in the middle of it. Tapping a locked sign says why (finish the tour first / look around the Forest and Marketplace first / listen to Grandma first).
- **The place guides** are one-off tips like Decorate's: also shown to players who started before the tutorial existed, the first time they visit after it was added; skipped along with the tutorial.
- The tutorial step is part of the game state, so it's saved; a reload during Day 1 starts Day 1 again (saves are between days only, §6.1), with the tutorial from its first cafe step.

### 5.10 Christmas stall and catalogue

- **A seasonal stall:** the **Christmas stall** (the player's own stall art: snowy roof, a wreath, a candy-striped awning, a red counter with stockings) stands in the open lower middle of the Marketplace. It's there from **1 December to 31 December** (the player's own date). **While testing it's always there** (a dev setting, on in the dev build; the release build goes by the date).
- **The catalogue:** tapping the stall opens a **catalogue** instead of a shop list, in the cafe's own look (wood and cream paper, not copied from other games):
  - **Cover:** "Woodland Cafe Catalogue", "Christmas Edition", a snowy picture and **Tap to open**. A close button in the corner; `Esc` closes it too.
  - **Opened:** a **two-page book**. Each page holds **2 tall item cards** side by side: the item's picture, its name, one line about it, and its **price button** (🍃). Every picture is drawn **at the same scale (2x)**, so sizes compare as they do in the cafe (the tree taller than the poinsettia). **Opening** is like a book: the cover swings open on its spine and the left page unfolds. **Turning a page:** tap a page's folded bottom corner (it stays still, lifting slightly only while the pointer is over it) (right to go on, left to go back; the arrow keys too): the page folds over the spine and its back lands on the other side. Page numbers at the bottom of each page, and the wallet as plain dark text on the paper: "Your leaves:", the leaf, the amount; **tabs down the side** for the catalogue's sections: **Furniture** (its tables and chairs), **Decor** (floor decorations) and **Wall** (wall decorations). How many of each you have shows on its card. Left/right arrow keys turn the pages.
  - **Buying** is like the Carpenter: one tap buys one, straight into **storage**; the button is greyed out when the wallet can't pay.
- **The Christmas edition** (the player's own item art, converted to the game's pixel grid like the critters):

  | Item | Placed | Price |
  | ---- | ------ | ----- |
  | Christmas Tree | floor, one tile (drawn taller) | 🍃80 |
  | Snowman | floor | 🍃60 |
  | Table & Candle | floor, **a table** (customers eat at it) | 🍃50 |
  | Chair with Bow | floor, **a chair** (customers sit on it) | 🍃20 |
  | Gift Boxes | floor | 🍃35 |
  | Poinsettia Plant | floor | 🍃20 |
  | Snow Globe | floor | 🍃15 |
  | Pine Garland | back wall | 🍃35 |
  | Fairy Lights | back wall | 🍃25 |
  | Stockings | back wall | 🍃20 |
  | Bauble Ornaments | back wall | 🍃20 |
  | Christmas Wreath | back wall | 🍃35 |
  | Lantern | back wall | 🍃20 |
  | Christmas Tree Picture | back wall | 🍃40 |

- **Furniture designs:** a placed piece and a stored piece now say **which design** it is (e.g. the plain chair or the Chair with Bow), not only table or chair. Every design has a **kind**: table, chair, floor decoration or wall decoration. Tables and chairs follow the seating rules of §5.7 whatever their design.
- **Floor decorations** take one floor tile, by the same rules as a table (only plain floor; the floor must stay connected), but nobody sits at them and a chair next to one isn't next to a table.
- **Wall decorations** hang on the **back wall**, one wall tile each, on any free wall tile: not over a window or the clock. They don't touch the floor, so they never get in anyone's way. Things that hang from a line (the garland, the fairy lights, the baubles) hang from the wall's **top edge** and reach across the whole tile, so several side by side join into one long string; the rest hang in the middle of the tile.
- **The counter** takes decorations too, one per counter tile, never in anyone's way:
  - **along its front:** the Pine Garland and Fairy Lights (also wall pieces) hang from the counter's front edge;
  - **on top:** small things stand on it: the Snow Globe (also a floor piece), the Lantern and the Christmas Tree Picture (also wall pieces).
- **Table & Candle** is drawn wider than its tile (30 pixels), so it's clearly bigger than the chairs around it.
- **Decorate:** the storage tray shows **one card per design** owned (its picture and a count), so all the new pieces can be placed by tap or drag, and Move / Put away work on them like on tables. The catalogue is opened from the Marketplace stall only.
- **Bought Christmas pieces stay** after December: they're the player's to keep and place all year; only the stall goes away.
- **In the game state** (§6) and the save: furniture records the design. Older saves load with the plain table and chair designs (a save version bump, §6.1).

### 5.11 Wardrobe (in progress)

- First step: review a Santa hat and coat fitted to the existing hedgehog, inspired by the supplied Christmas clothing sheet. Clean pixel outlines and matching front, back, left and right views; retain the existing face, spines and walking feet.
- Clothing is separate transparent art on the hedgehog's frame grid, with equipped examples in the sprite gallery for review before use in play.
- Tapping the player on the cafe floor or outdoors opens a cafe-styled wardrobe with a four-direction character preview, Hats and Tops tabs, item cards and equip/remove controls. The Santa hat and coat are free starter cosmetics. Changes apply immediately; Close or Escape returns to play. The world continues running, as with the shops and recipe book.
- Outfits use separate head and top slots, are saved with the normal game save (during a cafe day, at the end of that day), and appear in every walking direction. Older saves start without clothing. Capes, shoes, purchases and other animals follow later.
- The wardrobe's **Animal** tab lets the player change freely between hedgehog, rabbit, mouse and deer. The preview and walking character change immediately, keeping the equipped outfit with its animal-specific fitting. The choice saves with the outfit; older saves default to hedgehog. This changes appearance only, not movement, interactions or game rules.
- The Christmas clothing collection also includes antlers, a red bobble hat, a green winter beanie; a cream reindeer sweater, green tree jumper and patterned festive jumper; red, green, cream and tartan capes; and red, brown, buckled and fluffy boots. They are inspired by the supplied clothing sheet and fitted to all four playable animals.
- Clothing is sold in the Christmas catalogue's **Clothes** section, after Furniture, Decor and Wall. Each item is bought once, owned for all four animals and kept after December. Hats cost 🍃15 (antlers 🍃20), tops 🍃25, capes 🍃30 and shoes 🍃15 (buckled/fluffy boots 🍃20). New games own the Santa hat and coat; saves made before clothing purchases keep the entire collection they previously had access to, including equipped items.
- The wardrobe keeps all four cards visible in each category. Unowned items show **Locked** and cannot be equipped; a note directs the player to the Christmas catalogue. Buying clothing deducts Leaves, adds it to the wardrobe and autosaves between days. Owned catalogue items show **Owned** and cannot be bought again.
- A seasonal NPC tends the Christmas stall from behind its counter. Tapping the vendor uses the same walk-to-counter and catalogue interaction as tapping the stall. The NPC appears only when that stall is present, uses the existing critter and clothing art, and moves with the stall in Arrange mode.
- Each clothing card in the Christmas catalogue shows the player's currently selected animal wearing that garment, with its real colours, face, body and gameplay clothing fitting. Only that card's garment is shown so other outfit slots cannot hide it.
- The stall vendor idles with gentle one-pixel breathing and occasional blinks inside the stall opening. The counter and awning stay still; the animation stops with the vendor when the scene ends.
- **Christmas customer outfits:** during 1-31 December, each arriving cafe customer gets a random selection from the Christmas clothing collection, independent of the player's purchases. Each slot has a 65% chance of an item chosen uniformly in that category; if all slots are empty, add a random top. The outfit stays the same for that visit, including the prep portrait, walking and sitting. Outside December customers wear their usual appearance. The dev console's `season all|date` also controls this preview. Foxes have clothing fittings too; this does not add fox as a playable animal.
- Hats, Tops, Capes and Shoes are independent slots. Each category shows all four items together in a two-by-two grid, with a picture and name. Tap an item to equip it; tap the equipped item again to remove it. Equipped cards have a highlighted border and a worn marker. Capes cover the shoulders and back but leave tails visible, and shoes follow the existing walking feet. Older saves retain their hat and top, with the new slots empty.

## 6. Game State

- All player state lives in **one central, serializable state object**, so it can be saved and loaded later:
  - Leaves
  - Inventory (ingredient stock, §3.6)
  - **Owned ingredients**
  - **Owned upgrades**
  - Owned furniture: placed (where) and in storage, by design (§5.7, §5.10)
  - Hired employees (§5.8)
  - Cafe layout: the fixed room plus the placed furniture
  - Unlocked locations
  - Where the player is in the tutorial (§5.9)
- "Serializable" means plain data only (no Phaser objects, class instances, or functions), so it can be converted to JSON and back without losing anything.

### 6.1 Saving and loading

- **One save slot**, saved automatically. There is no Save button.
- **Only between days.** The game saves when:
  - the day summary closes (after wages are paid)
  - something is bought, hired or let go
  - decorating is finished
  - leaves are picked up or a forage spot is gathered
- **Cafe days are not saved in progress:** customers, the queue and the clock aren't part of the save. Quitting mid-day loses that day: Continue goes back to the world map just before it, and opening the Cafe starts that same day again. Garden actions are an exception: only their garden and harvest deltas are saved against that pre-day checkpoint, as described below.
- **Title screen** (the first thing shown):
  - **Continue** shows the last finished day and the wallet (e.g. "Day 4 done · 🍃120") and opens the world map.
  - **New game** starts Day 1 at the cafe. If a save exists, it asks first: the old save is deleted straight away.
  - With no save, only New game is offered.
- **Versioned:** every save records a version number. A save from an older version gets defaults for anything added since (e.g. no employees), so old saves keep working.
- **Never half-loaded:** a save that can't be read (broken, or from a newer version) isn't loaded. The title screen says so and offers New game.
- **Where:** the browser's local storage for now, behind a small storage interface, so the desktop build (milestone 11) can save to a file instead.

---

## 7. Later Features

- More furniture kinds: bigger tables, more decorations (rugs), a bigger room (decorations and designs started with the Christmas catalogue, §5.10)
- **Furniture designs and a storage catalogue:** several designs of the same kind (e.g. a round oak table and a square birch one, or different chairs). The Decorate storage tray becomes a catalogue panel along the bottom: one **card per design** with its picture, its name and a **count badge** (cards with none in storage are faded), grouped by **category tabs** (e.g. Tables, Chairs, Decorations, Outdoor) with filter chips and counts. Tap or drag a card to place that design; tapping a placed piece keeps the Move / Put away menu. The panel can be folded away to see the whole cafe. Needs storage and placed pieces to record the design, not just the kind (a save version bump, §6.1).
- More employee roles (e.g. a Server who carries dishes, a Greeter who takes orders), and more than one of a role
- **Customer groups:** 2+ critters arriving together, ordering together and sharing a table (and leaving messes together). Planned once ordering and the counter queue exist (milestone 3 or later).
- **Farming:** implemented as the cafe garden below, growing ingredients in real time.
- **Background music:** a soft, cosy loop (made in code like the effects, or a music file), with its own volume next to the effects.
- **A pixel font** for all text, to match the art.
- **Multiplayer places (a big later step):** the outdoor places (the Forest, the Marketplace, and places added later) become shared spaces where players meet: everyone there sees the others walking around as their critters, with their name over their head, and can **chat** (a chat box along the bottom; messages also show as speech bubbles over the speaker for a few seconds). A "N critters on the island right now" counter. Each player's own cafe stays their own (single-player).
  - **Needs:** a game server (keeps who is where, and passes on moves and chat), player accounts and names, and saves kept on the server instead of the browser.
  - **Safety, from the start:** a word filter on chat and names, block and report buttons, and limits on how fast messages can be sent. Worth deciding early who the game is for (e.g. younger players need stricter chat rules).
  - **Fairness:** the server decides what counts (Leaves picked up, purchases), so a changed copy of the game can't cheat in shared places.
- **Appearance and wardrobe:** the player changes how their critter looks from a **profile and inventory menu**: a portrait of their critter on a backdrop, their name, and an inventory of cosmetic items in **category tabs** (e.g. Hats, Clothes, Held items, Colours, Backs), shown as cards, paged. Items are bought or earned in the game and are cosmetic only. Drawn as layers on top of the critter, so each item needs a version for each of the four views (§8.2), lined up with the critter's head and body. Shown to other players in the multiplayer places. Pairs with **choose your animal** below.
- **Choose your animal:** available in the wardrobe (§5.11) for hedgehog, rabbit, mouse, deer, frog, badger and raccoon. A choice at new-game setup and the remaining animals can follow later.

---

## 8. Art Direction

- Pixel art with Phaser `pixelArt: true` (no texture smoothing).
- Fixed **16×16 tile size**.
- **Integer scaling** only, so pixels stay crisp.
- Pixel art since milestone 10 (§8.1-8.3), replacing the coloured placeholder shapes.

### 8.1 Look and feel (milestone 10)

- **Mood:** cute, cosy, retro charm. Chunky shapes, round faces with big dot eyes, soft shading (one light and one dark shade per colour), warm light indoors.
- **Palette: Endesga 32** (from Lospec) for all code-drawn art. The player's own art keeps its own colours (a sprite's legend may give a colour as #rrggbb), so their critters look exactly as drawn. The same 32 colours are used for code-drawn sprites and for any PNGs drawn by hand, so everything matches:
  `be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569`
- **Outlines:** a dark outline (`3e2731` dark brown, not black) around characters and props, so they read on any floor.
- **UI colours** (panels, buttons, text) move to palette colours too: paper `ead4aa`, ink `3e2731`.

### 8.2 Sprites

- **Sizes:** the **cafe is built on 24×24 tiles** (floor, walls, counter, tables, stools: since the player's critters arrived, 16px furniture looked tiny next to them), so critters stand about 1.5 tiles tall. Outdoor ground and the map keep **16×16** art tiles. The code-drawn characters are **16×24**, the player's own 22-29 × 30-38. Drawn at real size; the game scales the whole screen.
- **The cafe on screen:** the room is **24×12 tiles** (576×288), near the top of the screen; the wallet and clock sit on the top wall, and the strip below the room is free for Grandma's box and Decorate's storage tray.
- **Cast** (can still change):
  | Who | Animal |
  | --- | --- |
  | Player (cafe owner) | Hedgehog in an apron |
  | Cleaner | Raccoon with a bandana |
  | Mascot | Frog in a leaf costume |
  | Customers | Rabbit, mouse, deer and fox (picked per customer) |
- **The player's own critter art** (hedgehog, rabbit, mouse, deer, from their sheet): sampled on the sheet's own pixel grid (no shrinking), so each critter keeps its own size, about **22-29 wide and 32-38 tall** (the rabbit's ears and the hedgehog's spines make them the biggest). **Four views**: front, back, facing left, facing right; they face the way they walk (back when walking up, front walking down) and, standing still, keep facing the way they last went. **Walking moves the legs**: each view has two step poses, made by lifting one foot and then the other by a pixel. Converted from the sheet into letter grids by a script, so they can be touched up like any sprite. A second sheet brought the rest of the cast the same way (badger as Grandma, raccoon, frog, fox; 6.5 sheet pixels per art pixel). Its squirrel was left out: the sheet drew it with two tails and it never converted cleanly. Every critter is now the player's own art. **All critters stand upright, side views too** (the deer's side body is drawn upright like the rabbit's, not on all fours). Only the frog may be green: green in the others is background bleeding into the outline. The raccoon comes from its own reference picture instead (four views, 3.5 pixels per art pixel, its own colours; about 38x36), with its tail hanging behind it in the back view, cut at its feet. The badger's back view is its front outline in grey fur (the sheet's had mouse-sized ears).
- **Animations:** a 2-frame walk for the 16x24 critters, mirrored for left/right; an idle bob while waiting; the Mascot's dance stays a hop and sway.
- **Where art comes from:** each sprite is first drawn **in code** as a small text grid (one letter per palette colour). A hand-drawn **PNG** with the same name in `src/art/drawn/` (e.g. `leaf.png`) replaces it: same size, and for animations a horizontal strip of frames that size. So any sprite can be redrawn later, one at a time.
- **Covered:** cafe floor, walls, door, counter, tables, chairs, messes; the cast; ingredient bins, bread and fillings, dishes, toaster; the island map, the Forest, the Marketplace stalls, leaves, mushroom patches and berry bushes; the title screen.

### 8.3 Little animations

- Customers bob while they wait at the counter; a burst of Leaves (one per Leaf earned, up to 8) flutters out of the customer when a dish is paid for; leaves on the ground drift down onto their spot, swaying, then rock gently; a puff of dust where each mess was wiped (by the player or the Cleaner); buttons press down 2px.
- Effects live in `ui/effects.ts`: each makes its own objects and tidies them up, so scenes just call it.

### 8.4 Sound

- **Sound effects, made in code** (Web Audio, no files at first): button tap, leaf pickup, order taken, ingredient added, serve (a ding; brighter for a perfect dish), angry customer, toaster tick and pop, wiping, a purchase, day end.
- A real sound file with the same name can replace any effect later.
- **Music:** a soft background loop: not built yet (later features).
- **Mute** with `M`, plus a volume setting. These are settings, not game progress: they're kept apart from the save and survive a New game.
- **Each sound** is a tiny recipe of notes (pitch, length, wave shape, loudness) or a short burst of noise, played with a quick fade so nothing clicks. Soft and short, in keeping with the cosy mood:
  | Sound | When |
  | --- | --- |
  | tap | any button (not the ingredient bins, which have their own) |
  | add | an ingredient goes on the plate |
  | order | an order is taken at the counter (a two-note ding-dong) |
  | serve / servePerfect / wrong | the dish is handed over: a ding, a bright little run for a perfect one, a low "bwom" for a wrong one |
  | upset | a customer gives up and leaves |
  | toastIn / toastPop | the dish goes into the toaster / pops up |
  | wipe | a mess is wiped (by the player or the Cleaner) |
  | leaf / gather | a Leaf is picked up / a forage spot is gathered |
  | buy | anything bought, unlocked or hired at a stall |
  | dayEnd | the day summary opens (a short tune) |
- **Volume control, always there:** a small speaker button in the bottom-left corner of every screen (a red cross on it while muted). Tapping it opens a little panel with a **mute button** and a **volume slider** (0-100%, drag the knob or tap the track; 60% to start), showing the percentage. While muted the slider sits at 0 and says Off; unmuting brings back the level it had. Tapping the speaker again or anywhere else closes it. `M` also mutes and unmutes anywhere, with a short "Sound off" / "Sound on" note. Settings are kept in the browser apart from the save.
- **Dev console:** `sound` lists the sounds; `sound <name>` plays one.

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

### 9.1 Text editor (dev only)

- **All the game's words in one place:** Grandma's tutorial lines, tips and notes, and the customers' lines (orders direct and hint, extras, double orders, reactions, giving up) live in JSON files under `src/data/texts/`, not in code. Each of Grandma's lines can name what her arrow points at.
- **An editor page** at `/editor.html` while `npm run dev` runs: sections on the left, every line in its own text box, lines can be added and removed. **Save** writes the JSON files and the running game picks the new words up.
- **Fit check:** a line too long for where it's shown (Grandma's box on that screen, a speech bubble) gets a warning before saving.
- **Safety:** saving is refused if it would break the game: an empty step or topic, a recipe or extra without lines, or a customer hint that no longer points to exactly one recipe. The tests check the same.
- **Dev only:** the page and its save route exist only under `npm run dev`, never in a built game. Names (recipes, ingredients, stalls) and button labels aren't in the editor (yet).

### 9.2 Sprite gallery (dev only)

- **Every sprite in one page** at `/sprites.html` while `npm run dev` runs, grouped (critters, cafe, kitchen, outdoors, icons), with collapsible groups like the text editor.
- Each sprite shows its **name, size, frames and where it comes from** (drawn in code, the player's PNG in `src/art/drawn/`, or converted from the player's critter sheet), its frames at game size and enlarged, and, for critters, its **walk playing** in every view.
- **Quality checks**, flagged with a warning like the text editor: for critters, see-through holes inside the outline, uneven front/back views (eyes that don't match), stray single pixels; for every sprite, a broken grid (uneven rows, unknown colours). The same checks run as tests.
- **Side by side:** every critter at real scale next to a table, chairs and the counter, to see proportions before playing.
- **Gardening animations:** looping Planting, Watering and Harvesting previews use the same poses, tools, effects and durations as gameplay. Choose any playable animal, pause/play, or slow playback to inspect pixels. The gallery never reads or changes the player's save.
- Read-only for now. Later: drop a PNG onto a sprite to replace it, and import new critters drawn on the skeleton template.

### 9.3 Arrange mode (dev only)

- **Move things on any screen by dragging them**, in the running game: the dev console's `arrange` (or **F2**) turns Arrange mode on for the screen you're on. Everything movable gets a thin outline and its name; drag it to move it. It snaps to whole pixels, to an 8-pixel grid while **Shift** is held. A small toolbar: **Save**, **Undo** (Ctrl+Z), **Reset** (back to the last save), **Done**.
- **Positions live in data, one file per screen:** `src/data/layouts/<screen>.json`, like the words in `src/data/texts/`. Save writes that file (through a dev-only route, like the text editor's) and the game picks the new positions up.
- **The rule for every screen, now and later:** each thing on a screen gets its position **by name with a default** ("the Serve button, else (544, 260)"), never from a bare number in the scene's code. Then it shows up in Arrange mode by itself, and anything never moved keeps its default. Rows of things (the ingredient bins, the tray's cards, a stall and its sign) move as one, by their first one.
- **Safety:** something that breaks a rule turns red and Save is refused: off the screen, a stall outside the walk area, two buttons on top of each other, a forage spot inside a tree. The tests check the saved files the same way.
- **Not movable:** things that move by themselves while playing (critters, falling leaves, messes); their starting points can be (where the player arrives).
- **Dev only:** like the text editor, Arrange mode and its save route exist only under `npm run dev`, never in a built game.
- **Furniture dragging:** lifted furniture follows the pointer continuously, keeping its grab offset, and snaps to the target tile only on release. Placement validation runs only when the target tile changes; pointer movement within a tile only updates the preview position.
- **Purchasable finishes:** the Christmas catalogue has a Room section containing all four wallpapers and seven floor finishes, each costing ??25 once for unlimited reuse. Original wall/floor finishes stay free. The painter displays locked swatches until purchased; both brush and Whole stretch require ownership. Ownership is saved (version 9); older saves retain the finishes already applied to their room. Loading a current save removes unowned applied finishes back to Original.
- **Painting controls:** choose Brush or Whole stretch. Brush follows dragging continuously, fills tiles crossed between pointer events, and updates only changed tile images. Whole stretch fills the connected matching surface reached from the clicked tile (walls continue round corners; floors stop at walls, doors and counters). One drag or fill is one Undo action. Completed strokes save immediately in Decorate.
- **Wallpaper and Floor in Decorate:** painting changes floor and wall finishes only, using tile swatches from the supplied room sheet. Drag over matching surfaces, Undo reverses a stroke, each completed stroke saves finishes with the cafe. Painting never changes room structure or service markers. No Leaves cost. Undo stays clear of the bottom-left HUD.
- **Move counter in Decorate:** drag the counter itself, with a preview following the pointer continuously and snapping on release; there is no separate Move counter button. Move the complete counter, player/order/queue positions and counter-mounted decorations together. Refuse moves onto walls, the door, furniture or outside the room, or moves that block paths. Escape cancels. Furniture placement stays in Decorate.
- Saved rooms and finishes drive the cafe floor. Older saves use default finishes; malformed finish grids are refused. The dev painter at /room.html still edits the default structural room data. Room resizing comes later.

---

## 10. Milestones

1. **Prep station core loop**
2. **Cafe floor:** customers sit, eat, and leave messes; the player cleans messes (click/tap-to-walk movement)
3. **Connect** the counter queue, patience timers, tip thresholds, and the two scenes
4. **Leaves currency and day cycle** (a run ends, show day summary)
5. **Ingredient stock** (§3.6) and the **world map** with Cafe, Forest (foraging + leaf pickups) and Marketplace (leaf pickups)
6. **Marketplace shop:** buy ingredients and upgrades (Toaster first), unlocking new recipes, modifiers and dialogue; add hint-style dialogue
7. **Furniture and cafe expansion**
8. **Employees:** a quieter start, the Mascot (more customers) and the Cleaner, hired at the Notice Board for a daily wage (§5.8)
9. **Saving and loading:** one autosaved slot, between days only, and a title screen (§6.1)
10. **Pixel art, animation, sound** (including the illustrated island map): Endesga 32 palette, code-drawn sprites replaceable by PNGs, code-made sound effects (§8)
11. **Tutorial and mini story:** Grandma Badger guides the first day (§5.9)
12. **Desktop build** (Tauri or Electron): not needed for now

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
- **Patience** (`patienceSeconds`: 45s at first, 50s in milestone 5, 25s in milestone 6) counted down at a fixed rate from joining the queue until served, shown as a bar over each waiting customer and at the prep station. At 0 they leave upset ("!!"), unpaid. (Since milestone 6 it only starts when the order is taken, §4.)
- **Taking orders:** tap the customer at the counter ("!") and the player walks to the counter spot `P`. The order is taken on arrival if a clean, unreserved seat is free (taking it reserves the seat). Otherwise "No clean seats!" appears ("?" over the customer).
- **Prep station as an overlay** (`scene.launch`): it shows the customer's real order, and the floor keeps running underneath. Serving stops patience; the customer reacts, and **starts walking only once the prep screen closes**: to their seat, or out angry for a wrong dish. If patience runs out mid-cook, they say so and prep closes.
- **Payment** when served: price (`data/prices.ts`) plus a patience-tier tip (`data/tipConfig.ts`), shown as "+X 🍃". (Milestone 4 put it into the real wallet.)
- **Dev console:** `serve [perfect|close|wrong]`, `mess` and `clean` were added for quick testing.
- **Not yet:** the wallet, day cycle and day summary (milestone 4). Ingredients are still the starters for everyone (`STARTER_OWNED`) until the central game state exists. Customer groups come later.

### Milestone 4 scope: Leaves & Day Cycle (as built)

- **Central game state** (`logic/gameState.ts`): day number, Leaves, ingredients and upgrades as plain data (ready for saving in milestone 9). Scenes share it through the Phaser registry (`scenes/gameStore.ts`). `STARTER_OWNED` is gone; orders use what the game state owns.
- **Wallet:** payment goes into the real Leaves total, shown on the floor and at the prep station.
- **Day clock** (`data/dayConfig.ts`): 8:00 to 17:00 over `dayLengthSeconds` (180), in 10-minute steps. It runs on floor time, so `speed` speeds it up. At closing time arrivals stop ("Closed" in red); the day ends when the last customer has left.
- **Day summary** overlay: served by score, gave up, Leaves earned (dishes + tips) and the wallet. It had a "Start next day" button (or `Enter`) that restarted the floor fresh, until milestone 5 replaced it with "Exit cafe" and the world map.
- **Prep closing:** the customer's reaction stays up for 1.2s, and any tap or key after the first 0.3s skips it (the earlier 2.2s felt too long after every order).
- **Dev console:** `time` and `endday` were added, and `config` / `set` / `reset` now cover the day settings too, e.g. `set dayLengthSeconds 30`.
- **Not yet:** the world map and "Exit cafe" (milestone 5). Changing `dayLengthSeconds` mid-day makes the clock jump, since the time already elapsed stays the same.

### Milestone 5 scope: Stock & World Map (as built)

- **Ingredient stock** (§3.6): stock in the game state (30 of each starter to begin), used on serve, rush deliveries at 2x the unit price, "Out" bins, customers leaving when their dish can't be made, and the stock/rush/net lines and "Ingredients used" column in the day summary. Dish prices were raised to 2 x ingredient cost + 2.
- **World map** (§5.2): placeholder island, landmarks, dotted paths, signposts (current place in green, a lock for locked places). "Exit cafe" on the day summary opens it; the Cafe asks "Start Day N at the cafe?" before a new day starts.
- **Outdoor places:** one OutdoorScene for the Forest and Marketplace, built from `data/outdoorAreas.ts`. Tap to walk in a straight line; depth sorting by y, so the player walks behind trees and stalls. A Map button goes back.
- **Leaf pickups** (§5.4): random leaves, kept clear of trees, stalls and forage spots; daily cap of 15.
- **Foraging** (§5.5): 4 mushroom patches and 2 berry bushes in the Forest, once a day each.
- **Tuning on the way:** cleaning 0.5s per mess, patience 50s.
- **Dev console:** `stock`, `leaves` and `goto <map|cafe|forest|marketplace>` work anywhere; `config` / `set` also cover the stock, leaf and forage settings.
- **Not yet:** obstacles outdoors (the player walks through trees and stalls), Marketplace shops (milestone 6), farming and the tutorial (later features).

### Milestone 6 scope: Marketplace Shop (as built)

- **Shops** (§5.6): three Marketplace stalls. Tap one to walk up to it; its panel opens on arrival (Close or `Esc`).
  - **Pantry:** stock of owned ingredients at the unit price, **+1** / **+10** per tap, greyed out when unaffordable.
  - **Specialty:** unlocks chilli (15), tomato (10) and tuna (20), showing how many recipes each adds. New ingredients come with 0 stock, and owned ingredients stay in catalogue order, so prep bins and keys `1`-`6` don't move.
  - **Tools:** the Toaster (30). The other upgrades aren't listed until they're built.
- **Toasting** (§3.4): drag the dish from the plate into the toaster, wait ~2s (`toastSeconds`) while it rattles, then drag it back from the top. `T` does both on the keyboard.
- **Modifier mistakes** (§4): a missing or extra modifier counts as one mistake, so a dish toasted without being asked is "close". This replaced the 20% missing-modifier tip cut.
- **Hint dialogue** (§3.5): every recipe has its own hint lines with consistent clue words, and more for toasted. Hints are 0% on day 1, +10% a day, up to 50% (`data/hintConfig.ts`). The ingredient-by-ingredient hints were dropped because they were ambiguous.
- **Patience** (§4): it now only counts down once the order is taken; the queue waits for free. At closing time, the queue goes home calmly (not counted as giving up). Patience retuned to 25s.
- **Dev console:** `unlock <chilli|tuna|tomato|toaster>` (free), `endday` also sends every customer home, and `config` / `set` cover the toaster and hint settings.
- **Not yet:** the other upgrades (Butter Churn ... Serving Tray) and double orders; a summary line for customers sent home at closing; obstacles outdoors.

### Milestone 7 scope: Furniture (as built)

- **Furniture in the game state** (§5.7): which tables and chairs are placed where, plus how many of each are in storage. The cafe starts with today's 4 tables and 8 chairs. The default empty room comes from `data/cafeRoom.json`; each player saves their own room through Decorate, and the floor is built from that room plus the furniture each day.
- **Carpenter stall** at the Marketplace: **+1** buys a table (🍃30) or chair (🍃10) into storage. The other stalls moved left to make room.
- **Decorate** from the map's Cafe panel (Open cafe / Decorate / Not yet, `D` for Decorate): pick a piece from the storage tray, tap the floor to place it, tap a placed piece to put it away (a table takes its chairs). Moving is free. Later (during milestone 10): **dragging** a placed piece moves just that piece, a table's chairs staying put (`moveProblem` / `movePiece` in `logic/furniture.ts`), and pieces can be dragged out of the tray too. Tapping a placed piece then opens a **Move / Put away** icon menu instead of putting it away at once.
- **Placement rules:** plain floor only; a chair touches exactly one table; nothing may cut the floor into pieces (checked with a flood fill from the door), so every seat stays reachable. Refused taps say why.
- **Dev console:** `furniture [table|chair n]` lists what's stored and placed, or sets how many are in storage, for free.
- **Not yet:** a bigger room (cafe expansion), more furniture kinds and decorations (later features).

### Milestone 8 scope: Employees (as built)

- **Quieter start** (§5.8): a customer every 9-15s (was 4-8s), about 15 a day.
- **Notice Board**, a fifth Marketplace stall (the others moved left): **Hire** / **Let go** the Mascot (🍃20/day) or Cleaner (🍃15/day), both free. Hires are in the game state and work from the next day the cafe opens.
- **Wages** are paid when the day ends, before the summary: a "Wages" line, taken off Net. Anyone the wallet can't pay in full quits unpaid ("Couldn't pay, quit: ..."); a cheaper one after them can still be paid.
- **Mascot:** an orange critter dancing (hopping and swaying) next to the cafe on the world map, whenever hired; not shown inside the cafe. The gap between arrivals is multiplied by `mascotIntervalMultiplier` (0.6, in `floorConfig.ts`, so `set` works on it live).
- **Cleaner:** waits just inside the door, walks (at `cleanerSpeed` 4, the player is 6) to the nearest messy table and wipes every mess there, using the same wiping time as the player. Leaves any table the player is heading to or wiping; goes home when all is clean. Runs on floor time, so `speed` speeds them up too.
- **Dev console:** `hire` / `fire <mascot|cleaner>`, and `config` / `set` cover `mascotIntervalMultiplier` and `cleanerSpeed`.
- **Not yet:** more roles (Server, Greeter) and more than one of a role (later features).

### Milestone 9 scope: Saving and loading (as built)

- **Save text** (`logic/save.ts`): `{ version, state }` as JSON. Loading checks every field: missing fields get new-game values, ids the game no longer has are dropped, furniture that no longer fits the room goes into storage, and anything else wrong (not JSON, a newer version, a field of the wrong type) refuses the save with a reason.
- **One slot** (`storage/saveSlot.ts`): localStorage behind a small `SaveSlot` interface, ready to swap for a file in the desktop build. Storage errors are caught (a failed save warns in the console).
- **Autosave** (`scenes/gameStore.ts`): every game-state change between days writes the slot. Opening the cafe stops autosaving (before the day number moves on); leaving the floor (the summary's Exit cafe) saves and starts it again.
- **Title screen** (`TitleScene`, first scene): Continue ("Day N done · 🍃X", opens the map) or New game (asks first when a save exists; deletes it straight away). An unreadable save is explained there and only New game is offered.
- **Dev console:** `save` (save now, even mid-day) and `wipesave`.
- **Not yet:** more than one slot; the desktop build's file storage (milestone 11).

### Milestone 10 scope: Pixel art, animation, sound (as built)

- **Palette:** Endesga 32 (`art/palette.ts`), and UI colours moved onto it.
- **Art pipeline:** sprites are text grids, one letter per palette colour (`art/sprites/`, listed in `art/spriteArt.ts`), checked by tests. `BootScene` turns them into textures; a PNG with the same name in `src/art/drawn/` replaces one.
- **Art:** the cafe (planks, log walls with windows, door mat, counter, tables, stools, order rug, queue paw prints, messes, plates); the cast (hedgehog player, raccoon Cleaner, frog Mascot, fox, rabbit, deer and mouse customers) with walk cycles and facing; the prep station (bin icons, dish layers built from end and middle pieces, toaster); outdoors (grass and forest ground, oaks and pines, mushroom patches, berry bushes, stalls); the island map drawn into a canvas so its shore is whole pixels; the title scene. Round shapes were laid out with a script, then kept as plain grids.
- **Animation** (`ui/effects.ts`, `setBobbing`): waiting customers bob slowly, Leaves burst out on payment, leaves drift down onto the ground, dust puffs on wiping.
- **Sound** (`audio/`): code-made effects for every main action, one Web Audio context with a master volume. A volume control on every screen (`HudScene`: speaker button, slider, mute) and `M` to mute; settings kept apart from the save. Dev command `sound [name]`.
- **Also during this milestone:** Decorate gained dragging, a Move / Put away menu on a tapped piece, single-piece moves, and chairs allowed without a table (§5.7).
- **Not yet:** background music (later features); a pixel font (text is still the browser's monospace).

### Milestone 11 scope: Tutorial and mini story (as built)

- **Rules** (`logic/tutorial.ts`): the steps in order and the event that finishes each (`advanceTutorial`); `floorGuide` holds the floor during the intro and lets one customer in until the first wipe; `tutorialOrder` is always Jam Bread. The step is in the game state and the save; saves from before load as done.
- **Words** (`data/tutorial.ts`): Grandma Badger's lines per step, and whether a step waits for Next or for the player to act.
- **The floor during the guided start:** no arrivals while held, then one; that customer's patience is frozen; the day clock waits. A wrong dish (no mess to wipe) moves on once the floor is empty. If the day ends with "off you go" still up, the tutorial carries on with the summary.
- **The story box** (`ui/StoryBox.ts`): portrait, one line at a time, Next / OK, a quiet "Skip tutorial" link that asks first, and a bouncing arrow (pointing down, or up from below) that follows its target. Placed per screen so it never covers what the step needs: under the cafe, left of the plate, over the summary's title, under the map.
- **Follow-ups:** the prep arrow follows the dish (next bin, then Serve, or Reset after a wrong layer) and Grandma mentions extras; the map step tours every place with the arrow on its sign (`pointsAt` in the data); **Decorate tips** the first time only (`tipsSeen` in the game state, skipped along with the tutorial); **Grandma's notes** behind a **?** button next to the speaker (`HudScene`, `ui/NotesPanel.ts`, topics in `data/tutorial.ts`), pausing the game while open; Skip never sits under Next; mushroom layers are tan and brown.
- **Dev console:** `tutorial [restart|skip|<step>]`.

### Customer species expansion

Arriving customers include fox, rabbit, deer, mouse, frog, badger and raccoon. Every species appears over the customer rotation, keeps its identity in the prep portrait, and uses fitted Christmas clothing during the seasonal period. Frog hats leave the raised eyes visible; badger and raccoon outfits preserve their tails. Existing frog mascot and raccoon cleaner roles remain available. Frog, badger and raccoon are also selectable in the wardrobe Animal tab, retaining the player outfit and progress. All seven player choices stay visible in a two-column grid; the fitting mirror rotates through four views, and catalogue clothing samples use the selected species.

Dev console: `spawn <fox|rabbit|deer|mouse|frog|badger|raccoon>` immediately adds one customer of that species at the cafe door during an open, unguided cafe day. Refuse outside the floor, during prep/tutorial, after closing, or when the queue is full. They join the normal queue and retain their species and seasonal outfit in prep.

### Placeable rugs

Four supplied rug designs (Snowflake, Tree, Floral and Tartan) are sold in the Christmas catalogue Decor section for ??35 each. Purchases add copies to furniture storage. Each rug occupies a 2x2 floor footprint, drawn below service markers, furniture and critters; rugs never block walking or seating. Furniture may share rug tiles, while rugs cannot overlap other rugs or extend onto walls, counters, the door or beyond the room. Drag, Move and Put away operate on one layer at a time. Select a rug by tapping an exposed part of it; furniture menus have no Rug shortcut. Rugs and their counts persist in the normal furniture save, with defaults for older saves.

Rug precision: rugs snap in quarter-tile (6px) steps while tables/chairs keep whole-tile seating positions. A live footprint outline shows the actual drop position; new or menu-carried rugs are centred on the pointer. All overlapped floor tiles are validated, fractional rug anchors persist in version 11 saves, and older integer positions remain unchanged.

Rug orientation: a placed rug's menu offers a clockwise-arrow symbol for 90-degree rotation, beside Move and Put away. There are no flip controls. Transforms affect only that rug and preserve its centre, 2x2 footprint, fine placement and furniture above it. The live drag preview, floor and painter use the same orientation. Legacy flip flags are retained when loading existing saves. Orientation persists in version 12 saves; older rugs default to no rotation or flips. Stored copies start in their default orientation when placed again.

### Decorate finishes and storage categories

The catalogue is accessible only from the Marketplace stall. Decorate has no Catalogue or Paint room button. Wallpaper and Floor tabs sit beside the storage categories below the cafe, showing finish swatches (Original is free; other finishes require their catalogue purchase). Select an owned swatch and paint directly on the room, with immediate tile updates while dragging. Brush paints a stroke; Whole stretch fills the connected wall or floor. Each completed stroke/fill saves immediately, and Undo reverses it. Switching tabs finishes the stroke and cancels furniture movement. Painting preserves furniture, room structure and service markers. All eight floor swatches fit without paging; controls stay clear of the HUD and Done.

Storage has Tables, Chairs, Decorations, Wall items and Rugs tabs, all visible below the cafe. Each tab shows designs in catalogue order, their pictures and stored counts; designs already placed remain listed with faded zero-stock cards. Plain Table and Chair stay listed in their categories even when unowned. Default to Tables on entry. Changing tabs clears selection, cancels dragging/carrying and resets paging. Categories page independently when more than eight designs are present. Empty categories say no items are in storage. Buying or putting away items refreshes the current category immediately. Furniture placement, rug controls and save state remain unchanged.

### Garden — real-time farming

The harvested mushroom's overhead icon has a soft golden pixel aura behind it during the half-second display. The aura follows the icon, fades out as it is put away, and disappears on cancellation or leaving. Keep the mushroom's colours and outline readable. The sprite gallery uses the same aura and fade.

Dev console testing shortcuts: `seed <mushroom|tomato|chilli> [n]` adds seeds for free (default one; positive safe whole numbers only). Locked crops still require their usual unlock. `grow` makes every watered crop ready immediately by moving its watering timestamp back by its growth duration; unwatered plants and empty beds stay unchanged. It grants no stock: harvest normally to test the animation and rewards.

A labelled garden door on the cafe back wall opens a separate Garden map. Visiting pauses the cafe scene (customers, player, orders and clock); returning through the garden door resumes that same day. It never starts another cafe day. The door is unavailable during the guided tutorial or another cafe overlay.

The world map also has a small planted Garden landmark and signpost beside the cafe, connected by a dotted path. It opens the garden between cafe days without starting or advancing a day. A map visit returns to the world map with Garden highlighted; a cafe-door visit returns to the paused cafe. The return control says Map or Cafe to match the entrance. Map gardening saves normally between days and uses the same plots and seed stock as the cafe door.

Seed selection lives in a floral seed pouch resting on a wooden garden table. Tap the table or pouch to open a cream panel with an olive-green border, wooden Seed Pouch title, floral corners and close button, inspired by the supplied reference. Three packet cards show Mushroom, Tomato and Chilli with their seed counts; locked crops explain the Specialty unlock. Choosing an unlocked packet closes the panel and selects that crop for planting. Empty packets remain selectable, with buying guidance when planting is attempted. The current selection is shown above the beds instead of the old three blue seed buttons. The panel blocks garden clicks behind it; Esc closes it before leaving the garden. Planting, prices, growth times and saves stay unchanged. Table, pouch, panel and selected-crop label have named Arrange positions.

Tapping a bed queues a garden action: walk to its front edge, face the bed and work briefly (plant 0.65s, water 0.9s, harvest 0.7s). Show the character tending with a trowel, watering can or harvest basket, small seed/water/harvest effects and progress. Only finishing the action consumes a seed, starts the real-time watering timestamp or grants the harvest. Validate the plot and stock again at completion; never repeat a completed harvest or change a queued watering into another action. The crop selected when planting was queued is retained. Clicking another bed replaces the action; clicking ground, opening the pouch or leaving cancels it without spending or saving. Clicking the same bed does not reset progress. Growing crops and missing seeds show guidance immediately. Work progress is transient and is not saved. Standing points follow the actual arranged bed positions and are accessible in both rows.

After a successful harvest, the critter immediately faces forward and displays that crop's ingredient icon above its head for 0.5 seconds, then puts it away. Position the icon above the chosen animal's full head height, including ears/antlers. Stock is granted and saved once when picking finishes, before the display; putting away never grants another harvest. Normal garden clicks wait during this brief display; leaving the garden can dismiss it. Cancelled, unavailable or growing crops never trigger the display. This display is transient and absent after a reload. The sprite gallery previews the same pickup/display timing and lets the user choose the harvested crop.

The first garden has six reusable plots. Buy seed packets at the Marketplace Seeds stall, choose a crop, tap an empty plot to plant, then tap it once to water. Growth starts on watering, using a saved real-world watering timestamp plus its duration: Mushroom 5 minutes, Tomato 10 minutes, Chilli 15 minutes. Growth continues while elsewhere, paused or offline, independent of cafe speed/days. Unwatered crops wait indefinitely; ready crops never wilt. Show planted, sprouting, growing and ready stages with countdowns. Harvest adds four units of that ingredient to stock and empties the plot. No auto-replant or repeat watering.

Seed packets cost 🍃1 Mushroom / 🍃2 Tomato / 🍃3 Chilli each and are consumed on planting. Mushroom is initially available; Tomato/Chilli seeds require their existing ingredient unlocks. Seed stock, six plots and crop timestamps persist in save version 13. Older saves start with an empty garden and no seeds. Invalid crop ids, timestamps or seed counts are rejected on loading. Backwards clock changes never complete a crop early; remaining time is capped at its full duration.

Garden transactions save immediately, including during a cafe day: apply only their garden/seed and harvest stock deltas to the pre-day checkpoint, so quitting still rolls back the cafe day without losing or duplicating a harvest. Resume in the same browser keeps the live cafe state. The garden uses the player's chosen animal/outfit, named Arrange positions, existing grass/fence/path art and matching pixel crop/soil art. A return door, seed counts and plot status remain visible; seed prices use LeafText.

### Garden expansion — mutations, seasonal inventory and event rewards

Step 1 implements mutations, seasonal seeds and double harvests. Saved garden data is version 14: older crops retain their watering times and become Ordinary, seasonal packet counts start at zero, and special harvests have separate Golden/Christmas counts for each crop. Special crop textures appear in the beds and overhead harvest display. The harvest message reports the actual yield and destination. The Seasonal inventory screen, ticket exchanges and museum/gallery remain future steps.

- **Normal seeds:** when planting completes, choose one crop outcome. During an active seasonal event, the chances are **3% Seasonal, 5% Golden and 92% Ordinary**. Outside an event, they are **5% Golden and 95% Ordinary**. Outcomes are mutually exclusive; a crop cannot be both Golden and Seasonal. Store the outcome with the planted crop so reloading, watering or returning later does not reroll it. The seasonal outcome belongs to the event active when it was planted and remains that crop after the event ends.
- **Seasonal seeds:** during the event, the Marketplace Seeds stall sells Christmas Mushroom seeds for 🍃5, Christmas Tomato seeds for 🍃10 and Christmas Chilli seeds for 🍃15. The normal ingredient unlocks still apply. These seeds guarantee the matching seasonal crop, with no ordinary or Golden outcome; owned seasonal seeds remain usable after the event ends. The seed pouch has Normal and Christmas packet choices, retaining the selected packet type while walking to plant. Christmas uses the existing 1–31 December event and the dev console's `season all|date` preview.
- **Double harvest:** every successful harvest has an independent **5% chance to give double yield**, including Ordinary, Golden and Seasonal crops. The usual four-unit harvest therefore gives **eight units** on a double harvest. Determine and grant the yield once when harvesting completes; cancelled actions grant nothing, and reloading or replaying the overhead display cannot grant another reward.
- **Seasonal inventory:** build a new **Seasonal** inventory tab to hold harvested special crops separately from ordinary cooking stock. Keep Golden and event-specific crops identifiable by crop and variant, with quantities saved. Ordinary harvests continue to enter ingredient stock. Existing saves start with no special crops or seasonal seeds; implementation must add save migration and preserve the garden's immediate-saving behaviour during cafe days.
- **Event rewards:** players can choose to sell special crops for **event tickets**, then spend those tickets in an event catalogue, or retain the crops for a future **museum/gallery display**. These destinations are planned, not yet available. Exchange rates, event-ticket ownership/expiry rules, catalogue contents/prices and museum donation/display behaviour still need design decisions before their implementation. Stored crops must not be automatically sold, donated or discarded when an event ends.

Build in small steps: (1) mutations, seasonal seeds, double harvests and persistence; (2) the Seasonal inventory tab; (3) ticket exchanges and the event catalogue; (4) the museum/gallery. Confirm the outstanding design choices for each step before building its dependent behaviour. New controls and screens follow named Arrange positions; amounts of Leaves use LeafText.
