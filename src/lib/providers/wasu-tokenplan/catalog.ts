import { registerOfficialModel } from '@/lib/providers/official/model-registry'
import type { OfficialModelModality } from '@/lib/providers/official/model-registry'

const WASU_TOKENPLAN_CATALOG: Readonly<Record<OfficialModelModality, readonly string[]>> = {
  llm: [
    'qwen3.6-plus',
    'qwen3.6-flash',
    'doubao-seed-2.0-pro',
    'doubao-seed-2.0-lite',
    'doubao-seed-2.0-mini',
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'qwen3.7-max',
  ],
  image: [
    'qwen-image-2.0',
    'qwen-image-2.0-pro',
    'doubao-seedream-4.5',
    'doubao-seedream-5.0-lite',
  ],
  video: [
    'doubao-seedance-2.0',
    'doubao-seedance-2.0-fast',
    'doubao-seedance-2.0-mini',
    'doubao-seedance-1.5-pro',
  ],
  audio: [
    'qwen3-tts-instruct-flash',
  ],
}

let initialized = false

export function ensureWasuTokenplanCatalogRegistered(): void {
  if (initialized) return
  initialized = true
  for (const modality of Object.keys(WASU_TOKENPLAN_CATALOG) as OfficialModelModality[]) {
    for (const modelId of WASU_TOKENPLAN_CATALOG[modality]) {
      registerOfficialModel({ provider: 'wasu-tokenplan', modality, modelId })
    }
  }
}

export function listWasuTokenplanCatalogModels(modality: OfficialModelModality): readonly string[] {
  ensureWasuTokenplanCatalogRegistered()
  return WASU_TOKENPLAN_CATALOG[modality]
}
