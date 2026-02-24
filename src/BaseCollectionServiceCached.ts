import type { CollectionSlug, Payload } from 'payload'
import { BaseCollectionService } from './BaseCollectionService.js'

const TTL_MS = 10 * 60 * 1000 // 10 min

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
export abstract class BaseCollectionServiceCached<
  T,
  TDto extends { id: number },
> extends BaseCollectionService<T, TDto> {
  protected idMap = new Map<number, TDto>()
  protected expiresAt = 0
  private refreshPromise: Promise<void> | null = null

  constructor(payload: Payload, collection: CollectionSlug) {
    super(payload, collection)
  }

  protected get isExpired(): boolean {
    return Date.now() > this.expiresAt
  }

  protected async ensureCache(): Promise<void> {
    if (!this.isExpired) return
    if (this.refreshPromise) {
      await this.refreshPromise
      return
    }
    this.refreshPromise = this.runRefresh()
    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async runRefresh(): Promise<void> {
    try {
      await this.refresh()
    } finally {
      this.refreshPromise = null
    }
  }

  protected async refresh(): Promise<void> {
    const { docs } = await this.payload.find({
      collection: this.collection,
      limit: 10000,
      depth: 1,
      pagination: false,
      select: this.selectFields() as any,
    })

    const nextMap = new Map<number, TDto>()
    for (const doc of docs) {
      const dto = this.toDto(doc as T)
      if (dto) nextMap.set(dto.id, dto)
    }
    this.idMap = nextMap
    this.expiresAt = Date.now() + TTL_MS
  }

  /** Invalidates cache. Next request triggers full refresh. Call after create/update/delete. */
  invalidateCache(): void {
    this.expiresAt = 0
  }

  override async getByIdDto(id: number): Promise<TDto | null> {
    await this.ensureCache()
    return this.idMap.get(id) ?? null
  }

  override async getAllDto(): Promise<TDto[]> {
    await this.ensureCache()
    return Array.from(this.idMap.values())
  }
}
