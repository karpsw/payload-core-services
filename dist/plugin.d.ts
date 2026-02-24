import type { Config } from 'payload';
import { type CacheLoadingMode } from './pluginOptions.js';
export type { CacheLoadingMode } from './pluginOptions.js';
export interface CoreServicesPluginOptions {
    /** Cache TTL in seconds for BaseCollectionServiceCached (default 600). */
    cacheTtlSec?: number;
    /** When true, log cache requests, invalidations and expiry to console. */
    debug?: boolean;
    /**
     * - `eager`: load full collection on first request (or after TTL/invalidation).
     * - `lazy`: load only requested document by ID; no full prefetch.
     */
    cacheLoadingMode?: CacheLoadingMode;
}
/**
 * Payload plugin for payload-core-services.
 * Sets global cache TTL and options used by BaseCollectionServiceCached / BaseCollectionServiceCachedSlug.
 */
export declare const coreServicesPlugin: (options?: CoreServicesPluginOptions) => (incomingConfig: Config) => Config;
//# sourceMappingURL=plugin.d.ts.map