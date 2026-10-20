import { useState } from 'react';
import type { ProductAvailability, StoreResult } from '../../shared/types';
import { formatPrice, formatTime, formatTook } from '../lib/format';
import { ProductImage } from './ProductImage';
import { StoreBadge } from './StoreBadge';

function stockState(inStock: boolean | null): 'in' | 'out' | 'unknown' {
  if (inStock === true) {
    return 'in';
  }

  if (inStock === false) {
    return 'out';
  }

  return 'unknown';
}

function stockLabel(availability: ProductAvailability): string {
  if (availability.inStock === true) {
    return `En stock en ${availability.store}`;
  }

  if (availability.inStock === false) {
    return `Sin stock en ${availability.store}`;
  }

  return `Stock en ${availability.store} no disponible`;
}

interface StoreCardProps {
  result: StoreResult;
  best: boolean;
  onRetry: () => void;
}

export function StoreCard({ result, best, onRetry }: StoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const main = result.products[0];
  const isBest = best && result.status === 'ok' && Boolean(main);

  return (
    <article className={`store-card${isBest ? ' store-card--best' : ''}`}>
      <header className="store-card__head">
        <StoreBadge
          name={result.name}
          shortName={result.shortName}
          color={result.color}
        />
        {isBest && <span className="best-badge">Precio más bajo</span>}
      </header>

      {result.status === 'ok' && main ? (
        <>
          <a
            className="product"
            href={main.productUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ProductImage
              src={main.imageUrl}
              alt={main.title}
              accent={result.color}
            />
            <div className="product__info">
              <h3 className="product__title">{main.title}</h3>
              <p className="product__price">{formatPrice(main.price)}</p>
              {main.availability && (
                <p
                  className={`product__stock product__stock--${stockState(main.availability.inStock)}`}
                >
                  {stockLabel(main.availability)}
                </p>
              )}
            </div>
          </a>

          <a
            className="store-card__link"
            href={main.productUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ver en {result.name} <span aria-hidden="true">→</span>
          </a>

          {result.products.length > 1 && (
            <div className="alternatives">
              <button
                type="button"
                className="alternatives__toggle"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
              >
                {expanded
                  ? 'Ocultar alternativas'
                  : `+${result.products.length - 1} resultados más`}
              </button>

              {expanded && (
                <ul className="alternatives__list">
                  {result.products.slice(1).map((product) => (
                    <li key={product.productUrl}>
                      <a
                        href={product.productUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>{product.title}</span>
                        <strong>{formatPrice(product.price)}</strong>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      ) : result.status === 'empty' ? (
        <div className="store-card__state">
          <span className="store-card__icon" aria-hidden="true">
            ⌕
          </span>
          <p>Sin resultados claros para esta búsqueda.</p>
        </div>
      ) : (
        <div className="store-card__state store-card__state--error">
          <span className="store-card__icon" aria-hidden="true">
            !
          </span>
          <p>{result.error ?? 'No se pudo consultar la tienda.'}</p>
          <button
            className="button-secondary"
            type="button"
            onClick={onRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      <footer className="store-card__meta">
        Consultado a las {formatTime(result.fetchedAt)} ·{' '}
        {formatTook(result.tookMs)}
      </footer>
    </article>
  );
}
