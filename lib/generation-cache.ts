interface CachedGeneration {
  generated_text: string
  persona_version_id: string
  persona_id: string
  account_id: string
  seed_text: string
  tier_id: number
  created_at: number
}

const cache = new Map<string, CachedGeneration>()
const TTL = 24 * 60 * 60 * 1000 // 24 hours

function evictExpired() {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (now - entry.created_at > TTL) cache.delete(key)
  }
}

export function storeGeneration(generationId: string, data: Omit<CachedGeneration, 'created_at'>): void {
  evictExpired()
  cache.set(generationId, { ...data, created_at: Date.now() })
}

export function getGeneration(generationId: string, accountId: string): CachedGeneration | null {
  evictExpired()
  const entry = cache.get(generationId)
  if (!entry) return null
  if (entry.account_id !== accountId) return null
  return entry
}

export function removeGeneration(generationId: string): void {
  cache.delete(generationId)
}
