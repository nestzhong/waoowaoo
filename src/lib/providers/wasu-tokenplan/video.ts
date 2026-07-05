import { getProviderConfig } from '@/lib/api-config'
import type { GenerateResult } from '@/lib/generators/base'
import { toFetchableUrl } from '@/lib/storage/utils'
import { WASU_TOKENPLAN_BASE_URL } from './types'
import type { WasuTokenplanGenerateRequestOptions } from './types'

export interface WasuTokenplanVideoGenerateParams {
  userId: string
  imageUrl?: string
  prompt?: string
  options: WasuTokenplanGenerateRequestOptions
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function readOptionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`WASU_TOKENPLAN_VIDEO_OPTION_INVALID_${fieldName.toUpperCase()}`)
  }
  return value
}

const DOUBAO_SEEDANCE_MODELS = new Set(['doubao-seedance-2.0-fast', 'doubao-seedance-1.5-pro'])
const WAN_TEXT_TO_VIDEO_MODELS = new Set(['wan2.7-t2v'])
const WAN_IMAGE_TO_VIDEO_MODELS = new Set(['wan2.7-i2v'])
const WAN_REFERENCE_MODELS = new Set(['wan2.7-r2v'])
const WAN_VIDEO_EDIT_MODELS = new Set(['wan2.7-videoedit'])

interface WasuTokenplanVideoSubmitResponse {
  task_id?: string
  id?: string
  status?: string
  error?: { message?: string; code?: string }
}

interface WasuTokenplanVideoTaskStatusResponse {
  task_id?: string
  id?: string
  status?: string
  result_url?: string
  output?: {
    video_url?: string
    url?: string
  }
  data?: {
    status?: string
    content?: {
      video_url?: string
    }
    video_url?: string
    url?: string
  }
  video_url?: string
  url?: string
  error?: { message?: string; code?: string }
}

function assertNoUnsupportedOptions(options: WasuTokenplanGenerateRequestOptions): void {
  const allowedOptionKeys = new Set([
    'provider',
    'modelId',
    'modelKey',
    'prompt',
    'resolution',
    'ratio',
    'aspectRatio',
    'watermark',
    'promptExtend',
    'duration',
    'generateAudio',
    'lastFrameImageUrl',
  ])
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue
    if (!allowedOptionKeys.has(key)) {
      throw new Error(`WASU_TOKENPLAN_VIDEO_OPTION_UNSUPPORTED: ${key}`)
    }
  }
}

function buildSubmitRequestBody(params: WasuTokenplanVideoGenerateParams): Record<string, unknown> {
  const modelId = readTrimmedString(params.options.modelId)
  if (!modelId) {
    throw new Error('WASU_TOKENPLAN_VIDEO_MODEL_ID_REQUIRED')
  }

  const prompt = readTrimmedString(params.prompt) || readTrimmedString(params.options.prompt)
  const resolution = readTrimmedString(params.options.resolution)
  const ratio = readTrimmedString(params.options.ratio as string) || readTrimmedString(params.options.aspectRatio as string)
  const watermark = readOptionalBoolean(params.options.watermark)
  const promptExtend = readOptionalBoolean(params.options.promptExtend)
  const duration = readOptionalPositiveInteger(params.options.duration, 'duration')
  const generateAudio = readOptionalBoolean(params.options.generateAudio)

  const imageUrl = readTrimmedString(params.imageUrl)

  if (DOUBAO_SEEDANCE_MODELS.has(modelId)) {
    const lastFrameImageUrl = readTrimmedString(params.options.lastFrameImageUrl)
    const content: Array<Record<string, unknown>> = []

    if (imageUrl) {
      content.push({
        type: 'image_url',
        role: 'first_frame',
        image_url: { url: toFetchableUrl(imageUrl) },
      })
    }
    if (lastFrameImageUrl) {
      content.push({
        type: 'image_url',
        role: 'last_frame',
        image_url: { url: toFetchableUrl(lastFrameImageUrl) },
      })
    }

    if (content.length === 0) {
      throw new Error('WASU_TOKENPLAN_VIDEO_IMAGE_URL_REQUIRED')
    }

    const requestBody: Record<string, unknown> = {
      model: modelId,
      prompt: prompt || 'Generate a video',
      duration: duration || 5,
      metadata: {
        resolution: resolution || '720p',
        ratio: ratio || '16:9',
        generate_audio: generateAudio ?? false,
        content,
      },
    }
    return requestBody
  }

  if (WAN_TEXT_TO_VIDEO_MODELS.has(modelId)) {
    if (!prompt) {
      throw new Error('WASU_TOKENPLAN_VIDEO_PROMPT_REQUIRED')
    }
    const requestBody: Record<string, unknown> = {
      model: modelId,
      prompt,
    }
    const parameters: Record<string, unknown> = {}
    if (resolution) parameters.resolution = resolution
    if (ratio) parameters.ratio = ratio
    if (typeof promptExtend === 'boolean') parameters.prompt_extend = promptExtend
    if (typeof watermark === 'boolean') parameters.watermark = watermark
    if (typeof duration === 'number') parameters.duration = duration
    if (Object.keys(parameters).length > 0) {
      requestBody.parameters = parameters
    }
    return requestBody
  }

  if (WAN_IMAGE_TO_VIDEO_MODELS.has(modelId)) {
    if (!imageUrl) {
      throw new Error('WASU_TOKENPLAN_VIDEO_IMAGE_URL_REQUIRED')
    }
    const requestBody: Record<string, unknown> = {
      model: modelId,
      prompt: prompt || 'Animate the image',
      input_reference: toFetchableUrl(imageUrl),
    }
    if (duration) requestBody.duration = duration
    if (resolution) requestBody.resolution = resolution
    if (ratio) requestBody.ratio = ratio
    return requestBody
  }

  if (WAN_REFERENCE_MODELS.has(modelId)) {
    if (!imageUrl) {
      throw new Error('WASU_TOKENPLAN_VIDEO_IMAGE_URL_REQUIRED')
    }
    const requestBody: Record<string, unknown> = {
      model: modelId,
      prompt: prompt || 'Generate video from reference',
      media: [
        { type: 'reference_image', url: toFetchableUrl(imageUrl) },
      ],
    }
    if (duration) requestBody.duration = duration
    if (resolution) requestBody.resolution = resolution
    if (ratio) requestBody.ratio = ratio
    return requestBody
  }

  if (WAN_VIDEO_EDIT_MODELS.has(modelId)) {
    if (!imageUrl) {
      throw new Error('WASU_TOKENPLAN_VIDEO_IMAGE_URL_REQUIRED')
    }
    if (!prompt) {
      throw new Error('WASU_TOKENPLAN_VIDEO_PROMPT_REQUIRED')
    }
    const requestBody: Record<string, unknown> = {
      model: modelId,
      prompt,
      media: [
        { type: 'video', url: toFetchableUrl(imageUrl) },
      ],
    }
    if (duration) requestBody.duration = duration
    if (resolution) requestBody.resolution = resolution
    if (ratio) requestBody.ratio = ratio
    return requestBody
  }

  throw new Error(`WASU_TOKENPLAN_VIDEO_UNSUPPORTED_MODEL: ${modelId}`)
}

