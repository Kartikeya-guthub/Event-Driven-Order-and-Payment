#!/bin/bash

# Exit on any error
set -e

# Configuration
API_URL="http://localhost:3000"

# Main action
echo "Creating order..."

curl -i -X POST "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user1","amount":100}'

echo ""
echo "Done"