import { getCacheTtlSec } from './cacheTtl.js';
import { getDebug, getCacheLoadingMode } from './pluginOptions.js';
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
export class BaseCollectionServiceCached extends BaseCollectionService {
    idMap = new Map();
    expiresAt = 0;
    refreshPromise = null;
    constructor(payload, collection) {
        super(payload, collection);
    }
    get isExpired() {
        return Date.now() > this.expiresAt;
    }
    log(msg, ...args) {
        if (getDebug()) {
            const prefix = `[core-services cache ${this.collection}]`;
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
    /** Load full collection (used by eager ensureCache and by lazy getAllDto). */
    async ensureFullCache() {
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
    async runRefresh() {
        try {
            await this.refresh();
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
    /** Load single document by ID into cache (lazy mode). */
    async loadById(id) {
        const doc = await this.getById(id);
        if (doc) {
            const dto = this.toDto(doc);
            if (dto) {
                this.idMap.set(dto.id, dto);
                if (getDebug()) {
                    this.log('loaded by id (lazy):', id);
                }
            }
        }
        if (this.expiresAt === 0) {
            this.expiresAt = Date.now() + getCacheTtlSec() * 1000;
        }
    }
    /** Invalidates cache. Next request triggers load (full in eager, by id in lazy). Call after create/update/delete. */
    invalidateCache() {
        if (getDebug()) {
            this.log('invalidated (collection)');
        }
        this.idMap.clear();
        this.expiresAt = 0;
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
        // lazy
        if (this.isExpired) {
            if (getDebug()) {
                this.log('cache expired, clearing');
            }
            this.idMap.clear();
            this.expiresAt = 0;
        }
        if (!this.idMap.has(id)) {
            await this.loadById(id);
        }
        if (getDebug()) {
            this.log('getByIdDto', id, this.idMap.has(id) ? '(hit)' : '(miss)');
        }
        return this.idMap.get(id) ?? null;
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
        // lazy: load full collection for getAllDto
        await this.ensureFullCache();
        if (getDebug()) {
            this.log('getAllDto (lazy, full load), count:', this.idMap.size);
        }
        return Array.from(this.idMap.values());
    }
}
