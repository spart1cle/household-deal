const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newId(): string {
  return crypto.randomUUID()
}

export function newHouseholdCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}
