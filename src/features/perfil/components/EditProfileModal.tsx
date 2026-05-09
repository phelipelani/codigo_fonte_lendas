// Arquivo: src/features/perfil/components/EditProfileModal.tsx
import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, X } from "lucide-react";
import api from "@/api";

interface EditProfileModalProps {
  acc: string;
  editNome: string;
  setEditNome: (val: string) => void;
  editFoto: string;
  setEditFoto: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
}

const EditProfileModal = React.memo(function EditProfileModal({
  acc,
  editNome,
  setEditNome,
  editFoto,
  setEditFoto,
  onClose,
  onSave,
  isPending,
}: EditProfileModalProps) {
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/upload/foto', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditFoto(res.data.url || res.data.foto_url || URL.createObjectURL(file));
    } catch {
      setEditFoto(URL.createObjectURL(file));
    }
  }, [setEditFoto]);

  const handleUploadClick = useCallback(() => {
    document.getElementById('upload-foto-perfil')?.click();
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = `${acc}60`;
    e.target.style.boxShadow = `0 0 0 2px ${acc}15`;
  }, [acc]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = `${acc}25`;
    e.target.style.boxShadow = 'none';
  }, [acc]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 100 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-2xl w-full max-w-md overflow-hidden"
        style={{ background: '#0A1428', border: `1px solid ${acc}30` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${acc}20` }}>
              <Camera size={16} style={{ color: acc }} />
            </div>
            <span className="font-black text-white">Editar Perfil</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} className="text-white/60" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview da foto atual */}
          <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ border: `2px solid ${acc}30` }}>
              {editFoto ? (
                <img src={editFoto} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: `${acc}10` }}>
                  <Camera size={20} style={{ color: acc }} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Foto atual</p>
              <button
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: `${acc}15`, color: acc, border: `1px solid ${acc}25` }}
                onClick={handleUploadClick}
              >
                <Camera size={11} className="inline mr-1" /> Trocar foto
              </button>
              <input
                type="file" id="upload-foto-perfil" className="hidden" accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Campo nome */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: `${acc}80` }}>
              Nome
            </label>
            <input
              type="text"
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Seu nome no FutLendas"
              className="w-full px-4 py-3 rounded-xl text-sm font-bold text-white outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${acc}25`,
                caretColor: acc,
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${acc}, ${acc}CC)`, color: '#000', boxShadow: `0 4px 15px ${acc}30` }}
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default EditProfileModal;
