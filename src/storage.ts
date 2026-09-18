import type { Firestore } from 'firebase/firestore'
import type { Household } from './types'

const LOCAL_PREFIX = 'household-deal:house:'
const LOCAL_EVENT = 'household-deal-changed'

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID,
  )
}

function localKey(code: string): string {
  return `${LOCAL_PREFIX}${code}`
}

function readLocal(code: string): Household | null {
  const raw = localStorage.getItem(localKey(code))
  if (!raw) return null
  try {
    return JSON.parse(raw) as Household
  } catch {
    return null
  }
}

function writeLocal(household: Household): void {
  localStorage.setItem(localKey(household.code), JSON.stringify(household))
  window.dispatchEvent(
    new CustomEvent(LOCAL_EVENT, { detail: household.code }),
  )
}

async function firestore(): Promise<Firestore> {
  const { ensureAuth, getDb } = await import('./firebase')
  await ensureAuth()
  return getDb()
}

export async function loadHousehold(code: string): Promise<Household | null> {
  if (!isFirebaseConfigured()) return readLocal(code)
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(await firestore(), 'households', code))
  return snap.exists() ? (snap.data() as Household) : null
}

export async function saveHousehold(household: Household): Promise<void> {
  if (!isFirebaseConfigured()) {
    writeLocal(household)
    return
  }
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(await firestore(), 'households', household.code), household)
}

export function subscribeHousehold(
  code: string,
  onData: (household: Household | null) => void,
): () => void {
  if (!isFirebaseConfigured()) {
    onData(readLocal(code))
    const onStorage = (event: StorageEvent) => {
      if (event.key === localKey(code)) onData(readLocal(code))
    }
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail === code) onData(readLocal(code))
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(LOCAL_EVENT, onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOCAL_EVENT, onLocal)
    }
  }

  let unsub = () => {}
  let cancelled = false
  void (async () => {
    const { doc, onSnapshot } = await import('firebase/firestore')
    if (cancelled) return
    unsub = onSnapshot(doc(await firestore(), 'households', code), (snap) => {
      onData(snap.exists() ? (snap.data() as Household) : null)
    })
  })()
  return () => {
    cancelled = true
    unsub()
  }
}
