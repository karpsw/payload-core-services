import type { Payload } from 'payload'

export type ServiceConstructor<T> = new (payload: Payload) => T

export type GetServiceFn = <T>(Service: ServiceConstructor<T>) => Promise<T>

/**
 * Класс с этим статическим ключом будет зарегистрирован в реестре по строке,
 * а не по ссылке на конструктор — тогда админ- и фронт-бандл получат один инстанс.
 */
export interface CacheKeyServiceConstructor<T> extends ServiceConstructor<T> {
  cacheKey: string
}

/** globalThis — один реестр на процесс даже при двух бандлах (админка / фронт). */
declare global {
  var __payloadCoreServicesRegistry: Map<
    string | ServiceConstructor<unknown>,
    unknown
  > | undefined
  var __payloadCoreServicesGetPayload: (() => Promise<Payload>) | undefined
  var __payloadCoreServicesPayload: Payload | undefined
}

function getGlobalRegistry(): Map<
  string | ServiceConstructor<unknown>,
  unknown
> {
  if (typeof globalThis.__payloadCoreServicesRegistry === 'undefined') {
    globalThis.__payloadCoreServicesRegistry = new Map()
  }
  return globalThis.__payloadCoreServicesRegistry
}

function getRegistryKey(Service: ServiceConstructor<unknown>): string | ServiceConstructor<unknown> {
  const withKey = Service as CacheKeyServiceConstructor<unknown>
  return typeof withKey.cacheKey === 'string' ? withKey.cacheKey : (Service as ServiceConstructor<unknown>)
}

/**
 * Creates a getService function that returns a singleton instance per service class.
 * Uses a single global registry per process. If the same code runs from different
 * bundles (e.g. Payload admin and frontend), the class reference differs — set
 * on your cached service `static cacheKey = 'your-collection-slug'` so both
 * bundles share the same instance and cache.
 *
 * @param getPayloadInstance — app-specific: () => getPayload({ config }) or similar
 * @returns getService(ServiceClass) → Promise<instance>
 *
 * @example
 * // get-service.ts
 * export const getService = createGetService(() => getPayload({ config }))
 *
 * @example
 * // Cached service used from admin + frontend — обязателен cacheKey:
 * export class NaSourcesService extends BaseCollectionServiceCached<...> {
 *   static cacheKey = 'na-sources'
 *   constructor(payload: Payload) { super(payload, 'na-sources') }
 * }
 */
export function createGetService(
  getPayloadInstance: () => Promise<Payload>,
): GetServiceFn {
  if (!globalThis.__payloadCoreServicesGetPayload) {
    globalThis.__payloadCoreServicesGetPayload = getPayloadInstance
  }

  async function getPayload(): Promise<Payload> {
    if (!globalThis.__payloadCoreServicesPayload) {
      const fn = globalThis.__payloadCoreServicesGetPayload
      if (!fn) throw new Error('createGetService was not called')
      globalThis.__payloadCoreServicesPayload = await fn()
    }
    return globalThis.__payloadCoreServicesPayload
  }

  return async function getService<T>(
    Service: ServiceConstructor<T>,
  ): Promise<T> {
    const registry = getGlobalRegistry()
    const key = getRegistryKey(Service as ServiceConstructor<unknown>)
    if (!registry.has(key)) {
      const p = await getPayload()
      registry.set(key, new Service(p) as unknown)
    }
    return registry.get(key) as T
  }
}
