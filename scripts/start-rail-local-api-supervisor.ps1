$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source
$restartDelaySeconds = 5

Set-Location $repoRoot

while ($true) {
  & $npmCmd "run" "rail:local-api"
  Start-Sleep -Seconds $restartDelaySeconds
}
