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
export class BaseCollectionServiceCachedSlug extends BaseCollectionServiceCached {
    slugMap = new Map();
    constructor(payload, collection) {
        super(payload, collection);
    }
    async refresh() {
        await super.refresh();
        this.slugMap.clear();
        for (const dto of this.idMap.values()) {
            if (dto.slug)
                this.slugMap.set(dto.slug, dto);
        }
    }
    invalidateCache() {
        super.invalidateCache();
        this.slugMap.clear();
    }
    async getBySlugCached(slug) {
        await this.ensureCache();
        return this.slugMap.get(slug) ?? null;
    }
    /** Full Payload document by slug from DB, bypassing cache. */
    async getBySlug(slug) {
        const { docs } = await this.payload.find({
            collection: this.collection,
            where: { slug: { equals: slug } },
            limit: 1,
        });
        return docs[0] ?? null;
    }
}
