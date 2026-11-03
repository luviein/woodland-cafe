import { CUSTOMER_ART, customerArt, type CustomerArt } from '../art/spriteArt';
import { FLOOR_CONFIG } from '../data/floorConfig';
import { queueCapacity, type FloorState } from './floor';
import type { Layout } from './layout';
import { createWalker } from './walker';

/** Choose an unused id from the normal rotation, so every view agrees on species. */
export function spawnCustomer(state: FloorState, layout: Layout, animal: CustomerArt): { ok: true; state: FloorState; id: number } | { ok: false; reason: string } {
  if (!state.doorsOpen) return { ok: false, reason: 'The cafe is closed' };
  if (state.guide !== null) return { ok: false, reason: 'Finish or skip the tutorial first' };
  if (state.queue.length >= queueCapacity(layout)) return { ok: false, reason: 'The customer queue is full' };
  let id = state.nextCustomerId;
  for (let checked = 0; checked < CUSTOMER_ART.length && customerArt(id) !== animal; checked++) id++;
  if (customerArt(id) !== animal) return { ok: false, reason: 'Unknown customer species' };
  return {
    ok: true, id,
    state: {
      ...state, nextCustomerId: id + 1, queue: [...state.queue, id],
      customers: [...state.customers, {
        id, walker: createWalker(layout.door), phase: 'queued', timer: 0,
        order: null, score: null, patience: FLOOR_CONFIG.patienceSeconds, seat: null, upset: false,
      }],
    },
  };
}
