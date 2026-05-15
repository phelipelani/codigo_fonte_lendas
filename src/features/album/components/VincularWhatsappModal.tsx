// Arquivo: src/features/album/components/VincularWhatsappModal.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useVincularWhatsapp } from '../api/albumApi';

type Props = {
  onVinculado: () => void;
};

/**
 * Modal exibido na 1a visita ao /album quando o usuario ainda nao
 * tem whatsapp vinculado. Bloqueante (sem botao fechar) — o vinculo
 * conecta a conta do app ao bot do racha.
 */
export const VincularWhatsappModal: React.FC<Props> = ({ onVinculado }) => {
  const [valor, setValor] = React.useState('');
  const vincularMut = useVincularWhatsapp();

  const digitos = valor.replace(/\D/g, '');
  const valido = digitos.length >= 10 && digitos.length <= 13;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    vincularMut.mutate(valor, { onSuccess: onVinculado });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <motion.form
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0a1628] p-6 shadow-2xl"
      >
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
            <Phone className="h-7 w-7 text-white" />
          </div>
        </div>

        <h3 className="text-xl font-black text-white text-center">
          Confirme seu WhatsApp
        </h3>
        <p className="mt-2 text-sm text-cyan-100/60 text-center leading-relaxed">
          Usamos seu número pra conectar sua conta à sua presença no racha.
          É rápido e só precisa fazer uma vez.
        </p>

        <div className="mt-5">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1.5">
            Número com DDD
          </label>
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex: 12 99999-9999"
            inputMode="numeric"
            autoFocus
          />
          <p className="mt-1 text-[10px] text-cyan-100/40">
            Pode digitar com ou sem +55, com ou sem traço.
          </p>
        </div>

        <Button
          type="submit"
          disabled={!valido || vincularMut.isPending}
          className="mt-5 w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold disabled:opacity-50"
          size="lg"
        >
          {vincularMut.isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : null}
          Confirmar e entrar no álbum
        </Button>
      </motion.form>
    </motion.div>
  );
};
