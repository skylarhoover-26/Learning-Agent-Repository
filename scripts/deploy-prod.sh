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

echo "Deploying $PROJECT_NAME to production..."
npx vercel --prod

echo ""
echo "Verifying $EXPECTED_ALIAS is still serving learning-agent..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$EXPECTED_ALIAS")
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "307" ]]; then
  echo "Verification passed (HTTP $HTTP_STATUS)."
else
  echo "WARNING: Got HTTP $HTTP_STATUS from $EXPECTED_ALIAS. Check manually."
fi
