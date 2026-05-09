// Arquivo: src/lib/sorteio.ts
import { Jogador } from "@/@types";

// Embaralha um array usando o algoritmo Fisher-Yates
const embaralharArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Lógica de Sorteio de Times (Migrada do SorteioPage.jsx)
 * Balanceia por jogadores recuados e depois por nível.
 */
export const sortearTimes = (
  jogadores: Jogador[],
  jogadoresPorTime: number
) => {
  const totalJogadores = jogadores.length;
  const quantidadeTimes = Math.floor(totalJogadores / jogadoresPorTime);
  
  if (quantidadeTimes === 0 || jogadoresPorTime <= 0) {
    if (import.meta.env.DEV) console.error("Não é possível sortear times.", { totalJogadores, jogadoresPorTime });
    return { times: [], sobras: jogadores };
  }

  let times = Array.from({ length: quantidadeTimes }, (_, i) => ({
    nome: `Time ${i + 1}`,
    jogadores: [] as Jogador[],
    pontuacaoTotal: 0,
  }));

  // Separa goleiros, recuados e avançados
  const goleiros = embaralharArray(jogadores.filter(j => j.posicao === 'goleiro'));
  const recuados = embaralharArray(jogadores.filter(j => j.posicao === 'linha' && j.joga_recuado));
  const avancados = embaralharArray(jogadores.filter(j => j.posicao === 'linha' && !j.joga_recuado));

  // 1. Distribui Goleiros (se houver)
  goleiros.forEach((jogador, index) => {
    const timeIndex = index % quantidadeTimes;
    times[timeIndex].jogadores.push(jogador);
    times[timeIndex].pontuacaoTotal += (jogador.nivel ?? 1);
  });

  // 2. Distribui Recuados
  recuados.forEach((jogador, index) => {
    // Tenta alocar em times que ainda não têm recuados (ou goleiros)
    times.sort((a, b) => {
      const recuadosA = a.jogadores.filter(j => j.joga_recuado || j.posicao === 'goleiro').length;
      const recuadosB = b.jogadores.filter(j => j.joga_recuado || j.posicao === 'goleiro').length;
      if (recuadosA !== recuadosB) return recuadosA - recuadosB;
      return a.pontuacaoTotal - b.pontuacaoTotal;
    });
    
    const timeParaAdicionar = times.find(time => time.jogadores.length < jogadoresPorTime) || times[0];
    timeParaAdicionar.jogadores.push(jogador);
    timeParaAdicionar.pontuacaoTotal += (jogador.nivel ?? 1);
  });
  
  // 3. Distribui Avançados (ordenados por nível, do maior para o menor)
  const jogadoresAvancados = avancados.sort((a, b) => (b.nivel ?? 1) - (a.nivel ?? 1));
  
  jogadoresAvancados.forEach(jogador => {
    // Aloca no time com menos jogadores e, em seguida, menor pontuação
    times.sort((a, b) => a.jogadores.length - b.jogadores.length || a.pontuacaoTotal - b.pontuacaoTotal);
    
    const timeParaAdicionar = times.find(time => time.jogadores.length < jogadoresPorTime);
    
    if (timeParaAdicionar) {
      timeParaAdicionar.jogadores.push(jogador);
      timeParaAdicionar.pontuacaoTotal += (jogador.nivel ?? 1);
    }
  });

  // 4. Lida com sobras e rebalanceia se necessário (lógica de "cabeça de chave")
  // Esta é a sua lógica de 4 cabeças, 4 nota 5, etc.
  // A lógica acima é um balanceamento padrão. Vamos refinar para a SUA lógica.

  if (import.meta.env.DEV) console.warn("Lógica de sorteio atual é 'padrão'. Implementar 'cabeças de chave' aqui.");
  // TODO: Refatorar o algoritmo acima para usar sua regra de negócio
  // específica de "4 cabeças de chave", "4 nota 5", etc. [cite: 81-83]
  // Por enquanto, ele usa um balanceamento genérico por nível.

  // 5. Embaralha jogadores dentro dos times para exibição
  times.forEach(time => {
    time.jogadores = embaralharArray(time.jogadores);
  });
  
  const sobras = jogadores.filter(j => !times.some(t => t.jogadores.some(pj => pj.id === j.id)));

  return { times, sobras };
};