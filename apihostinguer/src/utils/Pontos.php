<?php
/**
 * Arquivo: src/utils/Pontos.php
 *
 * Constantes de pontuação do FutLendas.
 * Espelho do arquivo src/utils/constants.js do frontend.
 * Altere aqui e no constants.js para manter sincronizado.
 */

class Pontos
{
    // ── Pontuação por partida ──────────────────────────────────
    const GOLS         =  1.5;
    const ASSISTENCIAS =  1.0;
    const CLEAN_SHEET  =  0.5;   // Defensor / Goleiro (jogo sem sofrer gol)
    const VITORIAS     =  3.0;
    const EMPATES      =  1.0;
    const DERROTAS     = -1.0;
    const GOL_CONTRA   = -3.0;   // Punição automática (gol contra)

    // ── Prêmios de RODADA (semana) ───────────────────────────
    const MVP_RODADA             =  2;  // Craque da Semana
    const ARTILHEIRO_RODADA      =  2;  // Artilheiro da Semana
    const GARCOM_RODADA          =  2;  // Garçom da Semana
    const MELHOR_GOLEIRO_RODADA  =  2;  // Melhor Goleiro da Semana
    const MELHOR_ZAGUEIRO_RODADA =  2;  // Melhor Zagueiro da Semana
    const PE_DE_RATO_RODADA      = -2;  // Pé de Rato da Semana

    // ── Prêmios de CAMPEONATO ────────────────────────────────
    const TITULO_PONTOS_CORRIDOS = 100; // Campeão de Liga
    const TITULO_MATA_MATA       = 150; // Campeão de Copa
    const MVP_GERAL              =  5;  // Craque do Campeonato
    const ARTILHEIRO_GERAL       =  5;  // Artilheiro do Campeonato
    const GARCOM_GERAL           =  5;  // Garçom do Campeonato
    const MELHOR_GOLEIRO_GERAL   =  5;  // Melhor Goleiro do Campeonato
    const MELHOR_ZAGUEIRO_GERAL  =  5;  // Melhor Zagueiro do Campeonato
    const PE_DE_RATO_GERAL       = -5;  // Pé de Rato do Campeonato
    const GOL_HISTORICO          =  1;  // Acúmulo histórico
    const ASSIST_HISTORICO       =  1;  // Acúmulo histórico

    // ══════════════════════════════════════════════════════════════
    // CARTOLENDAS — Pontuação própria do fantasy game
    // Inspirado no Cartola FC, adaptado para futebol amador
    // ══════════════════════════════════════════════════════════════

    // ── Jogador de Linha (atacante/meia) ──────────────────────────
    const CARTOLENDAS_GOL             =  8.0;   // Gol marcado
    const CARTOLENDAS_ASSISTENCIA     =  5.0;   // Assistência
    const CARTOLENDAS_VITORIA         =  1.0;   // Vitória do time
    const CARTOLENDAS_EMPATE          =  0.0;   // Empate (neutro)
    const CARTOLENDAS_DERROTA         = -1.0;   // Derrota do time
    const CARTOLENDAS_GOL_CONTRA      = -3.0;   // Gol contra

    // ── Zagueiro (joga_recuado=1) ─────────────────────────────────
    const CARTOLENDAS_CLEAN_SHEET_ZAG =  5.0;   // Clean sheet p/ zagueiro
    const CARTOLENDAS_GOL_ZAGUEIRO    = 10.0;   // Gol de zagueiro (raro, super valorizado)
    const CARTOLENDAS_ASSIST_ZAGUEIRO =  7.0;   // Assistência de zagueiro (raro)

    // ── Goleiro ───────────────────────────────────────────────────
    const CARTOLENDAS_CLEAN_SHEET_GOL =  7.0;   // Clean sheet p/ goleiro
    const CARTOLENDAS_GOL_SOFRIDO     = -1.0;   // Penalidade por cada gol sofrido

