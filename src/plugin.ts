import type { Config } from 'payload'
import { setCacheTtlSec } from './cacheTtl.js'

export interface CoreServicesPluginOptions {
  /** Cache TTL in seconds for BaseCollectionServiceCached (default 600). */
  cacheTtlSec?: number
}

const DEFAULT_CACHE_TTL_SEC = 600

/**
 * Payload plugin for payload-core-services.
 * Sets global cache TTL used by BaseCollectionServiceCached / BaseCollectionServiceCachedSlug.
 */
export const coreServicesPlugin =
  (options?: CoreServicesPluginOptions) =>
  (incomingConfig: Config): Config => {
    if (options?.cacheTtlSec != null) {
      setCacheTtlSec(options.cacheTtlSec)
    } else {
      setCacheTtlSec(DEFAULT_CACHE_TTL_SEC)
    }
    return { ...incomingConfig }
  }
