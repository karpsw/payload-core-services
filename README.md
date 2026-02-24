# payload-core-services

Base service layer for **Payload CMS 3+**: collection services, in-memory DTO cache, and cache invalidation hooks. Use it to keep a single service instance across admin and frontend bundles and to cache small lookup collections (tags, sources, categories) with configurable loading strategies.

## Contents

- [Install](#install)
- [Overview](#overview)
- [Setup](#setup)
- [Plugin options](#plugin-options)
- [Cache loading modes](#cache-loading-modes)
- [Get by ID in eager vs lazy](#get-by-id-in-eager-vs-lazy)
- [Connecting collections and hooks](#connecting-collections-and-hooks)
- [Examples](#examples)
- [API reference](#api-reference)
- [When to use which class](#when-to-use-which-class)
- [License](#license)

---

## Install

```bash
pnpm add payload-core-services
# or from GitHub (always get the latest)
pnpm add github:karpsw/payload-core-services
```

The repo ships a built `dist/` folder so `pnpm add github:...` works without a separate build. After changing the plugin source, run `pnpm run build` and commit `dist/`.

---

## Overview

- **BaseService** — Base for services not tied to a collection (orchestration, external APIs).
- **BaseCollectionService** — CRUD + DTO mapping for any collection; no cache (good for large collections).
- **BaseCollectionServiceCached** — In-memory cache by `id` with two loading modes: **eager** (load full collection once) or **lazy** (load documents by ID on demand). Best for small lookup collections.
- **createGetService** — Builds a `getService(ServiceClass)` that returns a **singleton per class**. The registry key is the **class name** (`Service.name`), so the same class used from admin and frontend bundles shares one instance and one cache.
- **createInvalidateCacheHooks** — Payload `afterChange` / `afterDelete` hooks that call `invalidateCache(id)` (or full invalidation) on your cached service so the cache stays in sync with the DB.
- **coreServicesPlugin** — Optional Payload plugin to set cache TTL, loading mode (`eager` | `lazy`), and debug logging.

---

## Setup

### 1. Create `getService` (one place in your app)

```ts
// e.g. src/services/get-service.ts
import { getPayload } from 'payload'
import config from '@payload-config'
import { createGetService } from 'payload-core-services'

export const getService = createGetService(() => getPayload({ config }))
```

Use this single `getService` everywhere (admin and frontend). The registry lives in `globalThis`, so one process = one registry; the key is the **class name** (e.g. `"NaSourceService"`). No static fields on your service classes are required. Two different classes for the same collection (e.g. cached vs non-cached) get two different instances.

### 2. (Optional) Register the plugin

```ts
// payload.config.ts (or wherever you build config)
import { coreServicesPlugin } from 'payload-core-services'

export default buildConfig({
  plugins: [
    coreServicesPlugin({
      cacheTtlSec: 600,
      debug: false,
      cacheLoadingMode: 'eager', // or 'lazy'
    }),
  ],
  // ...
})
```

---

## Plugin options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cacheTtlSec` | `number` | `600` | Cache TTL in seconds for `BaseCollectionServiceCached`. |
| `debug` | `boolean` | `false` | When `true`, logs to console: which ID was requested, hit/miss, invalidation (element or collection), cache expiry, and when full or per-id load runs. |
| `cacheLoadingMode` | `'eager' \| 'lazy'` | `'eager'` | See [Cache loading modes](#cache-loading-modes). |

---

## Cache loading modes

Controlled by the plugin option `cacheLoadingMode`. Affects only `BaseCollectionServiceCached`.

### Eager (default)

- On the first request (or after TTL expiry / invalidation), the service loads the **entire collection** and stores it in memory.
- All later `getByIdDto(id)` and `getAllDto()` are served from that cache until TTL or invalidation.
- **Use for:** Small lookup tables (tags, sources, categories) when you often need multiple items or the full list.

### Lazy

- The full collection is **not** loaded upfront.
- Each `getByIdDto(id)` loads only that document (from DB) if it is missing or expired in the cache, then caches it with its **own** TTL. Other IDs are unaffected.
- `getAllDto()` triggers one full load and fills the cache with per-item TTLs.
- **Use for:** Same small collections when most requests are for a single ID and the full list is rarely needed.

---

## Get by ID in eager vs lazy

| Aspect | Eager | Lazy |
|--------|--------|------|
| **First `getByIdDto(id)`** | Loads full collection, then returns `id`. | Loads only document `id` from DB, caches it, returns it. |
| **Later `getByIdDto(id)`** | Served from in-memory map (hit). | Served from cache if not expired; else loads that `id` again. |
| **Expiry** | One global TTL for the whole cache. | Per-item TTL: each cached document has its own expiry. |
| **Invalidation** | `invalidateCache()` clears whole cache. | `invalidateCache(id)` clears only that ID; `invalidateCache()` clears all. |

Example (same service class, mode set by plugin):

```ts
// Plugin: cacheLoadingMode: 'eager'
const dto = await sourceService.getByIdDto(1)  // Loads full collection, then returns id 1

// Plugin: cacheLoadingMode: 'lazy'
const dto = await sourceService.getByIdDto(1)  // Loads only doc 1 from DB, caches it, returns it
const dto2 = await sourceService.getByIdDto(2) // Loads only doc 2, caches it
```

---

## Connecting collections and hooks

1. **Define a cached service** (extend `BaseCollectionServiceCached`), implement `selectFields()` and `toDto(doc)`.
2. **Register invalidation hooks** on the collection with `createInvalidateCacheHooks(() => getService(YourCachedService))`.
3. **Use the service** via `getService(YourCachedService)` and call `getByIdDto`, `getAllDto`, or (if you add slug support) your custom methods.

Hooks call `invalidateCache(doc.id)` so that in **lazy** mode only the changed document is invalidated; in **eager** mode the whole cache is cleared (same as `invalidateCache()`).

---

## Examples

### Uncached collection service (large collection)

```ts
// src/services/posts.service.ts
import type { Payload } from 'payload'
import type { Post } from '@/payload-types'
import { BaseCollectionService } from 'payload-core-services'

export type PostDto = { id: number; title: string; slug: string }

export class PostService extends BaseCollectionService<Post, PostDto> {
  constructor(payload: Payload) {
    super(payload, 'posts')
  }

  protected selectFields() {
    return { id: true, title: true, slug: true }
  }

  protected toDto(doc: Post): PostDto {
    return { id: doc.id, title: doc.title, slug: doc.slug }
  }
}
```

Usage: no cache; every call hits the DB.

```ts
const postService = await getService(PostService)
const post = await postService.getByIdDto(123)
const all = await postService.getAllDto()
```

---

### Cached collection service (eager or lazy via plugin)

```ts
// src/services/sources.service.ts
import type { Payload } from 'payload'
import type { NaSource } from '@/payload-types'
import { BaseCollectionServiceCached } from 'payload-core-services'

export type NaSourceDto = { id: number; name: string; code: string }

export class NaSourceService extends BaseCollectionServiceCached<NaSource, NaSourceDto> {
  constructor(payload: Payload) {
    super(payload, 'na-sources')
  }

  protected selectFields() {
    return { id: true, name: true, code: true }
  }

  protected toDto(doc: NaSource): NaSourceDto {
    return { id: doc.id, name: doc.name, code: doc.code }
  }
}
```

Registry key for this service is the class name `"NaSourceService"`. No static fields needed.

**Get by ID (eager):** first call loads the full collection, then returns the requested id from memory.

```ts
const service = await getService(NaSourceService)
const one = await service.getByIdDto(22)  // Loads all, then returns 22
const two = await service.getByIdDto(22)  // From cache (hit)
```

**Get by ID (lazy):** only the requested document is loaded and cached.

```ts
const service = await getService(NaSourceService)
const one = await service.getByIdDto(22)  // Fetches doc 22, caches it
const two = await service.getByIdDto(33)  // Fetches doc 33, caches it
const again = await service.getByIdDto(22) // From cache (hit) until its TTL expires
```

**Get all (both modes):** in eager, uses existing full cache; in lazy, runs one full load and then returns from cache.

```ts
const all = await service.getAllDto()
```

---

### Register hooks on the collection

```ts
// src/collections/na-sources.ts (or your collection config)
import type { CollectionConfig } from 'payload'
import { createInvalidateCacheHooks } from 'payload-core-services'
import { getService, NaSourceService } from '@/services'

const { afterChange, afterDelete } = createInvalidateCacheHooks(() =>
  getService(NaSourceService),
)

export const NaSources: CollectionConfig = {
  slug: 'na-sources',
  hooks: {
    afterChange: [afterChange],
    afterDelete: [afterDelete],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'code', type: 'text', required: true },
  ],
}
```

After a document is created, updated, or deleted, the hook calls `invalidateCache(doc.id)`. In **lazy** mode only that document is removed from the cache; in **eager** mode the entire cache is cleared.

---

### Use in a Server Component or API route

```ts
const service = await getService(NaSourceService)
const source = await service.getByIdDto(Number(params.id))
if (!source) notFound()
// use source
```

---

## API reference

### createGetService(getPayloadInstance)

- **Arguments:** `getPayloadInstance: () => Promise<Payload>` (e.g. `() => getPayload({ config })`).
- **Returns:** `getService<T>(Service: ServiceConstructor<T>) => Promise<T>`.
- **Behavior:** One singleton per service class. Registry key = **class name** (`Service.name`). Payload is lazily initialized on first `getService()` call.

### BaseCollectionService

- **Methods:** `getById(id)`, `getAll()`, `getByIdDto(id)`, `getAllDto()` — all hit the DB (no cache).
- **Abstract:** `toDto(doc)`, `selectFields()`.

### BaseCollectionServiceCached

- **Extends:** `BaseCollectionService`.
- **Methods:** Same DTO API; results are cached. `invalidateCache(id?: number)` — with `id` in lazy mode invalidates only that document; without `id` (or in eager) clears the whole cache.
- **Behavior:** Depends on plugin `cacheLoadingMode`: [eager](#eager-default) vs [lazy](#lazy).

### createInvalidateCacheHooks(getService)

- **Arguments:** A function that returns `Promise<{ invalidateCache(id?: number): void }>` (e.g. `() => getService(NaSourceService)`).
- **Returns:** `{ afterChange, afterDelete }` — use in the collection’s `hooks`.

### coreServicesPlugin(options?)

- **Options:** `cacheTtlSec`, `debug`, `cacheLoadingMode` (see [Plugin options](#plugin-options)).
- **Use:** Add to Payload `plugins` array in config.

---

## When to use which class

| Class | Collection size | Cache | Example |
|-------|-----------------|-------|---------|
| BaseService | — | — | Orchestration, external APIs |
| BaseCollectionService | Large | No | Posts, products |
| BaseCollectionServiceCached | Small | Yes (eager or lazy) | Tags, sources, categories |

---

## Single instance across admin and frontend

The registry key is the **class name** (`Service.name`). If admin and frontend are built as separate bundles, the same class name in both yields one shared instance and one cache. You do **not** need to add `static collectionSlug` or `static cacheKey` on your classes. If your bundler minifies class names, keys can differ per bundle — in that case preserve class names for server-side service modules (e.g. disable name mangling for those files).

---

## License

MIT
