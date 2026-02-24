import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';
type CacheInvalidatable = {
    invalidateCache(): void;
};
/**
 * Creates Payload hooks for automatic cache invalidation.
 * Accepts a lazy getter that returns a Promise of the service.
 * The getter is called only when the hook runs, not at module load.
 *
 * @example
 * // category.service.ts uses getService from your app
 * import { getService } from '@/services'
 *
 * export const categoryHooks = createCacheHooks(() => getService(CategoryService))
 *
 * // collections/Categories.ts
 * import { categoryHooks } from '@/services/category.service'
 *
 * hooks: {
 *   afterChange: [categoryHooks.afterChange],
 *   afterDelete: [categoryHooks.afterDelete],
 * }
 */
export declare function createInvalidateCacheHooks(getService: () => Promise<CacheInvalidatable>): {
    afterChange: CollectionAfterChangeHook;
    afterDelete: CollectionAfterDeleteHook;
};
export {};
//# sourceMappingURL=createCacheHooks.d.ts.map