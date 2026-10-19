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
 * Parser determinístico para datas vindas da API.
 * Resolve incompatibilidades conhecidas do WebKit/Safari (ex: "YYYY-MM-DD" tratado como UTC ou
 * strings com espaço "YYYY-MM-DD HH:MM:SS" que retornam Invalid Date).
 * Garante que datas de calendário mantenham dia/mês/ano idênticos em qualquer fuso horário e navegador.
 */
export function parseApiDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const valueStr = String(value).trim();
  if (!valueStr) return null;

  // 1. Data de calendário simples: YYYY-MM-DD
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valueStr);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    // Usamos 12:00:00 (meio-dia) para proteger contra desvios de timezone
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  }

  // 2. Data com horário sem timezone explícito: YYYY-MM-DD HH:MM:SS ou YYYY-MM-DDTHH:MM:SS
  const dateTimeMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?$/.exec(valueStr);
  if (dateTimeMatch) {
    const [, y, m, d, h, min, s, ms] = dateTimeMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const hour = Number(h);
    const minute = Number(min);
    const second = s ? Number(s) : 0;
    const millisecond = ms ? Number(ms.padEnd(3, '0').substring(0, 3)) : 0;
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
    const date = new Date(year, month - 1, day, hour, minute, second, millisecond);
    return isNaN(date.getTime()) ? null : date;
  }

  // 3. Formato ISO completo com fuso horário (ex: Z ou +03:00 / -03:00)
  const isoWithTzMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?(?:Z|([+-]\d{2}:?\d{2}))$/.exec(valueStr);
  if (isoWithTzMatch) {
    const normalized = valueStr.replace(' ', 'T');
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  }

  // 4. Fallback seguro para outros formatos
  try {
    const normalized = valueStr.includes(' ') ? valueStr.replace(' ', 'T') : valueStr;
    const date = new Date(normalized);
    if (!isNaN(date.getTime())) return date;
    const rawDate = new Date(valueStr);
    return isNaN(rawDate.getTime()) ? null : rawDate;
  } catch {
    return null;
  }
}

/**
 * Retorna o timestamp em milissegundos para ordenação segura (sem risco de NaN).
 */
export function getApiDateTimestamp(value: string | Date | null | undefined): number {
  const date = parseApiDate(value);
  return date ? date.getTime() : 0;
}

/**
 * Formata uma data para o padrão brasileiro DD/MM/YYYY.
 */
export function formatDate(value: string | Date | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) return '-';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data para o padrão DD/MM (ex: 18/05).
 */
export function formatDateDayMonth(value: string | Date | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}`;
}

/**
 * Retorna apenas o ano da data (ex: 2025).
 */
export function formatDateYear(value: string | Date | null | undefined): string {
  const date = parseApiDate(value);
  return date ? String(date.getFullYear()) : '';
}

/**
 * Formata uma data para o padrão por extenso (ex: 19 de novembro de 2025).
 */
export function formatDateLong(value: string | Date | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) return '';
  try {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return formatDate(value);
  }
}

/**
 * Retorna o dia e mês curto de forma segura (ex: { dia: '19', mes: 'nov' }).
 */
export function formatDateShortMonth(value: string | Date | null | undefined): { dia: string; mes: string } {
  const date = parseApiDate(value);
  if (!date) return { dia: '--', mes: '--' };
  try {
    const dia = date.toLocaleDateString('pt-BR', { day: '2-digit' });
    const mes = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return { dia, mes };
  } catch {
    const dia = String(date.getDate()).padStart(2, '0');
    return { dia, mes: '' };
  }
}

/**
 * Formata um horário para o padrão HH:mm de forma segura (ex: 14:30).
 */
export function formatTime(value: string | Date | null | undefined): string {
  const date = parseApiDate(value);
  if (!date) return '--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}