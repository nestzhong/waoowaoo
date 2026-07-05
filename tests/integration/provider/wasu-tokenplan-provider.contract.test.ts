import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWasuTokenplanImage } from '@/lib/providers/wasu-tokenplan/image'
import { generateWasuTokenplanVideo } from '@/lib/providers/wasu-tokenplan/video'
import { generateWasuTokenplanAudio } from '@/lib/providers/wasu-tokenplan/audio'
import { probeWasuTokenplan } from '@/lib/providers/wasu-tokenplan/probe'

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: vi.fn(async () => ({
    id: 'wasu-tokenplan',
    name: 'Wasu TokenPlan',
    apiKey: 'ws-test-key',
    baseUrl: undefined,
    gatewayRoute: 'official' as const,
  })),
}))

vi.mock('@/lib/storage/utils', () => ({
  toFetchableUrl: vi.fn((url: string) => url),
}))

describe('provider contract - wasu-tokenplan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('probe', () => {
    it('returns success when models endpoint responds with data', async () => {
      const fetchMock = vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ id: 'qwen3.6-plus' }, { id: 'qwen3.6-flash' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await probeWasuTokenplan('ws-key')

      expect(result.success).toBe(true)
      expect(result.steps[0]).toEqual({
        name: 'models',
        status: 'pass',
        message: 'Found 2 models',
      })
      expect(result.steps[1]).toEqual({
        name: 'credits',
        status: 'skip',
        message: 'Not supported by Wasu TokenPlan probe API',
      })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://token.wasu.cn/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer ws-key' },
        }),
      )
    })

    it('returns failure on 401 unauthorized', async () => {
      const fetchMock = vi.fn(async () =>
        new Response('Unauthorized', { status: 401 }),
      )
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await probeWasuTokenplan('bad-key')

      expect(result.success).toBe(false)
      expect(result.steps[0].status).toBe('fail')
      expect(result.steps[0].message).toContain('Authentication failed')
    })
  })

  describe('image generation', () => {
    it('submits text-to-image request for qwen-image-2.0', async () => {
      const fetchMock = vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ url: 'https://example.com/image.png' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await generateWasuTokenplanImage({
        userId: 'user-1',
        prompt: 'a cute cat',
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'qwen-image-2.0',
          modelKey: 'wasu-tokenplan::qwen-image-2.0',
        },
      })

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBe('https://example.com/image.png')
      expect(fetchMock).toHaveBeenCalledWith(
        'https://token.wasu.cn/v1/images/generations',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer ws-test-key',
            'Content-Type': 'application/json',
          },
        }),
      )
      const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      const body = JSON.parse(String(callArgs[1].body))
      expect(body).toEqual({
        model: 'qwen-image-2.0',
        prompt: 'a cute cat',
        n: 1,
        size: '1024x1024',
      })
    })

    it('submits image-to-image request for qwen-image-2.0-pro with reference images', async () => {
      const fetchMock = vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ url: 'https://example.com/image.png' }] }), {
          status: 200,
        }),
      )
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      await generateWasuTokenplanImage({
        userId: 'user-1',
        prompt: 'make it blue',
        referenceImages: ['https://example.com/ref.png'],
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'qwen-image-2.0-pro',
          modelKey: 'wasu-tokenplan::qwen-image-2.0-pro',
        },
      })

      const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      const body = JSON.parse(String(callArgs[1].body))
      expect(body.input.messages[0].content).toEqual([
        { image: 'https://example.com/ref.png' },
        { text: 'make it blue' },
      ])
    })
  })

  describe('video generation', () => {
    it('submits text-to-video request for wan2.7-t2v and polls for result', async () => {
      let pollCount = 0
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/video/generations') && !url.includes('/video/generations/')) {
          return new Response(JSON.stringify({ task_id: 'task-123' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        pollCount++
        if (pollCount >= 2) {
          return new Response(JSON.stringify({
            status: 'completed',
            output: { video_url: 'https://example.com/video.mp4' },
          }), { status: 200 })
        }
        return new Response(JSON.stringify({ status: 'processing' }), { status: 200 })
      })
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await generateWasuTokenplanVideo({
        userId: 'user-1',
        prompt: 'a flying bird',
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'wan2.7-t2v',
          modelKey: 'wasu-tokenplan::wan2.7-t2v',
        },
      })

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
      expect(result.requestId).toBe('task-123')
    })

    it('extracts video url from data wrapper with result_url', async () => {
      let pollCount = 0
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/video/generations') && !url.includes('/video/generations/')) {
          return new Response(JSON.stringify({ task_id: 'task-nested-1' }), { status: 200 })
        }
        pollCount++
        if (pollCount >= 2) {
          return new Response(JSON.stringify({
            data: {
              status: 'completed',
              result_url: 'https://example.com/result-video.mp4',
            },
          }), { status: 200 })
        }
        return new Response(JSON.stringify({ data: { status: 'processing' } }), { status: 200 })
      })
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await generateWasuTokenplanVideo({
        userId: 'user-1',
        prompt: 'a flying bird',
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'wan2.7-t2v',
          modelKey: 'wasu-tokenplan::wan2.7-t2v',
        },
      })

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/result-video.mp4')
    })

    it('extracts video url from response without data wrapper', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/video/generations') && !url.includes('/video/generations/')) {
          return new Response(JSON.stringify({ task_id: 'task-nested-2' }), { status: 200 })
        }
        return new Response(JSON.stringify({
          status: 'completed',
          result_url: 'https://example.com/direct-result.mp4',
        }), { status: 200 })
      })
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await generateWasuTokenplanVideo({
        userId: 'user-1',
        prompt: 'a swimming fish',
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'wan2.7-t2v',
          modelKey: 'wasu-tokenplan::wan2.7-t2v',
        },
      })

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/direct-result.mp4')
    })

    it('submits doubao-seedance-1.5-pro with seedance metadata', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/video/generations') && !url.includes('/video/generations/')) {
          return new Response(JSON.stringify({ task_id: 'task-seedance15' }), { status: 200 })
        }
        return new Response(JSON.stringify({
          status: 'completed',
          output: { video_url: 'https://example.com/seedance15.mp4' },
        }), { status: 200 })
      })
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await generateWasuTokenplanVideo({
        userId: 'user-1',
        imageUrl: 'https://example.com/frame.png',
        prompt: 'animate gently',
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'doubao-seedance-1.5-pro',
          modelKey: 'wasu-tokenplan::doubao-seedance-1.5-pro',
        },
      })

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/seedance15.mp4')
      const submitCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      const body = JSON.parse(String(submitCall[1].body))
      expect(body.model).toBe('doubao-seedance-1.5-pro')
    })

    it('submits doubao-seedance-2.0-fast with first/last frame content', async () => {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/video/generations') && !url.includes('/video/generations/')) {
          return new Response(JSON.stringify({ task_id: 'task-456' }), { status: 200 })
        }
        return new Response(JSON.stringify({
          status: 'completed',
          output: { video_url: 'https://example.com/seedance.mp4' },
        }), { status: 200 })
      })
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      await generateWasuTokenplanVideo({
        userId: 'user-1',
        imageUrl: 'https://example.com/first.png',
        prompt: 'animate this',
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'doubao-seedance-2.0-fast',
          modelKey: 'wasu-tokenplan::doubao-seedance-2.0-fast',
          lastFrameImageUrl: 'https://example.com/last.png',
        },
      })

      const submitCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      const body = JSON.parse(String(submitCall[1].body))
      expect(body.model).toBe('doubao-seedance-2.0-fast')
      expect(body.metadata.content).toHaveLength(2)
      expect(body.metadata.content[0].role).toBe('first_frame')
      expect(body.metadata.content[1].role).toBe('last_frame')
    })
  })

  describe('audio generation', () => {
    it('submits TTS request for qwen3-tts-instruct-flash', async () => {
      const fetchMock = vi.fn(async () =>
        new Response(JSON.stringify({ audio_url: 'https://example.com/audio.wav' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

      const result = await generateWasuTokenplanAudio({
        userId: 'user-1',
        text: 'Hello world',
        voice: 'alloy',
        options: {
          provider: 'wasu-tokenplan',
          modelId: 'qwen3-tts-instruct-flash',
          modelKey: 'wasu-tokenplan::qwen3-tts-instruct-flash',
        },
      })

      expect(result.success).toBe(true)
      expect(result.audioUrl).toBe('https://example.com/audio.wav')
      const audioCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      const body = JSON.parse(String(audioCall[1].body))
      expect(body).toEqual({
        model: 'qwen3-tts-instruct-flash',
        input: 'Hello world',
        voice: 'alloy',
        response_format: 'wav',
      })
    })
  })
})
