const DEFAULT_TTL_SEC = 600; // 10 min
let cacheTtlSec = DEFAULT_TTL_SEC;
export function getCacheTtlSec() {
    return cacheTtlSec;
}
export function setCacheTtlSec(sec) {
    cacheTtlSec = sec;
}
