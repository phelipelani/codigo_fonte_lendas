// Arquivo: src/features/Campeonatos/components/CampeonatoFinalizarModal.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Trophy, Upload, Image as ImageIcon, Loader2, Sparkles, Crown } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campeonatoId: number;
  campeonatoNome: string;
  isFinalizado: boolean;
}

export function CampeonatoFinalizarModal({ isOpen, onClose, campeonatoId, isFinalizado }: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: classificacao } = useQuery({
    queryKey: ['classificacao', campeonatoId],
    queryFn: async () => (await api.get(`/campeonatos/${campeonatoId}/classificacao`)).data,
    enabled: isOpen
  });

  const provavelCampeao = classificacao?.[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);

      if (!isFinalizado) {
        await api.post(`/campeonatos/${campeonatoId}/finalizar`, {});
      }

      if (file) {
        const formData = new FormData();
        formData.append('foto', file);
        await api.post(`/campeonatos/${campeonatoId}/foto-campeao`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success(isFinalizado ? 'Foto atualizada!' : 'Campeonato encerrado com sucesso!');

      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos'] });

      onClose();
    } catch (error: any) {
      console.error('Erro ao finalizar campeonato:', error);
      const msg = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || 'Erro ao processar solicitação.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-amber-500/30 p-0 overflow-hidden max-w-md w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative p-4 sm:p-5 pb-3 sm:pb-4 shrink-0">
          <div className="absolute top-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-b from-amber-500/15 to-transparent pointer-events-none" />

          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-black">
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                className="relative shrink-0"
              >
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/30">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
                </motion.div>
              </motion.div>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                {isFinalizado ? 'Foto do Titulo' : 'Encerrar Temporada'}
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent shrink-0" />

        {/* Content — scrollable */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Destaque do Campeão */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-amber-300/60 mb-2 sm:mb-3 uppercase font-bold">
              {isFinalizado ? 'Campeao Definido' : 'Campeao Calculado (Lider)'}
            </p>

            {provavelCampeao ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2 sm:gap-3"
              >
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0d1f35] border-2 border-amber-500/50 flex items-center justify-center overflow-hidden p-1 shadow-lg shadow-amber-500/20">
                    {provavelCampeao.logo_url ? (
                      <img src={provavelCampeao.logo_url} alt={provavelCampeao.nome} className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <span className="text-xl sm:text-2xl font-black text-amber-400">
                        {provavelCampeao.nome.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                    <Crown size={12} className="text-amber-900 sm:hidden" fill="currentColor" />
                    <Crown size={14} className="text-amber-900 hidden sm:block" fill="currentColor" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white">{provavelCampeao.nome}</h3>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1f35] border border-amber-500/20 text-xs font-mono">
                  <span className="text-amber-400 font-bold">{provavelCampeao.pontos} PTS</span>
                  <span className="text-cyan-100/30">·</span>
                  <span className="text-emerald-400">{provavelCampeao.vitorias} V</span>
                </div>
              </motion.div>
            ) : (
              <p className="text-amber-400 text-sm">Tabela vazia. Jogue partidas para definir o campeao.</p>
            )}
          </div>

          {/* Área de Upload */}
          <div className="space-y-2">
            <label className="text-[10px] sm:text-xs text-cyan-100/50 uppercase font-bold flex items-center gap-2">
              <ImageIcon size={12} className="text-cyan-400" />
              Foto do Poster / Trofeu
            </label>

            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-dashed border-cyan-500/20 rounded-xl cursor-pointer bg-[#0d1f35]/50 hover:bg-[#0d1f35] hover:border-cyan-500/40 transition-colors relative overflow-hidden"
              >
                {preview ? (
                  <img src={preview} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 sm:py-5">
                    <Upload className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3 text-cyan-400/50" />
                    <p className="text-xs sm:text-sm text-cyan-100/50 mb-1">
                      <span className="font-semibold text-cyan-300">Clique para enviar</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-cyan-100/30">PNG, JPG ou WEBP</p>
                  </div>
                )}
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer — always visible */}
        <div className="p-4 sm:p-5 pt-3 sm:pt-4 border-t border-white/5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 sm:h-11 text-cyan-100/70 hover:text-white hover:bg-cyan-500/10 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !provavelCampeao}
            className="h-10 sm:h-11 px-4 sm:px-6 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-amber-900 font-bold text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Trophy className="mr-2 h-4 w-4" />
                {isFinalizado ? 'Salvar Foto' : 'Confirmar Titulo'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
