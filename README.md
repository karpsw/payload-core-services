# payload-core-services

Base service layer for **Payload CMS 3+**: collection services, in-memory cache, and cache invalidation hooks.

- **BaseService** — for services not tied to a collection (orchestration, external APIs).
- **BaseCollectionService** — CRUD + DTO mapping for any collection.
- **BaseCollectionServiceCached** — in-memory cache by `id` (small lookup collections).
- **BaseCollectionServiceCachedSlug** — cache by `id` and `slug`.
- **createInvalidateCacheHooks** — Payload `afterChange` / `afterDelete` hooks to invalidate cache.

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
import { BaseCollectionServiceCachedSlug } from 'payload-core-services'

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
import { createInvalidateCacheHooks } from 'payload-core-services'
import { getService, CategoryService } from '@/services'

const { afterChange, afterDelete } = createInvalidateCacheHooks(() =>
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

5. **(Optional) Register the plugin** in Payload config to set cache TTL, loading mode and debug:

```ts
import { coreServicesPlugin } from 'payload-core-services'

export default buildConfig({
  plugins: [
    coreServicesPlugin({
      cacheTtlSec: 600,        // TTL кэша в секундах (по умолчанию 600)
      debug: false,            // true — логи в консоль (запросы, инвалидация, истечение кэша)
      cacheLoadingMode: 'eager', // 'eager' | 'lazy' — см. ниже
    }),
  ],
  // ...
})
```

### Опции плагина (CoreServicesPluginOptions)

| Опция | Тип | По умолчанию | Описание |
| ----- | --- | ------------ | -------- |
| `cacheTtlSec` | `number` | `600` | Время жизни кэша в секундах для `BaseCollectionServiceCached` / `BaseCollectionServiceCachedSlug`. |
| `debug` | `boolean` | `false` | При `true` в консоль выводятся: какой элемент запрошен (`getByIdDto` id, hit/miss), инвалидация коллекции, истечение кэша, загрузка (eager — вся коллекция, lazy — по id). |
| `cacheLoadingMode` | `'eager' \| 'lazy'` | `'eager'` | Режим загрузки кэша (см. ниже). |

### Режимы загрузки кэша (cacheLoadingMode)

- **`eager`** (по умолчанию) — при первом обращении (или после истечения TTL / инвалидации) загружается **вся коллекция** и кладётся в память. Все последующие `getByIdDto` / `getAllDto` обслуживаются из кэша. Подходит для небольших справочников.

- **`lazy`** — полная коллекция не подгружается заранее. По каждому `getByIdDto(id)` запрашивается только документ с этим `id` (если его ещё нет в кэше) и кэшируется. `getAllDto()` при этом один раз загружает всю коллекцию. Подходит, когда запросы в основном по одному id, а полный список нужен редко.

### Один инстанс для админки и фронта

Ключ реестра — **имя класса** (`Service.name`), например `"NaSourceService"`. Дополнительных полей в классе задавать не нужно. Один класс — один инстанс; для одной коллекции могут быть два класса (с кэшем и без) — два разных имени, два инстанса.

```ts
export class NaSourceService extends BaseCollectionServiceCached<NaSource, NaSourceDto> {
  constructor(payload: Payload) { super(payload, 'na-sources') }
}
// Ключ в реестре: "NaSourceService"
```

Если бандлер минифицирует имена классов, в разных бандлах ключи могут разойтись — тогда сохраняйте имена классов для серверных модулей с сервисами.

## API

- **createGetService(getPayloadInstance)** — returns a `getService(ServiceClass)` that resolves to a singleton. Registry key = class name (`Service.name`).
- **BaseCollectionService**: `getById`, `getAll`, `getByIdDto`, `getAllDto`.
- **BaseCollectionServiceCached**: same DTO methods from cache; `invalidateCache()`. Режим загрузки задаётся плагином: `eager` (вся коллекция) или `lazy` (по id по требованию).
- **BaseCollectionServiceCachedSlug**: `getBySlugCached(slug)`, `getBySlug(slug)` (DB, no cache).
- **createInvalidateCacheHooks(getter)** — pass a function that returns `Promise<{ invalidateCache(): void }>` (e.g. `() => getService(YourService)`).

## When to use which class

| Class                           | Collection size | Slug | Example              |
| ------------------------------- | --------------- | ---- | -------------------- |
| BaseService                     | —               | —    | External API service |
| BaseCollectionService           | Large           | —    | Posts, products      |
| BaseCollectionServiceCached     | Small           | No   | Tags, sources        |
| BaseCollectionServiceCachedSlug | Small           | Yes  | Categories, pages    |

## License

MIT
