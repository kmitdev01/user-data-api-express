#!/bin/bash
BASE_URL="http://localhost:3001"

get_ts() {
  python3 -c 'import time; print(int(time.time() * 1000))'
}

echo "=== Backend Validation Suite ==="

# 1. Clear Cache
echo -n "[1] Clearing Cache... "
curl -s -X DELETE "$BASE_URL/users/cache"
echo "Done"

echo "    (Waiting 11s to clear burst window...)"
sleep 11

# 2. Measure Cache vs DB Latency (User 1 - Exists)
echo "[2] Latency Test (User 1)"
start_time=$(get_ts)
curl -s -o /dev/null "$BASE_URL/users/1"
end_time=$(get_ts)
miss_time=$((end_time - start_time))
echo "    Cache MISS (DB Fetch): ${miss_time}ms (Expected >200ms)"

start_time=$(get_ts)
curl -s -o /dev/null "$BASE_URL/users/1"
end_time=$(get_ts)
hit_time=$((end_time - start_time))
echo "    Cache HIT:            ${hit_time}ms (Expected <20ms)"

echo "    (Waiting 11s to clear burst window...)"
sleep 11

# 3. Simulate High Traffic (Concurrent)
echo "[3] Coalescing Test (3 concurrent requests to User 2)"
# Fire 3 requests in parallel to User 2
pids=""
for i in {1..3}; do
  curl -s -o /dev/null "$BASE_URL/users/2" &
  pids="$pids $!"
done
wait $pids
echo "    Finished 3 concurrent requests."
# Check cache status - Hit count should be 0 because all 3 coalesced into 1 fetch
# But subsequent request should hit
curl -s "$BASE_URL/users/cache-status"

echo -e "\n    (Waiting 11s to clear burst window...)"
sleep 11

# 4. Verify Rate Limiting
echo -e "\n[4] Rate Limit Stress Test (Triggering 429)"
success_count=0
fail_count=0
echo "    Sending 12 requests (rapidly)..."
for i in {1..12}; do
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/users/3")
  if [ "$http_code" == "200" ]; then
    ((success_count++))
  elif [ "$http_code" == "429" ]; then
    ((fail_count++))
  fi
done
echo "    Success (200): $success_count (Expected ~5)"
echo "    Blocked (429): $fail_count (Expected ~7)"

echo -e "\n=== Validation Complete ==="
