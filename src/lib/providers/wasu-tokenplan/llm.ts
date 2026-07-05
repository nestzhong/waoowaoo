import OpenAI from 'openai'
import { WASU_TOKENPLAN_BASE_URL } from './types'
import type { WasuTokenplanLlmMessage } from './types'

export interface WasuTokenplanLlmCompletionParams {
  modelId: string
  messages: WasuTokenplanLlmMessage[]
  apiKey: string
  temperature?: number
}

export async function completeWasuTokenplanLlm(
  _params: WasuTokenplanLlmCompletionParams,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const client = new OpenAI({
    apiKey: _params.apiKey,
    baseURL: WASU_TOKENPLAN_BASE_URL,
    timeout: 300_000,
  })
  const completion = await client.chat.completions.create({
    model: _params.modelId,
    messages: _params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: _params.temperature ?? 0.7,
  })
  return completion as OpenAI.Chat.Completions.ChatCompletion
}
