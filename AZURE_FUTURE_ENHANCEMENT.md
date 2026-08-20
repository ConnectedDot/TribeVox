# Azure Speech Future Enhancement Plan

## Goal
Replace browser-native speech recognition/synthesis with Azure Speech SDK while preserving the React UI, local comparison engine, and external-display workflow.

## Proposed production architecture
Browser microphone -> Azure Speech SDK -> real-time transcript/pronunciation assessment -> local comparison UI.
Spelling word -> backend-issued short-lived Azure token -> Azure TTS -> browser audio/PA output.

Do **not** expose a permanent Azure Speech subscription key in the frontend. Use a minimal backend/token endpoint to obtain a short-lived authorization token.

## Functional comparison

| Capability | Browser MVP | Azure Speech |
|---|---|---|
| Real-time STT | Yes, browser-dependent | Yes, service-backed |
| Interim text | Yes | Yes |
| TTS | Yes, OS/browser voices | Neural voices + SSML |
| Pronunciation scoring | No native reliable scoring | Pronunciation Assessment |
| Word/phoneme analysis | Local text diff only | Word/syllable/phoneme assessment where supported |
| Accent robustness | Browser-dependent | Better configurable speech service, still imperfect |
| Offline guarantee | No universal guarantee | No; cloud connectivity required |
| Credential control | None | Requires secure token pattern |
| Cross-browser consistency | Low/medium | Higher |

## Performance expectations
Browser Web Speech is usually fastest to prototype because there is no custom network layer in the application. Perceived latency can be sub-second for interim text in favourable browser/network conditions, but behavior and recognition quality vary by browser and OS.

Azure adds a network round trip, but supports production-oriented streaming recognition. Actual latency should be measured at the venue using the selected Azure region, microphone, PA setup and internet connection. Do not design competition rules around an assumed millisecond SLA without field testing.

## Pronunciation assessment
Azure Pronunciation Assessment can evaluate reference-text speech and return accuracy, fluency and completeness; word/syllable/phoneme granularity is available depending on configuration/language. Microsoft states pronunciation assessment usage is billed at the same baseline as Speech to Text for Standard/commitment pricing.

## Cost model
At current published Azure pricing, Standard real-time transcription is listed around **US$1 per audio hour** in pricing views, with per-second billing. Pronunciation Assessment uses the Speech-to-Text pricing baseline. Exact regional/currency pricing must be checked when provisioning.

Illustrative event usage:
- 12 tribes x 2 minutes = 24 audio minutes per session.
- 2 sessions/day = 48 minutes.
- 2 competition days = 96 minutes = 1.6 audio hours.
- At ~US$1/audio-hour STT baseline, raw STT/pronunciation usage would be roughly **US$1.60** before taxes/region-specific differences and any additional features.

Even multiplying that usage several times for testing/retries remains inexpensive relative to venue/event operations. TTS for individual spelling words is character-based and should be very small at this scale, but exact Azure TTS character pricing varies by voice/model and region.

## Recommended migration phases
1. Keep current browser hook interface.
2. Add `AzureSpeechProvider` implementing the same events.
3. Add backend `/speech/token` endpoint.
4. Add streaming STT.
5. Add Pronunciation Assessment for Bible reference text.
6. Add Azure neural TTS + SSML for spelling words.
7. Add provider toggle: Browser / Azure.
8. Run venue benchmark comparing accuracy, interim latency and dropouts.
9. Keep browser fallback for service outage.

## Venue benchmark metrics
Record at least:
- median time to first interim transcript,
- p95 time to first interim transcript,
- final-transcript delay,
- word error rate on selected KJV passages,
- letter-recognition accuracy during spelling,
- false-positive/false-negative mismatch rate,
- microphone dropout rate,
- network disconnect recovery time.

## Cost-effectiveness conclusion
Browser API wins for zero infrastructure and immediate deployment. Azure wins once consistent recognition, explicit pronunciation assessment, standardized TTS voices, observability and cross-device behavior matter. For the expected Twelve Tribes event duration, cloud speech usage itself is likely a minor cost; engineering, testing, microphone quality and reliable connectivity matter more.
