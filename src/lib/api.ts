import type { SearchResponse } from '../../shared/types';

const FALLBACK_MESSAGE = 'No se pudo completar la búsqueda.';

interface ErrorPayload {
  error?: unknown;
  message?: unknown;
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as ErrorPayload;

  if (typeof record.error === 'string') {
    return record.error;
  }

  if (record.error && typeof record.error === 'object') {
    const nested = (record.error as { message?: unknown }).message;

    if (typeof nested === 'string') {
      return nested;
    }
  }

  if (typeof record.message === 'string') {
    return record.message;
  }

  return null;
}

async function readErrorMessage(response: Response): Promise<string> {
  if (response.status === 404) {
    return 'El servidor de precios no está disponible.';
  }

  const payload = await response.json().catch(() => null);
  const message = extractMessage(payload);

  if (message) {
    return message;
  }

  if (response.status === 429) {
    return 'Demasiadas búsquedas seguidas. Espera un minuto e inténtalo de nuevo.';
  }

  if (response.status >= 500) {
    return 'El servidor de precios ha fallado. Inténtalo más tarde.';
  }

  return FALLBACK_MESSAGE;
}

export async function searchProducts(
  query: string,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
    headers: { accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as SearchResponse;
}