async function parseSubmitResponse(response: Response): Promise<WasuTokenplanVideoSubmitResponse> {
  const raw = await response.text()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('WASU_TOKENPLAN_VIDEO_RESPONSE_INVALID')
    }
    return parsed as WasuTokenplanVideoSubmitResponse
  } catch {
    throw new Error('WASU_TOKENPLAN_VIDEO_RESPONSE_INVALID_JSON')
  }
}

async function parseTaskStatusResponse(response: Response): Promise<WasuTokenplanVideoTaskStatusResponse> {
  const raw = await response.text()
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('WASU_TOKENPLAN_VIDEO_STATUS_RESPONSE_INVALID')
    }
    const data = parsed.data as Record<string, unknown> | undefined
    const taskData = (data && typeof data === 'object' ? data : parsed) as WasuTokenplanVideoTaskStatusResponse
    return taskData
  } catch {
    throw new Error('WASU_TOKENPLAN_VIDEO_STATUS_RESPONSE_INVALID_JSON')
  }
}

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 15 * 60 * 1000

async function pollVideoTask(
  taskId: string,
  apiKey: string,
): Promise<WasuTokenplanVideoTaskStatusResponse> {
  const startTime = Date.now()

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const statusResponse = await fetch(`${WASU_TOKENPLAN_BASE_URL}/video/generations/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30_000),
    })

    const statusData = await parseTaskStatusResponse(statusResponse)

    if (!statusResponse.ok) {
      const errorMessage = statusData.error?.message || statusData.error?.code || `HTTP ${statusResponse.status}`
      throw new Error(`WASU_TOKENPLAN_VIDEO_POLL_FAILED: ${errorMessage}`)
    }

    const rawStatus = statusData.status || statusData.data?.status
    const status = rawStatus?.toLowerCase()
    if (status === 'completed' || status === 'succeeded' || status === 'success') {
      return statusData
    }
    if (status === 'failed' || status === 'error') {
      const errorMessage = statusData.error?.message || 'Task failed'
      throw new Error(`WASU_TOKENPLAN_VIDEO_TASK_FAILED: ${errorMessage}`)
    }
  }

  throw new Error('WASU_TOKENPLAN_VIDEO_POLL_TIMEOUT')
}

export async function generateWasuTokenplanVideo(
  params: WasuTokenplanVideoGenerateParams,
): Promise<GenerateResult> {
  assertNoUnsupportedOptions(params.options)

  const { apiKey } = await getProviderConfig(params.userId, params.options.provider)
  const requestBody = buildSubmitRequestBody(params)

  const response = await fetch(`${WASU_TOKENPLAN_BASE_URL}/video/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(60_000),
  })

  const data = await parseSubmitResponse(response)

  if (!response.ok) {
    const errorMessage = data.error?.message || data.error?.code || `HTTP ${response.status}`
    throw new Error(`WASU_TOKENPLAN_VIDEO_SUBMIT_FAILED: ${errorMessage}`)
  }

  const taskId = readTrimmedString(data.task_id || data.id)
  if (!taskId) {
    throw new Error('WASU_TOKENPLAN_VIDEO_TASK_ID_MISSING')
  }

  console.log(`[wasu-tokenplan-video] External task submitted: ${taskId}`, JSON.stringify({ model: params.options.modelId, prompt: params.prompt?.slice(0, 50) }))

  const statusData = await pollVideoTask(taskId, apiKey)
  const videoUrl = statusData.result_url
    || statusData.data?.content?.video_url
    || statusData.data?.video_url
    || statusData.data?.url
    || statusData.output?.video_url
    || statusData.output?.url
    || statusData.video_url
    || statusData.url

  if (!videoUrl) {
    throw new Error('WASU_TOKENPLAN_VIDEO_URL_MISSING')
  }

  return {
    success: true,
    videoUrl,
    requestId: taskId,
    async: false,
  }
}
