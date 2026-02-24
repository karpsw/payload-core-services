import type {
	CollectionAfterChangeHook,
	CollectionAfterDeleteHook,
} from 'payload'

type CacheInvalidatable = { invalidateCache(id?: number): void }

/**
 * Creates Payload hooks for automatic cache invalidation.
 * Accepts a lazy getter that returns a Promise of the service.
 * The getter is called only when the hook runs, not at module load.
 *
 * @example
 * // category.service.ts uses getService from your app
 * import { getService } from '@/services'
 *
 * export const categoryHooks = createInvalidateCacheHooks(() => getService(CategoryService))
 *
 * // collections/Categories.ts
 * import { categoryHooks } from '@/services/category.service'
 *
 * hooks: {
 *   afterChange: [categoryHooks.afterChange],
 *   afterDelete: [categoryHooks.afterDelete],
 * }
 */
export function createInvalidateCacheHooks(
	getService: () => Promise<CacheInvalidatable>,
): {
	afterChange: CollectionAfterChangeHook
	afterDelete: CollectionAfterDeleteHook
} {
	const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
		const service = await getService()
		const id = typeof doc.id === 'number' ? doc.id : Number(doc.id)
		service.invalidateCache(id)
		return doc
	}

	const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
		const service = await getService()
		const id = typeof doc.id === 'number' ? doc.id : Number(doc.id)
		service.invalidateCache(id)
		return doc
	}

	return { afterChange, afterDelete }
}
