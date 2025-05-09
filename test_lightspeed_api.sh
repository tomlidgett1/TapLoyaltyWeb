#!/bin/bash
# Test script for the updated Lightspeed Sales API (V3 compatible)

# Add your credentials here
MERCHANT_ID="YOUR_MERCHANT_ID"
ACCOUNT_ID="YOUR_ACCOUNT_ID"  # Must be numeric

# Ensure the required credentials are set
if [ "$MERCHANT_ID" = "YOUR_MERCHANT_ID" ] || [ "$ACCOUNT_ID" = "YOUR_ACCOUNT_ID" ]; then
  echo "Error: Please edit this script to set your MERCHANT_ID and ACCOUNT_ID"
  exit 1
fi

# Base URL - update if needed
BASE_URL="http://localhost:3000"

echo "====================================================================="
echo "Lightspeed V3 API Test Script"
echo "====================================================================="
echo "This script tests the updated Lightspeed Sales API with V3 compatibility."
echo "The API now properly formats parameters like load_relations as JSON arrays"
echo "and uses cursor-based pagination for better performance."
echo "====================================================================="

# Test 1: Fetch 2 pages of sales
echo -e "\n====================================================================="
echo "TEST 1: Fetching 2 pages of recent sales"
echo "====================================================================="
curl "${BASE_URL}/api/lightspeed/sales?merchantId=${MERCHANT_ID}&accountId=${ACCOUNT_ID}&pages=2" | jq

# Test 2: Fetch sales with date filtering
echo -e "\n\n====================================================================="
echo "TEST 2: Fetching sales from the last 3 months"
echo "====================================================================="
# Calculate date 3 months ago
THREE_MONTHS_AGO=$(date -v-3m +%Y-%m-%d)
curl "${BASE_URL}/api/lightspeed/sales?merchantId=${MERCHANT_ID}&accountId=${ACCOUNT_ID}&pages=2&startDate=${THREE_MONTHS_AGO}" | jq

# Test 3: Test with both start and end date
echo -e "\n\n====================================================================="
echo "TEST 3: Fetching sales for a specific date range"
echo "====================================================================="
# Calculate date ranges
SIX_MONTHS_AGO=$(date -v-6m +%Y-%m-%d)
THREE_MONTHS_AGO=$(date -v-3m +%Y-%m-%d)
curl "${BASE_URL}/api/lightspeed/sales?merchantId=${MERCHANT_ID}&accountId=${ACCOUNT_ID}&pages=2&startDate=${SIX_MONTHS_AGO}&endDate=${THREE_MONTHS_AGO}" | jq

echo -e "\n\nTests completed. Sales data should be saved to Firestore automatically."
echo "If you encounter any issues, make sure your merchant has a valid Lightspeed integration."

# Usage instructions
echo -e "\n\nUsage instructions:"
echo "1. Edit this script to add your MERCHANT_ID and ACCOUNT_ID"
echo "2. Make the script executable: chmod +x test_lightspeed_api.sh"
echo "3. Run the script: ./test_lightspeed_api.sh"
echo "4. Ensure your localhost server is running"

echo -e "\nAPI Compatibility Notes:"
echo "- This API is compatible with Lightspeed Retail V3 API"
echo "- Uses cursor-based pagination instead of offset-based pagination"
echo "- Properly formats load_relations as a JSON encoded array"
echo "- For more details, see LIGHTSPEED_API_CHANGELOG.md and LIGHTSPEED_SALES_API_GUIDE.md" 