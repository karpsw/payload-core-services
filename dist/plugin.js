import { setCacheTtlSec } from './cacheTtl.js';
const DEFAULT_CACHE_TTL_SEC = 600;
/**
 * Payload plugin for payload-core-services.
 * Sets global cache TTL used by BaseCollectionServiceCached / BaseCollectionServiceCachedSlug.
 */
export const coreServicesPlugin = (options) => (incomingConfig) => {
    if (options?.cacheTtlSec != null) {
        setCacheTtlSec(options.cacheTtlSec);
    }
    else {
        setCacheTtlSec(DEFAULT_CACHE_TTL_SEC);
    }
    return { ...incomingConfig };
};
