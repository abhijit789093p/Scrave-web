$ErrorActionPreference = "Stop"

$body = '{"email":"demopdf3@example.com","password":"password123!"}'
try {
    $resp = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" -Method Post -ContentType "application/json" -Body $body
    $apiKey = $resp.apiKey
    Write-Output "Got API Key: $apiKey"
} catch {
    Write-Output "Registration Failed: $_"
    exit 1
}

$pdfBody = '{"url":"https://example.com"}'
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/v1/pdf" -Method Post -Headers @{"x-api-key" = $apiKey} -ContentType "application/json" -Body $pdfBody -OutFile "test_output.pdf"
    $size = (Get-Item "test_output.pdf").Length
    Write-Output "PDF saved successfully. File size: $size bytes"
} catch {
    Write-Output "PDF Generation Failed: $_"
    exit 1
}
