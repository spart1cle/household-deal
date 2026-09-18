import { eligiblePeople } from './deal'
import type { Chore, Person } from './types'

export function choreFor(chores: Chore[], choreId: string): Chore | undefined {
  return chores.find((c) => c.id === choreId)
}

export function canDo(chore: Chore, personId: string, people: Person[]): boolean {
  return eligiblePeople(chore, people).some((p) => p.id === personId)
}
