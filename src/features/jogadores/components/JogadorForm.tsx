// Arquivo: src/features/jogadores/components/JogadorForm.tsx

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/Button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { Input } from "@/components/ui/Input"
import { Checkbox } from "@/components/ui/Checkbox"
import { Jogador } from "@/@types"
import { JogadorPhotoUpload } from "./JogadorPhotoUpload_S3"

// Schema de Validação
export const JogadorFormSchema = z.object({
  nome: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres.",
  }),
  posicao: z.enum(['linha', 'goleiro'], {
    message: "Posição inválida.",
  }),
  nivel: z.coerce
    .number()
    .min(0, { message: "Nível deve ser no mínimo 0." })
    .max(10, { message: "Nível deve ser no máximo 10." }),
  joga_recuado: z.boolean().default(false),
  foto_url: z.string().optional(),
})

// Tipos de Props do Componente
type JogadorFormProps = {
  defaultValues?: Partial<Jogador>;
  onSubmit: (values: z.infer<typeof JogadorFormSchema>) => void;
  isLoading: boolean;
  submitButtonText?: string;
}

export function JogadorForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitButtonText = "Salvar"
}: JogadorFormProps) {
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof JogadorFormSchema>>({
    resolver: zodResolver(JogadorFormSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      posicao: defaultValues?.posicao || "linha",
      nivel: defaultValues?.nivel || 0,
      joga_recuado: !!defaultValues?.joga_recuado,
      foto_url: defaultValues?.foto_url || "",
    },
  })

  // Watch do nome para usar no upload
  const playerName = form.watch('nome') || 'Jogador';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Layout 2 Colunas (Desktop) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Coluna Esquerda: Foto (1/3) */}
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-textPrimary">
              Foto do Jogador
            </h3>
            <FormField
              control={form.control}
              name="foto_url"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <JogadorPhotoUpload
                      currentPhotoUrl={field.value}
                      onPhotoChange={field.onChange}
                      playerName={playerName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Coluna Direita: Formulário (2/3) */}
          <div className="space-y-6 lg:col-span-2">
            <h3 className="font-display text-lg font-semibold text-textPrimary">
              Informações Básicas
            </h3>

            {/* Campo Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Cristiano Ronaldo"
                      className="input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Grid: Posição e Nível */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Campo Posição (Select) */}
              <FormField
                control={form.control}
                name="posicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posição *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a posição" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="linha">⚽ Linha</SelectItem>
                        <SelectItem value="goleiro">🧤 Goleiro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Nível */}
              <FormField
                control={form.control}
                name="nivel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível (0-10) *</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          className="flex-1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                        <div className="flex h-12 w-16 items-center justify-center rounded-lg border-2 border-accentPrimary bg-gradient-hero/10 font-display text-2xl font-bold text-accentPrimary">
                          {field.value}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      {field.value === 0 && 'Iniciante'}
                      {field.value > 0 && field.value <= 3 && 'Básico'}
                      {field.value > 3 && field.value <= 6 && 'Intermediário'}
                      {field.value > 6 && field.value <= 8 && 'Avançado'}
                      {field.value > 8 && 'Expert'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Divisor */}
            <div className="divider" />

            {/* Campo Joga Recuado (Checkbox) */}
            <FormField
              control={form.control}
              name="joga_recuado"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-borderLight bg-surface/50 p-4 transition-colors hover:bg-surface">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer text-base">
                      🛡️ Defensor (Joga Recuado)
                    </FormLabel>
                    <FormDescription>
                      Marque se este jogador for zagueiro/defensor (para bônus de clean sheet).
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Divisor Final */}
        <div className="divider" />

        {/* Botões de Ação */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/jogadores')}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}