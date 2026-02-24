import type { Payload } from 'payload'

export type ServiceConstructor<T> = new (payload: Payload) => T

export type GetServiceFn = <T>(Service: ServiceConstructor<T>) => Promise<T>

/** globalThis — один реестр на процесс даже при двух бандлах (админка / фронт). */
declare global {
  var __payloadCoreServicesRegistry: Map<
    ServiceConstructor<unknown>,
    unknown
  > | undefined
  var __payloadCoreServicesGetPayload: (() => Promise<Payload>) | undefined
  var __payloadCoreServicesPayload: Payload | undefined
}

function getGlobalRegistry(): Map<ServiceConstructor<unknown>, unknown> {
  if (typeof globalThis.__payloadCoreServicesRegistry === 'undefined') {
    globalThis.__payloadCoreServicesRegistry = new Map()
  }
  return globalThis.__payloadCoreServicesRegistry
}

/**
 * Creates a getService function that returns a singleton instance per service class.
 * Uses a single global registry per process — no matter how many times createGetService
 * is called (e.g. from different entry points or bundles), getService(ServiceClass)
 * returns the same instance. Lazy-initializes Payload on first getService() call.
 *
 * @param getPayloadInstance — app-specific: () => getPayload({ config }) or similar
 * @returns getService(ServiceClass) → Promise<instance>
 *
 * @example
 * // In your app (e.g. src/services/get-service.ts):
 * import { createGetService } from 'payload-core-services'
 * import { getPayload } from 'payload'
 * import config from '@payload-config'
 *
 * export const getService = createGetService(() => getPayload({ config }))
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
    if (!registry.has(Service as ServiceConstructor<unknown>)) {
      const p = await getPayload()
      registry.set(
        Service as ServiceConstructor<unknown>,
        new Service(p) as unknown,
      )
    }
    return registry.get(Service as ServiceConstructor<unknown>) as T
  }
}
