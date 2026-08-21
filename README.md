# TribeVox V5 — ElevenLabs Recognition Studio

V5 upgrades TribeVox from browser Web Speech recognition to **ElevenLabs Scribe v2 Realtime**, while retaining the custom TribeVox recognition-intelligence and scoring layer. Spelling pronunciation now uses **Eleven Flash v2.5** through a protected server endpoint.

> Important: configure `ELEVENLABS_API_KEY` server-side. Do not expose a permanent ElevenLabs key in React. See `ELEVENLABS_V5_IMPLEMENTATION.md`.

## V5 quick start

```bash
npm install
npx vercel dev
```

For Vercel deployment, add `ELEVENLABS_API_KEY` to the project environment and redeploy.

---

## Previous project documentation

# TribeVox — Live Voice Engine (V3)

A standalone, browser-first live speech console for the vocal events of the Twelve Tribes Family Games. V3 concentrates on operator usability, polished control/backdrop UI, local catalogue management, browser speech recognition, spelling pronunciation controls, and safe one-person operation without authentication or external APIs.

## What changed in V3

### Enterprise console refresh
- Renamed the utility to **TribeVox** with the descriptor **Live Voice Engine**.
- Rebuilt the control screen around a warmer operations-console visual language: soft icon tiles, refined hierarchy, compact KPI cards, a voice status card, cleaner controls, and stronger spacing.
- Kept both light and dark themes.
- Refined the secondary `/display` view to behave more like a true event/backdrop feed.

### Session library collapse fix
The library no longer becomes unreachable after collapse. When collapsed, a persistent vertical/open handle stays visible; clicking it restores the full catalogue.

### Editable local catalogue
The seed data still lives in:
- `src/data/words.json`
- `src/data/scriptures.json`

At runtime, TribeVox now creates a persistent browser catalogue stored as JSON in `localStorage`. Operators can:
- add spelling words or scriptures;
- edit existing entries;
- delete entries;
- search and immediately load entries into a session;
- export the entire catalogue as a `.json` file;
- import a previously exported TribeVox catalogue;
- restore the original source seed data.

Why localStorage instead of rewriting `src/data/*.json` directly? A browser application cannot safely modify files inside its compiled source bundle at runtime. The JSON files therefore remain the source seed, while the runtime catalogue is persisted locally in JSON form. Import/export provides a clean migration path until a backend/content API is introduced.

### Recognition accent controls
Recognition language can now be switched between:
- English — Nigeria (`en-NG`)
- English — United Kingdom (`en-GB`)
- English — United States (`en-US`)
- English — South Africa (`en-ZA`)

Browser speech recognition support still depends on Chrome/Edge and the recognition service available on the machine. Requesting `en-NG` does not guarantee that every browser vendor has a dedicated Nigerian acoustic model, but it gives the browser the correct locale preference where supported.

### Pronunciation Voice Lab
Spelling pronunciation now has a dedicated Voice Lab:
- browser/system voice selector;
- voice language shown alongside the voice name;
- speed slider (`0.55x` to `1.30x`);
- pitch slider;
- selected voice/local-service indicator;
- speaking state and stop control.

The previous ambiguous `Slower` button has been removed. The active speed is now visible and adjustable before pronunciation.

Browser speech synthesis voices are operating-system dependent. If a Nigerian English voice is installed/exposed by the browser, it appears automatically in the voice list. Otherwise TribeVox falls back to the nearest available English voice.

The synthesis hook also warms the browser speech service on first use and preloads voice enumeration to reduce the common first-click delay seen in Chromium.

### Existing recognition behaviour retained
- continuous recognition with automatic recovery after native recognition ends;
- interim and final transcript handling;
- multiple recognition alternatives;
- spelling letter aliases (`bee`, `see`, `double you`, `zed`, etc.);
- recitation reference filtering so announcements such as “John chapter three verse sixteen” are excluded from verse scoring;
- pending words remain pending until reached instead of being marked wrong prematurely.

## Running locally

```bash
npm install
npm run dev
```

Open:
- `http://localhost:5173/control`
- `http://localhost:5173/display`

Chrome or Edge is recommended for the current browser-native recognition phase.

## Suggested rigorous dry run

