#!/usr/bin/env bash
set -e

KEY="${1:-$GEMINI_API_KEY}"
MODEL="${2:-gemini-1.5-flash}"

echo "========================================================="
echo "Testing Google Gemini API Key Connection"
echo "Model: $MODEL"
echo "========================================================="

if [ -z "$KEY" ] || [ "$KEY" = "mock-key" ]; then
  echo "⚠️ No GEMINI_API_KEY provided!"
  echo "Usage: ./scripts/test-gemini.sh YOUR_GEMINI_API_KEY"
  echo "Or: export GEMINI_API_KEY='your-key' && ./scripts/test-gemini.sh"
  exit 1
fi

echo "Sending test ping to Google Gemini REST API..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}s\n" \
  -X POST "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent?key=$KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [{"text": "Responda em uma única frase: Conexão com Google Gemini 1.5 estabelecida com sucesso!"}]
      }
    ]
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
TIME_TAKEN=$(echo "$RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d' | sed '/TIME_TOTAL:/d')

if [ "$HTTP_CODE" = "200" ]; then
  TEXT=$(echo "$BODY" | grep -o '"text": "[^"]*' | head -n 1 | cut -d'"' -f4)
  echo ""
  echo "✅ SUCCESS! Gemini API Key is ACTIVE and WORKING!"
  echo "⏱️ Response Latency: $TIME_TAKEN"
  echo "💬 Gemini Response: \"$TEXT\""
  echo "========================================================="
else
  echo ""
  echo "❌ ERROR: Google Gemini API rejected the request (HTTP $HTTP_CODE)"
  echo "Details: $BODY"
  echo "========================================================="
  exit 1
fi
