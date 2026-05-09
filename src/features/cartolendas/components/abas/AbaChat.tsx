import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Avatar } from '../shared';

export function AbaChat({ ligaId }: { ligaId: number }) {
  const { user } = useAuthStore();
  const { data: chat, refetch } = useQuery({ queryKey: ['cartolendas', 'chat', ligaId], queryFn: async () => (await api.get(`/cartolendas/ligas/${ligaId}/chat`)).data as any[], refetchInterval: 30000, refetchIntervalInBackground: false });
  const [msg, setMsg] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chat]);
  const enviar = async () => {
    if (!msg.trim()) return;
    try { await api.post(`/cartolendas/ligas/${ligaId}/chat`, { mensagem: msg }); setMsg(''); refetch(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erro'); }
  };
  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ height: 480 }}>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {(chat ?? []).map((m: any) => {
          const isMe = m.usuario_id === user?.id;
          return (
            <div key={m.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
              <Avatar src={m.foto_url ?? m.avatar_url} nome={m.jogador_nome ?? m.username} size={8} className="shrink-0 self-end" />
              <div className={cn('max-w-[75%]', isMe && 'items-end flex flex-col')}>
                <p className={cn('text-[10px] text-white/30 mb-0.5 px-1', isMe && 'text-right')}>{m.jogador_nome ?? m.username}</p>
                <div className={cn('px-3 py-2 rounded-2xl text-sm', isMe ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white/8 text-white/90 rounded-bl-sm')}>{m.mensagem}</div>
                <p className="text-[9px] text-white/20 mt-0.5 px-1">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          );
        })}
        {(!chat || chat.length === 0) && <div className="h-full flex items-center justify-center text-white/20 text-sm">Manda a primeira mensagem!</div>}
      </div>
      <div className="p-3 border-t border-white/10 flex gap-2">
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()} placeholder="Manda um textao..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-purple-500/50" />
        <button onClick={enviar} disabled={!msg.trim()} className="w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"><Send size={15} className="text-white" /></button>
      </div>
    </div>
  );
}
