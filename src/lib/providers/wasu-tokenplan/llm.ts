import OpenAI from 'openai'
import {
  assertOfficialModelRegistered,
  type OfficialModelModality,
} from '@/lib/providers/official/model-registry'
import { ensureWasuTokenplanCatalogRegistered } from './catalog'
import { WASU_TOKENPLAN_BASE_URL } from './types'
import type { WasuTokenplanLlmMessage } from './types'

export interface WasuTokenplanLlmCompletionParams {
  modelId: string
  messages: WasuTokenplanLlmMessage[]
  apiKey: string
  temperature?: number
}

function assertRegistered(modelId: string): void {
  ensureWasuTokenplanCatalogRegistered()
  assertOfficialModelRegistered({
    provider: 'wasu-tokenplan',
    modality: 'llm' satisfies OfficialModelModality,
    modelId,
  })
}

export async function completeWasuTokenplanLlm(
  _params: WasuTokenplanLlmCompletionParams,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  assertRegistered(_params.modelId)
  const client = new OpenAI({
    apiKey: _params.apiKey,
    baseURL: WASU_TOKENPLAN_BASE_URL,
    timeout: 30_000,
  })
  const completion = await client.chat.completions.create({
    model: _params.modelId,
    messages: _params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: _params.temperature ?? 0.7,
  })
  return completion as OpenAI.Chat.Completions.ChatCompletion
}
