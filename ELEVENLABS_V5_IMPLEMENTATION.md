# TribeVox V5 — ElevenLabs Engine Integration

## Primary engine

V5 uses ElevenLabs as the only external speech provider:

- STT: `scribe_v2_realtime`
- TTS: `eleven_flash_v2_5`
- Recognition/scoring intelligence remains inside TribeVox.

The old browser `SpeechRecognition` hook is no longer used by the control console.

## Security model

Never call ElevenLabs with the permanent API key from React.

The browser calls `/api/scribe-token`. The Vercel function creates a 15-minute single-use `realtime_scribe` token and returns only that token to the browser. The browser then connects directly to Scribe Realtime.

Set this in Vercel:

```env
ELEVENLABS_API_KEY=...
```

The server temporarily accepts `VITE_ELEVENLABS_API_KEY` as a migration fallback, but rename it to `ELEVENLABS_API_KEY`. A `VITE_` prefix is intended for client-visible configuration and should not be used for secrets.

Optional:

```env
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
```

## API routes

- `/api/scribe-token` — creates short-lived realtime STT token
- `/api/elevenlabs-metrics` — exposes safe subscription/credit summary
- `/api/elevenlabs-voices` — exposes voices available to this workspace, with default fallbacks
- `/api/elevenlabs-tts` — server-side low-latency spelling pronunciation

## Local development

Because the application now has Vercel serverless API functions, use Vercel's local runtime for full ElevenLabs testing:

```bash
npm install
npx vercel dev
```

Vite-only `npm run dev` will render the interface, but the `/api/*` functions are not automatically provided by the standard Vite dev server.

## Vercel deployment

1. Add `ELEVENLABS_API_KEY` under Project → Settings → Environment Variables.
2. Remove the old `VITE_ELEVENLABS_API_KEY` after confirming the new variable works.
3. Redeploy.
4. Test `/control`.
5. Start listening and approve microphone access.
6. Check Engine Monitor for subscription usage.

The SPA rewrite is scoped to `/control` and `/display` so `/api/*` is never swallowed by the index rewrite.

## V5 UI direction

V5 is a dark-first recognition studio with:

- compact navigation/library rail;
- large central recognition workspace;
- collapsible engine-monitor panel;
- fewer persistent controls;
- popover voice controls;
- mobile/tablet breakpoints;
- explicit Scribe connection state;
- ElevenLabs credit usage monitoring;
- reduced dashboard-card clutter.

## Recognition architecture

```text
Microphone
  ↓
ElevenLabs Scribe v2 Realtime
  ↓
partial / committed transcript
  ↓
TribeVox recognition intelligence
  ├─ repetition + stutter handling
  ├─ scripture reference removal
  ├─ skip-forward recovery
  ├─ verse position tracking
  ├─ spelling correction handling
  └─ sequence scoring
  ↓
Control UI + backdrop
```

This separation is deliberate: ElevenLabs determines what was spoken; TribeVox determines whether it was correct in the competition.
