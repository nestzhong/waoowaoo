export type WasuTokenplanProviderKey = 'wasu-tokenplan'

export const WASU_TOKENPLAN_BASE_URL = 'https://token.wasu.cn/v1'

export interface WasuTokenplanGenerateRequestOptions {
  provider: string
  modelId: string
  modelKey: string
  [key: string]: unknown
}

export type WasuTokenplanLlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface WasuTokenplanLlmMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | WasuTokenplanLlmContentPart[]
}

export interface WasuTokenplanProbeStep {
  name: 'models' | 'credits'
  status: 'pass' | 'fail' | 'skip'
  message: string
  detail?: string
}

export interface WasuTokenplanProbeResult {
  success: boolean
  steps: WasuTokenplanProbeStep[]
}
