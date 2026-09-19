/**
 * One run day's school report door, spelled once: the two requests go through
 * `client`/`blobClient`, which add `/api` themselves, while the download link
 * has to carry the prefix — so the prefixed form is built from the same path.
 *
 * `runDay` is the ledger row's own `run_day` (`YYYY-MM-DD`). A day nothing was
 * generated for answers `409 report_missing`; a caller below manager is refused.
 */
export function insightRunReportPath(runDay: string): string {
  return `/insights/runs/${encodeURIComponent(runDay)}/report`;
}

/** The same door as a same-origin URL — hand it to an `<a href>`: the session cookie rides along. */
export function insightRunReportUrl(runDay: string): string {
  return `/api${insightRunReportPath(runDay)}`;
}
