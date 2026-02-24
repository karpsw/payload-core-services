import { BaseCollectionService } from './BaseCollectionService.js';
const TTL_MS = 10 * 60 * 1000; // 10 min
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
    async ensureCache() {
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
        this.expiresAt = Date.now() + TTL_MS;
    }
    /** Invalidates cache. Next request triggers full refresh. Call after create/update/delete. */
    invalidateCache() {
        this.expiresAt = 0;
    }
    async getByIdDto(id) {
        await this.ensureCache();
        return this.idMap.get(id) ?? null;
    }
    async getAllDto() {
        await this.ensureCache();
        return Array.from(this.idMap.values());
    }
}
