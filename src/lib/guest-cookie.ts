// 軽量モジュール: middleware (Edge Runtime) からも安全にimportできるよう
// jose 等の重量級依存を含む `guest.ts` からは分離している。

export const GUEST_COOKIE_NAME = 'unyam.guest'
export const GUEST_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
