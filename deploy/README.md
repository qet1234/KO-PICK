# KO-PICK backend deployment

The Spring Boot backend is portable. Render is not required.

## Recommended: Railway

1. Create a Railway project from the `qet1234/KO-PICK` GitHub repository.
2. Set the service root directory to `/backend`. Railway reads `backend/railway.toml` and builds `backend/Dockerfile`.
3. Add a PostgreSQL service in the same Railway project.
4. Add these references to the API service:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `DATABASE_USERNAME=${{Postgres.PGUSER}}`
   - `DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}`
5. Copy the non-database secrets from the current backend without committing them:
   `FRONTEND_URL`, `ALLOWED_ORIGINS`, OAuth client IDs/secrets, `KAKAO_REST_API_KEY`,
   `TOUR_API_SERVICE_KEY`, `JWT_SECRET`, `KEYWORD_HASH_SALT`, cookie settings, and JWT TTLs.
6. Select the Singapore region, generate a Railway domain, and verify `/actuator/health`.
7. Restore the current PostgreSQL dump into Railway before switching traffic.
8. Attach `api.koreapick.duckdns.org`, update its DNS record, then update the frontend
   `VITE_SPRING_API_URL` and OAuth callback registrations if the public API hostname changes.

Do not delete Render until login, API health, reservations, spaces, and TourAPI have passed smoke tests on Railway.

## Provider-independent self-hosting

A Linux VPS with Docker can run the same API and PostgreSQL database:

```bash
cd deploy
cp .env.example .env
docker compose -f compose.production.yaml up -d --build
```

Fill every secret in `.env` first. Point `API_DOMAIN` to the VPS public IP and allow inbound TCP 80/443 and UDP 443. Caddy obtains and renews HTTPS certificates automatically.

## Database transfer

Create a consistent dump from the old database and restore it before DNS cutover:

```bash
pg_dump --format=custom --no-owner --no-acl "$OLD_DATABASE_URL" > kopick.dump
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$NEW_DATABASE_URL" kopick.dump
```

Run this from a trusted machine and keep both URLs out of shell history and Git. For final cutover, briefly block writes or enter maintenance mode, take one final dump, restore it, then change DNS.

## Rollback

Keep the old backend untouched during validation. If the new health check, login, or API smoke test fails, restore the previous API DNS target and frontend API variable. DNS TTL should be lowered before the migration window.
