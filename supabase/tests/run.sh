#!/usr/bin/env bash
#
# Rejoue les migrations puis la suite de tests sur une base PostgreSQL jetable.
#
#   ./supabase/tests/run.sh
#
# Variables reconnues : PGHOST, PGPORT, PGUSER (par défaut : connexion locale).
# La base TEST_DB est supprimée puis recréée à chaque exécution.
set -euo pipefail

TEST_DB="${TEST_DB:-ntcharkou_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "▶ Recréation de la base « $TEST_DB »"
psql -q -c "drop database if exists $TEST_DB;" postgres
psql -q -c "create database $TEST_DB;" postgres

echo "▶ Stubs Supabase (auth, storage, rôles)"
psql -q -v ON_ERROR_STOP=1 -d "$TEST_DB" -f "$ROOT/supabase/tests/00_supabase_stubs.sql"

echo "▶ Migrations"
for file in "$ROOT"/supabase/migrations/*.sql; do
  printf '   %s\n' "$(basename "$file")"
  psql -q -v ON_ERROR_STOP=1 -d "$TEST_DB" -f "$file"
done

echo "▶ Tests"
for file in "$ROOT"/supabase/tests/[0-9][1-9]_*.sql; do
  printf '   %s\n' "$(basename "$file")"
  psql -q -v ON_ERROR_STOP=1 -d "$TEST_DB" -f "$file"
done

echo "✔ Terminé"
