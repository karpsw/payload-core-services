import type { Payload } from 'payload';
export type ServiceConstructor<T> = new (payload: Payload) => T;
export type GetServiceFn = <T>(Service: ServiceConstructor<T>) => Promise<T>;
/**
 * Creates a getService function that returns a singleton instance per service class.
 * Lazy-initializes Payload only on first getService() call (avoids circular deps:
 * payload.config → collections → services → payload.config).
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
export declare function createGetService(getPayloadInstance: () => Promise<Payload>): GetServiceFn;
//# sourceMappingURL=getService.d.ts.map