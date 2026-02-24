import type { CollectionSlug, Payload } from 'payload';
import { BaseCollectionService } from './BaseCollectionService.js';
export declare abstract class BaseCollectionServiceCached<T, TDto extends {
    id: number;
}> extends BaseCollectionService<T, TDto> {
    /** Eager: все документы коллекции. */
    protected idMap: Map<number, TDto>;
    /** Eager: общее время истечения кэша. */
    protected expiresAt: number;
    /** Lazy: по каждому id — DTO и время истечения элемента. */
    private lazyCache;
    private refreshPromise;
    constructor(payload: Payload, collection: CollectionSlug);
    /** Eager: кэш всей коллекции истёк. */
    protected get isExpired(): boolean;
    private isLazyEntryExpired;
    private log;
    /** Eager: load full collection. Lazy: no-op (load by ID on demand). */
    protected ensureCache(): Promise<void>;
    /** Load full collection for lazy getAllDto (fills lazyCache with per-item TTL). */
    protected ensureFullCache(): Promise<void>;
    private runRefresh;
    private runRefreshLazy;
    protected refresh(): Promise<void>;
    /** Lazy: загрузка всей коллекции, каждый элемент кэшируется с отдельным TTL. */
    protected refreshLazy(): Promise<void>;
    /** Load single document by ID into lazyCache (lazy mode). */
    private loadById;
    /** Invalidates cache. Next request triggers load (full in eager, by id in lazy). Call after create/update/delete. */
    invalidateCache(): void;
    getByIdDto(id: number): Promise<TDto | null>;
    getAllDto(): Promise<TDto[]>;
}
//# sourceMappingURL=BaseCollectionServiceCached.d.ts.map