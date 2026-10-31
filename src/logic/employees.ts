import { EMPLOYEE_ROLES, EMPLOYEES, type EmployeeRole } from '../data/employees';
import { spendLeaves, type GameState } from './gameState';

// Hiring, letting go and paying employees (GAME_DESIGN.md §5.8). Like the
// rest of logic/, these take a state and return a new one.

export function isHired(state: GameState, role: EmployeeRole): boolean {
  return state.employees.includes(role);
}

/**
 * Hires `role` (free; wages come at the end of each day). Already hired:
 * unchanged. Kept in EMPLOYEE_ROLES order, not the order hired, so wages
 * are always paid in the same order.
 */
export function hire(state: GameState, role: EmployeeRole): GameState {
  const employees = EMPLOYEE_ROLES.filter((r) => r === role || state.employees.includes(r));
  return { ...state, employees };
}

/** Lets `role` go (free). Not hired: unchanged. */
export function letGo(state: GameState, role: EmployeeRole): GameState {
  return { ...state, employees: state.employees.filter((r) => r !== role) };
}

export interface WagesResult {
  state: GameState;
  /** Leaves paid in total. */
  paid: number;
  /** Who couldn't be paid in full, and so quit (unpaid). */
  quit: EmployeeRole[];
}

/**
 * End of day: pays everyone hired, in role order. Anyone the wallet can't
 * pay in full quits unpaid instead; a cheaper employee after them may still
 * get paid. The wallet never goes below 0.
 */
export function payWages(state: GameState): WagesResult {
  let next = state;
  let paid = 0;
  const quit: EmployeeRole[] = [];
  for (const role of state.employees) {
    const { wage } = EMPLOYEES[role];
    if (wage <= next.leaves) {
      next = spendLeaves(next, wage);
      paid += wage;
    } else {
      next = letGo(next, role);
      quit.push(role);
    }
  }
  return { state: next, paid, quit };
}
