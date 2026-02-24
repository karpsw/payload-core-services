function getGlobalRegistry() {
    if (typeof globalThis.__payloadCoreServicesRegistry === 'undefined') {
        globalThis.__payloadCoreServicesRegistry = new Map();
    }
    return globalThis.__payloadCoreServicesRegistry;
}
function getRegistryKey(Service) {
    const name = Service.name;
    return typeof name === 'string' && name !== '' ? name : Service;
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
export function createGetService(getPayloadInstance) {
    if (!globalThis.__payloadCoreServicesGetPayload) {
        globalThis.__payloadCoreServicesGetPayload = getPayloadInstance;
    }
    async function getPayload() {
        if (!globalThis.__payloadCoreServicesPayload) {
            const fn = globalThis.__payloadCoreServicesGetPayload;
            if (!fn)
                throw new Error('createGetService was not called');
            globalThis.__payloadCoreServicesPayload = await fn();
        }
        return globalThis.__payloadCoreServicesPayload;
    }
    return async function getService(Service) {
        const registry = getGlobalRegistry();
        const key = getRegistryKey(Service);
        if (!registry.has(key)) {
            const p = await getPayload();
            registry.set(key, new Service(p));
        }
        return registry.get(key);
    };
}
