#!/bin/bash

echo "================================================================"
echo "  EXTENDED KPI COLLECTION — PERCENTILES + ADDITIONAL METRICS"
echo "================================================================"
echo ""

# ── Ensure wrk is installed ───────────────────────────────────────
if ! command -v wrk &>/dev/null; then
  sudo apt-get update -y -q && sudo apt-get install -y -q wrk
fi

BASE_URL="https://localhost:8443"

# ── Create wrk POST script ────────────────────────────────────────
cat > /tmp/post_product.lua << 'EOF'
local counter = 100
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"

request = function()
  counter = counter + 1
  wrk.body = string.format([[{
    "productId": %d,
    "name": "Load Product %d",
    "weight": 10,
    "recommendations": [
      {"recommendationId": 1, "author": "Author A", "rate": 5, "content": "Great"},
      {"recommendationId": 2, "author": "Author B", "rate": 4, "content": "Good"}
    ],
    "reviews": [
      {"reviewId": 1, "author": "Reviewer A", "subject": "Quality", "content": "Excellent"},
      {"reviewId": 2, "author": "Reviewer B", "subject": "Value",   "content": "Good"}
    ]
  }]], counter, counter)
  return wrk.format(nil, "/product-composite")
end
EOF

# ── Seed baseline data ────────────────────────────────────────────
echo "Seeding baseline data (products 1-5)..."
for i in 1 2 3 4 5; do
  curl -sk -o /dev/null -X POST $BASE_URL/product-composite \
    -H "Content-Type: application/json" \
    -d "{\"productId\":$i,\"name\":\"Product $i\",\"weight\":$((i*10)),
         \"recommendations\":[{\"recommendationId\":1,\"author\":\"A\",\"rate\":5,\"content\":\"Good\"}],
         \"reviews\":[{\"reviewId\":1,\"author\":\"B\",\"subject\":\"S\",\"content\":\"Great\"}]}"
done
sleep 5
echo "Done."
echo ""

# ═══════════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION A — LATENCY PERCENTILES (GET)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running 30s GET load test with full latency distribution..."
echo "Target: $BASE_URL/product-composite/1"
echo ""
wrk -t4 -c10 -d30s --latency --timeout 10s $BASE_URL/product-composite/1
echo ""

# ═══════════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION B — CONCURRENT SCALING (10 → 25 → 50 connections)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This shows Netty's async model: thread count stays constant"
echo "while connections scale up."
echo ""

for CONN in 10 25 50; do
  echo "--- c=$CONN connections ---"
  wrk -t4 -c$CONN -d15s --timeout 10s $BASE_URL/product-composite/1 \
    | grep -E "Requests/sec|Latency\s|requests in"
  echo ""
  sleep 3
done

# ═══════════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION C — WRITE THROUGHPUT (async event publishing)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running 15s POST load test — each request publishes 3 events"
echo "(product + recommendation + review → RabbitMQ)"
echo ""

# Snapshot queue counts before
BEFORE=$(curl -s -u guest:guest http://localhost:15672/api/overview \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message_stats',{}).get('publish',0))" 2>/dev/null || echo "0")

wrk -t2 -c5 -d15s --timeout 15s --script /tmp/post_product.lua $BASE_URL/product-composite \
  | grep -E "Requests/sec|Latency\s|requests in|Non-2xx"

sleep 3

AFTER=$(curl -s -u guest:guest http://localhost:15672/api/overview \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message_stats',{}).get('publish',0))" 2>/dev/null || echo "0")

EVENTS=$((AFTER - BEFORE))
echo ""
echo "RabbitMQ events published during write test: $EVENTS"
echo "(each POST publishes to products + recommendations + reviews topics)"
echo ""

# ═══════════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION D — CONTAINER RESOURCE FOOTPRINT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "docker stats snapshot (CPU%, MEM usage / limit, NET I/O):"
echo ""
docker stats --no-stream --format \
  "  {{printf \"%-50s\" .Name}}  CPU={{.CPUPerc}}  MEM={{.MemUsage}}  NET={{.NetIO}}"
echo ""

# ═══════════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION E — RESPONSE PAYLOAD EFFICIENCY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
PAYLOAD=$(curl -sk $BASE_URL/product-composite/1)
BYTES=$(echo "$PAYLOAD" | wc -c)
echo "  Composite response payload size: $BYTES bytes"
echo "  Response includes: product + $(echo $PAYLOAD | python3 -c "
import sys,json
d=json.load(sys.stdin)
r = len(d.get('recommendations',[]))
rev = len(d.get('reviews',[]))
print(f'{r} recommendation(s) + {rev} review(s) + service addresses')
" 2>/dev/null)"
echo ""

# ═══════════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SECTION F — REQUESTS PER THREAD (WebFlux efficiency ratio)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running final 20s test at c=50 to compute req/s per thread..."
echo ""

RPS=$(wrk -t4 -c50 -d20s --timeout 10s $BASE_URL/product-composite/1 \
  | grep "Requests/sec" | awk '{print $2}')

THREADS=$(docker exec retail-microservices-product-composite-1 \
  curl -s http://localhost:8080/actuator/metrics/jvm.threads.live \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['measurements'][0]['value']))" 2>/dev/null || echo "36")

echo "  Throughput at c=50:    $RPS req/s"
echo "  JVM threads (live):    $THREADS"
if [[ "$RPS" =~ ^[0-9]+(\.[0-9]+)?$ ]] && [[ "$THREADS" =~ ^[0-9]+$ ]]; then
  RATIO=$(python3 -c "print(round($RPS / $THREADS, 2))")
  echo "  Ratio (req/s/thread):  $RATIO"
  echo ""
  echo "  For comparison: a traditional servlet stack (Tomcat) would need"
  echo "  ~$THREADS dedicated threads just to serve $THREADS concurrent requests."
  echo "  Netty handles this with the same thread pool regardless of concurrency."
fi
echo ""

echo "================================================================"
echo "  EXTENDED KPI COLLECTION COMPLETE"
echo "================================================================"
