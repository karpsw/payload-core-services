import type { CollectionSlug, Payload } from 'payload'
import { BaseCollectionServiceCached } from './BaseCollectionServiceCached.js'

/**
 * Extends BaseCollectionServiceCached with slug lookup.
 *
 * On refresh builds two maps: idMap (inherited) and slugMap from idMap.
 * Use for: collections with slug that are read often (categories, pages, tags).
 *
 * @template T    — Payload collection type
 * @template TDto — DTO with numeric `id` and string `slug`
 */
export abstract class BaseCollectionServiceCachedSlug<
  T,
  TDto extends { id: number; slug: string },
> extends BaseCollectionServiceCached<T, TDto> {
  private slugMap = new Map<string, TDto>()

  constructor(payload: Payload, collection: CollectionSlug) {
    super(payload, collection)
  }

  protected override async refresh(): Promise<void> {
    await super.refresh()
    this.slugMap.clear()
    for (const dto of this.idMap.values()) {
      if (dto.slug) this.slugMap.set(dto.slug, dto)
    }
  }

  override invalidateCache(): void {
    super.invalidateCache()
    this.slugMap.clear()
  }

  async getBySlugCached(slug: string): Promise<TDto | null> {
    await this.ensureCache()
    return this.slugMap.get(slug) ?? null
  }

  /** Full Payload document by slug from DB, bypassing cache. */
  async getBySlug(slug: string): Promise<T | null> {
    const { docs } = await this.payload.find({
      collection: this.collection,
      where: { slug: { equals: slug } },
      limit: 1,
    })
    return (docs[0] as T) ?? null
  }
}
