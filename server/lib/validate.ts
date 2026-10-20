const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

export function parseQuery(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (typeof raw !== 'string') {
    return null;
  }

  const query = raw.replace(CONTROL_CHARACTERS, ' ').replace(/\s+/g, ' ').trim();

  if (query.length < 2 || query.length > 80) {
    return null;
  }

  return query;
}
