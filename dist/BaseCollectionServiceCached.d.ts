import type { CollectionSlug, Payload } from 'payload';
import { BaseCollectionService } from './BaseCollectionService.js';
/**
 * Extends BaseCollectionService with in-memory DTO cache.
 *
 * Loading modes (see plugin option cacheLoadingMode):
 * - eager: on first request (or after TTL/invalidation) loads ALL documents into Map<id, TDto>.
 * - lazy: loads only requested document by ID on demand; getAllDto() triggers full load.
 *
 * Use for: small lookup collections (categories, tags, currencies).
 * Not for: large collections (posts, products) — use BaseCollectionService.
 *
 * @template T    — Payload collection type
 * @template TDto — DTO type with numeric `id`
 */
export declare abstract class BaseCollectionServiceCached<T, TDto extends {
    id: number;
}> extends BaseCollectionService<T, TDto> {
    protected idMap: Map<number, TDto>;
    protected expiresAt: number;
    private refreshPromise;
    constructor(payload: Payload, collection: CollectionSlug);
    protected get isExpired(): boolean;
    private log;
    /** Eager: load full collection. Lazy: no-op (load by ID on demand). */
    protected ensureCache(): Promise<void>;
    /** Load full collection (used by eager ensureCache and by lazy getAllDto). */
    protected ensureFullCache(): Promise<void>;
    private runRefresh;
    protected refresh(): Promise<void>;
    /** Load single document by ID into cache (lazy mode). */
    private loadById;
    /** Invalidates cache. Next request triggers load (full in eager, by id in lazy). Call after create/update/delete. */
    invalidateCache(): void;
    getByIdDto(id: number): Promise<TDto | null>;
    getAllDto(): Promise<TDto[]>;
}
//# sourceMappingURL=BaseCollectionServiceCached.d.ts.map