1. Test Recitation with `en-NG`, `en-GB`, and `en-US` using the same speaker and passage.
2. Announce references before each verse and during a multi-verse passage.
3. Deliberately omit, repeat, or replace words and inspect alignment behaviour.
4. Pause for 3–10 seconds mid-passage and verify recognition resumes.
5. Spell with both literal letters and letter aliases: `N E C...`, `en ee see...`, etc.
6. Test Voice Lab with every exposed English voice and record the most natural choices for the event machine.
7. Add/edit/delete catalogue entries, refresh the browser, and verify persistence.
8. Export JSON, clear/restore data, then re-import the exported catalogue.
9. Open the display before and after the control page and verify state synchronization.
10. Test the backdrop at 1920×1080 and full-screen browser zoom levels intended for the event.

## Current architecture boundary

This version intentionally has no authentication, database, cloud speech engine, or remote content API. It is designed as a controlled single-operator prototype. The next major quality jump for speech accuracy, diarization, confidence values, noise robustness, and accent handling will come from the Azure/cloud speech phase already documented in `AZURE_FUTURE_ENHANCEMENT.md`.

## V4 — Recognition Intelligence Engine

V4 changes the project from a direct transcript comparer into a browser-first recognition intelligence pipeline. The raw Web Speech transcript is now stabilised and passed through separate recitation/spelling matchers before it can affect scoring.

### What V4 adds

- Sequential recitation alignment with a moving expected-word position.
- Stutter and short repeated-word/phrase tolerance without double advancement.
- Skip-forward recovery: nearby expected words can re-anchor the sequence after an omission.
- Inserted/filler/background-word tolerance with conservative re-anchoring.
- Initial room-speech guard: unrelated speech before the participant finds the opening sequence is ignored.
- Scripture call-out filtering remains active and multi-verse references expose a current verse estimate.
- Multi-verse boundary tracking uses explicit reference ranges and sentence boundaries where possible, with a safe proportional fallback.
- Browser recognition auto-restart after unexpected `onend`, preserving the accumulated attempt.
- Confidence gating for recognition results that expose a real confidence value. Confidence `0`/unknown is not rejected because Chromium often does not expose meaningful confidence.
- Recognition alternatives increased to seven and the highest-confidence candidate is selected.
- Short-window duplicate-final suppression to reduce duplicated native results after recognizer churn.
- Spelling commands: `restart` / `start again`, `backspace` / `undo` / `correction`, and `double <letter>`.
- Dedicated participant-turn reset that clears recognition/TTS state without deleting the selected catalogue item.
- Separate Accuracy, Sequence Progress and Speech Confidence metrics so partial-but-correct recitation no longer looks like a completed 100% attempt.
- Recognition diagnostics for ignored repetitions, ignored filler/noise insertions, sequence recoveries, skipped expected words, and automatic browser restarts.
- Optional microphone health monitor requesting `echoCancellation`, `noiseSuppression`, and `autoGainControl`, with live mic activity and estimated room floor.

### Important browser limitation

The Web Speech API does not accept a custom Web Audio stream, so the application cannot place its own DSP filter directly in front of Chromium speech recognition. V4 therefore combines browser-requested microphone processing, transcript-side noise/filler rejection, confidence gating, and sequence intelligence. A future Azure/Deepgram/Google adapter can feed the same matcher layer with a provider that supports stronger acoustic noise suppression and word-level confidence/timestamps.

### V4 dry-run cases

Test at minimum: clean continuous recitation; scripture reference before each verse; 5–10 second pauses; `for, for, for God...` stutters; repeated phrases; one/two/five skipped words; a wrong substituted word followed by correct continuation; self-correction; background speech before the participant begins; intermittent room noise mid-verse; browser recognition ending/restarting; and spelling with `double`, `undo`, and `restart` commands. Compare en-NG, en-GB and en-US on the same microphone and participant.

## V5.1 calibration fixes

- Studio grid now truly reallocates width when either side rail is collapsed.
- Spelling normalization now understands Scribe outputs such as `A-C-C-O-M-M-O-D-A-T-E`, spaced letters, letter names, double-letter commands, undo/correction and short compact letter runs.
- The latency tile now measures commit settle time (last partial transcript to committed transcript) rather than the misleading first-partial-to-final duration.
- Realtime VAD is tuned more aggressively for competition use (`0.48s` silence threshold, `0.4` VAD threshold).
- Backdrop transport now combines BroadcastChannel with persisted localStorage recovery for much more reliable same-device tabs and refreshes. Cross-device backdrop synchronization still requires a realtime backend transport.
- ElevenLabs usage metrics require the API key to include **User → Read** permission. STT/TTS can still work when that monitoring permission is missing.
