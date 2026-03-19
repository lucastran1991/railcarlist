#!/bin/bash
# Test all backend APIs. Start server first, or use ./start.sh (backend port from config.json).
# BASE_URL overrides; otherwise uses config.json server.port (default 8888).
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$PROJECT_ROOT/config.json}"
if [ -n "$BASE_URL" ]; then
  BASE="$BASE_URL"
elif [ -f "$CONFIG_FILE" ]; then
  if command -v jq &> /dev/null; then
    BACKEND_PORT=$(jq -r '.server.port // "8888"' "$CONFIG_FILE")
  elif command -v python3 &> /dev/null; then
    BACKEND_PORT=$(python3 -c "import json; f=open('$CONFIG_FILE'); d=json.load(f); print(d.get('server', {}).get('port', '8888'))" 2>/dev/null || echo "8888")
  else
    BACKEND_PORT="8888"
  fi
  BASE="http://localhost:$BACKEND_PORT"
else
  BASE="http://localhost:8888"
fi
echo "Testing APIs at $BASE"

# Health
echo -n "GET /health ... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
[ "$code" = "200" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Config
echo -n "GET /api/config ... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/config")
[ "$code" = "200" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Railcars: list (empty)
echo -n "GET /api/railcars ... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/railcars")
[ "$code" = "200" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Railcars: create
echo -n "POST /api/railcars ... "
res=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/railcars" -H "Content-Type: application/json" -d '{"name":"RC-TEST","startTime":"2025-12-01T08:00:00Z","endTime":"2025-12-01T18:00:00Z","spot":"SPOT8","product":"ASPHALT"}')
code=$(echo "$res" | tail -1)
body=$(echo "$res" | sed '$d')
[ "$code" = "201" ] && echo "OK ($code)" || { echo "FAIL ($code) $body"; exit 1; }
ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  created id=$ID"

# Railcars: get by id
echo -n "GET /api/railcars/$ID ... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/railcars/$ID")
[ "$code" = "200" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Railcars: list (one)
echo -n "GET /api/railcars (with data) ... "
count=$(curl -s "$BASE/api/railcars" | grep -o '"id"' | wc -l)
[ "$count" -ge 1 ] && echo "OK (count=$count)" || { echo "FAIL"; exit 1; }

# Railcars: update
echo -n "PUT /api/railcars/$ID ... "
code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/api/railcars/$ID" -H "Content-Type: application/json" -d '{"name":"RC-TEST-UPDATED"}')
[ "$code" = "200" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Railcars: delete
echo -n "DELETE /api/railcars/$ID ... "
code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/railcars/$ID")
[ "$code" = "204" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Railcars: get 404
echo -n "GET /api/railcars/$ID (expect 404) ... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/railcars/$ID")
[ "$code" = "404" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Tags
echo -n "GET /api/tags/names ... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tags/names")
[ "$code" = "200" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

echo -n "GET /api/tags ... "
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tags")
[ "$code" = "200" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Standard import (minimal XLSX would need to be created; skip or use a tiny test)
echo -n "POST /api/railcars/import (no file = 400) ... "
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/railcars/import")
[ "$code" = "400" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Savana import (no file = 400)
echo -n "POST /api/railcars/import/savana (no file = 400) ... "
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/railcars/import/savana")
[ "$code" = "400" ] && echo "OK ($code)" || { echo "FAIL ($code)"; exit 1; }

# Savana import with file (use real Savana file if present)
if [ -f "Savana/2026/APRIL 2026.xlsx" ]; then
  echo -n "POST /api/railcars/import/savana (APRIL 2026.xlsx) ... "
  res=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/railcars/import/savana" -F "file=@Savana/2026/APRIL 2026.xlsx" -F "filename=APRIL 2026.xlsx")
  code=$(echo "$res" | tail -1)
  body=$(echo "$res" | sed '$d')
  [ "$code" = "200" ] && echo "OK ($code) $body" || { echo "FAIL ($code) $body"; exit 1; }
fi

echo "All API tests passed."
