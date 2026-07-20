#!/bin/sh
set -eu

# Render supplies postgresql:// URLs, while the PostgreSQL JDBC driver expects
# jdbc:postgresql://. Local and already-normalized JDBC URLs pass through.
case "${DATABASE_URL:-}" in
  postgresql://*)
    DATABASE_URL="jdbc:${DATABASE_URL}"
    export DATABASE_URL
    ;;
  postgres://*)
    DATABASE_URL="jdbc:postgresql://${DATABASE_URL#postgres://}"
    export DATABASE_URL
    ;;
esac

exec java -jar /app/app.jar
