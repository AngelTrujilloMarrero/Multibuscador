import type { CSSProperties } from 'react';
import type { ExternalStore } from '../lib/stores';
import { externalStoreUrl } from '../lib/stores';
import { StoreBadge } from './StoreBadge';

interface ExternalStoreCardProps {
  store: ExternalStore;
  query: string;
}

export function ExternalStoreCard({ store, query }: ExternalStoreCardProps) {
  const style = { '--store-color': store.color } as CSSProperties;
  const href = externalStoreUrl(store, query);

  return (
    <article
      className="store-card store-card--manual"
      style={style}
      aria-label={`${store.name}: búsqueda manual`}
    >
      <header className="store-card__head">
        <StoreBadge
          name={store.name}
          shortName={store.shortName}
          color={store.color}
        />
        <span className="manual-badge">Búsqueda manual</span>
      </header>

      <div className="manual-card__body">
        <p className="manual-card__text">
          Esta tienda bloquea la comparación automática, así que la abrimos en
          su web para que consultes precio y stock directamente.
        </p>
        <a
          className="manual-card__link"
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Buscar ${query} en ${store.name}`}
        >
          Buscar en {store.name}
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <footer className="store-card__meta">
        Se abre en una pestaña nueva · precio y stock en la tienda
      </footer>
    </article>
  );
}
