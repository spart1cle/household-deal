import { newId } from './ids'
import type { Chore, EffortLevel, Role } from './types'

const ALL: Role[] = ['child', 'teen', 'adult']
const TEEN: Role[] = ['teen', 'adult']
const ADULT: Role[] = ['adult']

function chore(
  name: string,
  effort: EffortLevel,
  baseDays: number,
  eligibleRoles: Role[],
  extra: Partial<Chore> = {},
): Chore {
  return {
    id: newId(),
    name,
    effort,
    baseDays,
    dailyLocked: extra.dailyLocked ?? baseDays <= 1,
    weekday: extra.weekday ?? null,
    eligibleRoles,
    eligiblePersonIds: extra.eligiblePersonIds ?? [],
    note: extra.note ?? '',
    archived: false,
  }
}

export function starterCatalog(): Chore[] {
  return [
    chore('Unload dishwasher', 2, 1, TEEN),
    chore('Dishes / load dishwasher', 3, 1, TEEN),
    chore('Feed the dog (morning)', 1, 1, ALL, {
      note: 'Food is in the pantry.',
    }),
    chore('Feed the dog (evening)', 1, 1, ALL),
    chore('Declutter the living room', 3, 1, ALL),
    chore('Wipe kitchen counters / table', 2, 1, ALL),
    chore('Trash out', 1, 7, TEEN, { dailyLocked: true, weekday: 4 }),
    chore('Load laundry', 2, 3, TEEN),
    chore('Put away laundry', 3, 3, ALL),
    chore('Vacuum high-traffic floors', 3, 3, TEEN),
    chore('Clean a toilet', 2, 4, TEEN),
    chore('Wipe down a shower', 3, 7, TEEN),
    chore('Vacuum the rest of the house', 4, 7, TEEN),
    chore('Declutter another room', 3, 7, ALL),
    chore('Change towels', 2, 7, TEEN),
    chore('Change sheets', 3, 14, ADULT),
  ]
}
