// Arquivo: src/features/ligas/components/LigaForm.tsx
"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Calendar, Trophy, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { Liga } from '@/@types';

// Schema de Validação
export const LigaFormSchema = z
  .object({
    nome: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' }),
    data_inicio: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Data de início inválida.',
    }),
    data_fim: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Data de término inválida.',
    }),
  })
  .refine((data) => new Date(data.data_fim) >= new Date(data.data_inicio), {
    message: 'Data de término deve ser após a data de início.',
    path: ['data_fim'],
  });

type LigaFormProps = {
  defaultValues?: Partial<Liga>;
  onSubmit: (values: z.infer<typeof LigaFormSchema>) => void;
  isLoading: boolean;
  onCancel: () => void;
  submitButtonText?: string;
};

export function LigaForm({
  onSubmit,
  isLoading,
  onCancel,
  defaultValues,
  submitButtonText = 'Salvar',
}: LigaFormProps) {
  const formattedDefaultValues = defaultValues
    ? {
        ...defaultValues,
        data_inicio: defaultValues.data_inicio?.split('T')[0] || '',
        data_fim: defaultValues.data_fim?.split('T')[0] || '',
      }
    : {
        nome: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
      };

  const form = useForm<z.infer<typeof LigaFormSchema>>({
    resolver: zodResolver(LigaFormSchema),
    defaultValues: formattedDefaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Campo Nome */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-cyan-100/70 font-medium text-sm flex items-center gap-2">
                <Trophy size={14} className="text-cyan-400" />
                Nome da Liga
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Liga de Sábado (Manhã)"
                  className="h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 
                    focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-[10px] text-cyan-100/40">
                Escolha um nome descritivo para facilitar a identificação
              </FormDescription>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        {/* Grid de Datas */}
        <div className="grid grid-cols-2 gap-4">
          {/* Data Início */}
          <FormField
            control={form.control}
            name="data_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-cyan-100/70 font-medium text-sm flex items-center gap-2">
                  <Calendar size={14} className="text-emerald-400" />
                  Início
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

          {/* Data Fim */}
          <FormField
            control={form.control}
            name="data_fim"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-cyan-100/70 font-medium text-sm flex items-center gap-2">
                  <Calendar size={14} className="text-red-400" />
                  Término
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
        </div>

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
  );
}