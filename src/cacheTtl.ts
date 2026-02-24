const DEFAULT_TTL_SEC = 600 // 10 min

let cacheTtlSec = DEFAULT_TTL_SEC

export function getCacheTtlSec(): number {
  return cacheTtlSec
}

export function setCacheTtlSec(sec: number): void {
  cacheTtlSec = sec
}
