export type CacheLoadingMode = 'lazy' | 'eager'

const DEFAULT_LOADING_MODE: CacheLoadingMode = 'eager'

let debug = false
let cacheLoadingMode: CacheLoadingMode = DEFAULT_LOADING_MODE

export function getDebug(): boolean {
  return debug
}

export function setDebug(value: boolean): void {
  debug = value
}

export function getCacheLoadingMode(): CacheLoadingMode {
  return cacheLoadingMode
}

export function setCacheLoadingMode(mode: CacheLoadingMode): void {
  cacheLoadingMode = mode
}
