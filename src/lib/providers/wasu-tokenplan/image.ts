import { getProviderConfig } from '@/lib/api-config'
import type { GenerateResult } from '@/lib/generators/base'
import { resolveSeedreamSize, identifySeedreamModelFamily, SEEDREAM_DEFAULT_SIZES } from '@/lib/generators/seedream-sizes'
import { WASU_TOKENPLAN_BASE_URL } from './types'
import type { WasuTokenplanGenerateRequestOptions } from './types'

export interface WasuTokenplanImageGenerateParams {
  userId: string
  prompt: string
  referenceImages?: string[]
  options: WasuTokenplanGenerateRequestOptions
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

interface WasuTokenplanImageResponse {
  data?: Array<{ url?: string; b64_json?: string }>
  error?: { message?: string; code?: string }
}

async function parseImageResponse(response: Response): Promise<WasuTokenplanImageResponse> {
  const raw = await response.text()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('WASU_TOKENPLAN_IMAGE_RESPONSE_INVALID')
    }
    return parsed as WasuTokenplanImageResponse
  } catch {
    throw new Error('WASU_TOKENPLAN_IMAGE_RESPONSE_INVALID_JSON')
  }
}

export async function generateWasuTokenplanImage(
  params: WasuTokenplanImageGenerateParams,
): Promise<GenerateResult> {
  const modelId = readTrimmedString(params.options.modelId)
  if (!modelId) {
    throw new Error('WASU_TOKENPLAN_IMAGE_MODEL_ID_REQUIRED')
  }

  const prompt = readTrimmedString(params.prompt)
  if (!prompt) {
    throw new Error('WASU_TOKENPLAN_IMAGE_PROMPT_REQUIRED')
  }

  const { apiKey } = await getProviderConfig(params.userId, params.options.provider)

  const seedreamFamily = identifySeedreamModelFamily(modelId)
  const isDoubaoSeedream = seedreamFamily !== null
  const isQwenImagePro = modelId === 'qwen-image-2.0-pro'
  const hasReferenceImages = !!params.referenceImages && params.referenceImages.length > 0

  const resolveSize = (): string => {
    if (isDoubaoSeedream) {
      const resolved = resolveSeedreamSize({
        modelId,
        directSize: readTrimmedString(params.options.size),
        resolution: readTrimmedString(params.options.resolution),
        aspectRatio: readTrimmedString(params.options.aspectRatio),
      })
      return resolved || SEEDREAM_DEFAULT_SIZES[seedreamFamily!]
    }
    return readTrimmedString(params.options.size) || '1024x1024'
  }

  const size = resolveSize()

  let requestBody: Record<string, unknown>

  if (isDoubaoSeedream && hasReferenceImages) {
    requestBody = {
      model: modelId,
      prompt,
      image: params.referenceImages,
      n: 1,
      size,
    }
  } else if (isQwenImagePro && hasReferenceImages) {
    requestBody = {
      model: modelId,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              ...(params.referenceImages || []).map((url) => ({ image: url })),
              { text: prompt },
            ],
          },
        ],
      },
      parameters: {
        n: 1,
        size,
      },
    }
  } else {
    requestBody = {
      model: modelId,
      prompt,
      n: 1,
      size,
    }
  }

  const response = await fetch(`${WASU_TOKENPLAN_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120_000),
  })

  const data = await parseImageResponse(response)

  if (!response.ok) {
    const errorMessage = data.error?.message || data.error?.code || `HTTP ${response.status}`
    throw new Error(`WASU_TOKENPLAN_IMAGE_GENERATE_FAILED: ${errorMessage}`)
  }

  const imageData = data.data?.[0]
  if (!imageData) {
    throw new Error('WASU_TOKENPLAN_IMAGE_DATA_MISSING')
  }

  if (imageData.url) {
    return {
      success: true,
      imageUrl: imageData.url,
    }
  }

  if (imageData.b64_json) {
    return {
      success: true,
      imageBase64: imageData.b64_json,
    }
  }

  throw new Error('WASU_TOKENPLAN_IMAGE_DATA_EMPTY')
}
