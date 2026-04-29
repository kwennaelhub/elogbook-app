#!/usr/bin/env bash
# test-rls-profiles.sh — Validation de la migration 00000000000006
#
# Rejoue l'exploit d'exfiltration PII depuis un compte student test
# et vérifie que la policy scopée limite le nombre de profils visibles.
#
# AVANT migration : un student lit 8 profils PII (faille active).
# APRÈS migration : un student lit uniquement les profils de son hôpital
#                   + son propre profil + ses superviseurs assignés.
#
# Usage : ./scripts/test-rls-profiles.sh
# Requiert .env.local avec NEXT_PUBLIC_SUPABASE_URL,
# NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "❌ .env.local introuvable"
  exit 1
fi
export $(grep -E "^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=" .env.local | xargs)

TEST_EMAIL="rls.audit@elogbook.bj"
TEST_PASSWORD="AuditRLS2026!"

echo "=== Login compte student test ==="
TOKEN=$(curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('access_token',''))")

if [ -z "$TOKEN" ]; then
  echo "❌ Login échoué — compte test absent ou désactivé"
  exit 1
fi
echo "   JWT: ${TOKEN:0:40}..."

echo ""
echo "=== Query REST depuis le compte student ==="
RESULT=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles?select=email,role,home_hospital_id" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN")

COUNT=$(echo "$RESULT" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "   Profils visibles : $COUNT"
echo "$RESULT" | python3 -m json.tool

echo ""
echo "=== Verdict ==="
# Le compte test n'a pas de home_hospital_id → il ne devrait voir QUE lui-même.
# Si >1 profil visible, la policy laisse fuiter quelque chose.
if [ "$COUNT" -le 1 ]; then
  echo "✅ PASS — policy scopée active ($COUNT profil ≤ 1 attendu pour compte sans hôpital)"
  exit 0
else
  echo "❌ FAIL — policy trop permissive ($COUNT profils visibles, 1 attendu)"
  echo "   Rappel : rls.audit a home_hospital_id=NULL donc ne devrait voir que lui-même."
  exit 1
fi
