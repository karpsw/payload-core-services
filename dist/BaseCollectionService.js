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
export class BaseCollectionService extends BaseService {
    collection;
    constructor(payload, collection) {
        super(payload);
        this.collection = collection;
    }
    /** Raw: full Payload document by id */
    async getById(id) {
        try {
            const doc = await this.payload.findByID({
                collection: this.collection,
                id,
            });
            return doc;
        }
        catch {
            return null;
        }
    }
    async getAll() {
        const { docs } = await this.payload.find({
            collection: this.collection,
            limit: 10000,
            pagination: false,
        });
        return docs;
    }
    /** DTO by id */
    async getByIdDto(id) {
        const doc = await this.getById(id);
        return doc ? this.toDto(doc) : null;
    }
    async getAllDto() {
        const docs = await this.getAll();
        return docs.map((doc) => this.toDto(doc));
    }
}
