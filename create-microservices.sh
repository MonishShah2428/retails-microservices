#!/usr/bin/env bash
set -e

BASE_URL="https://start.spring.io/starter.zip"
BOOT_VERSION="4.0.6"
JAVA_VERSION="21"

mkdir -p microservices
cd microservices

generate() {
  local name=$1
  local package=$2
  local group=$3

  echo "Generating $name..."
  curl -s "$BASE_URL" \
    -d "bootVersion=${BOOT_VERSION}" \
    -d "type=gradle-project" \
    -d "javaVersion=${JAVA_VERSION}" \
    -d "packaging=jar" \
    -d "name=${name}" \
    -d "packageName=${package}" \
    -d "groupId=${group}" \
    -d "dependencies=actuator,webflux" \
    -d "version=1.0.0-SNAPSHOT" \
    -o "${name}.zip"

  unzip -q "${name}.zip" -d "${name}"
  rm "${name}.zip"
  echo "Done: microservices/${name}"
}

generate "product-service"            "se.magnus.microservices.core.product"     "se.magnus.microservices.core.product"
generate "review-service"             "se.magnus.microservices.core.review"      "se.magnus.microservices.core.review"
generate "recommendation-service"     "se.magnus.microservices.core.recommendation" "se.magnus.microservices.core.recommendation"
generate "product-composite-service"  "se.magnus.microservices.composite.product" "se.magnus.microservices.composite.product"

cd ..
echo "All microservices generated in ./microservices/"
