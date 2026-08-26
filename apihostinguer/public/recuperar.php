<?php
// Script de recuperação de emergência - Instala as dependências do Composer
echo "<h2>Recuperando dependências do Servidor (Vendor)...</h2>";
echo "<pre>";

$rootDir = '/var/www/api';
chdir($rootDir);

echo "1. Diretório atual: " . getcwd() . "\n\n";

echo "2. Baixando Composer...\n";
if (!file_exists('composer.phar')) {
    copy('https://getcomposer.org/composer.phar', 'composer.phar');
}
echo "Composer baixado com sucesso!\n\n";

echo "3. Instalando dependências (isso pode demorar uns 30 segundos)...\n";
putenv('COMPOSER_HOME=/tmp/composer');
$output = shell_exec('php composer.phar install --no-dev --optimize-autoloader 2>&1');
echo $output . "\n\n";

echo "4. Removendo Composer...\n";
@unlink('composer.phar');

echo "<b>Pronto! A pasta vendor foi gerada. Pode testar o upload de fotos novamente!</b>\n";
echo "</pre>";
