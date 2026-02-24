import type { Config } from 'payload'
import { setCacheTtlSec } from './cacheTtl.js'
import {
  setDebug,
  setCacheLoadingMode,
  type CacheLoadingMode,
} from './pluginOptions.js'

export type { CacheLoadingMode } from './pluginOptions.js'

export interface CoreServicesPluginOptions {
  /** Cache TTL in seconds for BaseCollectionServiceCached (default 600). */
  cacheTtlSec?: number
  /** When true, log cache requests, invalidations and expiry to console. */
  debug?: boolean
  /**
   * - `eager`: load full collection on first request (or after TTL/invalidation).
   * - `lazy`: load only requested document by ID; no full prefetch.
   */
  cacheLoadingMode?: CacheLoadingMode
}

const DEFAULT_CACHE_TTL_SEC = 600

/**
 * Payload plugin for payload-core-services.
 * Sets global cache TTL and options used by BaseCollectionServiceCached / BaseCollectionServiceCachedSlug.
 */
export const coreServicesPlugin =
  (options?: CoreServicesPluginOptions) =>
  (incomingConfig: Config): Config => {
    if (options?.cacheTtlSec != null) {
      setCacheTtlSec(options.cacheTtlSec)
    } else {
      setCacheTtlSec(DEFAULT_CACHE_TTL_SEC)
    }
    if (options?.debug != null) {
      setDebug(options.debug)
    }
    if (options?.cacheLoadingMode != null) {
      setCacheLoadingMode(options.cacheLoadingMode)
    }
    return { ...incomingConfig }
  }
