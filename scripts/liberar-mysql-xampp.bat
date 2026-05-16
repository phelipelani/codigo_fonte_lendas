@echo off
REM ================================================================
REM  Libera a porta 3306 para o MySQL do XAMPP
REM  Para o servico MySQL84 (MySQL 8.4 instalado separado) e o
REM  configura para NAO iniciar sozinho no boot.
REM
REM  COMO USAR: clique com o botao direito neste arquivo e escolha
REM  "Executar como administrador".
REM ================================================================

echo.
echo  Parando o servico MySQL84...
net stop MySQL84

echo.
echo  Configurando MySQL84 para inicio MANUAL...
sc config MySQL84 start= demand

echo.
echo ================================================================
echo  PRONTO!
echo  A porta 3306 esta livre. Agora:
echo    1. Abra o XAMPP Control Panel
echo    2. Clique em "Start" na linha do MySQL
echo  Ele deve ficar verde.
echo ================================================================
echo.
pause
