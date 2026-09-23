# Feature request: timed transcript for podcast episodes

Status: requested by frontend · Date: 2026-09-23
Contract checked: live OpenAPI at `https://hezarfen-backend.dizey.sh/api-docs/openapi.json`
(fetched 2026-09-23) — no transcript field or route under `/podcast/*`.

## What the frontend already does

The podcast player (`src/components/notes/podcast-player.tsx`) renders a
timed transcript under the audio when one is present: the line being spoken
is highlighted and kept in view, and clicking a line plays from its start
(`src/components/notes/podcast-transcript.tsx`). Until the backend sends a
transcript, the player shows no transcript control at all.

It reads the transcript from `GET /podcast/jobs/{id}/result`, as an optional
field of `PodcastJobArtifacts` (`src/api/client/types.ts`):

```jsonc
{
  "job_id": "…",
  "audio_id": "…",
  "duration_secs": 754,
  "format": "ogrenci_hoca",
  "transcript": [
    { "start_secs": 0.0, "end_secs": 4.2, "text": "Bugün hücreyi konuşalım.", "speaker": "Öğretmen" },
    { "start_secs": 4.2, "end_secs": 7.9, "text": "Hücre neden bu kadar önemli?", "speaker": "Öğrenci" }
  ]
}
```

## Requested shape

- `transcript`: array, ordered by `start_secs`, or `null`/absent when the
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
changes in one place: the type above and the `transcript` prop passed to
`PodcastPlayer`.
