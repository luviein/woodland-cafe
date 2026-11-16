import { describe, expect, it } from 'vitest';
import { createNewGame } from './gameState';
import { createFloorState, releaseCustomer, type Customer } from './floor';
import { parseLayout } from './layout';
import { createWalker } from './walker';
import { expectedPlate } from './orders';
import { servePartyMeal } from './serveMeal';

const layout = parseLayout(['WWWWWWW', 'WPCCC.W', 'W...O1W', 'W.STS2W', 'W.....W', 'WWWDWWW']);
const order = { recipeId: 'plainBread' as const, modifiers: [], quantity: 1 };
const customer = (id: number): Customer => ({
  id, partyId: 1, phase: 'ordered', timer: 0, walker: createWalker(id === 1 ? layout.orderSpot : layout.queueSpots[0]),
  order, orders: [order, order], patience: 50, patienceTotal: 100,
  seat: { tableId: layout.tables[0].id, seat: layout.tables[0].seats[id - 1] }, score: null, upset: false,
});
const floor = () => ({ ...createFloorState(), customers: [customer(1), customer(2)], queue: [1, 2], nextCustomerId: 3 });
const plates = () => Array.from({ length: 4 }, () => ({ ...expectedPlate(order), ready: true }));

describe('party serving transaction', () => {
  it('consumes four plates once, pays both animals and releases them together', () => {
    const before = floor();
    const game = createNewGame();
    const snapshot = structuredClone({ before, game });
    const served = servePartyMeal(before, 1, game, plates())!;
    expect(served.game.stock.bread).toBe(game.stock.bread - 4);
    expect(served.game.leaves).toBe(game.leaves + served.servings.reduce((sum, s) => sum + s.payment.total, 0));
    expect(served.floor.customers.every(c => c.phase === 'served')).toBe(true);
    expect(served.floor.queue).toEqual([1, 2]);
    expect(served.servings).toHaveLength(2);
    expect(servePartyMeal(served.floor, 1, served.game, plates())).toBeNull();
    let released = served.floor;
    for (const id of [1, 2]) released = releaseCustomer(released, layout, id);
    expect(released.queue).toEqual([]);
    expect(released.customers.every(c => c.phase === 'toSeat')).toBe(true);
    expect({ before, game }).toEqual(snapshot);
  });

  it('rejects an unfinished, unaffordable or timed-out delivery atomically', () => {
    const state = floor();
    const game = createNewGame();
    expect(servePartyMeal(state, 1, game, plates().slice(1))).toBeNull();
    expect(servePartyMeal(state, 1, game, plates().map((p, i) => i === 1 ? { ...p, ready: false } : p))).toBeNull();
    expect(servePartyMeal({ ...state, customers: state.customers.map(c => ({ ...c, patience: 0 })) }, 1, game, plates())).toBeNull();
    const empty = { ...game, stock: { ...game.stock, bread: 0 }, leaves: 0 };
    expect(servePartyMeal(state, 1, empty, plates())).toBeNull();
    expect(empty.leaves).toBe(0);
    expect(state.customers.every(c => c.phase === 'ordered')).toBe(true);
  });

  it('a wrong dish charges its ingredients but only its owner loses payment and seating', () => {
    const cooked = plates();
    cooked[0] = { layers: ['jam', 'jam', 'jam', 'jam'], modifiers: [], ready: true };
    const served = servePartyMeal(floor(), 1, createNewGame(), cooked)!;
    expect(served.servings[0].payment.total).toBe(0);
    expect(served.servings[1].payment.total).toBeGreaterThan(0);
    expect(served.plan.uses.find(u => u.id === 'jam')?.fromStock).toBe(4);
    const released = releaseCustomer(releaseCustomer(served.floor, layout, 1), layout, 2);
    expect(released.customers[0].phase).toBe('leaving');
    expect(released.customers[0].seat).toBeNull();
    expect(released.customers[1].phase).toBe('toSeat');
  });
});
