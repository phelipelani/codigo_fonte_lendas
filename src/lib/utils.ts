// Arquivo: src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
// O date-fns não é necessário para essa correção específica de timezone,
// mas se você usa em outros lugares, pode manter o import.

/**
 * Combina classes do Tailwind de forma inteligente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma string de data (ISO) ou objeto Date para o formato DD/MM/YYYY.
 * Usa métodos UTC para evitar que o fuso horário do Brasil (UTC-3) recue o dia.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    
    // Verifica se a data é inválida
    if (isNaN(d.getTime())) return 'Data Inválida';

    // CORREÇÃO: Usamos getUTCDate() e getUTCMonth()
    // Isso ignora o horário do navegador e pega a data "crua" do servidor
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Mês começa em 0
    const year = d.getUTCFullYear();

    return `${day}/${month}/${year}`;
    
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return 'Data Inválida';
  }
}