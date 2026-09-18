import { describe, expect, it } from 'vitest'
import { starterCatalog } from './catalog'
import {
  dealDay,
  effectiveInterval,
  isDue,
  requiredChores,
  rollingEffort,
} from './deal'
import type { Household, Person } from './types'

function person(id: string, name: string, role: Person['role']): Person {
  return { id, name, role, archived: false }
}

function household(partial: Partial<Household> = {}): Household {
  return {
    code: 'TEST12',
    startedOn: '2026-09-18',
    timezone: 'UTC',
    pace: 'normal',
    people: [
      person('a', 'Alex', 'adult'),
      person('b', 'Blair', 'adult'),
      person('c', 'Casey', 'child'),
    ],
    chores: starterCatalog().map((ch, i) => ({ ...ch, id: `ch${i}` })),
    lastDone: {},
    lastSkip: {},
    lastAssigned: {},
    days: {},
    ...partial,
  }
}

const rng = () => 0.2

describe('effectiveInterval', () => {
  it('does not stretch daily locked chores', () => {
    const h = household({ pace: 'relaxed' })
    const dishes = h.chores.find((c) => c.name.startsWith('Dishes'))!
    expect(effectiveInterval(dishes, 'relaxed')).toBe(1)
  })

  it('stretches rotating chores on relaxed pace', () => {
    const sheets = household().chores.find((c) => c.name === 'Change sheets')!
    expect(effectiveInterval(sheets, 'normal')).toBe(14)
    expect(effectiveInterval(sheets, 'relaxed')).toBe(21)
  })
})

describe('isDue', () => {
  it('treats never-done daily chores as due', () => {
    const h = household()
    const dishes = h.chores.find((c) => c.name.startsWith('Dishes'))!
    expect(isDue(dishes, h, '2026-09-18')).toBe(true)
  })

  it('hides weekday chores on other days', () => {
    const h = household()
    const trash = h.chores.find((c) => c.name === 'Trash out')!
    // 2026-09-18 is Friday (5); trash defaults to Thursday (4)
    expect(isDue(trash, h, '2026-09-18')).toBe(false)
    expect(isDue(trash, h, '2026-09-17')).toBe(true)
  })

  it('does not dump never-done rotating chores on day one', () => {
    const h = household()
    const sheets = h.chores.find((c) => c.name === 'Change sheets')!
    const laundry = h.chores.find((c) => c.name === 'Load laundry')!
    expect(isDue(sheets, h, '2026-09-18')).toBe(false)
    expect(isDue(laundry, h, '2026-09-18')).toBe(false)
  })

  it('brings rotating chores due after their interval', () => {
    const h = household({ startedOn: '2026-09-04' })
    const sheets = h.chores.find((c) => c.name === 'Change sheets')!
    expect(isDue(sheets, h, '2026-09-18')).toBe(true)
  })
})

describe('dealDay', () => {
  it('assigns every due daily job even when there are more jobs than people', () => {
    const h = household()
    const today = '2026-09-18'
    const due = requiredChores(h, today)
    const deal = dealDay(h, today, { rng })
    const required = deal.assignments.filter((a) => a.required)
    expect(required.length).toBeGreaterThan(h.people.length)
    expect(required.length).toBe(due.length)
    const peopleWithJobs = new Set(required.map((a) => a.personId))
    expect(peopleWithJobs.size).toBeGreaterThan(1)
  })

  it('does not give adult-only jobs to a child', () => {
    const h = household({ startedOn: '2026-09-04' })
    const sheets = h.chores.find((c) => c.name === 'Change sheets')!
    const deal = dealDay(
      {
        ...h,
        lastDone: Object.fromEntries(
          h.chores.filter((c) => c.id !== sheets.id).map((c) => [c.id, '2026-09-18']),
        ),
      },
      '2026-09-18',
      { rng },
    )
    const sheetJob = deal.assignments.find((a) => a.choreId === sheets.id)
    if (sheetJob) {
      expect(sheetJob.personId).not.toBe('c')
    }
  })

  it('skips people who are out', () => {
    const deal = dealDay(household(), '2026-09-18', {
      outPersonIds: ['c'],
      rng,
    })
    expect(deal.assignments.some((a) => a.personId === 'c')).toBe(false)
    expect(deal.outPersonIds).toContain('c')
  })

  it('marks the heaviest required job as Main', () => {
    const deal = dealDay(household(), '2026-09-18', { rng })
    const byPerson = new Map<string, typeof deal.assignments>()
    for (const a of deal.assignments.filter((x) => x.required)) {
      const list = byPerson.get(a.personId) ?? []
      list.push(a)
      byPerson.set(a.personId, list)
    }
    for (const list of byPerson.values()) {
      expect(list.filter((a) => a.isMain)).toHaveLength(1)
    }
  })

  it('gives the next job to the person with lower rolling effort', () => {
    const h = household({
      days: {
        '2026-09-17': {
          date: '2026-09-17',
          outPersonIds: [],
          dealtAt: '',
          assignments: [
            {
              id: 'old',
              choreId: 'ch1',
              personId: 'a',
              required: true,
              isMain: true,
              status: 'done',
              completedBy: 'a',
            },
          ],
        },
      },
    })
    const totals = rollingEffort(h, '2026-09-18')
    expect(totals.a).toBeGreaterThan(totals.b)
  })
})
