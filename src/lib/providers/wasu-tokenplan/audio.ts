import { getProviderConfig } from '@/lib/api-config'
import type { GenerateResult } from '@/lib/generators/base'
import { WASU_TOKENPLAN_BASE_URL } from './types'
import type { WasuTokenplanGenerateRequestOptions } from './types'

export interface WasuTokenplanAudioGenerateParams {
  userId: string
  text: string
  voice?: string
  rate?: number
  options: WasuTokenplanGenerateRequestOptions
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function generateWasuTokenplanAudio(
  params: WasuTokenplanAudioGenerateParams,
): Promise<GenerateResult> {
  const voiceId = readTrimmedString(params.voice)
  const text = readTrimmedString(params.text)
  const modelId = readTrimmedString(params.options.modelId)

  if (!voiceId) {
    throw new Error('WASU_TOKENPLAN_VOICE_ID_REQUIRED')
  }
  if (!text) {
    throw new Error('WASU_TOKENPLAN_TEXT_REQUIRED')
  }
  if (!modelId) {
    throw new Error('WASU_TOKENPLAN_AUDIO_MODEL_ID_REQUIRED')
  }

  const { apiKey } = await getProviderConfig(params.userId, params.options.provider)

  const requestBody: Record<string, unknown> = {
    model: modelId,
    input: text,
    voice: voiceId,
    response_format: 'wav',
  }

  const instructions = readTrimmedString(params.options.instructions as string)
  if (instructions) {
    requestBody.instructions = instructions
  }

  const languageHints = params.options.languageHints as string[] | undefined
  if (languageHints && Array.isArray(languageHints) && languageHints.length > 0) {
    requestBody.audio_options = {
      language_hints: languageHints,
    }
  }

  const response = await fetch(`${WASU_TOKENPLAN_BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120_000),
  })

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    let errorMessage = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } }
      if (parsed.error?.message) {
        errorMessage = parsed.error.message
      }
    } catch {
      if (raw) errorMessage = raw.slice(0, 200)
    }
    throw new Error(`WASU_TOKENPLAN_AUDIO_GENERATE_FAILED: ${errorMessage}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await response.json() as { audio_url?: string; url?: string }
    const audioUrl = data.audio_url || data.url
    if (!audioUrl) {
      throw new Error('WASU_TOKENPLAN_AUDIO_URL_MISSING')
    }
    return {
      success: true,
      audioUrl,
    }
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64Audio = buffer.toString('base64')
  const audioUrl = `data:audio/wav;base64,${base64Audio}`

  return {
    success: true,
    audioUrl,
  }
}
