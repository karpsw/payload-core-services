import type { Config } from 'payload'

export interface CoreServicesPluginOptions {
  /** Cache TTL in ms (optional; base classes use 10 min by default). */
  cacheTtlMs?: number
}

/**
 * Payload plugin for payload-core-services.
 * Currently a no-op: base classes and createCacheHooks are used as a library.
 * Options reserved for future use (e.g. global cache TTL).
 */
export const coreServicesPlugin =
  (_options?: CoreServicesPluginOptions) =>
  (incomingConfig: Config): Config => {
    return { ...incomingConfig }
  }
