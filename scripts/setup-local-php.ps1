# =============================================================================
# setup-local-php.ps1
# Baixa e instala o PHP 8.3 (Thread Safe, x64) em C:\php, configura o php.ini
# com as extensoes que o backend FutLendas precisa e imprime a versao final.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-local-php.ps1
# =============================================================================

$ErrorActionPreference = 'Stop'

$phpDir   = 'C:\php'
$zipUrl   = 'https://windows.php.net/downloads/releases/latest/php-8.3-Win32-vs16-x64-latest.zip'
$zipPath  = Join-Path $env:TEMP 'php-8.3-latest.zip'

Write-Host "==> Verificando instalacao existente em $phpDir..."
if (Test-Path (Join-Path $phpDir 'php.exe')) {
    Write-Host "PHP ja presente em $phpDir. Pulando download."
} else {
    Write-Host "==> Baixando PHP de $zipUrl ..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

    Write-Host "==> Criando $phpDir e extraindo..."
    if (-not (Test-Path $phpDir)) {
        New-Item -ItemType Directory -Path $phpDir | Out-Null
    }
    Expand-Archive -Path $zipPath -DestinationPath $phpDir -Force
    Remove-Item $zipPath -Force
}

# Configurar php.ini (copia do -development e habilita extensoes)
$iniDev  = Join-Path $phpDir 'php.ini-development'
$iniPath = Join-Path $phpDir 'php.ini'

if (-not (Test-Path $iniPath)) {
    Write-Host "==> Copiando php.ini-development -> php.ini"
    Copy-Item $iniDev $iniPath
}

Write-Host "==> Habilitando extensoes necessarias..."
$ini = Get-Content $iniPath -Raw

# Descomenta extension_dir
$ini = $ini -replace '(?m)^;\s*extension_dir\s*=\s*"ext"', 'extension_dir = "ext"'

# Lista de extensoes necessarias para a API FutLendas
# (mysqli ja vem habilitado por padrao no php.ini-development, nao precisa listar)
$extensions = @(
    'curl',
    'fileinfo',
    'gd',
    'mbstring',
    'openssl',
    'pdo_mysql'
)

foreach ($ext in $extensions) {
    $pattern     = "(?m)^;\s*extension\s*=\s*$ext\s*$"
    $replacement = "extension=$ext"
    if ($ini -match $pattern) {
        $ini = $ini -replace $pattern, $replacement
        Write-Host "   [OK] habilitou $ext"
    } else {
        Write-Host "   [--] $ext ja habilitado ou linha nao encontrada"
    }
}

# Garante timezone padrao
$ini = $ini -replace '(?m)^;\s*date\.timezone\s*=\s*$', 'date.timezone = America/Sao_Paulo'

Set-Content -Path $iniPath -Value $ini -Encoding ASCII
Write-Host "==> php.ini configurado em $iniPath"

# Adiciona PHP ao PATH do usuario permanentemente
$currentUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($currentUserPath -notlike "*$phpDir*") {
    Write-Host "==> Adicionando $phpDir ao PATH do usuario (permanente)"
    [Environment]::SetEnvironmentVariable('Path', "$currentUserPath;$phpDir", 'User')
} else {
    Write-Host "==> $phpDir ja esta no PATH do usuario"
}

# Testa a instalacao na sessao atual
$env:Path = "$env:Path;$phpDir"
Write-Host ""
Write-Host "==> Versao do PHP instalado:"
& "$phpDir\php.exe" -v
Write-Host ""
Write-Host "==> Extensoes carregadas:"
& "$phpDir\php.exe" -m | Select-String -Pattern '^(curl|fileinfo|gd|mbstring|openssl|pdo_mysql|mysqli|PDO)$'

Write-Host ""
Write-Host "==> Tudo pronto! Abra um novo terminal para que o PATH seja atualizado."
