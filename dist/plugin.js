/**
 * Payload plugin for payload-core-services.
 * Currently a no-op: base classes and createCacheHooks are used as a library.
 * Options reserved for future use (e.g. global cache TTL).
 */
export const coreServicesPlugin = (_options) => (incomingConfig) => {
    return { ...incomingConfig };
};
