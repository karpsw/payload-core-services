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
export function createGetService(getPayloadInstance) {
    const registry = new Map();
    let payload = null;
    async function getPayload() {
        if (!payload) {
            payload = await getPayloadInstance();
        }
        return payload;
    }
    return async function getService(Service) {
        if (!registry.has(Service)) {
            const p = await getPayload();
            registry.set(Service, new Service(p));
        }
        return registry.get(Service);
    };
}
