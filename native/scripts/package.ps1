# Builds the native Windows release assets into native\dist\:
#   MDPad-<version>-setup.exe     per-user Inno Setup installer (no admin required)
#   MDPad-<version>-portable.zip  clean ZIP with native MDPad.exe + LICENSE.txt (no self-extracting dropper)
#   SHA256SUMS.txt                SHA-256 verification checksums
#
# Optional Authenticode signing (recommended to eliminate SmartScreen warnings):
#   Set env vars WIN_CSC_PFX_BASE64 and WIN_CSC_PASSWORD in GitHub Actions secrets.
#
# Usage: pwsh native/scripts/package.ps1 [-SkipBuild]
param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$version = (Select-String -Path Cargo.toml -Pattern '^version = "(.+)"' | Select-Object -First 1).Matches[0].Groups[1].Value
if ($env:GITHUB_REF_TYPE -eq 'tag' -and $env:GITHUB_REF_NAME -ne "v$version") {
  Write-Host "Notice: tag $env:GITHUB_REF_NAME differs from Cargo.toml version $version; using $version"
}

function Invoke-OptionalCodeSign([string]$FilePath) {
  if (-not $env:WIN_CSC_PFX_BASE64) {
    return
  }
  $signtool = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $signtool) {
    throw "WIN_CSC_PFX_BASE64 is set, but Windows SDK signtool.exe was not found."
  }
  $pfxPath = Join-Path ([IO.Path]::GetTempPath()) ("mdpad-sign-" + [guid]::NewGuid().ToString('N') + ".pfx")
  try {
    [IO.File]::WriteAllBytes($pfxPath, [Convert]::FromBase64String($env:WIN_CSC_PFX_BASE64))
    $args = @('sign', '/fd', 'SHA256', '/tr', 'http://timestamp.digicert.com', '/td', 'SHA256', '/f', $pfxPath)
    if ($env:WIN_CSC_PASSWORD) {
      $args += @('/p', $env:WIN_CSC_PASSWORD)
    }
    $args += $FilePath
    & $signtool.FullName @args
    if ($LASTEXITCODE -ne 0) {
      throw "signtool failed for $FilePath (exit code $LASTEXITCODE)"
    }
  } finally {
    if (Test-Path $pfxPath) { Remove-Item $pfxPath -Force }
  }
}

# ---- Inno Setup 7.1.0 (pinned, SHA-256 verified, installed in portable mode inside .tools\)
$innoVersion = '7.1.0'
$innoSha256 = '0362A383ED217D4C4239B5933866DD96D3EB2102737DA92F80F6057A4B40DF2F'
$iscc = if ($env:ISCC) { $env:ISCC } else { Join-Path $root '.tools\innosetup\ISCC.exe' }
if (-not (Test-Path $iscc)) {
  $dl = Join-Path $root '.tools\inno-dl'
  New-Item -ItemType Directory -Force $dl | Out-Null
  $setup = Join-Path $dl "innosetup-$innoVersion-x64.exe"
  $tag = 'is-' + $innoVersion.Replace('.', '_')
  Invoke-WebRequest "https://github.com/jrsoftware/issrc/releases/download/$tag/innosetup-$innoVersion-x64.exe" -OutFile $setup
  if ((Get-FileHash $setup -Algorithm SHA256).Hash -ne $innoSha256) {
    Remove-Item $setup
    throw 'Inno Setup download SHA-256 hash mismatch'
  }
  $p = Start-Process $setup -ArgumentList '/PORTABLE=1', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/CURRENTUSER', '/NORESTART', "/DIR=$(Split-Path $iscc)" -PassThru -Wait
  if ($p.ExitCode -ne 0 -or -not (Test-Path $iscc)) {
    throw "Inno Setup portable extraction failed ($($p.ExitCode))"
  }
}

# ---- Build native Rust + Win32 release binary
if (-not $SkipBuild) {
  $cargo = if (Get-Command cargo -ErrorAction SilentlyContinue) { 'cargo' } else { Join-Path $HOME '.cargo\bin\cargo.exe' }
  & $cargo build --release
  if ($LASTEXITCODE) { throw 'cargo build --release failed' }
}
$exe = Join-Path $root 'target\release\MDPad.exe'
if (-not (Test-Path $exe)) { throw "Expected binary not found at $exe" }
$exeVersion = (Get-Item $exe).VersionInfo.ProductVersion
if ($exeVersion -ne $version) {
  throw "MDPad.exe ProductVersion says $exeVersion, Cargo.toml says ${version}: rebuild required"
}

Invoke-OptionalCodeSign $exe

# ---- Package clean Portable ZIP + Inno Setup Installer + SHA256SUMS.txt
$dist = Join-Path $root 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory $dist | Out-Null

$stage = Join-Path $dist 'portable'
New-Item -ItemType Directory $stage | Out-Null
Copy-Item $exe $stage
Copy-Item LICENSE (Join-Path $stage 'LICENSE.txt')
$zip = Join-Path $dist "MDPad-$version-portable.zip"
Compress-Archive -Path "$stage\*" -DestinationPath $zip
Remove-Item $stage -Recurse

& $iscc /Q "/DAppVersion=$version" installer\MDPad.iss
if ($LASTEXITCODE) { throw 'Inno Setup compile failed' }

$setupExe = Join-Path $dist "MDPad-$version-setup.exe"
Invoke-OptionalCodeSign $setupExe

Get-ChildItem $dist -File | Where-Object Name -ne 'SHA256SUMS.txt' | Sort-Object Name | ForEach-Object {
  "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower())  $($_.Name)"
} | Set-Content (Join-Path $dist 'SHA256SUMS.txt') -Encoding utf8NoBOM

Get-ChildItem $dist | ForEach-Object { '{0,10:N0}  {1}' -f $_.Length, $_.Name }
