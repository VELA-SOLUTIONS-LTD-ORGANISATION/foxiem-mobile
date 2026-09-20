# Interactive helper: paste Expo token into Notepad, then set GitHub secret.
# Never prints the token. Do not paste the token into chat.
#
# Usage:  powershell -File scripts/paste-expo-token.ps1

$ErrorActionPreference = 'Stop'
$repo = 'solutionvela/foxiem-mobile'
$tokenFile = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.expo-token'))

Write-Host ''
Write-Host '1) Expo Access tokens -> foxiem-github-actions -> copy the one-time token'
Write-Host '2) Notepad opens on .expo-token - paste ONE line, Save, close Notepad'
Write-Host ''

Set-Content -Path $tokenFile -Value '' -Encoding ascii
$null = Start-Process -FilePath notepad.exe -ArgumentList $tokenFile -PassThru -Wait

if (-not (Test-Path $tokenFile)) {
  Write-Host 'Token file missing after editor closed.'
  exit 1
}

$raw = (Get-Content -Raw $tokenFile).Trim()
if ($raw.Length -lt 20 -or $raw.Length -gt 500) {
  Write-Host ("Token length looks wrong ({0}). Expected a short access token." -f $raw.Length)
  exit 1
}
if ($raw -match '\s') {
  Write-Host 'Token must be a single line with no spaces.'
  exit 1
}

$raw | gh secret set EXPO_TOKEN --repo $repo
if ($LASTEXITCODE -ne 0) {
  Write-Host 'gh secret set failed.'
  exit $LASTEXITCODE
}

Write-Host ("EXPO_TOKEN configured for {0} (value not shown)." -f $repo)
gh secret list --repo $repo

$env:EXPO_TOKEN = $raw
Write-Host 'Verifying eas whoami...'
npx --yes eas-cli whoami
$whoExit = $LASTEXITCODE
Remove-Item Env:EXPO_TOKEN -ErrorAction SilentlyContinue
if ($whoExit -ne 0) {
  Write-Host 'eas whoami failed - token may be invalid.'
  exit $whoExit
}
Write-Host 'OK: Expo auth verified. Reply in chat: token rotated'
