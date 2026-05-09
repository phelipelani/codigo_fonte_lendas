import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, CheckCircle, Download, ExternalLink } from "lucide-react";

interface Props {
  onAvatarUploaded: (url: string) => void;
}

export default function RpmCreator({ onAvatarUploaded }: Props) {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL do criador do Ready Player Me
  const rpmEditorUrl = "https://readyplayer.me/avatar";

  const handleProcess = async () => {
    // Validação básica
    if (!url.trim()) {
        return; 
    }
    
    // Aceita URLs do RPM ou arquivos locais (.glb)
    if (!url.includes('.glb')) {
        alert("A URL deve terminar em .glb");
        return;
    }

    setIsSubmitting(true);
    
    // Simula um pequeno delay para feedback visual
    // Na verdade, apenas passamos a URL para o pai (PerfilPage)
    // O Pai vai chamar a API /jogadores/:id/avatar que JÁ SABE lidar com essa URL
    setTimeout(() => {
        onAvatarUploaded(url);
        setIsSubmitting(false);
        setUrl(""); // Limpa o campo
    }, 500);
  };

  return (
    <div className="bg-surfaceElevated p-6 rounded-xl border border-border space-y-6">
        <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accentPrimary/20 text-accentPrimary mb-3">
                <Download size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Criar Avatar 3D</h3>
            <p className="text-sm text-textMuted mb-4">
                Crie seu boneco no site oficial e cole o link gerado aqui.
            </p>
            
            <Button 
                variant="outline" 
                className="w-full border-accentPrimary text-accentPrimary hover:bg-accentPrimary/10 gap-2"
                onClick={() => window.open(rpmEditorUrl, '_blank')}
            >
                Abrir Criador Externo <ExternalLink size={14} />
            </Button>
        </div>

        <div className="space-y-3">
            <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="text-xs text-textMuted font-mono">URL</span>
                </div>
                <Input 
                    value={url} 
                    onChange={(e) => setUrl(e.target.value)} 
                    placeholder="Cole o link .glb aqui..." 
                    className="pl-10 bg-black/20 border-border"
                />
            </div>

            <Button 
                onClick={handleProcess} 
                disabled={!url || isSubmitting} 
                className="w-full bg-gradient-success hover:shadow-glow-success text-white font-bold"
            >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                Salvar Avatar
            </Button>
        </div>
        
        <div className="text-xs text-textMuted text-center bg-surface p-2 rounded border border-white/5">
            <strong>Dica:</strong> No final da criação, clique em "Copy Link" e cole acima.
        </div>
    </div>
  );
}