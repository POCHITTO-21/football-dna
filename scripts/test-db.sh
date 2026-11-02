#!/usr/bin/env bash
# ローカルの PostgreSQL でマイグレーションと RLS テストを実行する（Supabase 不要）。
# 使い方: DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/test-db.sh
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL を指定してください}"
DB="fdna_test_$$"
psql "$DATABASE_URL" -qc "create database $DB" >/dev/null
trap 'psql "$DATABASE_URL" -qc "drop database if exists $DB" >/dev/null' EXIT
URL="$(printf %s "$DATABASE_URL" | sed -E "s#(postgres(ql)?://[^/]*/)[^?]*#\1$DB#")"
psql "$URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/00_stub_supabase.sql
for f in supabase/migrations/*.sql; do psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
psql "$URL" -q -v ON_ERROR_STOP=1 -f supabase/seed.sql
for f in supabase/tests/[1-9]*.sql; do psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
