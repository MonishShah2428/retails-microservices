#!/usr/bin/env pwsh
# Helm chart validation tests for retail-microservices

$helmRoot = $PSScriptRoot
$pass = 0
$fail = 0
$errors = @()

function Assert-Contains {
    param([string]$description, [string]$content, [string]$pattern)
    if ($content -match [regex]::Escape($pattern)) {
        Write-Host "  [PASS] $description" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $description" -ForegroundColor Red
        Write-Host "         expected to find: $pattern" -ForegroundColor DarkRed
        $script:fail++
        $script:errors += $description
    }
}

function Assert-NotContains {
    param([string]$description, [string]$content, [string]$pattern)
    if (-not ($content -match [regex]::Escape($pattern))) {
        Write-Host "  [PASS] $description" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $description" -ForegroundColor Red
        Write-Host "         expected NOT to find: $pattern" -ForegroundColor DarkRed
        $script:fail++
        $script:errors += $description
    }
}

function Assert-ExitZero {
    param([string]$description, [int]$exitCode)
    if ($exitCode -eq 0) {
        Write-Host "  [PASS] $description" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] $description (exit code: $exitCode)" -ForegroundColor Red
        $script:fail++
        $script:errors += $description
    }
}

# ─────────────────────────────────────────────────────────
Write-Host "`n=== 1. helm lint: common library chart ===" -ForegroundColor Cyan
$out = helm lint "$helmRoot\common" 2>&1 | Out-String
Assert-ExitZero "common chart lints without error" $LASTEXITCODE

# ─────────────────────────────────────────────────────────
Write-Host "`n=== 2. helm lint: all component charts ===" -ForegroundColor Cyan
$components = @("mongodb","mysql","rabbitmq","zipkin-server","config-server","gateway","product","recommendation","review","product-composite")
foreach ($c in $components) {
    $out = helm lint "$helmRoot\components\$c" 2>&1 | Out-String
    Assert-ExitZero "component '$c' lints without error" $LASTEXITCODE
}

# ─────────────────────────────────────────────────────────
Write-Host "`n=== 3. helm lint: environment charts ===" -ForegroundColor Cyan
$out = helm lint "$helmRoot\environments\dev-env" 2>&1 | Out-String
Assert-ExitZero "dev-env lints without error" $LASTEXITCODE

$out = helm lint "$helmRoot\environments\prod-env" 2>&1 | Out-String
Assert-ExitZero "prod-env lints without error" $LASTEXITCODE

# ─────────────────────────────────────────────────────────
Write-Host "`n=== 4. dev-env template rendering ===" -ForegroundColor Cyan
$devTpl = helm template hands-on "$helmRoot\environments\dev-env" 2>&1 | Out-String
Assert-ExitZero "dev-env renders without error" $LASTEXITCODE

# Service names — must match hardcoded URLs in ProductCompositeIntegration.java
Assert-Contains "Service 'config' exists (matches spring.cloud.config.uri)"        $devTpl "name: config"
Assert-Contains "Service 'product' exists (matches http://product/ in integration)" $devTpl "name: product"
Assert-Contains "Service 'recommendation' exists"                                   $devTpl "name: recommendation"
Assert-Contains "Service 'review' exists"                                           $devTpl "name: review"
Assert-Contains "Service 'product-composite' exists"                               $devTpl "name: product-composite"
Assert-Contains "Service 'mongodb' exists"                                          $devTpl "name: mongodb"
Assert-Contains "Service 'mysql' exists"                                            $devTpl "name: mysql"
Assert-Contains "Service 'rabbitmq' exists"                                         $devTpl "name: rabbitmq"
Assert-Contains "Service 'zipkin' exists (matches http://zipkin: in config-repo)"  $devTpl "name: zipkin"

# Gateway is NodePort on 30443
Assert-Contains "Gateway service type is NodePort"   $devTpl "type: NodePort"
Assert-Contains "Gateway NodePort is 30443"          $devTpl "nodePort: 30443"

# Spring profiles
Assert-Contains "Config-server uses docker,native profile"  $devTpl "value: docker,native"
Assert-Contains "Microservices use docker profile"          $devTpl "value: docker"

# Secrets created by umbrella chart
Assert-Contains "Secret 'config-server-secrets' exists"      $devTpl "name: config-server-secrets"
Assert-Contains "Secret 'config-client-credentials' exists"  $devTpl "name: config-client-credentials"
Assert-Contains "ENCRYPT_KEY in config-server-secrets"       $devTpl "ENCRYPT_KEY:"
Assert-Contains "CONFIG_SERVER_USR in client credentials"    $devTpl "CONFIG_SERVER_USR:"
Assert-Contains "CONFIG_SERVER_PWD in client credentials"    $devTpl "CONFIG_SERVER_PWD:"

