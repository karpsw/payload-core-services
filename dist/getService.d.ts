import type { Payload } from 'payload';
export type ServiceConstructor<T> = new (payload: Payload) => T;
export type GetServiceFn = <T>(Service: ServiceConstructor<T>) => Promise<T>;
/** globalThis — один реестр на процесс даже при двух бандлах (админка / фронт). */
declare global {
    var __payloadCoreServicesRegistry: Map<string | ServiceConstructor<unknown>, unknown> | undefined;
    var __payloadCoreServicesGetPayload: (() => Promise<Payload>) | undefined;
    var __payloadCoreServicesPayload: Payload | undefined;
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
export declare function createGetService(getPayloadInstance: () => Promise<Payload>): GetServiceFn;
//# sourceMappingURL=getService.d.ts.map