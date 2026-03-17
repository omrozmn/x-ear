#!/bin/bash
declare -A CAT_PASSED
declare -A CAT_FAILED

CAT_PASSED["ADMIN"]=5
CAT_PASSED["TENANT"]=10
CAT_FAILED["ADMIN"]=2

echo "Keys: ${!CAT_PASSED[@]}"
for cat in "${!CAT_PASSED[@]}"; do
    echo "$cat: ${CAT_PASSED[$cat]} pass, ${CAT_FAILED[$cat]:-0} fail"
done
