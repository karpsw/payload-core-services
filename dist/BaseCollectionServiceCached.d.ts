import type { CollectionSlug, Payload } from 'payload';
import { BaseCollectionService } from './BaseCollectionService.js';
/**
 * Extends BaseCollectionService with in-memory DTO cache.
 *
 * Strategy: on first request (or after TTL / invalidation) loads ALL documents
 * and stores in Map<id, TDto>. Subsequent requests are served from memory.
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
    protected ensureCache(): Promise<void>;
    private runRefresh;
    protected refresh(): Promise<void>;
    /** Invalidates cache. Next request triggers full refresh. Call after create/update/delete. */
    invalidateCache(): void;
    getByIdDto(id: number): Promise<TDto | null>;
    getAllDto(): Promise<TDto[]>;
}
//# sourceMappingURL=BaseCollectionServiceCached.d.ts.map