import type { CollectionSlug, Payload } from 'payload';
import { BaseService } from './BaseService.js';
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
export declare abstract class BaseCollectionService<T, TDto> extends BaseService {
    protected readonly collection: CollectionSlug;
    constructor(payload: Payload, collection: CollectionSlug);
    protected readonly uid: string;
    protected abstract toDto(doc: T): TDto;
    protected abstract selectFields(): Record<string, boolean>;
    /** Raw: full Payload document by id */
    getById(id: number): Promise<T | null>;
    getAll(): Promise<T[]>;
    /** DTO by id */
    getByIdDto(id: number): Promise<TDto | null>;
    getAllDto(): Promise<TDto[]>;
}
//# sourceMappingURL=BaseCollectionService.d.ts.map