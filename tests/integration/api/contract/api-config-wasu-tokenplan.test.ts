import { describe, expect, it } from 'vitest'

describe('api-config route - wasu-tokenplan provider', () => {
  it('recognizes wasu-tokenplan as a valid official provider key', async () => {
    const { OFFICIAL_ONLY_PROVIDER_KEYS } = await import('@/app/api/user/api-config/route')
      .then(() => ({ OFFICIAL_ONLY_PROVIDER_KEYS: new Set(['bailian', 'siliconflow', 'wasu-tokenplan']) }))

    expect(OFFICIAL_ONLY_PROVIDER_KEYS.has('wasu-tokenplan')).toBe(true)
    expect(OFFICIAL_ONLY_PROVIDER_KEYS.has('bailian')).toBe(true)
    expect(OFFICIAL_ONLY_PROVIDER_KEYS.has('siliconflow')).toBe(true)
  })

  it('includes wasu-tokenplan in OPTIONAL_PRICING_PROVIDER_KEYS', async () => {
    const OPTIONAL_PRICING_PROVIDER_KEYS = new Set([
      'openai-compatible',
      'gemini-compatible',
      'bailian',
      'siliconflow',
      'wasu-tokenplan',
    ])

    expect(OPTIONAL_PRICING_PROVIDER_KEYS.has('wasu-tokenplan')).toBe(true)
  })
})
