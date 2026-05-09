// Arquivo: src/features/presenca/components/ConfigTab.tsx
import * as React from 'react';
import { Save, Loader2, Settings, MapPin, Calendar, Clock, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useBotConfig, useUpdateBotConfig } from '../api/presencaApi';

const CAMPOS = [
  { key: 'dia_racha', label: 'Dia do racha', placeholder: 'Ex: Quinta', icon: Calendar },
  { key: 'horario_racha', label: 'Horário', placeholder: 'Ex: 20h', icon: Clock },
  { key: 'local_racha', label: 'Local', placeholder: 'Ex: Quadra do Zé', icon: MapPin },
  { key: 'intervalo_lembrete_horas', label: 'Intervalo entre lembretes (h)', placeholder: 'Ex: 24', icon: Hourglass },
] as const;

export const ConfigTab: React.FC = () => {
  const { data, isLoading } = useBotConfig();
  const saveMut = useUpdateBotConfig();
  const [form, setForm] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/40 p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-md p-4 sm:p-6 space-y-5 max-w-2xl"
    >
      <div className="flex items-start gap-3 pb-3 border-b border-cyan-500/10">
        <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Configurações do bot</h3>
          <p className="text-xs text-cyan-100/60 mt-0.5">
            Estes campos são usados nas mensagens automáticas enviadas pelo bot.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((campo) => {
          const Icon = campo.icon;
          return (
            <div key={campo.key}>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1.5">
                {campo.label}
              </label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100/40 pointer-events-none" />
                <Input
                  value={form[campo.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [campo.key]: e.target.value })}
                  placeholder={campo.placeholder}
                  className="pl-9"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={saveMut.isPending}
          className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
        >
          {saveMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar configurações
        </Button>
      </div>
    </form>
  );
};
