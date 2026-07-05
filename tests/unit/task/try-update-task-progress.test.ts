import { beforeEach, describe, expect, it, vi } from 'vitest'

const taskFindUniqueMock = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<{ payload: Record<string, unknown> | null } | null>>(
    async () => null,
  ),
)
const taskUpdateManyMock = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<{ count: number }>>(async () => ({ count: 1 })),
)

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: taskFindUniqueMock,
      updateMany: taskUpdateManyMock,
    },
  },
}))

import { tryUpdateTaskProgress } from '@/lib/task/service'

describe('tryUpdateTaskProgress payload merge', () => {
  beforeEach(() => {
    taskFindUniqueMock.mockReset()
    taskUpdateManyMock.mockReset()
  })

  it('merges new payload into existing task payload', async () => {
    taskFindUniqueMock.mockResolvedValue({
      payload: { stage: 'image_generating', stageLabel: 'Generating', customField: 'keep-me' },
    })
    taskUpdateManyMock.mockResolvedValue({ count: 1 })

    const result = await tryUpdateTaskProgress('task-1', 50, {
      stage: 'video_rendering',
      stageLabel: 'Rendering',
    })

    expect(result).toBe(true)
    expect(taskUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          progress: 50,
          payload: {
            stage: 'video_rendering',
            stageLabel: 'Rendering',
            customField: 'keep-me',
          },
        }),
      }),
    )
  })

  it('preserves existing payload when no new payload provided', async () => {
    taskFindUniqueMock.mockResolvedValue({
      payload: { stage: 'encoding', progress_detail: '50%' },
    })
    taskUpdateManyMock.mockResolvedValue({ count: 1 })

    const result = await tryUpdateTaskProgress('task-2', 75)

    expect(result).toBe(true)
    expect(taskUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { progress: 75 },
      }),
    )
  })

  it('handles null existing payload gracefully', async () => {
    taskFindUniqueMock.mockResolvedValue({ payload: null })
    taskUpdateManyMock.mockResolvedValue({ count: 1 })

    const result = await tryUpdateTaskProgress('task-3', 30, { stage: 'queued' })

    expect(result).toBe(true)
    expect(taskUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          progress: 30,
          payload: { stage: 'queued' },
        }),
      }),
    )
  })

  it('handles missing task record gracefully', async () => {
    taskFindUniqueMock.mockResolvedValue(null)
    taskUpdateManyMock.mockResolvedValue({ count: 1 })

    const result = await tryUpdateTaskProgress('task-missing', 10, { stage: 'starting' })

    expect(result).toBe(true)
    expect(taskUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          progress: 10,
          payload: { stage: 'starting' },
        }),
      }),
    )
  })
})
