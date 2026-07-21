# KO-PICK Security Baseline

## Scope

This document defines the minimum controls for production operation of KO-PICK. No system can be guaranteed perfectly secure; these controls reduce risk and make incidents easier to detect and contain.

## Data classification

- **Restricted:** OAuth client secrets, JWT secrets, database passwords, refresh tokens, session identifiers.
- **Personal:** email, provider account identifier, profile name/photo, couple-space membership, anniversaries, saved places, account-deletion records.
- **Public:** place and tourism information already intended for public display.

Restricted data must never be sent to the browser, written to Git, placed in URLs, or stored in browser storage. Personal API responses must use `Cache-Control: private, no-store`.

## Authentication and sessions

- Keep access tokens short-lived (15 minutes or less).
- Store refresh tokens only in `HttpOnly`, `Secure` cookies.
- Use `SameSite=Lax` where the OAuth flow permits it; use `None` only when cross-site cookies are strictly required.
- Rotate refresh tokens and revoke the complete token family after reuse detection.
- Invalidate sessions after password/account changes, account deletion, suspicious login, or OAuth unlinking.
- Never accept a user ID, role, couple-space ID, or ownership claim solely from a request body. Resolve identity from the authenticated server session.

## Authorization and database

- Every personal-data query must be scoped by the authenticated user ID.
- Couple-space data requires server-side membership verification on every read and write.
- Apply least-privilege database roles. The application role must not own the database or schema.
- Do not expose PostgreSQL publicly. Restrict inbound connections to the application platform/private network when the provider supports it.
- Encrypt provider tokens and especially sensitive personal fields at the application or database layer when retained.
- Keep audit events for login, logout, account deletion, couple linking/unlinking, permission changes, and administrative access. Do not log tokens, secrets, full cookies, or sensitive request bodies.

## API protection

- Apply distributed rate limiting through a shared store or edge provider, not only in application memory.
- Suggested starting limits:
  - OAuth start/callback: 10 requests per minute per IP.
  - Login/session refresh: 20 requests per minute per IP and account.
  - Writes: 60 requests per minute per authenticated user.
  - Public place search: 120 requests per minute per IP, with server-side caching.
- Validate request size, content type, enum values, text length, dates, coordinates, pagination limits, and uploaded file type/size.
- Add request timeouts, bounded retries with jitter, circuit breakers, and concurrency limits for TourAPI and other external APIs.
- Return generic authentication and server errors. Keep detailed causes in protected server logs only.
- Require idempotency keys for sensitive retryable writes such as account deletion or couple-space unlinking.

## Browser protection

- Enforce HTTPS and HSTS.
- Send anti-clickjacking, MIME-sniffing, referrer, permissions, and opener-policy headers.
- Add a tested Content Security Policy after inventorying Kakao, Naver, Google, Supabase, image, map, and analytics domains. Roll it out in report-only mode first.
- Avoid `dangerouslySetInnerHTML`; sanitize any unavoidable HTML.
- Store only non-sensitive public place cache data in session/local storage. Never store tokens or personal responses there.

## Availability and traffic

- Put the public domain behind a CDN/WAF with DDoS protection, bot management, TLS, rate limiting, and origin shielding.
- Cache public tourism/place responses at the edge or server. Never edge-cache personalized responses.
- Use pagination and indexed queries; set maximum page sizes.
- Configure database connection pooling and hard connection limits.
- Use separate production/staging environments and secrets.
- Free single-instance services are not an adequate high-traffic or high-availability production design. Use multiple instances or autoscaling, managed Redis, and a database plan with backups and performance headroom before a public growth campaign.

## Backups and recovery

- Enable automated encrypted database backups and point-in-time recovery.
- Test restoration at least quarterly.
- Define recovery targets and document an incident runbook.
- Maintain an emergency process to rotate all OAuth, JWT, database, deployment, and API credentials.

## Monitoring and response

Alert on:

- elevated 401/403/429/5xx rates;
- repeated OAuth failures;
- refresh-token reuse;
- unusual account deletion or couple unlinking;
- database connection saturation, slow queries, storage growth;
- external API errors and latency;
- unexpected origin traffic bypassing the WAF.

Incidents should trigger containment, credential rotation, evidence preservation, impact analysis, notification review, remediation, and a post-incident report.

## Release gates

Before production deployment:

1. Build, tests, lint, dependency audit, and secret scanning pass.
2. Database migrations have a rollback/recovery plan.
3. New endpoints include authentication, authorization, validation, rate limits, logging rules, and tests.
4. No secret or production personal data appears in code, fixtures, logs, screenshots, or commits.
5. Backup and health checks are verified.
