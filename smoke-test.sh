#!/bin/bash
set -e
BASE="http://localhost:4000"

echo "→ Registering test user"
TOKEN=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"email":"smoketest@example.com","password":"password123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "  Got token: ${TOKEN:0:20}..."

echo "→ Uploading a test PDF"
DOC_ID=$(curl -s -X POST $BASE/documents -H "Authorization: Bearer $TOKEN" \
  -F "file=@./smoke-test.pdf" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "  Document id: $DOC_ID"

echo "→ Creating a chat"
CHAT_ID=$(curl -s -X POST $BASE/chats -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"document_id\":\"$DOC_ID\",\"title\":\"Smoke test\"}" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "  Chat id: $CHAT_ID"

echo "→ Sending a message (streamed)"
curl -s -N -X POST $BASE/chats/$CHAT_ID/messages -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"What is this document about?"}'

echo -e "\n✅ Smoke test complete"
