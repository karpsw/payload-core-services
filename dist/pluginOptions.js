const DEFAULT_LOADING_MODE = 'eager';
let debug = false;
let cacheLoadingMode = DEFAULT_LOADING_MODE;
export function getDebug() {
    return debug;
}
export function setDebug(value) {
    debug = value;
}
export function getCacheLoadingMode() {
    return cacheLoadingMode;
}
export function setCacheLoadingMode(mode) {
    cacheLoadingMode = mode;
}
