import type { Payload } from 'payload';
/**
 * Base class for services not tied to a specific Payload collection.
 * Use for business logic aggregation, orchestrating other services,
 * external API calls, etc.
 *
 * No abstract methods — can be extended without extra implementation.
 */
export declare abstract class BaseService {
    protected readonly payload: Payload;
    constructor(payload: Payload);
}
//# sourceMappingURL=BaseService.d.ts.map