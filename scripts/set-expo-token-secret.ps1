# Sets GitHub Actions secret EXPO_TOKEN from a local file (never prints the token).
# Usage:
#   1. Create an Expo access token at:
#      https://expo.dev/accounts/vela-solution-ltd/settings/access-tokens
#   2. Save it to .expo-token (gitignored) as a single line
#   3. Run:  powershell -File scripts/set-expo-token-secret.ps1

$ErrorActionPreference = 'Stop'
$repo = 'solutionvela/foxiem-mobile'
$tokenFile = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.expo-token'))

if (-not (Test-Path $tokenFile)) {
  Write-Host "Missing $tokenFile"
  Write-Host "Create that file with your Expo access token (one line), then re-run."
  exit 1
}

$raw = (Get-Content -Raw $tokenFile).Trim()
if ($raw.Length -lt 20 -or $raw.Length -gt 500) {
  Write-Host "Token file length looks wrong ($($raw.Length)). Expected a short access token."
  exit 1
}
if ($raw -match '\s') {
  Write-Host "Token file must be a single line with no whitespace."
  exit 1
}

$raw | gh secret set EXPO_TOKEN --repo $repo
if ($LASTEXITCODE -ne 0) {
  Write-Host "gh secret set failed."
  exit $LASTEXITCODE
}

Write-Host "EXPO_TOKEN configured for $repo (value not shown)."
gh secret list --repo $repo
