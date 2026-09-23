# Feature request: timed transcript for podcast episodes

Status: partly shipped · Updated: 2026-09-23
Contract checked: live OpenAPI at `https://hezarfen-backend.dizey.sh/api-docs/openapi.json`.

## What the backend ships now

`GET /podcast/jobs/{id}/result` carries `transcript: string | null` on
`JobArtifacts` — the episode's narration as plain text, chapters joined by
blank lines, with no timings. `null` for jobs that finished before the column
existed.

## What the frontend does with it

The podcast player (`src/components/notes/podcast-player.tsx`) reads the
result of whichever episode is selected and, when the transcript is present,
offers a "Transkript" toggle that shows it one paragraph per chapter
(`src/components/notes/podcast-transcript.tsx`). With no transcript there is
no toggle. Without timings the text cannot follow playback or seek, so the
request below still stands.

## Still requested: timings

- `transcript_segments` (new field beside the plain `transcript`): array, ordered by `start_secs`, or `null`/absent when the
  service produced none. Only on a `done` job.
- `start_secs` / `end_secs`: offsets into the produced audio, in seconds
  (fractions allowed). The pipeline already knows these when it stitches the
  narration's TTS segments together.
- `text`: the line as spoken.
- `speaker`: the voice's display label on the two-voice `ogrenci_hoca` format;
  `null` on `duz_okuma` and `tek_ogretici`.

If the backend prefers a separate door (for example
`GET /podcast/jobs/{id}/transcript`, which would also let the history list and
the studio inspector load it lazily), or different field names, the frontend
changes in one place: `PodcastJobArtifacts` in `src/api/client/types.ts` and
the fetch in `PodcastPlayer`.

## Related: the audio door cannot be seeked

`GET /podcast/jobs/{id}/audio` answers `200` with `Transfer-Encoding: chunked`,
no `Content-Length`, no `Accept-Ranges`, and ignores a `Range` header
(checked 2026-09-23). Browsers then report `seekable` as `[0, 0]` and every
seek snaps back to 0:00. The frontend works around it by loading the whole
file once (`getPodcastJobAudioBlob`) and seeking in a local copy, which costs
a full download before the first seek. Answering `Range` with `206 Partial
Content` (plus `Accept-Ranges: bytes` and `Content-Length` on the full
response) would make seeking instant; the player already prefers the stream
whenever the browser says it can seek there.
