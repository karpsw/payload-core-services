import type { Config } from 'payload';
export interface CoreServicesPluginOptions {
    /** Cache TTL in seconds for BaseCollectionServiceCached (default 600). */
    cacheTtlSec?: number;
}
/**
 * Payload plugin for payload-core-services.
 * Sets global cache TTL used by BaseCollectionServiceCached / BaseCollectionServiceCachedSlug.
 */
export declare const coreServicesPlugin: (options?: CoreServicesPluginOptions) => (incomingConfig: Config) => Config;
//# sourceMappingURL=plugin.d.ts.map