# envFrom wiring — app services load credentials from secret
Assert-Contains "App services use envFrom with config-client-credentials" $devTpl "name: config-client-credentials"

# ConfigMap holds all 7 config-repo files
Assert-Contains "ConfigMap contains application.yml"              $devTpl "application.yml:"
Assert-Contains "ConfigMap contains gateway.yml"                  $devTpl "gateway.yml:"
Assert-Contains "ConfigMap contains product-service.yml"          $devTpl "product-service.yml:"
Assert-Contains "ConfigMap contains recommendation-service.yml"   $devTpl "recommendation-service.yml:"
Assert-Contains "ConfigMap contains review-service.yml"           $devTpl "review-service.yml:"
Assert-Contains "ConfigMap contains product-composite-service.yml" $devTpl "product-composite-service.yml:"

# ConfigMap is mounted at /config-repo in config-server pod
Assert-Contains "ConfigMap mounted at /config-repo"  $devTpl "mountPath: /config-repo"

# Infrastructure images
Assert-Contains "MongoDB image is mongo:8"         $devTpl "mongo:8"
Assert-Contains "MySQL image is mysql:8.4"         $devTpl "mysql:8.4"
Assert-Contains "RabbitMQ image is management tag" $devTpl "rabbitmq:management"

# Microservice images use hands-on repository
Assert-Contains "Product image uses hands-on repo"             $devTpl "hands-on/product-service:"
Assert-Contains "Recommendation image uses hands-on repo"      $devTpl "hands-on/recommendation-service:"
Assert-Contains "Review image uses hands-on repo"              $devTpl "hands-on/review-service:"
Assert-Contains "Product-composite image uses hands-on repo"   $devTpl "hands-on/product-composite-service:"
Assert-Contains "Config-server image uses hands-on repo"       $devTpl "hands-on/config-server:"
Assert-Contains "Gateway image uses hands-on repo"             $devTpl "hands-on/gateway:"

# Health probes on microservices
Assert-Contains "Liveness probe path is /actuator/health/liveness"   $devTpl "/actuator/health/liveness"
Assert-Contains "Readiness probe path is /actuator/health/readiness" $devTpl "/actuator/health/readiness"
Assert-Contains "Gateway probes use HTTPS scheme"                    $devTpl "scheme: HTTPS"

# ─────────────────────────────────────────────────────────
Write-Host "`n=== 5. prod-env template rendering ===" -ForegroundColor Cyan
$prodTpl = helm template hands-on "$helmRoot\environments\prod-env" 2>&1 | Out-String
Assert-ExitZero "prod-env renders without error" $LASTEXITCODE

# prod-env must NOT include databases (external in production)
Assert-NotContains "prod-env has no MongoDB deployment"   $prodTpl "name: mongodb"
Assert-NotContains "prod-env has no MySQL deployment"     $prodTpl "name: mysql"
Assert-NotContains "prod-env has no RabbitMQ deployment"  $prodTpl "name: rabbitmq"

# prod-env uses v1 image tags
Assert-Contains "prod-env uses v1 image tag" $prodTpl ":v1"

# prod-env has resource requests (not just limits)
Assert-Contains "prod-env sets memory requests" $prodTpl "requests:"

# prod-env uses prod Spring profile for microservices
Assert-Contains "prod-env microservices use docker,prod profile" $prodTpl "value: docker,prod"

# prod-env still has secrets
Assert-Contains "prod-env has config-server-secrets"     $prodTpl "name: config-server-secrets"
Assert-Contains "prod-env has config-client-credentials" $prodTpl "name: config-client-credentials"

# ─────────────────────────────────────────────────────────
Write-Host "`n=== 6. config-repo files in chart directory ===" -ForegroundColor Cyan
$configRepoPath = "$helmRoot\components\config-server\config-repo"
$requiredFiles = @("application.yml","gateway.yml","product-service.yml","recommendation-service.yml","review-service.yml","product-composite-service.yml")
foreach ($f in $requiredFiles) {
    $exists = Test-Path (Join-Path $configRepoPath $f)
    if ($exists) {
        Write-Host "  [PASS] config-repo/$f exists in chart" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  [FAIL] config-repo/$f missing from chart directory" -ForegroundColor Red
        $script:fail++
        $script:errors += "config-repo/$f missing"
    }
}

# ─────────────────────────────────────────────────────────
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
if ($errors.Count -gt 0) {
    Write-Host "Failed tests:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
Write-Host "========================================`n" -ForegroundColor Cyan

exit $fail
