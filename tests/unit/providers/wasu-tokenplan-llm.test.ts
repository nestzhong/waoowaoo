import { beforeEach, describe, expect, it, vi } from 'vitest'

const createChatCompletionMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: 'chatcmpl_wasu',
    object: 'chat.completion',
    created: 1,
    model: 'qwen3.6-plus',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'ok' },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 1,
      total_tokens: 2,
    },
  })),
)

const openAiCtorMock = vi.hoisted(() =>
  vi.fn(() => ({
    chat: {
      completions: {
        create: createChatCompletionMock,
      },
    },
  })),
)

vi.mock('openai', () => ({
  default: openAiCtorMock,
}))

import { completeWasuTokenplanLlm } from '@/lib/providers/wasu-tokenplan/llm'

describe('wasu-tokenplan llm provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls token.wasu.cn openai-compatible endpoint for registered qwen model', async () => {
    const completion = await completeWasuTokenplanLlm({
      modelId: 'qwen3.6-plus',
      messages: [{ role: 'user', content: 'hello' }],
      apiKey: 'ws-key',
      temperature: 0.2,
    })

    expect(openAiCtorMock).toHaveBeenCalledWith({
      apiKey: 'ws-key',
      baseURL: 'https://token.wasu.cn/v1',
      timeout: 30_000,
    })
    expect(createChatCompletionMock).toHaveBeenCalledWith({
      model: 'qwen3.6-plus',
      messages: [{ role: 'user', content: 'hello' }],
      temperature: 0.2,
    })
    expect(completion.choices[0]?.message?.content).toBe('ok')
  })

  it('fails fast when model is not in official wasu-tokenplan catalog', async () => {
    await expect(
      completeWasuTokenplanLlm({
        modelId: 'unknown-model',
        messages: [{ role: 'user', content: 'hello' }],
        apiKey: 'ws-key',
      }),
    ).rejects.toThrow(/MODEL_NOT_REGISTERED/)

    expect(openAiCtorMock).not.toHaveBeenCalled()
    expect(createChatCompletionMock).not.toHaveBeenCalled()
  })

  it('supports vision content with image_url parts', async () => {
    const visionMessages = [
      {
        role: 'user' as const,
        content: [
          { type: 'image_url' as const, image_url: { url: 'https://example.com/img.png' } },
          { type: 'text' as const, text: 'describe this image' },
        ],
      },
    ]

    await completeWasuTokenplanLlm({
      modelId: 'qwen3.6-plus',
      messages: visionMessages,
      apiKey: 'ws-key',
    })

    expect(createChatCompletionMock).toHaveBeenCalledWith({
      model: 'qwen3.6-plus',
      messages: visionMessages,
      temperature: 0.7,
    })
  })
})
