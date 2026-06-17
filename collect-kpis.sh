#!/bin/bash
set -e

echo "================================================================"
echo "  RETAIL MICROSERVICES — PERFORMANCE KPI COLLECTION"
echo "================================================================"
echo ""

# ── 1. Install wrk ────────────────────────────────────────────────
echo "[1/7] Checking wrk..."
if ! command -v wrk &>/dev/null; then
  sudo apt-get update -y -q && sudo apt-get install -y -q wrk
fi
echo "wrk ready."
echo ""

# ── 2. Seed data ──────────────────────────────────────────────────
echo "[2/7] Seeding 5 products with recommendations and reviews..."
for i in 1 2 3 4 5; do
  curl -sk -o /dev/null -X POST https://localhost:8443/product-composite \
    -H "Content-Type: application/json" \
    -d "{
      \"productId\":$i,
      \"name\":\"Product $i\",
      \"weight\":$((i * 10)),
      \"recommendations\":[
        {\"recommendationId\":1,\"author\":\"Author A\",\"rate\":5,\"content\":\"Great product\"},
        {\"recommendationId\":2,\"author\":\"Author B\",\"rate\":4,\"content\":\"Good value\"}
      ],
      \"reviews\":[
        {\"reviewId\":1,\"author\":\"Reviewer A\",\"subject\":\"Quality\",\"content\":\"Excellent\"},
        {\"reviewId\":2,\"author\":\"Reviewer B\",\"subject\":\"Value\",\"content\":\"Would buy again\"}
      ]
    }"
  echo "  Seeded product $i"
done

echo "Waiting 6s for async consumers to process events..."
sleep 6
echo ""

# ── 3. Load test ──────────────────────────────────────────────────
echo "[3/7] Running 30-second load test (4 threads, 10 connections)..."
echo "Target: https://localhost:8443/product-composite/1"
echo ""
echo "─────────────────────────────────"
echo "KPI #1 — Throughput & Latency"
echo "─────────────────────────────────"
wrk -t4 -c10 -d30s --timeout 10s https://localhost:8443/product-composite/1
echo ""

# ── 4. JVM + Resilience4j metrics via docker exec ─────────────────
echo "[4/7] Collecting JVM and Resilience4j metrics..."
echo ""

SERVICES=(
  "retail-microservices-product-composite-1:product-composite"
  "retail-microservices-product-1:product"
  "retail-microservices-recommendation-1:recommendation"
  "retail-microservices-review-1:review"
)

echo "─────────────────────────────────"
echo "KPI #5 — JVM Heap Used (MB)"
echo "─────────────────────────────────"
for entry in "${SERVICES[@]}"; do
  CONTAINER="${entry%%:*}"
  NAME="${entry##*:}"
  HEAP=$(docker exec "$CONTAINER" curl -s "http://localhost:8080/actuator/metrics/jvm.memory.used?tag=area:heap" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d['measurements'][0]['value']/1048576,1))" 2>/dev/null || echo "N/A")
  echo "  $NAME: ${HEAP} MB"
done
echo ""

echo "─────────────────────────────────"
echo "KPI #6 — GC Pause Time (ms, max)"
echo "─────────────────────────────────"
for entry in "${SERVICES[@]}"; do
  CONTAINER="${entry%%:*}"
  NAME="${entry##*:}"
  GC=$(docker exec "$CONTAINER" curl -s "http://localhost:8080/actuator/metrics/jvm.gc.pause" 2>/dev/null \
    | python3 -c "
import sys,json
d=json.load(sys.stdin)
measurements = {m['statistic']: m['value'] for m in d['measurements']}
print(round(measurements.get('MAX', 0)*1000, 2))
" 2>/dev/null || echo "N/A")
  echo "  $NAME: ${GC} ms (max)"
done
echo ""

echo "─────────────────────────────────"
echo "KPI #7 — Live Thread Count"
echo "─────────────────────────────────"
for entry in "${SERVICES[@]}"; do
  CONTAINER="${entry%%:*}"
  NAME="${entry##*:}"
  THREADS=$(docker exec "$CONTAINER" curl -s "http://localhost:8080/actuator/metrics/jvm.threads.live" 2>/dev/null \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['measurements'][0]['value']))" 2>/dev/null || echo "N/A")
  echo "  $NAME: $THREADS threads"
done
echo ""

