import type { CSSProperties } from 'react';
import type { StoreResult } from '../../shared/types';

interface StoreStatusListProps {
  results: StoreResult[];
}

function statusLabel(result: StoreResult): string {
  if (result.status === 'error') {
    return 'error';
  }

  if (result.status === 'empty') {
    return 'sin resultados';
  }

  return `${result.products.length} resultado${result.products.length === 1 ? '' : 's'}`;
}

export function StoreStatusList({ results }: StoreStatusListProps) {
  const scrollToStore = (store: string) => {
    document
      .getElementById(`store-${store}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="store-status" aria-label="Estado de las tiendas">
      {results.map((result) => {
        const style = { '--store-color': result.color } as CSSProperties;

        return (
          <button
            key={result.store}
            type="button"
            className={`store-status__item store-status__item--${result.status}`}
            style={style}
            onClick={() => scrollToStore(result.store)}
          >
            <span className="store-status__dot" aria-hidden="true" />
            <span className="store-status__name">{result.name}</span>
            <span className="store-status__count">{statusLabel(result)}</span>
          </button>
        );
      })}
    </div>
  );
}
