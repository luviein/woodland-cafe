// The critters the player can hire at the Notice Board (GAME_DESIGN.md §5.8).
// One of each role for now. Wages are PLACEHOLDER values, paid at the end
// of every day worked; a quiet day nets roughly 🍃100, so both together
// take about a third of it.

export interface EmployeeDef {
  name: string;
  /** Leaves paid at the end of each day they work. */
  wage: number;
  /** One short line for the Notice Board, saying what they do. */
  does: string;
}

export const EMPLOYEES = {
  mascot: { name: 'Mascot', wage: 20, does: 'More customers' },
  cleaner: { name: 'Cleaner', wage: 15, does: 'Wipes messes' },
} satisfies Record<string, EmployeeDef>;

export type EmployeeRole = keyof typeof EMPLOYEES;

/** Every role, in Notice Board order (also the order wages are paid in). */
export const EMPLOYEE_ROLES = Object.keys(EMPLOYEES) as EmployeeRole[];