echo "─────────────────────────────────"
echo "KPI #8 — Circuit Breaker Success Ratio"
echo "─────────────────────────────────"
CB=$(docker exec retail-microservices-product-composite-1 curl -s \
  "http://localhost:8080/actuator/metrics/resilience4j.circuitbreaker.calls" 2>/dev/null \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
m = {(t['tag'] for t in entry['tags'] if t['tag']=='kind').__next__(): entry['value']
     for entry in d.get('measurements', []) if 'kind' in [t['tag'] for t in entry.get('tags',[])]}
ms = d.get('measurements', [])
total = sum(x['value'] for x in ms)
success = next((x['value'] for x in ms if 'successful' in str(x)), 0)
print(f'total={total:.0f}  (success ratio shown via /actuator/circuitbreakers)')
" 2>/dev/null || echo "N/A")
echo "  product circuit breaker: $CB"

CB_DETAIL=$(docker exec retail-microservices-product-composite-1 curl -s \
  "http://localhost:8080/actuator/circuitbreakers" 2>/dev/null \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
for name, data in d.get('circuitBreakers',{}).items():
    state = data.get('state','?')
    fr = data.get('failureRate','?')
    calls = data.get('numberOfSuccessfulCalls',0) + data.get('numberOfFailedCalls',0)
    print(f'  state={state}  failureRate={fr}  totalCalls={calls}')
" 2>/dev/null || echo "  (no calls yet)")
echo "$CB_DETAIL"
echo ""

echo "─────────────────────────────────"
echo "KPI #9 — Retry Rate"
echo "─────────────────────────────────"
RETRY=$(docker exec retail-microservices-product-composite-1 curl -s \
  "http://localhost:8080/actuator/metrics/resilience4j.retry.calls" 2>/dev/null \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
ms = d.get('measurements',[])
total = sum(x['value'] for x in ms)
print(f'total retry metric observations: {total:.0f}')
" 2>/dev/null || echo "N/A")
echo "  $RETRY"
echo ""

# ── 5. RabbitMQ metrics ───────────────────────────────────────────
echo "[5/7] Collecting RabbitMQ metrics..."
echo ""

echo "─────────────────────────────────"
echo "KPI #10 — Message Publish Rate (msg/s)"
echo "─────────────────────────────────"
curl -s -u guest:guest http://localhost:15672/api/overview 2>/dev/null \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
ms = d.get('message_stats',{})
pub_rate = ms.get('publish_details',{}).get('rate',0)
deliver_rate = ms.get('deliver_get_details',{}).get('rate',0)
total_pub = ms.get('publish',0)
total_del = ms.get('deliver_get',0)
print(f'  publish rate:  {pub_rate:.2f} msg/s  (total published: {total_pub})')
print(f'  deliver rate:  {deliver_rate:.2f} msg/s  (total delivered: {total_del})')
" 2>/dev/null || echo "  RabbitMQ not accessible on :15672"
echo ""

echo "─────────────────────────────────"
echo "KPI #11 — DLQ Depths"
echo "─────────────────────────────────"
curl -s -u guest:guest http://localhost:15672/api/queues 2>/dev/null \
  | python3 -c "
import sys,json
queues = json.load(sys.stdin)
dlqs = [q for q in queues if 'dlq' in q.get('name','').lower() or 'dead' in q.get('name','').lower()]
if not dlqs:
    print('  No DLQ entries found (or queues not yet created)')
for q in dlqs:
    print(f'  {q[\"name\"]}: {q.get(\"messages\",0)} messages')
" 2>/dev/null || echo "  RabbitMQ not accessible"

echo ""
echo "─────────────────────────────────"
echo "  All queues (depth snapshot)"
echo "─────────────────────────────────"
curl -s -u guest:guest http://localhost:15672/api/queues 2>/dev/null \
  | python3 -c "
import sys,json
queues = json.load(sys.stdin)
for q in sorted(queues, key=lambda x: x.get('name','')):
    print(f'  {q[\"name\"]:<50} messages={q.get(\"messages\",0)}')
" 2>/dev/null || echo "  (unavailable)"
echo ""

# ── 6. Zipkin traces ──────────────────────────────────────────────
echo "[6/7] Collecting Zipkin trace data..."
echo ""
echo "─────────────────────────────────"
echo "KPI #12 — Composite Aggregation Span (ms)"
echo "─────────────────────────────────"
curl -s "http://localhost:9411/api/v2/traces?serviceName=product-composite-service&limit=10" 2>/dev/null \
  | python3 -c "
import sys,json
traces = json.load(sys.stdin)
if not traces:
    print('  No traces found yet (try GETting /product-composite/1 first)')
    sys.exit()
durations = []
span_breakdown = {}
for trace in traces:
    for span in trace:
        svc = span.get('localEndpoint',{}).get('serviceName','?')
        dur_us = span.get('duration', 0)
        dur_ms = dur_us / 1000
        if svc not in span_breakdown:
            span_breakdown[svc] = []
        span_breakdown[svc].append(dur_ms)
        if svc == 'product-composite-service':
            # root span = total aggregation time
            if not span.get('parentId'):
                durations.append(dur_ms)

if durations:
    avg = sum(durations)/len(durations)
    p99 = sorted(durations)[int(len(durations)*0.99)] if len(durations)>1 else durations[0]
    print(f'  Composite GET avg: {avg:.1f} ms  p99: {p99:.1f} ms  (over {len(durations)} root spans)')

print()
print('  Avg span duration by service:')
for svc, durs in sorted(span_breakdown.items()):
    print(f'    {svc:<45} avg={sum(durs)/len(durs):.1f} ms  calls={len(durs)}')
" 2>/dev/null || echo "  Zipkin not accessible on :9411"
echo ""

# ── 7. Eureka instance count ──────────────────────────────────────
echo "[7/7] Collecting Eureka registry..."
echo ""
echo "─────────────────────────────────"
echo "KPI #13 — Registered Services"
echo "─────────────────────────────────"
curl -s -u eureka:password http://localhost:8761/eureka/apps 2>/dev/null \
  | python3 -c "
import sys,re
data = sys.stdin.read()
apps = re.findall(r'<application>(.*?)</application>', data, re.DOTALL)
print(f'  Registered applications: {len(apps)}')
for app in apps:
    name = re.search(r'<name>(.*?)</name>', app)
    status = re.search(r'<status>(.*?)</status>', app)
    port = re.search(r'<port[^>]*>(.*?)</port>', app)
    if name:
        print(f'    {name.group(1):<45} status={status.group(1) if status else \"?\":<5}')
" 2>/dev/null || echo "  Eureka not accessible on :8761"
echo ""

echo "================================================================"
echo "  KPI COLLECTION COMPLETE"
echo "================================================================"
