export type SeedreamModelFamily = 'seedream-4.5' | 'seedream-5.0-lite'

type AspectRatioKey = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9' | '9:21'

const SEEDREAM_4_5_2K: Record<AspectRatioKey, string> = {
    '1:1': '2048x2048',
    '4:3': '2304x1728',
    '3:4': '1728x2304',
    '16:9': '2848x1600',
    '9:16': '1600x2848',
    '3:2': '2496x1664',
    '2:3': '1664x2496',
    '21:9': '3136x1344',
    '9:21': '1344x3136',
}

const SEEDREAM_4_5_4K: Record<AspectRatioKey, string> = {
    '1:1': '4096x4096',
    '4:3': '4704x3520',
    '3:4': '3520x4704',
    '16:9': '5504x3040',
    '9:16': '3040x5504',
    '3:2': '4992x3328',
    '2:3': '3328x4992',
    '21:9': '6240x2656',
    '9:21': '2656x6240',
}

const SEEDREAM_5_0_LITE_2K: Record<AspectRatioKey, string> = {
    '1:1': '2048x2048',
    '4:3': '2304x1728',
    '3:4': '1728x2304',
    '16:9': '2848x1600',
    '9:16': '1600x2848',
    '3:2': '2496x1664',
    '2:3': '1664x2496',
    '21:9': '3136x1344',
    '9:21': '1344x3136',
}

const SEEDREAM_5_0_LITE_3K: Record<AspectRatioKey, string> = {
    '1:1': '3072x3072',
    '4:3': '3456x2592',
    '3:4': '2592x3456',
    '16:9': '4096x2304',
    '9:16': '2304x4096',
    '3:2': '3744x2496',
    '2:3': '2496x3744',
    '21:9': '4704x2016',
    '9:21': '2016x4704',
}

const SEEDREAM_5_0_LITE_4K: Record<AspectRatioKey, string> = {
    '1:1': '4096x4096',
    '4:3': '4704x3520',
    '3:4': '3520x4704',
    '16:9': '5504x3040',
    '9:16': '3040x5504',
    '3:2': '4992x3328',
    '2:3': '3328x4992',
    '21:9': '6240x2656',
    '9:21': '2656x6240',
}

export const SEEDREAM_SIZE_MAPS: Record<SeedreamModelFamily, Record<string, Record<AspectRatioKey, string>>> = {
    'seedream-4.5': {
        '2K': SEEDREAM_4_5_2K,
        '4K': SEEDREAM_4_5_4K,
    },
    'seedream-5.0-lite': {
        '2K': SEEDREAM_5_0_LITE_2K,
        '3K': SEEDREAM_5_0_LITE_3K,
        '4K': SEEDREAM_5_0_LITE_4K,
    },
}

export const SEEDREAM_DEFAULT_RESOLUTIONS: Record<SeedreamModelFamily, string> = {
    'seedream-4.5': '2K',
    'seedream-5.0-lite': '2K',
}

export const SEEDREAM_DEFAULT_SIZES: Record<SeedreamModelFamily, string> = {
    'seedream-4.5': '2048x2048',
    'seedream-5.0-lite': '2048x2048',
}

export function identifySeedreamModelFamily(modelId: string): SeedreamModelFamily | null {
    if (modelId.includes('seedream-5') || modelId.includes('seedream-5.0-lite')) {
        return 'seedream-5.0-lite'
    }
    if (modelId.includes('seedream-4.5') || modelId.includes('seedream-4-5')) {
        return 'seedream-4.5'
    }
    return null
}

export function resolveSeedreamSize(params: {
    modelId: string
    directSize?: string
    resolution?: string
    aspectRatio?: string
}): string | undefined {
    const family = identifySeedreamModelFamily(params.modelId)
    if (!family) return undefined

    if (params.directSize) {
        return params.directSize
    }

    const sizeMapByResolution = SEEDREAM_SIZE_MAPS[family]
    const resolution = params.resolution || SEEDREAM_DEFAULT_RESOLUTIONS[family]
    const sizeMap = sizeMapByResolution[resolution]

    if (!sizeMap) {
        return SEEDREAM_DEFAULT_SIZES[family]
    }

    if (params.aspectRatio) {
        const mapped = sizeMap[params.aspectRatio as AspectRatioKey]
        if (mapped) return mapped
    }

    const defaultSize = sizeMap['1:1']
    return defaultSize || SEEDREAM_DEFAULT_SIZES[family]
}

export function getSeedreamSupportedResolutions(modelId: string): string[] {
    const family = identifySeedreamModelFamily(modelId)
    if (!family) return []
    return Object.keys(SEEDREAM_SIZE_MAPS[family])
}
