import { WASU_TOKENPLAN_BASE_URL } from './types'
import type { WasuTokenplanProbeResult, WasuTokenplanProbeStep } from './types'

export async function probeWasuTokenplan(apiKey: string): Promise<WasuTokenplanProbeResult> {
  const steps: WasuTokenplanProbeStep[] = []
  const headers = { Authorization: `Bearer ${apiKey}` }

  try {
    const modelResponse = await fetch(`${WASU_TOKENPLAN_BASE_URL}/models`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(20_000),
    })

    if (!modelResponse.ok) {
      const status = modelResponse.status
      let message = `HTTP ${status}`
      if (status === 401) message = 'Authentication failed — check API Key'
      else if (status === 403) message = 'Access denied — check API Key permissions'

      const detail = await modelResponse.text().catch(() => '')
      steps.push({
        name: 'models',
        status: 'fail',
        message,
        detail: detail.slice(0, 500),
      })
      steps.push({
        name: 'credits',
        status: 'skip',
        message: 'Not supported by Wasu TokenPlan probe API',
      })
      return { success: false, steps }
    }

    const modelData = await modelResponse.json() as { data?: Array<{ id?: string }> }
    const count = Array.isArray(modelData.data) ? modelData.data.length : 0
    steps.push({
      name: 'models',
      status: 'pass',
      message: `Found ${count} models`,
    })
    steps.push({
      name: 'credits',
      status: 'skip',
      message: 'Not supported by Wasu TokenPlan probe API',
    })
    return { success: true, steps }
  } catch (error) {
    const message = error instanceof Error
      ? (error.message.includes('timeout') ? 'Request timed out' : `Network error: ${error.message}`)
      : 'Unknown error'
    steps.push({
      name: 'models',
      status: 'fail',
      message,
    })
    steps.push({
      name: 'credits',
      status: 'skip',
      message: 'Not supported by Wasu TokenPlan probe API',
    })
    return { success: false, steps }
  }
}
