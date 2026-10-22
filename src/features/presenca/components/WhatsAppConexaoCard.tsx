// Arquivo: src/features/presenca/components/WhatsAppConexaoCard.tsx
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Power,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  useWhatsAppStatus,
  useConectarWhatsApp,
  useDesconectarWhatsApp,
  useSimularConexaoWhatsApp,
} from '../api/presencaApi';

interface WhatsAppConexaoCardProps {
  rachaId: number;
  rachaNome?: string;
}

export const WhatsAppConexaoCard: React.FC<WhatsAppConexaoCardProps> = ({
  rachaId,
  rachaNome,
}) => {
  const { data: status, isLoading, refetch } = useWhatsAppStatus(rachaId);
  const conectarMut = useConectarWhatsApp(rachaId);
  const desconectarMut = useDesconectarWhatsApp(rachaId);
  const simularMut = useSimularConexaoWhatsApp(rachaId);

  const [confirmandoDesconexao, setConfirmandoDesconexao] = React.useState(false);

  const estado = status?.status_conexao ?? 'desconectado';
  const qrBase64 = status?.qrcode_base64 ?? status?.qr_code?.qr_code_base64;
  const numero = status?.numero_conectado;

  const handleConectar = () => {
    conectarMut.mutate(undefined, {
      onSuccess: () => refetch(),
    });
  };

  const handleDesconectar = () => {
    desconectarMut.mutate(undefined, {
      onSuccess: () => {
        setConfirmandoDesconexao(false);
        refetch();
      },
    });
  };

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-cyan-500/15">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center border',
              estado === 'conectado'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : estado === 'aguardando_qr' || estado === 'conectando'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
            )}
          >
            {estado === 'conectado' ? (
              <Wifi className="h-6 w-6" />
            ) : estado === 'aguardando_qr' || estado === 'conectando' ? (
              <QrCode className="h-6 w-6 animate-pulse" />
            ) : (
              <WifiOff className="h-6 w-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                Conexão WhatsApp — {rachaNome || `Racha #${rachaId}`}
              </h3>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border',
                  estado === 'conectado' &&
                    'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
                  estado === 'aguardando_qr' &&
                    'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse',
                  estado === 'conectando' &&
                    'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 animate-pulse',
                  estado === 'desconectado' &&
                    'bg-slate-500/20 border-slate-500/40 text-slate-300',
                  estado === 'erro' && 'bg-red-500/20 border-red-500/40 text-red-300'
                )}
              >
                {estado === 'conectado'
                  ? 'Conectado'
                  : estado === 'aguardando_qr'
                  ? 'Aguardando QR Code'
                  : estado === 'conectando'
                  ? 'Conectando...'
                  : estado === 'erro'
                  ? 'Erro de Conexão'
                  : 'Desconectado'}
              </span>
            </div>
            <p className="text-xs text-cyan-100/60 mt-0.5">
              {estado === 'conectado' && numero
                ? `Número conectado: ${numero} • Instância pronta para envio e recepção`
                : estado === 'aguardando_qr'
                ? 'Escaneie o QR Code abaixo com seu aplicativo do WhatsApp'
                : 'Instância desconectada. Clique em Conectar para iniciar o pareamento'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(estado === 'desconectado' || estado === 'erro') && (
            <Button
              size="sm"
              onClick={handleConectar}
              disabled={conectarMut.isPending || isLoading}
              className={cn(
                'font-bold text-white',
                estado === 'erro'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
              )}
            >
              {conectarMut.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  {estado === 'erro' ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
                </>
              )}
            </Button>
          )}

          {estado === 'conectado' && (
            <>
              {!confirmandoDesconexao ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmandoDesconexao(true)}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-200 font-medium">Tem certeza?</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDesconectar}
                    disabled={desconectarMut.isPending}
                    className="border-red-500 bg-red-600/30 text-white hover:bg-red-600/50"
                  >
                    {desconectarMut.isPending ? 'Saindo...' : 'Confirmar Saída'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmandoDesconexao(false)}
                    className="text-cyan-100/60 hover:text-white"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </>
          )}

          {(estado === 'aguardando_qr' || estado === 'conectando') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Status
            </Button>
          )}
        </div>
      </div>

      {/* Banner de Erro/Diagnóstico */}
      {estado === 'erro' && (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-white">Falha na integração com a Evolution API:</span>
            <p className="text-red-200/90">
              {status?.ultimo_erro_resumo || status?.mensagem_status || 'Não foi possível estabelecer contato com a Evolution API.'}
            </p>
            {status?.ultimo_erro_codigo === 'CONFIG_MISSING' && (
              <p className="text-[11px] text-red-300/80 font-mono mt-1">
                Aviso: Defina as variáveis <code>EVOLUTION_URL</code> e <code>EVOLUTION_APIKEY</code> no arquivo <code>.env</code> do servidor para conectar instâncias reais.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Banner de Modo Simulado (Sandbox Local) */}
      {status?.modo_simulado && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🧪</span>
            <div>
              <span className="font-semibold text-white">Ambiente Local — Conexão WhatsApp Simulada:</span>
              <p className="text-amber-200/90 mt-0.5">
                Nenhuma chamada externa é feita e a sessão da Oracle permanece protegida. Você pode simular conexões e envios livremente.
              </p>
            </div>
          </div>
          {estado !== 'conectado' && (
            <Button
              size="sm"
              onClick={() => simularMut.mutate()}
              disabled={simularMut.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 text-xs h-8"
            >
              {simularMut.isPending ? 'Simulando...' : 'Simular Pareamento Concluído'}
            </Button>
          )}
        </div>
      )}

      {/* Se estiver aguardando QR Code, renderiza o QR inline com instruções */}
      <AnimatePresence>
        {estado === 'aguardando_qr' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-cyan-500/15 flex flex-col md:flex-row items-center justify-center gap-6"
          >
            <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              {qrBase64 ? (
                <img
                  src={
                    qrBase64.startsWith('data:')
                      ? qrBase64
                      : `data:image/png;base64,${qrBase64}`
                  }
                  alt="QR Code WhatsApp"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-cyan-600" />
                  <span className="text-xs">Gerando QR Code...</span>
                </div>
              )}
            </div>

            <div className="max-w-md space-y-2 text-sm text-cyan-100/80">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-cyan-400" />
                Como conectar:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-cyan-100/70">
                <li>Abra o <strong>WhatsApp</strong> no seu celular.</li>
                <li>Toque em <strong>Configurações</strong> ou <strong>Menu ⋮</strong>.</li>
                <li>Selecione <strong>Aparelhos conectados</strong>.</li>
                <li>Toque em <strong>Conectar um aparelho</strong> e aponte para a imagem.</li>
              </ol>
              <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-2">
                O QR Code expira rapidamente. Se necessário, clique em "Conectar WhatsApp" novamente para gerar um novo código.
              </p>

              {status?.modo_simulado && (
                <div className="mt-3 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl space-y-2">
                  <p className="font-bold text-amber-300 text-xs">Simulação Ativa:</p>
                  <p className="text-xs text-amber-100/90">
                    Não é necessário apontar a câmera do celular. Clique no botão abaixo para simular que o aparelho foi conectado com sucesso:
                  </p>
                  <Button
                    size="sm"
                    onClick={() => simularMut.mutate()}
                    disabled={simularMut.isPending}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    {simularMut.isPending ? 'Simulando Pareamento...' : 'Simular Pareamento Imediato'}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
