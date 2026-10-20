const STORAGE_KEY = 'multibuscador:history';
const MAX_ITEMS = 6;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && 'localStorage' in window;
}

export function readHistory(): string[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveSearch(query: string): string[] {
  const next = [
    query,
    ...readHistory().filter(
      (item) => item.toLowerCase() !== query.toLowerCase()
    )
  ].slice(0, MAX_ITEMS);

  if (canUseStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // El historial es opcional: si el navegador lo bloquea, seguimos.
    }
  }

  return next;
}

export function clearHistory(): string[] {
  if (canUseStorage()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin acceso al almacenamiento no hay nada que borrar.
    }
  }

  return [];
}
