# Future Content Automation: Bible + Dictionary APIs

## Bible (KJV)
The current MVP intentionally uses manual text entry so competition content can be verified before going live.

Future option: integrate a KJV-capable Bible API. Candidates to evaluate include:
- bible-api.com: simple JSON passage lookup and KJV support.
- API.Bible: supports specific Bible editions including KJV through its API platform.

Recommended flow:
1. Operator enters `John 3:16`.
2. App queries configured Bible provider.
3. Return version, reference and verse text.
4. Require moderator preview/approval before the verse becomes "competition locked".
5. Cache approved text locally so a live round does not depend on API availability.

Never silently switch translations; KJV must be explicit and visible.

## Dictionary / Spelling words
Potential sources:
- dictionaryapi.dev: free dictionary API intended for games/learning apps.
- Merriam-Webster Dictionary API: free non-commercial access is available subject to its published daily/query terms.
- Oxford Dictionaries API: richer dictionary/pronunciation capabilities, commercial terms to be reviewed.

Recommended flow:
1. Moderator selects/imports candidate words.
2. API enriches each word with definition, phonetics, example sentence and optional audio.
3. Competition admin reviews and locks the word bank before the event.
4. Store/cache the locked bank locally.
5. During the competition use only locked content, not live random API results.

## Why caching matters
A live competition should not fail because a third-party dictionary/Bible endpoint is unavailable or rate-limited. APIs should be preparation tools; the event runtime should operate from a validated local competition package.
