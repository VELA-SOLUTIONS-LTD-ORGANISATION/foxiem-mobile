# Sets GitHub Actions secret EXPO_TOKEN from a local file (never prints the token).
# Usage:
#   1. Create an Expo access token at:
#      https://expo.dev/accounts/vela-solution-ltd/settings/access-tokens
#   2. Save it to .expo-token (gitignored) as a single line
#   3. Run:  powershell -File scripts/set-expo-token-secret.ps1

$ErrorActionPreference = 'Stop'
$repo = 'solutionvela/foxiem-mobile'
$tokenFile = Join-Path $PSScriptRoot '..' '.expo-token'
$tokenFile = [System.IO.Path]::GetFullPath($tokenFile)

if (-not (Test-Path $tokenFile)) {
  Write-Host "Missing $tokenFile"
  Write-Host "Create that file with your Expo access token (one line), then re-run."
  exit 1
}

$raw = (Get-Content -Raw $tokenFile).Trim()
if ($raw.Length -lt 20) {
  Write-Host "Token file looks empty or too short."
  exit 1
}

$raw | gh secret set EXPO_TOKEN --repo $repo
if ($LASTEXITCODE -ne 0) {
  Write-Host "gh secret set failed."
  exit $LASTEXITCODE
}

Write-Host "EXPO_TOKEN configured for $repo (value not shown)."
gh secret list --repo $repo
