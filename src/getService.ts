import type { Payload } from 'payload'

export type ServiceConstructor<T> = new (payload: Payload) => T

export type GetServiceFn = <T>(Service: ServiceConstructor<T>) => Promise<T>

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
  const name = (Service as Function).name
  return typeof name === 'string' && name !== '' ? name : (Service as ServiceConstructor<unknown>)
}

/**
 * Creates a getService function that returns a singleton instance per service class.
 * Registry key = class name (Service.name), e.g. "NaSourceService". No static fields required.
 * Same class name in different bundles (admin/frontend) → one instance; two different classes
 * for the same collection (cached vs non-cached) → two keys, two instances.
 *
 * @param getPayloadInstance — app-specific: () => getPayload({ config }) or similar
 * @returns getService(ServiceClass) → Promise<instance>
 *
 * @example
 * export const getService = createGetService(() => getPayload({ config }))
 *
 * @example
 * export class NaSourceService extends BaseCollectionServiceCached<...> {
 *   constructor(payload: Payload) { super(payload, 'na-sources') }
 * }
 * // Key in registry: "NaSourceService"
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
