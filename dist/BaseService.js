/**
 * Base class for services not tied to a specific Payload collection.
 * Use for business logic aggregation, orchestrating other services,
 * external API calls, etc.
 *
 * No abstract methods — can be extended without extra implementation.
 */
export class BaseService {
    payload;
    constructor(payload) {
        this.payload = payload;
    }
}
