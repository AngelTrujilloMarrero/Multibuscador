const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR'
});

export function formatPrice(value: number): string {
  return euroFormatter.format(value);
}

export function formatTook(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)} ms`;
  }

  return `${(milliseconds / 1000).toFixed(1).replace('.', ',')} s`;
}

export function formatTime(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoDate));
  } catch {
    return '';
  }
}
