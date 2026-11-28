# Build and package MDPad Desktop (full UI Tauri v2 Rust + WebView2) for Windows x64
# Produces:
#   - src-tauri/dist/MDPad-<version>-setup.exe      (Inno Setup 7 per-user installer, Italian + English)
#   - src-tauri/dist/MDPad-<version>-portable.zip   (Clean portable ZIP, zero %TEMP% self-extractors)
#   - src-tauri/dist/SHA256SUMS.txt                 (SHA-256 verification checksums)
# Optional Authenticode signing if WIN_CSC_PFX_BASE64 + WIN_CSC_PASSWORD are set.
param()
$ErrorActionPreference = 'Stop'

$TauriRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = Split-Path -Parent $TauriRoot
$InnoVersion = '7.1.0'
$InnoUrl = "https://github.com/jrsoftware/issrc/releases/download/is-7_1_0/innosetup-$InnoVersion-x64.exe"
$InnoSha256 = '0362A383ED217D4C4239B5933866DD96D3EB2102737DA92F80F6057A4B40DF2F'
$ToolsDir = Join-Path $TauriRoot '.tools'
$InnoDir = Join-Path $ToolsDir 'inno'
$Iscc = Join-Path $InnoDir 'ISCC.exe'

$CargoToml = Get-Content (Join-Path $TauriRoot 'Cargo.toml') -Raw
if ($CargoToml -notmatch '(?m)^version\s*=\s*"([^"]+)"') {
  throw 'Unable to parse version from src-tauri/Cargo.toml'
}
$Version = $Matches[1]

function Find-SignTool {
  $kitRoot = 'C:\Program Files (x86)\Windows Kits\10\bin'
  if (Test-Path $kitRoot) {
    $found = Get-ChildItem $kitRoot -Recurse -Filter 'signtool.exe' -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  $cmd = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Invoke-OptionalSign([string]$TargetPath) {
  if (-not $env:WIN_CSC_PFX_BASE64 -or -not $env:WIN_CSC_PASSWORD) {
    Write-Host "[sign] Skipped for $(Split-Path -Leaf $TargetPath) (no WIN_CSC_PFX_BASE64 configured; SignPath OSS can sign artifacts in CI)."
    return
  }
  $signTool = Find-SignTool
  if (-not $signTool) {
    throw 'WIN_CSC_PFX_BASE64 is set, but signtool.exe was not found on PATH or Windows Kits.'
  }
  $pfxPath = Join-Path $env:RUNNER_TEMP 'mdpad-sign.pfx'
  try {
    [IO.File]::WriteAllBytes($pfxPath, [Convert]::FromBase64String($env:WIN_CSC_PFX_BASE64))
    & $signTool sign /f $pfxPath /p $env:WIN_CSC_PASSWORD /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /d "MDPad by Marco Razzano" $TargetPath
    if ($LASTEXITCODE -ne 0) { throw "signtool failed for $TargetPath" }
  } finally {
    if (Test-Path $pfxPath) { Remove-Item $pfxPath -Force }
  }
}

if (-not (Test-Path $Iscc)) {
  New-Item -ItemType Directory -Force $ToolsDir | Out-Null
  $installer = Join-Path $ToolsDir "innosetup-$InnoVersion-x64.exe"
  if (-not (Test-Path $installer)) {
    Write-Host "Downloading Inno Setup $InnoVersion (x64)..."
    Invoke-WebRequest -Uri $InnoUrl -OutFile $installer
  }
  $hash = (Get-FileHash -Algorithm SHA256 $installer).Hash
  if ($hash -ne $InnoSha256) {
    Remove-Item $installer -Force
    throw "Inno Setup SHA256 mismatch: expected $InnoSha256, got $hash"
  }
  Write-Host "Extracting Inno Setup $InnoVersion locally in portable mode..."
  $proc = Start-Process -FilePath $installer -ArgumentList '/PORTABLE=1', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/CURRENTUSER', '/NORESTART', "/DIR=$InnoDir" -PassThru -Wait
  if ($proc.ExitCode -ne 0 -or -not (Test-Path $Iscc)) {
    throw "Inno Setup portable extraction failed (exit code $($proc.ExitCode)); ISCC.exe not found at $Iscc."
  }
}

Push-Location $TauriRoot
try {
  Write-Host "Building native Tauri v2 MDPad.exe v$Version (Marco Razzano)..."
  cargo build --release
  if ($LASTEXITCODE -ne 0) { throw "cargo build --release failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

$ExePath = Join-Path $TauriRoot 'target\release\MDPad.exe'
if (-not (Test-Path $ExePath)) {
  throw "Expected binary not found at $ExePath"
}

Invoke-OptionalSign $ExePath

$DistDir = Join-Path $TauriRoot 'dist'
New-Item -ItemType Directory -Force $DistDir | Out-Null

# 1. Clean Portable ZIP (zero self-extracting temp dropper)
$ZipPath = Join-Path $DistDir "MDPad-$Version-portable.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
$StageDir = Join-Path $DistDir '_portable_stage'
if (Test-Path $StageDir) { Remove-Item $StageDir -Recurse -Force }
New-Item -ItemType Directory -Force $StageDir | Out-Null
Copy-Item $ExePath (Join-Path $StageDir 'MDPad.exe')
Copy-Item (Join-Path $RepoRoot 'LICENSE') (Join-Path $StageDir 'LICENSE.txt')
Compress-Archive -Path (Join-Path $StageDir '*') -DestinationPath $ZipPath -CompressionLevel Optimal
Remove-Item $StageDir -Recurse -Force

# 2. Per-user Inno Setup Installer
$IssPath = Join-Path $TauriRoot 'installer\MDPad.iss'
& $Iscc "/DAppVersion=$Version" $IssPath
if ($LASTEXITCODE -ne 0) { throw "ISCC.exe failed with exit code $LASTEXITCODE" }

$SetupPath = Join-Path $DistDir "MDPad-$Version-setup.exe"
if (-not (Test-Path $SetupPath)) {
  throw "Expected installer not found at $SetupPath"
}

Invoke-OptionalSign $SetupPath

# 3. SHA256SUMS.txt
$SumsPath = Join-Path $DistDir 'SHA256SUMS.txt'
$Lines = @($SetupPath, $ZipPath) | ForEach-Object {
  $h = (Get-FileHash -Algorithm SHA256 $_).Hash.ToLowerInvariant()
  "$h  $(Split-Path -Leaf $_)"
}
Set-Content -Path $SumsPath -Value $Lines -Encoding Ascii

Write-Host 'Native Windows Tauri v2 release artifacts ready:'
Get-ChildItem $DistDir -File | Format-Table Name, Length
Get-Content $SumsPath
