import { memo, useMemo } from 'react';

interface Props { campeonatos: any[]; }
export const CompetitionTypeChart = memo(({ campeonatos }: Props) => {
  const stats = useMemo(() => {
    const s = { 'pontos_corridos': 0, 'copa': 0, 'mata_mata': 0, 'outros': 0 };
    campeonatos.forEach(c => {
      if (c.formato === 'pontos_corridos') s['pontos_corridos']++;
      else if (c.formato === 'copa') s['copa']++;
      else if (c.formato === 'mata_mata') s['mata_mata']++;
      else s['outros']++;
    });
    return s;
  }, [campeonatos]);

  const data = [
    { label: 'Pontos Corridos', val: stats['pontos_corridos'], color: 'bg-purple-500' },
    { label: 'Copas', val: stats['copa'], color: 'bg-indigo-500' },
    { label: 'Mata-Mata', val: stats['mata_mata'], color: 'bg-amber-500' },
    { label: 'Outros', val: stats['outros'], color: 'bg-cyan-500' }
  ];
  
  const total = campeonatos.length || 1;
  const p1 = (data[0].val/total)*100;
  const p2 = p1 + (data[1].val/total)*100;
  const p3 = p2 + (data[2].val/total)*100;

  return (
    <div className="rounded-xl border border-border/50 bg-surfaceElevated/30 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-6 mb-8">
      <div className="flex-1">
        <h3 className="text-[10px] font-bold text-textMuted uppercase tracking-wider mb-4 ml-1">Tipos de Competição</h3>
        <div className="flex items-center gap-6">
          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full flex-shrink-0" style={{ 
            background: `conic-gradient(#a855f7 0% ${p1}%, #6366f1 ${p1}% ${p2}%, #f59e0b ${p2}% ${p3}%, #06b6d4 ${p3}% 100%)`
          }}>
            <div className="absolute inset-2 md:inset-3 bg-[#0a1628] rounded-full"></div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-y-2 gap-x-4">
            {data.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-white/80">
                  <div className={`w-2 h-2 rounded-full ${d.color}`} />
                  {d.label}
                </div>
                <span className="font-bold text-white">{d.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
