import { describe, expect, it } from 'vitest';
import { CUSTOMER_ART, customerArt } from '../art/spriteArt';
import { createFloorState, queueCapacity, stepFloor } from './floor';
import { buildLayout, startingFurniture } from './furniture';
import { spawnCustomer } from './customerSpawn';

const layout = buildLayout(startingFurniture());

describe('specific customer spawning', () => {
  it('spawns every species at the door with unique ids and normal queue movement', () => {
    let state = createFloorState();
    const original = state;
    for (const animal of CUSTOMER_ART) {
      // This loop tests the species independently, without filling the queue.
      const result = spawnCustomer({ ...state, queue: [], customers: [] }, layout, animal);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      expect(customerArt(result.id)).toBe(animal);
      expect(result.state.customers[0].walker.tile).toEqual(layout.door);
      expect(result.state.queue).toEqual([result.id]);
      expect(result.state.nextCustomerId).toBeGreaterThan(result.id);
      expect(result.state.spawnTimer).toBe(state.spawnTimer);
      expect(stepFloor(result.state, layout, 0).customers[0].walker.path.length).toBeGreaterThan(0);
      state = result.state;
    }
    expect(original.customers).toEqual([]);
    expect(original.nextCustomerId).toBe(1);
  });

  it('refuses closed, guided and full cafe queues', () => {
    const state = createFloorState();
    expect(spawnCustomer({ ...state, doorsOpen: false }, layout, 'frog').ok).toBe(false);
    expect(spawnCustomer({ ...state, guide: 'hold' }, layout, 'badger').ok).toBe(false);
    expect(spawnCustomer({ ...state, queue: Array.from({ length: queueCapacity(layout) }, (_, i) => i + 1) }, layout, 'raccoon').ok).toBe(false);
  });
});
