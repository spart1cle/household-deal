import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID,
  )
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let signIn: Promise<void> | null = null

function firebaseApp(): FirebaseApp {
  if (app) return app
  app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  return app
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(firebaseApp())
  return db
}

export function ensureAuth(): Promise<void> {
  if (!isFirebaseConfigured()) return Promise.resolve()
  if (signIn) return signIn
  auth = getAuth(firebaseApp())
  signIn = signInAnonymously(auth).then(() => undefined)
  return signIn
}
