#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JQ="$SCRIPT_DIR/jq.exe"

HOST=localhost
PORT=8443
PRODUCT_ID=1
BASE="https://$HOST:$PORT"
HEALTH="$BASE/product-composite/actuator/health"

function assertCurl() {
  local expectedHttpCode=$1
  local curlCmd="$2 -w \"%{http_code}\""
  local result=$(eval "$curlCmd")
  local httpCode="${result:(-3)}"
  RESPONSE='' && (( ${#result} > 3 )) && RESPONSE="${result%???}"
  if [ "$httpCode" = "$expectedHttpCode" ]; then
    echo "Test OK (HTTP: $httpCode)"
  else
    echo "Test FAILED, expected HTTP: $expectedHttpCode, got: $httpCode"
    echo "Response: $RESPONSE"
    exit 1
  fi
}

function assertEqual() {
  local expected=$1
  local actual=$2
  if [ "$actual" = "$expected" ]; then
    echo "Test OK (value: $actual)"
  else
    echo "Test FAILED, expected: $expected, got: $actual"
    exit 1
  fi
}

function getCBState() {
  curl -k -s $HEALTH | $JQ -r '.components.circuitBreakers.details.product.details.state' | tr -d '\r'
}

echo ""
echo "==== Pre-check: Reset circuit breaker to CLOSED ===="
for attempt in {1..5}; do
  CB_STATE=$(getCBState)
  if [ "$CB_STATE" = "CLOSED" ]; then
    echo "  CB is CLOSED, ready to test"
    break
  fi
  echo "  CB is $CB_STATE, sending requests to reset..."
  for i in {1..3}; do
    curl -k -s "$BASE/product-composite/$PRODUCT_ID" > /dev/null
  done
  sleep 3
done

echo ""
echo "==== Setup: Create test product ===="
assertCurl 200 "curl -k -s -X POST $BASE/product-composite \
  -H 'Content-Type: application/json' \
  -d '{\"productId\":$PRODUCT_ID,\"name\":\"product name $PRODUCT_ID\",\"weight\":1}'"

echo ""
echo "==== Test 1: Normal request ===="
assertCurl 200 "curl -k -s $BASE/product-composite/$PRODUCT_ID"

echo ""
echo "==== Verify circuit breaker is CLOSED ===="
assertEqual "CLOSED" "$(getCBState)"

echo ""
echo "==== Test 2: Send requests with faultPercent=100 to open circuit breaker ===="
echo "(Retry amplifies failures so CB may open before all 5 requests complete)"
for i in {1..5}; do
  echo -n "  Request $i: "
  httpCode=$(curl -k -s -o /dev/null -w "%{http_code}" "$BASE/product-composite/$PRODUCT_ID?faultPercent=100")
  echo "HTTP: $httpCode"
  if [ "$httpCode" = "200" ]; then
    echo "  (CB opened early - fallback returned, this is expected)"
    break
  fi
done

echo ""
echo "==== Verify circuit breaker is OPEN ===="
assertEqual "OPEN" "$(getCBState)"

echo ""
echo "==== Test 3: Request while CB is OPEN should return fallback ===="
assertCurl 200 "curl -k -s $BASE/product-composite/$PRODUCT_ID"
assertEqual "Fallback product$PRODUCT_ID" "$(echo $RESPONSE | $JQ -r '.name' | tr -d '\r')"
echo "  Fallback name: $(echo $RESPONSE | $JQ -r '.name' | tr -d '\r')"

echo ""
echo "==== Test 4: Trigger timeout (delay=3s > 2s time limiter) ===="
echo "(CB still OPEN so this also returns fallback immediately)"
assertCurl 200 "curl -k -s $BASE/product-composite/$PRODUCT_ID?delay=3"
echo "  Response: $(echo $RESPONSE | $JQ -r '.name' | tr -d '\r')"

echo ""
echo "==== Test 5: Wait 10s for CB to transition to HALF_OPEN ===="
echo -n "  Waiting"
for i in {1..10}; do echo -n "."; sleep 1; done
echo ""

echo ""
echo "==== Test 6: Send 3 normal requests in HALF_OPEN state ===="
echo "(permittedNumberOfCallsInHalfOpenState=3 → all pass → CB closes)"
for i in {1..3}; do
  echo -n "  Request $i: "
  assertCurl 200 "curl -k -s $BASE/product-composite/$PRODUCT_ID"
done

echo ""
echo "==== Verify circuit breaker is CLOSED again ===="
assertEqual "CLOSED" "$(getCBState)"

echo ""
echo "==== Cleanup: Delete test product ===="
assertCurl 200 "curl -k -s -X DELETE $BASE/product-composite/$PRODUCT_ID"

echo ""
echo "==== All circuit breaker tests passed! ===="
