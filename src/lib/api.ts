import type { SearchResponse } from '../../shared/types';

interface ErrorPayload {
  error?: string;
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
    let message = 'No se pudo completar la búsqueda.';

    try {
      const payload = (await response.json()) as ErrorPayload;
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Mantener el mensaje genérico.
    }

    throw new Error(message);
  }

  return (await response.json()) as SearchResponse;
}
