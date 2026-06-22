<#
  build-apk.ps1 — Gera o(s) APK(s) do FutLendas / Campo.

  Por que existe: o projeto fica no OneDrive, e o filtro de nuvem do Windows
  trava os arquivos de build do Gradle. Este script COPIA o app para fora do
  OneDrive (C:\capbuild) e compila lá, onde o Gradle roda liso. O APK final é
  copiado para a sua Área de Trabalho.

  COMO USAR (no PowerShell, dentro da pasta do projeto):
    powershell -ExecutionPolicy Bypass -File .\build-apk.ps1 -App both
    powershell -ExecutionPolicy Bypass -File .\build-apk.ps1 -App campo
    powershell -ExecutionPolicy Bypass -File .\build-apk.ps1 -App futlendas -Icons

  Parametros:
    -App    campo | futlendas | both   (padrao: both)
    -Icons  (regenera os icones a partir das imagens em assets/ antes de buildar)
#>

param(
  [ValidateSet('campo', 'futlendas', 'both')]
  [string]$App = 'both',
  [switch]$Icons
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$capbuild = 'C:\capbuild'

# --- localiza JDK (Android Studio) e SDK ---
$java = "$env:ProgramFiles\Android\Android Studio\jbr"
if (-not (Test-Path "$java\bin\java.exe")) { $java = "$env:LOCALAPPDATA\Programs\Android Studio\jbr" }
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path "$java\bin\java.exe")) { Write-Error "JDK do Android Studio nao encontrado. Instale o Android Studio."; exit 1 }
if (-not (Test-Path $sdk)) { Write-Error "Android SDK nao encontrado em $sdk."; exit 1 }
$env:JAVA_HOME = $java
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk

function Build-One {
  param(
    [string]$Nome,        # rotulo / nome do apk de saida (sem .apk)
    [string]$AppDir,      # pasta do app (onde roda o npm)
    [string]$CopyMode     # 'full' (copia a pasta toda) | 'split' (android + node_modules)
  )

  Write-Host ""
  Write-Host "==================== $Nome ====================" -ForegroundColor Cyan

  # 1) sincroniza (build web no modo capacitor + copia pro android/)
  Push-Location $AppDir
  try {
    if ($Icons) {
      Write-Host "[1/4] Regenerando icones..." -ForegroundColor Yellow
      npx capacitor-assets generate --android
    }
    Write-Host "[1/4] cap:sync (build web + copia)..." -ForegroundColor Yellow
    npm run cap:sync
  } finally { Pop-Location }

  # 2) copia pra fora do OneDrive
  $dst = Join-Path $capbuild $Nome
  Write-Host "[2/4] Copiando para $dst (fora do OneDrive)..." -ForegroundColor Yellow
  if (Test-Path $dst) { Remove-Item -LiteralPath $dst -Recurse -Force -ErrorAction SilentlyContinue }
  New-Item -ItemType Directory -Force $dst | Out-Null
  # /XF *Rodolfo*  => ignora copias de conflito do OneDrive (quebram o AAPT por causa do '-')
  if ($CopyMode -eq 'full') {
    robocopy $AppDir $dst /E /XD build .gradle .git dist /XF *Rodolfo* /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
  } else {
    robocopy "$AppDir\android" "$dst\android" /E /XD build .gradle .git /XF *Rodolfo* /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
    robocopy "$AppDir\node_modules" "$dst\node_modules" /E /XD build .git .cache /XF *Rodolfo* /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
  }

  # 3) compila o APK debug
  Write-Host "[3/4] Compilando APK (Gradle)..." -ForegroundColor Yellow
  $ad = Join-Path $dst 'android'
  & "$ad\gradlew.bat" assembleDebug -p "$ad" --no-daemon
  if ($LASTEXITCODE -ne 0) { Write-Error "Falha no build do $Nome."; return }

  # 4) copia o APK pro Desktop
  $apk = Join-Path $ad 'app\build\outputs\apk\debug\app-debug.apk'
  $out = Join-Path $desktop "$Nome.apk"
  Copy-Item $apk $out -Force
  $mb = (Get-Item $out).Length / 1MB
  Write-Host ("[4/4] OK -> {0}  ({1:N1} MB)" -f $out, $mb) -ForegroundColor Green
}

if ($App -eq 'campo' -or $App -eq 'both') {
  Build-One -Nome 'campo-analista' -AppDir (Join-Path $root 'campo-app') -CopyMode 'full'
}
if ($App -eq 'futlendas' -or $App -eq 'both') {
  Build-One -Nome 'futlendas' -AppDir $root -CopyMode 'split'
}

Write-Host ""
Write-Host "Concluido. APK(s) na Area de Trabalho. A pasta $capbuild pode ser apagada quando quiser." -ForegroundColor Cyan
