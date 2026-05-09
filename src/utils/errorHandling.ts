/**
 * Extrai a mensagem de erro de uma resposta Axios, com fallback.
 */
export function getApiErrorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
}
