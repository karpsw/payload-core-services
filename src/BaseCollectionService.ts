import type { CollectionSlug, Payload } from 'payload'
import { BaseService } from './BaseService.js'

export interface IEntityImageDto {
  src: string | null
  alt: string | null
  width: number | null
  height: number | null
}

/** Minimal Media-like shape for toImageDto (no dependency on project payload-types). */
interface IMediaLike {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

/**
 * Base class for services that work with a single Payload collection.
 * Provides basic CRUD and DTO mapping.
 *
 * Requires implementation of:
 * - toDto(doc) — map Payload document to DTO
 * - selectFields() — fields to select from Payload
 *
 * @template T    — Payload collection type (e.g. Category, Product)
 * @template TDto — DTO type returned to the client
 */
export abstract class BaseCollectionService<T, TDto> extends BaseService {
  constructor(
    payload: Payload,
    protected readonly collection: CollectionSlug,
  ) {
    super(payload)
  }

  protected abstract toDto(doc: T): TDto
  protected abstract selectFields(): Record<string, boolean>

  /**
   * Maps Payload Media (or any object with url/alt/width/height) to DTO.
   * Use inside toDto() for Media fields.
   */
  protected toImageDto(img: unknown): IEntityImageDto | null {
    if (!img || typeof img !== 'object') return null
    const m = img as IMediaLike
    return {
      src: m.url ?? null,
      alt: m.alt ?? null,
      width: m.width ?? null,
      height: m.height ?? null,
    }
  }

  /** Raw: full Payload document by id */
  async getById(id: number): Promise<T | null> {
    try {
      const doc = await this.payload.findByID({
        collection: this.collection,
        id,
      })
      return doc as T
    } catch {
      return null
    }
  }

  async getAll(): Promise<T[]> {
    const { docs } = await this.payload.find({
      collection: this.collection,
      limit: 10000,
      pagination: false,
    })
    return docs as T[]
  }

  /** DTO by id */
  async getByIdDto(id: number): Promise<TDto | null> {
    const doc = await this.getById(id)
    return doc ? this.toDto(doc) : null
  }

  async getAllDto(): Promise<TDto[]> {
    const docs = await this.getAll()
    return docs.map((doc) => this.toDto(doc))
  }
}
