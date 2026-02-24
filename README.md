# payload-core-services

Base service layer for **Payload CMS 3+**: collection services, in-memory cache, and cache invalidation hooks.

- **BaseService** — for services not tied to a collection (orchestration, external APIs).
- **BaseCollectionService** — CRUD + DTO mapping for any collection.
- **BaseCollectionServiceCached** — in-memory cache by `id` (small lookup collections).
- **BaseCollectionServiceCachedSlug** — cache by `id` and `slug`.
- **createCacheHooks** — Payload `afterChange` / `afterDelete` hooks to invalidate cache.

## Install

```bash
pnpm add payload-core-services
# or from GitHub (always get the latest)
pnpm add github:karpsw/payload-core-services
```

**Установка с GitHub:** в репозитории закоммичен каталог `dist/`, чтобы при `pnpm add github:...` пакет приходил уже собранным. После изменений в коде в репозитории плагина выполните `pnpm run build` и закоммитьте `dist/`.

## Quick start

1. **Create a getService helper** in your app (e.g. `src/services/get-service.ts`):

```ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { createGetService } from 'payload-core-services'

export const getService = createGetService(() => getPayload({ config }))
```

2. **Create a cached collection service** (e.g. categories):

```ts
import type { Payload } from 'payload'
import type { Category } from '@/payload-types'
import {
  BaseCollectionServiceCachedSlug,
  type IEntityImageDto,
} from 'payload-core-services'

export type CategoryDto = {
  id: number
  title: string
  slug: string
}

export class CategoryService extends BaseCollectionServiceCachedSlug<
  Category,
  CategoryDto
> {
  constructor(payload: Payload) {
    super(payload, 'categories')
  }

  protected selectFields() {
    return { id: true, title: true, slug: true }
  }

  protected toDto(doc: Category): CategoryDto {
    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
    }
  }
}
```

3. **Register hooks on the collection** (in your collection config):

```ts
import type { CollectionConfig } from 'payload'
import { createCacheHooks } from 'payload-core-services'
import { getService, CategoryService } from '@/services'

const { afterChange, afterDelete } = createCacheHooks(() =>
  getService(CategoryService),
)

export const Categories: CollectionConfig = {
  slug: 'categories',
  hooks: {
    afterChange: [afterChange],
    afterDelete: [afterDelete],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
  ],
}
```

4. **Use in app** (e.g. Server Component):

```ts
const categoryService = await getService(CategoryService)
const category = await categoryService.getBySlugCached(params.slug)
```

## API

- **createGetService(getPayloadInstance)** — returns a `getService(ServiceClass)` that resolves to a singleton. Pass your app’s way to get Payload, e.g. `() => getPayload({ config })`.
- **BaseCollectionService**: `getById`, `getAll`, `getByIdDto`, `getAllDto`, `toImageDto(img)`.
- **BaseCollectionServiceCached**: same DTO methods from cache; `invalidateCache()`.
- **BaseCollectionServiceCachedSlug**: `getBySlugCached(slug)`, `getBySlug(slug)` (DB, no cache).
- **createCacheHooks(getter)** — pass a function that returns `Promise<{ invalidateCache(): void }>` (e.g. `() => getService(YourService)`).

## When to use which class

| Class                             | Collection size | Slug | Example              |
|-----------------------------------|-----------------|------|----------------------|
| BaseService                       | —               | —    | External API service |
| BaseCollectionService             | Large           | —    | Posts, products      |
| BaseCollectionServiceCached       | Small           | No   | Tags, sources        |
| BaseCollectionServiceCachedSlug   | Small           | Yes  | Categories, pages    |

## License

MIT
