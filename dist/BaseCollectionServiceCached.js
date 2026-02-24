import { BaseCollectionService } from './BaseCollectionService.js';
import { getCacheTtlSec } from './cacheTtl.js';
import { getCacheLoadingMode, getDebug } from './pluginOptions.js';
export class BaseCollectionServiceCached extends BaseCollectionService {
    /** Eager: все документы коллекции. */
    idMap = new Map();
    /** Eager: общее время истечения кэша. */
    expiresAt = 0;
    /** Lazy: по каждому id — DTO и время истечения элемента. */
    lazyCache = new Map();
    refreshPromise = null;
    /** Lazy: дедупликация — один промис загрузки на id при конкурентных getByIdDto(id). */
    loadByIdPromises = new Map();
    constructor(payload, collection) {
        super(payload, collection);
    }
    /** Eager: кэш всей коллекции истёк. */
    get isExpired() {
        return Date.now() > this.expiresAt;
    }
    isLazyEntryExpired(entry) {
        return Date.now() > entry.expiresAt;
    }
    log(msg, ...args) {
        if (getDebug()) {
            const prefix = `[${this.uid} core-services cache ${this.collection}]`;
            console.log(prefix, msg, ...args);
        }
    }
    /** Eager: load full collection. Lazy: no-op (load by ID on demand). */
    async ensureCache() {
        if (getCacheLoadingMode() !== 'eager')
            return;
        if (!this.isExpired)
            return;
        if (this.refreshPromise) {
            await this.refreshPromise;
            return;
        }
        this.refreshPromise = this.runRefresh();
        try {
            await this.refreshPromise;
        }
        finally {
            this.refreshPromise = null;
        }
    }
    /** Load full collection for lazy getAllDto (fills lazyCache with per-item TTL). */
    async ensureFullCache() {
        if (getCacheLoadingMode() !== 'lazy')
            return;
        if (this.refreshPromise) {
            await this.refreshPromise;
            return;
        }
        this.refreshPromise = this.runRefreshLazy();
        try {
            await this.refreshPromise;
        }
        finally {
            this.refreshPromise = null;
        }
    }
    async runRefresh() {
        try {
            await this.refresh();
        }
        finally {
            this.refreshPromise = null;
        }
    }
    async runRefreshLazy() {
        try {
            await this.refreshLazy();
        }
        finally {
            this.refreshPromise = null;
        }
    }
    async refresh() {
        if (getDebug()) {
            this.log('loading full collection (eager)...');
        }
        const { docs } = await this.payload.find({
            collection: this.collection,
            limit: 10000,
            depth: 1,
            pagination: false,
            select: this.selectFields(),
        });
        const nextMap = new Map();
        for (const doc of docs) {
            const dto = this.toDto(doc);
            if (dto)
                nextMap.set(dto.id, dto);
        }
        this.idMap = nextMap;
        this.expiresAt = Date.now() + getCacheTtlSec() * 1000;
        if (getDebug()) {
            this.log('full collection loaded, count:', nextMap.size);
        }
    }
    /** Lazy: загрузка всей коллекции, каждый элемент кэшируется с отдельным TTL. */
    async refreshLazy() {
        if (getDebug()) {
            this.log('loading full collection (lazy)...');
        }
        const { docs } = await this.payload.find({
            collection: this.collection,
            limit: 10000,
            depth: 1,
            pagination: false,
            select: this.selectFields(),
        });
        const ttlMs = getCacheTtlSec() * 1000;
        const now = Date.now();
        const nextLazy = new Map();
        for (const doc of docs) {
            const dto = this.toDto(doc);
            if (dto) {
                nextLazy.set(dto.id, { dto, expiresAt: now + ttlMs });
            }
        }
        this.lazyCache = nextLazy;
        if (getDebug()) {
            this.log('full collection loaded (lazy), count:', nextLazy.size);
        }
    }
    /** Load single document by ID into lazyCache (lazy mode). Called under loadByIdPromise(id) guard. */
    async loadById(id) {
        const doc = await this.getById(id);
        if (doc) {
            const dto = this.toDto(doc);
            if (dto) {
                const expiresAt = Date.now() + getCacheTtlSec() * 1000;
                this.lazyCache.set(dto.id, { dto, expiresAt });
                if (getDebug()) {
                    this.log('loaded by id (lazy):', id);
                }
            }
        }
    }
    /** Returns existing or creates a single load promise for id; removes from map when done. */
    loadByIdPromise(id) {
        let p = this.loadByIdPromises.get(id);
        if (p)
            return p;
        p = this.loadById(id).finally(() => {
            this.loadByIdPromises.delete(id);
        });
        this.loadByIdPromises.set(id, p);
        return p;
    }
    /**
     * Invalidates cache. Call after create/update/delete.
     * - Eager: всегда очищает весь кэш коллекции.
     * - Lazy: при передаче id очищает только этот элемент; без id — всю коллекцию.
     */
    invalidateCache(id) {
        const mode = getCacheLoadingMode();
        if (mode === 'lazy' && id != null) {
            if (getDebug()) {
                this.log('invalidated (element):', id);
            }
            this.lazyCache.delete(id);
            return;
        }
        if (getDebug()) {
            this.log('invalidated (collection)');
        }
        this.idMap.clear();
        this.expiresAt = 0;
        this.lazyCache.clear();
    }
    async getByIdDto(id) {
        const mode = getCacheLoadingMode();
        if (mode === 'eager') {
            await this.ensureCache();
            const hit = this.idMap.has(id);
            if (getDebug()) {
                this.log('getByIdDto', id, hit ? '(hit)' : '(miss)');
            }
            return this.idMap.get(id) ?? null;
        }
        // lazy: проверка истечения только для запрошенного id; один промис на id при конкурентных вызовах
        const entry = this.lazyCache.get(id);
        if (!entry || this.isLazyEntryExpired(entry)) {
            if (getDebug() && entry) {
                this.log('cache expired for id:', id);
            }
            await this.loadByIdPromise(id);
        }
        const cached = this.lazyCache.get(id);
        if (getDebug()) {
            this.log('getByIdDto', id, cached ? '(hit)' : '(miss)');
        }
        return cached?.dto ?? null;
    }
    async getAllDto() {
        const mode = getCacheLoadingMode();
        if (mode === 'eager') {
            await this.ensureCache();
            if (getDebug()) {
                this.log('getAllDto (eager), count:', this.idMap.size);
            }
            return Array.from(this.idMap.values());
        }
        // lazy: full load заполняет lazyCache с per-item TTL
        await this.ensureFullCache();
        if (getDebug()) {
            this.log('getAllDto (lazy, full load), count:', this.lazyCache.size);
        }
        return Array.from(this.lazyCache.values(), e => e.dto);
    }
}
