import type { CollectionSlug, Payload } from 'payload';
import { BaseCollectionServiceCached } from './BaseCollectionServiceCached.js';
/**
 * Extends BaseCollectionServiceCached with slug lookup.
 *
 * On refresh builds two maps: idMap (inherited) and slugMap from idMap.
 * Use for: collections with slug that are read often (categories, pages, tags).
 *
 * @template T    — Payload collection type
 * @template TDto — DTO with numeric `id` and string `slug`
 */
export declare abstract class BaseCollectionServiceCachedSlug<T, TDto extends {
    id: number;
    slug: string;
}> extends BaseCollectionServiceCached<T, TDto> {
    private slugMap;
    constructor(payload: Payload, collection: CollectionSlug);
    protected refresh(): Promise<void>;
    invalidateCache(): void;
    getBySlugCached(slug: string): Promise<TDto | null>;
    /** Full Payload document by slug from DB, bypassing cache. */
    getBySlug(slug: string): Promise<T | null>;
}
//# sourceMappingURL=BaseCollectionServiceCachedSlug.d.ts.map