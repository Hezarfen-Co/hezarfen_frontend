// The avatar endpoint answers with raw image bytes, so it is read through a
// plain <img src>, not fetch: /api is same-origin, which carries the session
// cookie on its own. `version` is a cache-buster the caller bumps after an
// upload or delete — the URL is otherwise identical before and after, and the
// browser's in-memory image cache would keep serving the old bytes.
export function getUserAvatarUrl(userId: string, version?: number): string {
  const bust = version ? `?v=${version}` : "";
  return `/api/users/${encodeURIComponent(userId)}/avatar${bust}`;
}
