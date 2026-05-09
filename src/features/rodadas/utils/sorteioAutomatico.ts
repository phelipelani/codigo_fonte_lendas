// Arquivo: src/features/rodadas/utils/sorteioAutomatico.ts

import { Jogador } from '@/@types';

interface TimesSorteados {
  jogadores: Jogador[];
  pontuacaoTotal: number;
}

/**
 * Embaralha um array usando algoritmo Fisher-Yates
 */
const embaralharArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Pega a nota efetiva de um jogador
 */
const getNota = (j: Jogador): number => Number(j.nota_ultima_rodada) || j.nivel || 1;

/**
 * Sorteia times de forma balanceada por categorias
 *
 * Regras:
 * 1. Classifica jogadores em 3 tiers: MVP (top N), Pé de Rato (bottom N), Recuado
 * 2. Distribui 1 de cada tier para cada time (embaralhado)
 * 3. Preenche os restantes priorizando o time com menor pontuação
 * 4. Cada chamada gera resultado diferente (aleatoriedade real)
 */
export const sorteiarTimesAutomatico = (
  jogadores: Jogador[],
  jogadoresPorTime: number
): TimesSorteados[] => {
  if (jogadoresPorTime <= 0) return [];

  const totalJogadores = jogadores.length;
  const quantidadeTimes = Math.floor(totalJogadores / jogadoresPorTime);
  if (quantidadeTimes < 2) return [];

  // Inicializa os times vazios
  const times: TimesSorteados[] = Array.from({ length: quantidadeTimes }, () => ({
    jogadores: [],
    pontuacaoTotal: 0,
  }));

  const addToTime = (time: TimesSorteados, jogador: Jogador) => {
    time.jogadores.push(jogador);
    time.pontuacaoTotal += getNota(jogador);
  };

  // ====== CLASSIFICAÇÃO EM TIERS ======
  // Separar recuados primeiro
  const recuados: Jogador[] = [];
  const naoRecuados: Jogador[] = [];
  jogadores.forEach(j => {
    if (j.joga_recuado) recuados.push(j);
    else naoRecuados.push(j);
  });

  // Ordenar não-recuados por nota
  const naoRecuadosSorted = [...naoRecuados].sort((a, b) => getNota(b) - getNota(a));

  // Montar tiers sem sobreposição
  const usados = new Set<number>();
  const tierMvp: Jogador[] = [];
  const tierRecuado: Jogador[] = [];
  const tierPeDeRato: Jogador[] = [];
  const tierNormal: Jogador[] = [];

  // Tier MVP: top jogadores (maiores notas, não recuados)
  for (const j of naoRecuadosSorted) {
    if (tierMvp.length >= quantidadeTimes) break;
    tierMvp.push(j);
    usados.add(j.id);
  }

  // Tier Recuado: jogadores que jogam recuado
  for (const j of recuados) {
    if (tierRecuado.length >= quantidadeTimes) break;
    if (!usados.has(j.id)) {
      tierRecuado.push(j);
      usados.add(j.id);
    }
  }

  // Tier Pé de Rato: piores notas (não recuados, não MVPs)
  for (let i = naoRecuadosSorted.length - 1; i >= 0; i--) {
    if (tierPeDeRato.length >= quantidadeTimes) break;
    const j = naoRecuadosSorted[i];
    if (!usados.has(j.id)) {
      tierPeDeRato.push(j);
      usados.add(j.id);
    }
  }

  // Tier Normal: todos os restantes
  jogadores.forEach(j => {
    if (!usados.has(j.id)) {
      tierNormal.push(j);
    }
  });

  if (import.meta.env.DEV) {
    console.log(`Sorteio: ${totalJogadores} jogadores, ${quantidadeTimes} times, ${jogadoresPorTime}/time`);
    console.log(`Tiers → MVP: ${tierMvp.length}, Recuado: ${tierRecuado.length}, Pé de Rato: ${tierPeDeRato.length}, Normal: ${tierNormal.length}`);
  }

  // ====== DISTRIBUIÇÃO DOS TIERS (1 de cada por time, embaralhado) ======
  const distribuirTier = (tier: Jogador[]) => {
    const shuffled = embaralharArray(tier);
    const ordemTimes = embaralharArray([...Array(quantidadeTimes).keys()]);
    shuffled.forEach((j, i) => {
      if (i < quantidadeTimes) addToTime(times[ordemTimes[i]], j);
    });
    return shuffled.slice(quantidadeTimes); // retorna sobras
  };

  const sobrasMvp = distribuirTier(tierMvp);
  const sobrasRecuado = distribuirTier(tierRecuado);
  const sobrasPdr = distribuirTier(tierPeDeRato);

  // ====== DISTRIBUIÇÃO DOS RESTANTES (balanceado por pontuação) ======
  const restantes = embaralharArray([
    ...tierNormal,
    ...sobrasMvp,
    ...sobrasRecuado,
    ...sobrasPdr,
  ]);

  restantes.forEach(jogador => {
    // Pegar times com vaga, ordenar por menor pontuação
    const timesComVaga = times
      .filter(t => t.jogadores.length < jogadoresPorTime)
      .sort((a, b) => a.pontuacaoTotal - b.pontuacaoTotal);

    if (timesComVaga.length > 0) {
      // Entre os empatados em menor pontuação, escolher aleatoriamente
      const menorPontuacao = timesComVaga[0].pontuacaoTotal;
      const empate = timesComVaga.filter(t => t.pontuacaoTotal === menorPontuacao);
      const escolhido = empate[Math.floor(Math.random() * empate.length)];
      addToTime(escolhido, jogador);
    }
  });

  // ====== EMBARALHA ordem dos jogadores dentro de cada time ======
  const timesFinal = times.map(time => ({
    ...time,
    jogadores: embaralharArray(time.jogadores),
  }));

  if (import.meta.env.DEV) {
    timesFinal.forEach((time, index) => {
      const media = time.jogadores.length > 0 ? (time.pontuacaoTotal / time.jogadores.length).toFixed(1) : '0';
      const recuadosNoTime = time.jogadores.filter(j => j.joga_recuado).length;
      const mvpsNoTime = time.jogadores.filter(j => tierMvp.some(m => m.id === j.id)).length;
      console.log(`Time ${index + 1}: ${time.jogadores.length} jog | Média: ${media} | Recuados: ${recuadosNoTime} | MVPs: ${mvpsNoTime}`);
    });
  }

  return timesFinal;
};
