# HTTPS Setup for SnapTalker Development
# This script generates self-signed certificates for HTTPS access

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "    SnapTalker HTTPS Certificate Generator" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$certPath = "$PSScriptRoot\frontend\cert"

# Create cert directory if it doesn't exist
if (-not (Test-Path $certPath)) {
    New-Item -ItemType Directory -Path $certPath -Force | Out-Null
}

Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow

# Generate self-signed certificate using PowerShell
$cert = New-SelfSignedCertificate `
    -Subject "CN=localhost" `
    -DnsName "localhost", "127.0.0.1", "*.local" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -NotBefore (Get-Date) `
    -NotAfter (Get-Date).AddYears(1) `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -FriendlyName "SnapTalker Dev Certificate" `
    -KeyUsage DigitalSignature,KeyEncipherment `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

# Export certificate
$certPassword = ConvertTo-SecureString -String "snaptalker" -Force -AsPlainText
$pfxPath = "$certPath\cert.pfx"
$pemPath = "$certPath\cert.pem"
$keyPath = "$certPath\key.pem"

Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $pfxPath -Password $certPassword | Out-Null

Write-Host "Certificate generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Certificate location: $certPath" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: You need to install OpenSSL to convert the certificate" -ForegroundColor Yellow
Write-Host "   Or use the simpler mkcert tool (recommended)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Recommended: Install mkcert for easier HTTPS setup" -ForegroundColor Cyan
Write-Host "1. Install mkcert: choco install mkcert" -ForegroundColor White
Write-Host "2. Run: mkcert -install" -ForegroundColor White
Write-Host "3. Run: mkcert localhost 127.0.0.1 ::1" -ForegroundColor White
Write-Host "4. Move generated files to frontend/cert/" -ForegroundColor White
Write-Host ""
Write-Host "For now, the easiest solution is to access via:" -ForegroundColor Cyan
Write-Host "  http://localhost:5174 (works with encryption)" -ForegroundColor Green
Write-Host ""
Write-Host "For network access without HTTPS, we'll disable E2E encryption requirement." -ForegroundColor Yellow