    // ── Punições disciplinares ─────────────────────────────────
    const PUNICAO_LEVE           =  -5;  // Advertência / briga verbal
    const PUNICAO_MEDIA          = -10;  // Briga física / comportamento antidesportivo
    const PUNICAO_GRAVE          = -25;  // Expulsão de rodada / suspensão
    const PUNICAO_MAXIMA         = -50;  // Suspensão longa / conduta gravíssima

    // ── Mapeamento tipo_premio → constante (rodada) ──────────
    const BONUS_RODADA = [
        'mvp_rodada'             => self::MVP_RODADA,
        'artilheiro_rodada'      => self::ARTILHEIRO_RODADA,
        'garcom_rodada'          => self::GARCOM_RODADA,
        'melhor_goleiro_rodada'  => self::MELHOR_GOLEIRO_RODADA,
        'melhor_zagueiro_rodada' => self::MELHOR_ZAGUEIRO_RODADA,
        'pe_de_rato_rodada'      => self::PE_DE_RATO_RODADA,
    ];

    // ── Mapeamento tipo_premio → constante (campeonato) ──────
    const BONUS_CAMPEONATO = [
        'mvp'              => self::MVP_GERAL,
        'artilheiro'       => self::ARTILHEIRO_GERAL,
        'garcom'           => self::GARCOM_GERAL,
        'melhor_goleiro'   => self::MELHOR_GOLEIRO_GERAL,
        'melhor_zagueiro'  => self::MELHOR_ZAGUEIRO_GERAL,
        'pe_de_rato'       => self::PE_DE_RATO_GERAL,
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // MÉTODOS DE CÁLCULO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Jogador de linha (não goleiro, não recuado).
     * Clean Sheet NÃO conta — passe 0 sempre.
     */
    public static function calcularJogadorLinha(
        int $gols,
        int $assistencias,
        int $cleanSheets,
        int $vitorias,
        int $empates,
        int $derrotas,
        int $golsContra = 0
    ): float {
        return ($gols         * self::GOLS)
             + ($assistencias * self::ASSISTENCIAS)
             + ($vitorias     * self::VITORIAS)
             + ($empates      * self::EMPATES)
             + ($derrotas     * self::DERROTAS)
             + ($golsContra   * self::GOL_CONTRA);
    }

    /**
     * Jogador recuado (zagueiro/fixo).
     * Pontua por coletivo + clean sheet, não por gols/assists.
     */
    public static function calcularJogadorRecuado(
        int $cleanSheets,
        int $vitorias,
        int $empates,
        int $derrotas,
        int $golsContra = 0
    ): float {
        return ($cleanSheets * self::CLEAN_SHEET)
             + ($vitorias    * self::VITORIAS)
             + ($empates     * self::EMPATES)
             + ($derrotas    * self::DERROTAS)
             + ($golsContra  * self::GOL_CONTRA);
    }

    /**
     * Goleiro.
     * Pontua por coletivo + clean sheet, não por gols/assists.
     */
    public static function calcularGoleiro(
        int $cleanSheets,
        int $vitorias,
        int $empates,
        int $derrotas,
        int $golsContra = 0
    ): float {
        return ($cleanSheets * self::CLEAN_SHEET)
             + ($vitorias    * self::VITORIAS)
             + ($empates     * self::EMPATES)
             + ($derrotas    * self::DERROTAS)
             + ($golsContra  * self::GOL_CONTRA);
    }

    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS CARTOLENDAS — Fantasy game (não altera os métodos acima)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Cartolendas: Jogador de linha (atacante/meia).
     * Pontua por gols, assistências e resultado.
     */
    public static function cartolendas_linha(
        int $gols,
        int $assistencias,
        int $vitorias,
        int $empates,
        int $derrotas,
        int $golsContra = 0
    ): float {
        return ($gols         * self::CARTOLENDAS_GOL)
             + ($assistencias * self::CARTOLENDAS_ASSISTENCIA)
             + ($vitorias     * self::CARTOLENDAS_VITORIA)
             + ($empates      * self::CARTOLENDAS_EMPATE)
             + ($derrotas     * self::CARTOLENDAS_DERROTA)
             + ($golsContra   * self::CARTOLENDAS_GOL_CONTRA);
    }

    /**
     * Cartolendas: Zagueiro (joga_recuado=1).
     * Pontua por clean sheet + gols/assists (raros, super valorizados) + resultado.
     */
    public static function cartolendas_zagueiro(
        int $gols,
        int $assistencias,
        int $cleanSheets,
        int $vitorias,
        int $empates,
        int $derrotas,
        int $golsContra = 0
    ): float {
        return ($cleanSheets  * self::CARTOLENDAS_CLEAN_SHEET_ZAG)
             + ($gols         * self::CARTOLENDAS_GOL_ZAGUEIRO)
             + ($assistencias * self::CARTOLENDAS_ASSIST_ZAGUEIRO)
             + ($vitorias     * self::CARTOLENDAS_VITORIA)
             + ($empates      * self::CARTOLENDAS_EMPATE)
             + ($derrotas     * self::CARTOLENDAS_DERROTA)
             + ($golsContra   * self::CARTOLENDAS_GOL_CONTRA);
    }

    /**
     * Cartolendas: Goleiro.
     * Clean sheet muito valorizado + penalidade por gols sofridos + resultado.
     */
    public static function cartolendas_goleiro(
        int $cleanSheets,
        int $golsSofridos,
        int $vitorias,
        int $empates,
        int $derrotas
    ): float {
        return ($cleanSheets  * self::CARTOLENDAS_CLEAN_SHEET_GOL)
             + ($golsSofridos * self::CARTOLENDAS_GOL_SOFRIDO)
             + ($vitorias     * self::CARTOLENDAS_VITORIA)
             + ($empates      * self::CARTOLENDAS_EMPATE)
             + ($derrotas     * self::CARTOLENDAS_DERROTA);
    }

    /**
     * Gera o fragmento SQL para calcular pontos Cartolendas
     * conforme tipo de jogador (linha vs zagueiro vs goleiro).
     */
    public static function sqlPontosPartidaCartolendas(string $epAlias = 'ep', string $cpAlias = 'cp', string $jAlias = 'j'): string
    {
        $gol     = self::CARTOLENDAS_GOL;
        $assist  = self::CARTOLENDAS_ASSISTENCIA;
        $csZag   = self::CARTOLENDAS_CLEAN_SHEET_ZAG;
        $csGol   = self::CARTOLENDAS_CLEAN_SHEET_GOL;
        $golZag  = self::CARTOLENDAS_GOL_ZAGUEIRO;
        $assZag  = self::CARTOLENDAS_ASSIST_ZAGUEIRO;
        $golSof  = self::CARTOLENDAS_GOL_SOFRIDO;
        $vit     = self::CARTOLENDAS_VITORIA;
        $emp     = self::CARTOLENDAS_EMPATE;
        $der     = self::CARTOLENDAS_DERROTA;
        $gc      = self::CARTOLENDAS_GOL_CONTRA;

        // Helper: resultado do time
        $isVit = "(CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeA>{$cpAlias}.placar_timeB)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeB>{$cpAlias}.placar_timeA)
                  THEN 1 ELSE 0 END)";
        $isEmp = "(CASE WHEN {$cpAlias}.placar_timeA={$cpAlias}.placar_timeB THEN 1 ELSE 0 END)";
        $isDer = "(CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeA<{$cpAlias}.placar_timeB)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeB<{$cpAlias}.placar_timeA)
                  THEN 1 ELSE 0 END)";
        $isCS  = "(CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeB=0)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeA=0)
                  THEN 1 ELSE 0 END)";
        // Gols sofridos pelo time do jogador
        $golsSofridos = "(CASE WHEN {$epAlias}.time_id={$cpAlias}.timeA_id THEN {$cpAlias}.placar_timeB
                               ELSE {$cpAlias}.placar_timeA END)";

        $isGoleiro = "(SELECT COUNT(*) FROM campeonato_partidas gp
                       WHERE gp.status = 'finalizada'
                         AND gp.id = {$epAlias}.partida_id
                         AND (gp.goleiro_timeA_id = {$epAlias}.jogador_id
                           OR gp.goleiro_timeB_id = {$epAlias}.jogador_id)) > 0";

        return "
            CASE
                WHEN {$isGoleiro} THEN
                    ({$isCS} * {$csGol})
                  + ({$golsSofridos} * {$golSof})
                  + ({$isVit} * {$vit}) + ({$isEmp} * {$emp}) + ({$isDer} * {$der})

                WHEN {$jAlias}.joga_recuado = 1 THEN
                    ({$isCS} * {$csZag})
                  + ({$epAlias}.gols * {$golZag}) + ({$epAlias}.assistencias * {$assZag})
                  + ({$isVit} * {$vit}) + ({$isEmp} * {$emp}) + ({$isDer} * {$der})
                  + (COALESCE({$epAlias}.gols_contra, 0) * {$gc})

                ELSE
                    ({$epAlias}.gols * {$gol}) + ({$epAlias}.assistencias * {$assist})
                  + ({$isVit} * {$vit}) + ({$isEmp} * {$emp}) + ({$isDer} * {$der})
                  + (COALESCE({$epAlias}.gols_contra, 0) * {$gc})
            END
        ";
    }

    /**
     * Retorna o valor de desconto de uma punição disciplinar.
     */
    public static function calcularPunicao(string $tipo): float
    {
        return match ($tipo) {
            'leve'   => self::PUNICAO_LEVE,
            'media'  => self::PUNICAO_MEDIA,
            'grave'  => self::PUNICAO_GRAVE,
            'maxima' => self::PUNICAO_MAXIMA,
            default  => self::PUNICAO_LEVE,
        };
    }

    /**
     * Retorna o valor de desconto de Pé de Rato.
     */
    public static function calcularPeDeRato(string $tipo = 'rodada'): float
    {
        return match ($tipo) {
            'rodada' => self::PE_DE_RATO_RODADA,
            'geral'  => self::PE_DE_RATO_GERAL,
            default  => self::PE_DE_RATO_RODADA,
        };
    }

    /**
     * Calcula bônus total de prêmios de rodada para um jogador.
     * Recebe array de rows da tabela premios_rodada.
     */
    public static function calcularBonusRodadas(array $premios): float
    {
        $total = 0.0;
        foreach ($premios as $p) {
            $tipo = $p['tipo_premio'] ?? '';
            $total += self::BONUS_RODADA[$tipo] ?? 0;
        }
        return $total;
    }

    /**
     * Calcula bônus total de prêmios de campeonato para um jogador.
     * Recebe array de rows da tabela campeonato_premios.
     */
    public static function calcularBonusCampeonato(array $premios): float
    {
        $total = 0.0;
        foreach ($premios as $p) {
            $tipo = $p['tipo_premio'] ?? '';
            $total += self::BONUS_CAMPEONATO[$tipo] ?? 0;
        }
        return $total;
    }

    /**
     * Calcula o total de pontos Hall da Fama de um jogador.
     */
    public static function calcularHallDaFama(array $dados): float
    {
        $d = array_merge([
            'titulos_liga'          => 0,
            'titulos_copa'          => 0,
            'mvp_geral'             => 0,
            'mvp_rodada'            => 0,
            'artilheiro_geral'      => 0,
            'artilheiro_rodada'     => 0,
            'garcom_geral'          => 0,
            'garcom_rodada'         => 0,
            'melhor_goleiro_geral'  => 0,
            'melhor_goleiro_rodada' => 0,
            'melhor_zagueiro_geral' => 0,
            'melhor_zagueiro_rodada'=> 0,
            'gols_historicos'       => 0,
            'assists_historicos'    => 0,
            'pe_de_rato_rodada'     => 0,
            'pe_de_rato_geral'      => 0,
            'punicoes_leve'         => 0,
            'punicoes_media'        => 0,
            'punicoes_grave'        => 0,
            'punicoes_maxima'       => 0,
        ], $dados);

        $pontos = 0.0;

        // ── Positivo ──────────────────────────────────────────
        $pontos += $d['titulos_liga']          * self::TITULO_PONTOS_CORRIDOS;
        $pontos += $d['titulos_copa']          * self::TITULO_MATA_MATA;
        $pontos += $d['mvp_geral']             * self::MVP_GERAL;
        $pontos += $d['mvp_rodada']            * self::MVP_RODADA;
        $pontos += $d['artilheiro_geral']      * self::ARTILHEIRO_GERAL;
        $pontos += $d['artilheiro_rodada']     * self::ARTILHEIRO_RODADA;
        $pontos += $d['garcom_geral']          * self::GARCOM_GERAL;
        $pontos += $d['garcom_rodada']         * self::GARCOM_RODADA;
        $pontos += $d['melhor_goleiro_geral']  * self::MELHOR_GOLEIRO_GERAL;
        $pontos += $d['melhor_goleiro_rodada'] * self::MELHOR_GOLEIRO_RODADA;
        $pontos += $d['melhor_zagueiro_geral'] * self::MELHOR_ZAGUEIRO_GERAL;
        $pontos += $d['melhor_zagueiro_rodada']* self::MELHOR_ZAGUEIRO_RODADA;
        $pontos += $d['gols_historicos']       * self::GOL_HISTORICO;
        $pontos += $d['assists_historicos']    * self::ASSIST_HISTORICO;

        // ── Descontos — Pé de Rato ────────────────────────────
        $pontos += $d['pe_de_rato_rodada']     * self::PE_DE_RATO_RODADA;
        $pontos += $d['pe_de_rato_geral']      * self::PE_DE_RATO_GERAL;

        // ── Descontos — Punições disciplinares ────────────────
        $pontos += $d['punicoes_leve']         * self::PUNICAO_LEVE;
        $pontos += $d['punicoes_media']        * self::PUNICAO_MEDIA;
        $pontos += $d['punicoes_grave']        * self::PUNICAO_GRAVE;
        $pontos += $d['punicoes_maxima']       * self::PUNICAO_MAXIMA;

        return $pontos;
    }

    /**
     * Gera o fragmento SQL para calcular pontos de partida
     * conforme tipo de jogador (linha vs recuado/goleiro).
     * Usa as constantes de Pontos.php como source of truth.
     */
    public static function sqlPontosPartida(string $epAlias = 'ep', string $cpAlias = 'cp', string $jAlias = 'j'): string
    {
        $gols   = self::GOLS;
        $assist = self::ASSISTENCIAS;
        $cs     = self::CLEAN_SHEET;
        $vit    = self::VITORIAS;
        $emp    = self::EMPATES;
        $der    = self::DERROTAS;

        return "
            CASE WHEN {$jAlias}.joga_recuado = 1 OR
                      (SELECT COUNT(*) FROM campeonato_partidas gp
                       WHERE gp.status = 'finalizada'
                         AND gp.id = {$epAlias}.partida_id
                         AND (gp.goleiro_timeA_id = {$epAlias}.jogador_id
                           OR gp.goleiro_timeB_id = {$epAlias}.jogador_id)) > 0
            THEN
                (CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeB=0)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeA=0)
                      THEN {$cs} ELSE 0 END)
              + (CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeA>{$cpAlias}.placar_timeB)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeB>{$cpAlias}.placar_timeA)
                      THEN {$vit} ELSE 0 END)
              + (CASE WHEN {$cpAlias}.placar_timeA={$cpAlias}.placar_timeB THEN {$emp} ELSE 0 END)
              + (CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeA<{$cpAlias}.placar_timeB)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeB<{$cpAlias}.placar_timeA)
                      THEN {$der} ELSE 0 END)
            ELSE
                ({$epAlias}.gols * {$gols}) + ({$epAlias}.assistencias * {$assist})
              + (CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeA>{$cpAlias}.placar_timeB)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeB>{$cpAlias}.placar_timeA)
                      THEN {$vit} ELSE 0 END)
              + (CASE WHEN {$cpAlias}.placar_timeA={$cpAlias}.placar_timeB THEN {$emp} ELSE 0 END)
              + (CASE WHEN ({$epAlias}.time_id={$cpAlias}.timeA_id AND {$cpAlias}.placar_timeA<{$cpAlias}.placar_timeB)
                        OR ({$epAlias}.time_id={$cpAlias}.timeB_id AND {$cpAlias}.placar_timeB<{$cpAlias}.placar_timeA)
                      THEN {$der} ELSE 0 END)
            END
        ";
    }

    /**
     * Gera fragmento SQL CASE WHEN para bônus de prêmios de rodada.
     * Lê dinamicamente do array BONUS_RODADA.
     * Retorna algo como: CASE pr.tipo_premio WHEN 'mvp_rodada' THEN 2 ... ELSE 0 END
     */
    public static function sqlCaseBonusRodada(string $colTipoPremio = 'pr.tipo_premio'): string
    {
        $parts = [];
        foreach (self::BONUS_RODADA as $tipo => $valor) {
            $parts[] = "WHEN '{$tipo}' THEN {$valor}";
        }
        return "CASE {$colTipoPremio} " . implode(' ', $parts) . " ELSE 0 END";
    }

    /**
     * Gera fragmento SQL CASE WHEN para bônus de prêmios de campeonato.
     * Lê dinamicamente do array BONUS_CAMPEONATO.
     */
    public static function sqlCaseBonusCampeonato(string $colTipoPremio = 'cpr.tipo_premio'): string
    {
        $parts = [];
        foreach (self::BONUS_CAMPEONATO as $tipo => $valor) {
            $parts[] = "WHEN '{$tipo}' THEN {$valor}";
        }
        return "CASE {$colTipoPremio} " . implode(' ', $parts) . " ELSE 0 END";
    }

    /**
     * Gera subquery completa para somar bônus de premios_rodada de um jogador.
     * Uso: Pontos::sqlSubqueryBonusRodada('ep.jogador_id')
     * Retorna: COALESCE((SELECT SUM(CASE ...) FROM premios_rodada pr WHERE pr.jogador_id = X), 0)
     */
    public static function sqlSubqueryBonusRodada(string $jogadorIdExpr = 'ep.jogador_id'): string
    {
        $caseWhen = self::sqlCaseBonusRodada('pr.tipo_premio');
        return "COALESCE((SELECT SUM({$caseWhen}) FROM premios_rodada pr WHERE pr.jogador_id = {$jogadorIdExpr}), 0)";
    }

    /**
     * Gera subquery completa para somar bônus de campeonato_premios de um jogador.
     * Uso: Pontos::sqlSubqueryBonusCampeonato('ep.jogador_id')
     */
    public static function sqlSubqueryBonusCampeonato(string $jogadorIdExpr = 'ep.jogador_id'): string
    {
        $caseWhen = self::sqlCaseBonusCampeonato('cpr2.tipo_premio');
        return "COALESCE((SELECT SUM({$caseWhen}) FROM campeonato_premios cpr2 WHERE cpr2.jogador_id = {$jogadorIdExpr}), 0)";
    }

    /** Pontos do título de campeonato */
    public static function sqlTitulosPontos(): int
    {
        return self::TITULO_PONTOS_CORRIDOS;
    }
}
