#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="learning-agent"
EXPECTED_ALIAS="learning-agent-pearl.vercel.app"

# Verify we're in the right project directory
if [[ ! -f .vercel/project.json ]]; then
  echo "ERROR: No .vercel/project.json found. Run from the learning-agent root."
  exit 1
fi

LINKED_PROJECT=$(grep -o '"projectName":"[^"]*"' .vercel/project.json | cut -d'"' -f4)
if [[ "$LINKED_PROJECT" != "$PROJECT_NAME" ]]; then
  echo "ERROR: This directory is linked to '$LINKED_PROJECT', not '$PROJECT_NAME'."
  echo "You may be in the wrong directory. Aborting."
  exit 1
fi

# Capture the deployment the alias currently serves, so we can auto-roll-back to
# a known-good build if the new one comes up unhealthy (e.g. a bad Edge middleware
# artifact that 500s the whole site — see the middleware-500 incident).
echo "Capturing current good deployment (rollback target)..."
ROLLBACK_TARGET=$(npx vercel inspect "$EXPECTED_ALIAS" 2>&1 \
  | grep -oE 'https://learning-agent-[a-z0-9]+-housecallpro-infosys\.vercel\.app' \
  | head -1 || true)
echo "Rollback target: ${ROLLBACK_TARGET:-<none found>}"

echo ""
echo "Deploying $PROJECT_NAME to production..."
npx vercel --prod

# Verify on the ALIAS (not the deployment URL — that one shows Vercel deployment
# protection, which masks real app health). Healthy = any 2xx/3xx (302 -> Okta
# sign-in is the normal signed-out response). Retry a few times to ride out
# propagation before deciding it's actually broken.
echo ""
echo "Verifying https://$EXPECTED_ALIAS ..."
STATUS=000
for i in 1 2 3 4 5; do
  sleep 3
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$EXPECTED_ALIAS" || echo 000)
  echo "  attempt $i: HTTP $STATUS"
  case "$STATUS" in
    2*|3*)
      echo "Verification passed (HTTP $STATUS). Production is healthy."
      exit 0
      ;;
  esac
done

echo ""
echo "ERROR: $EXPECTED_ALIAS returned HTTP $STATUS after deploy — the new build is unhealthy."
if [[ -n "$ROLLBACK_TARGET" ]]; then
  echo "Auto-rolling back to $ROLLBACK_TARGET ..."
  npx vercel rollback "$ROLLBACK_TARGET"
  echo "Rollback done. Re-verifying:"
  for i in 1 2 3; do
    sleep 3
    RB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$EXPECTED_ALIAS" || echo 000)
    echo "  attempt $i: HTTP $RB_STATUS"
    case "$RB_STATUS" in
      2*|3*) echo "Rollback verified (HTTP $RB_STATUS). Production restored."; break ;;
    esac
  done
else
  echo "No rollback target captured — roll back manually: npx vercel rollback <last-good-url>"
fi
exit 1
