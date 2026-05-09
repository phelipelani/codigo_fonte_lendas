// Arquivo: src/features/jogadores/components/JogadorPhotoUpload.tsx (ATUALIZADO)
import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import api from '@/api';
import { getApiErrorMessage } from '@/utils/errorHandling';

type JogadorPhotoUploadProps = {
  currentPhotoUrl?: string;
  onPhotoChange: (photoUrl: string) => void;
  playerName?: string;
};

export const JogadorPhotoUpload = ({
  currentPhotoUrl,
  onPhotoChange,
  playerName = 'Jogador',
}: JogadorPhotoUploadProps) => {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gera iniciais para o placeholder
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Upload do arquivo para o backend (que envia pro S3)
  const uploadToS3 = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('foto', file);

    try {
      const { data } = await api.post('/upload/foto', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.url; // URL retornada pelo backend
    } catch (error: any) {
      console.error('Erro no upload:', error);
      throw new Error(getApiErrorMessage(error, 'Erro ao fazer upload da imagem'));
    }
  };

  // Handler de mudança de arquivo
  const handleFileChange = useCallback(
    async (file: File) => {
      // Validações
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        toast.error('A imagem deve ter no máximo 5MB.');
        return;
      }

      // Cria preview local imediatamente (pra UX)
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Faz upload pro S3
      setIsUploading(true);
      try {
        const s3Url = await uploadToS3(file);
        setPreview(s3Url); // Atualiza com URL real
        onPhotoChange(s3Url); // Envia URL pro formulário
        toast.success('Foto enviada com sucesso!');
      } catch (error: any) {
        toast.error(error.message);
        setPreview(currentPhotoUrl || null); // Reverte pro valor anterior
      } finally {
        setIsUploading(false);
      }
    },
    [onPhotoChange, currentPhotoUrl]
  );

  // Handler do input file
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  // Remover foto
  const handleRemove = () => {
    setPreview(null);
    onPhotoChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview da Foto ou Área de Upload */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300',
          isDragging
            ? 'border-accentPrimary bg-accent-cyan-transparent'
            : 'border-border bg-surface hover:border-borderLight',
          isUploading && 'pointer-events-none opacity-60'
        )}
      >
        <AnimatePresence mode="wait">
          {preview ? (
            // Preview da imagem
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full w-full"
            >
              <img
                src={preview}
                alt={playerName}
                className="h-full w-full object-cover"
              />

              {/* Loading overlay durante upload */}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    <Loader2 className="mx-auto mb-2 h-12 w-12 animate-spin text-accentPrimary" />
                    <p className="text-sm text-white">Enviando...</p>
                  </div>
                </div>
              )}

              {/* Botão de remover (overlay) */}
              {!isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 hover:opacity-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemove}
                    className="border-danger text-danger hover:bg-danger hover:text-white"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remover Foto
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            // Área de upload
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center p-6 text-center"
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isDragging ? (
                <>
                  <Upload className="mb-4 h-16 w-16 text-accentPrimary" />
                  <p className="text-lg font-medium text-accentPrimary">
                    Solte a imagem aqui
                  </p>
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="mb-4 h-16 w-16 animate-spin text-accentPrimary" />
                  <p className="text-lg font-medium text-textPrimary">Enviando...</p>
                </>
              ) : (
                <>
                  {/* Avatar placeholder com iniciais */}
                  <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-hero text-3xl font-bold text-white shadow-glow-cyan">
                    {getInitials(playerName)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-accentPrimary">
                    <ImageIcon className="h-5 w-5" />
                    <p className="font-medium">Adicionar Foto</p>
                  </div>
                  
                  <p className="mt-2 text-sm text-textMuted">
                    Clique ou arraste uma imagem
                  </p>
                  <p className="mt-1 text-xs text-textMuted">
                    PNG, JPG ou WEBP (max. 5MB)
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input file (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Botão alternativo de upload (quando já tem foto) */}
      {preview && !isUploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Trocar Foto
        </Button>
      )}

      {/* Indicador de status */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-sm text-textMuted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Fazendo upload para o servidor...
        </div>
      )}
    </div>
  );
};