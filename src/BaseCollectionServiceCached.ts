import type { CollectionSlug, Payload } from 'payload'
import { getCacheTtlSec } from './cacheTtl.js'
import { getDebug, getCacheLoadingMode } from './pluginOptions.js'
import { BaseCollectionService } from './BaseCollectionService.js'

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

/** Элемент кэша в lazy-режиме: DTO и время истечения по TTL. */
interface LazyCacheEntry<TDto> {
  dto: TDto
  expiresAt: number
}

export abstract class BaseCollectionServiceCached<
  T,
  TDto extends { id: number },
> extends BaseCollectionService<T, TDto> {
  /** Eager: все документы коллекции. */
  protected idMap = new Map<number, TDto>()
  /** Eager: общее время истечения кэша. */
  protected expiresAt = 0
  /** Lazy: по каждому id — DTO и время истечения элемента. */
  private lazyCache = new Map<number, LazyCacheEntry<TDto>>()
  private refreshPromise: Promise<void> | null = null

  constructor(payload: Payload, collection: CollectionSlug) {
    super(payload, collection)
  }

  /** Eager: кэш всей коллекции истёк. */
  protected get isExpired(): boolean {
    return Date.now() > this.expiresAt
  }

  private isLazyEntryExpired(entry: LazyCacheEntry<TDto>): boolean {
    return Date.now() > entry.expiresAt
  }

  private log(msg: string, ...args: unknown[]): void {
    if (getDebug()) {
      const prefix = `[core-services cache ${this.collection}]`
      console.log(prefix, msg, ...args)
    }
  }

  /** Eager: load full collection. Lazy: no-op (load by ID on demand). */
  protected async ensureCache(): Promise<void> {
    if (getCacheLoadingMode() !== 'eager') return
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

  /** Load full collection for lazy getAllDto (fills lazyCache with per-item TTL). */
  protected async ensureFullCache(): Promise<void> {
    if (getCacheLoadingMode() !== 'lazy') return
    if (this.refreshPromise) {
      await this.refreshPromise
      return
    }
    this.refreshPromise = this.runRefreshLazy()
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

  private async runRefreshLazy(): Promise<void> {
    try {
      await this.refreshLazy()
    } finally {
      this.refreshPromise = null
    }
  }

  protected async refresh(): Promise<void> {
    if (getDebug()) {
      this.log('loading full collection (eager)...')
    }
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
    this.expiresAt = Date.now() + getCacheTtlSec() * 1000
    if (getDebug()) {
      this.log('full collection loaded, count:', nextMap.size)
    }
  }

  /** Lazy: загрузка всей коллекции, каждый элемент кэшируется с отдельным TTL. */
  protected async refreshLazy(): Promise<void> {
    if (getDebug()) {
      this.log('loading full collection (lazy)...')
    }
    const { docs } = await this.payload.find({
      collection: this.collection,
      limit: 10000,
      depth: 1,
      pagination: false,
      select: this.selectFields() as any,
    })
    const ttlMs = getCacheTtlSec() * 1000
    const now = Date.now()
    const nextLazy = new Map<number, LazyCacheEntry<TDto>>()
    for (const doc of docs) {
      const dto = this.toDto(doc as T)
      if (dto) {
        nextLazy.set(dto.id, { dto, expiresAt: now + ttlMs })
      }
    }
    this.lazyCache = nextLazy
    if (getDebug()) {
      this.log('full collection loaded (lazy), count:', nextLazy.size)
    }
  }

  /** Load single document by ID into lazyCache (lazy mode). */
  private async loadById(id: number): Promise<void> {
    const doc = await this.getById(id)
    if (doc) {
      const dto = this.toDto(doc)
      if (dto) {
        const expiresAt = Date.now() + getCacheTtlSec() * 1000
        this.lazyCache.set(dto.id, { dto, expiresAt })
        if (getDebug()) {
          this.log('loaded by id (lazy):', id)
        }
      }
    }
  }

  /**
   * Invalidates cache. Call after create/update/delete.
   * - Eager: всегда очищает весь кэш коллекции.
   * - Lazy: при передаче id очищает только этот элемент; без id — всю коллекцию.
   */
  invalidateCache(id?: number): void {
    const mode = getCacheLoadingMode()
    if (mode === 'lazy' && id != null) {
      if (getDebug()) {
        this.log('invalidated (element):', id)
      }
      this.lazyCache.delete(id)
      return
    }
    if (getDebug()) {
      this.log('invalidated (collection)')
    }
    this.idMap.clear()
    this.expiresAt = 0
    this.lazyCache.clear()
  }

  override async getByIdDto(id: number): Promise<TDto | null> {
    const mode = getCacheLoadingMode()

    if (mode === 'eager') {
      await this.ensureCache()
      const hit = this.idMap.has(id)
      if (getDebug()) {
        this.log('getByIdDto', id, hit ? '(hit)' : '(miss)')
      }
      return this.idMap.get(id) ?? null
    }

    // lazy: проверка истечения только для запрошенного id
    const entry = this.lazyCache.get(id)
    if (!entry || this.isLazyEntryExpired(entry)) {
      if (getDebug() && entry) {
        this.log('cache expired for id:', id)
      }
      await this.loadById(id)
    }
    const cached = this.lazyCache.get(id)
    if (getDebug()) {
      this.log('getByIdDto', id, cached ? '(hit)' : '(miss)')
    }
    return cached?.dto ?? null
  }

  override async getAllDto(): Promise<TDto[]> {
    const mode = getCacheLoadingMode()

    if (mode === 'eager') {
      await this.ensureCache()
      if (getDebug()) {
        this.log('getAllDto (eager), count:', this.idMap.size)
      }
      return Array.from(this.idMap.values())
    }

    // lazy: full load заполняет lazyCache с per-item TTL
    await this.ensureFullCache()
    if (getDebug()) {
      this.log('getAllDto (lazy, full load), count:', this.lazyCache.size)
    }
    return Array.from(this.lazyCache.values(), (e) => e.dto)
  }
}
