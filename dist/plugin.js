import { setCacheTtlSec } from './cacheTtl.js';
import { setDebug, setCacheLoadingMode, } from './pluginOptions.js';
const DEFAULT_CACHE_TTL_SEC = 600;
/**
 * Payload plugin for payload-core-services.
 * Sets global cache TTL and options used by BaseCollectionServiceCached / BaseCollectionServiceCachedSlug.
 */
export const coreServicesPlugin = (options) => (incomingConfig) => {
    if (options?.cacheTtlSec != null) {
        setCacheTtlSec(options.cacheTtlSec);
    }
    else {
        setCacheTtlSec(DEFAULT_CACHE_TTL_SEC);
    }
    if (options?.debug != null) {
        setDebug(options.debug);
    }
    if (options?.cacheLoadingMode != null) {
        setCacheLoadingMode(options.cacheLoadingMode);
    }
    return { ...incomingConfig };
};
