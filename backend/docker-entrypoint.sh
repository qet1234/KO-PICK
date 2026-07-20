#!/bin/sh
set -eu

# Render supplies a URI with credentials embedded in the authority section,
# while the PostgreSQL JDBC driver expects credentials as separate datasource
# properties. DATABASE_USERNAME and DATABASE_PASSWORD are injected separately
# by render.yaml, so remove URI userinfo before converting to a JDBC URL.
case "${DATABASE_URL:-}" in
  postgresql://*)
    database_address="${DATABASE_URL#postgresql://}"
    case "$database_address" in
      *@*) database_address="${database_address##*@}" ;;
    esac
    DATABASE_URL="jdbc:postgresql://$database_address"
    export DATABASE_URL
    ;;
  postgres://*)
    database_address="${DATABASE_URL#postgres://}"
    case "$database_address" in
      *@*) database_address="${database_address##*@}" ;;
    esac
    DATABASE_URL="jdbc:postgresql://$database_address"
    export DATABASE_URL
    ;;
esac

exec java -jar /app/app.jar
