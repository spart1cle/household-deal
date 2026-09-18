import { createContext, useContext } from 'react'

export type Tab = 'today' | 'week' | 'manage' | 'me'

export const NavContext = createContext<(tab: Tab) => void>(() => {})

export function useNav(): (tab: Tab) => void {
  return useContext(NavContext)
}
