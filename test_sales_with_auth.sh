#!/bin/bash

# Get token from browser localStorage
# Open browser console and run: localStorage.getItem('token')
# Then paste it here

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWQ1NjUxZWEiLCJlbWFpbCI6InRlc3RlckB4ZWFyLmNvbSIsInJvbGUiOiJ0ZW5hbnRfYWRtaW4iLCJ0ZW5hbnRfaWQiOiI5NTYyNTU4OS1hNGFkLTQxZmYtYTk5ZS00OTU1OTQzYmI0MjEiLCJleHAiOjk5OTk5OTk5OTl9.fake"

echo "Testing /api/parties/pat_01464a2b/sales"
echo "=========================================="

curl -s "http://localhost:5003/api/parties/pat_01464a2b/sales" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data[0].devices[0] | {barcode, serialNumber, brand, model, name}'

