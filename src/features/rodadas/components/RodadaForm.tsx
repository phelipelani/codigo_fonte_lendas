// Arquivo: src/features/rodadas/components/RodadaForm.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Calendar, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form"
import { Input } from "@/components/ui/Input"
import { Rodada } from "@/@types"

// Schema de Validação
export const RodadaFormSchema = z.object({
  data: z.string().date("Data inválida. Formato esperado: AAAA-MM-DD"),
});

type RodadaFormProps = {
  defaultValues?: Partial<Rodada>;
  onSubmit: (values: z.infer<typeof RodadaFormSchema>) => void;
  isLoading: boolean;
  onCancel: () => void;
  submitButtonText?: string;
}

export function RodadaForm({ 
  onSubmit, 
  isLoading, 
  onCancel, 
  defaultValues, 
  submitButtonText = "Salvar" 
}: RodadaFormProps) {
  
  const formattedDefaultValues = defaultValues ? {
    data: defaultValues.data ? defaultValues.data.split('T')[0] : new Date().toISOString().split('T')[0],
  } : {
    data: new Date().toISOString().split('T')[0],
  };

  const form = useForm<z.infer<typeof RodadaFormSchema>>({
    resolver: zodResolver(RodadaFormSchema),
    defaultValues: formattedDefaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Campo Data */}
        <FormField
          control={form.control}
          name="data"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-cyan-100/70 font-medium text-sm flex items-center gap-2">
                <Calendar size={14} className="text-cyan-400" />
                Data da Rodada
              </FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  className="h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white 
                    focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl
                    [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
                  {...field} 
                />
              </FormControl>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {/* Botões */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="text-cyan-100/60 hover:text-cyan-100 hover:bg-cyan-500/10"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold px-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {submitButtonText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}