# Security remediation — 2026-09-09

Scope: mobile login session injection, suspended merchant reads, operation telemetry abuse, reservation spam, shared poll identity and pgcrypto resolution.

- Mobile callbacks reject access/refresh tokens and token hashes, validate the callback address and unique parameters, and require a pending 15-minute login attempt. Google/Kakao use Supabase PKCE. Naver uses an app-held verifier, signed browser request binding, a five-minute one-time exchange, and atomic consumption. The callback URL contains no usable session credential. Duplicate native/browser delivery shares one completion.
- Suspended merchants cannot SELECT customer reservations. Customer self-access and approved merchant access remain. Server-side queries also filter approved stores.
- Operation events require a verified user (native Bearer token or web session). The server derives the visitor identity; caller IDs cannot change it. Atomic database limits permit 60 events/minute and 1,000/day/account. Bodies are capped at 8 KiB. This bounds abuse, but client-reported events are still not proof of real user actions.
- New telemetry references the authenticated user with deletion cascading. Consent withdrawal deletes only the authenticated user's new events. Legacy anonymous events have no verified account mapping and remain subject to existing retention rather than accepting arbitrary identifiers for deletion.
- Reservations are limited to five creations/10 minutes and 20/day/account. A customer lock prevents concurrent duplicate bookings of an active reservation for the same store/date/time. These are fixed-window limits, not a guarantee against many accounts.
- Shared polls remain publicly readable, but voting requires a non-anonymous authenticated account. Changing the legacy voter token no longer adds a second ballot. Existing historic ballots are preserved; they cannot safely be retroactively associated with accounts. Creation/query/voting now resolve pgcrypto explicitly through `extensions`.
- CI no longer replays historical migrations on DB credential failures, which could silently replace hardened functions. It only verifies already-applied changed versions through the Management API, otherwise it fails.

Validation: web production build, web/mobile TypeScript, changed-file ESLint, `node tests/security/regression.cjs`. `tests/security/database.sql` ran with assertions enabled in a transaction against the live schema; all synthetic users, stores, reservations, polls, counters and exchanges were rolled back. The migration was then applied with Supabase migration history version 20260909073250.

Deployment order: database migration, then web and Android production/preview OTA via the existing GitHub pipelines. The older Naver mobile login entry point intentionally asks users to update. Already-installed clients must receive the new JavaScript before their callback handler is protected. A real Android OAuth round trip and per-device OTA receipt must still be checked on a device; mocked SDK success does not prove provider configuration or device delivery.

References: https://supabase.com/docs/guides/auth/sessions/pkce-flow and https://nextjs.org/docs/app/api-reference/file-conventions/route .
