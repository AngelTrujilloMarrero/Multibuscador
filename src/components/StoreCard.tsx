import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { StoreResult } from '../../shared/types';
import { formatPrice, formatTime, formatTook } from '../lib/format';
import { ProductImage } from './ProductImage';
import { StoreBadge } from './StoreBadge';

interface StoreCardProps {
  result: StoreResult;
  best: boolean;
  onRetry: () => void;
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 4h9v9M16 4 4 16" />
    </svg>
  );
}

export function StoreCard({ result, best, onRetry }: StoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const main = result.products[0];
  const isBest = best && result.status === 'ok' && Boolean(main);
  const style = { '--store-color': result.color } as CSSProperties;
  const total = result.products.length;

  return (
    <article
      id={`store-${result.store}`}
      className={`store-card${isBest ? ' store-card--best' : ''}`}
      style={style}
    >
      <header className="store-card__head">
        <StoreBadge
          name={result.name}
          shortName={result.shortName}
          color={result.color}
        />
        {isBest ? (
          <span className="best-badge">Mejor precio</span>
        ) : total > 0 ? (
          <span className="result-count">
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </span>
        ) : null}
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
              <div className="product__bottom">
                <p className="product__price">{formatPrice(main.price)}</p>
                <span className="product__cta">
                  Ver oferta
                  <ExternalIcon />
                </span>
              </div>
            </div>
          </a>

          {total > 1 && (
            <div className="alternatives">
              <button
                type="button"
                className="alternatives__toggle"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
              >
                {expanded
                  ? 'Ocultar alternativas'
                  : `Ver ${total - 1} alternativa${total - 1 === 1 ? '' : 's'} más`}
                <span
                  className={`alternatives__chevron${expanded ? ' is-open' : ''}`}
                  aria-hidden="true"
                >
                  ▾
                </span>
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
          <h3>Sin coincidencias</h3>
          <p>No hemos encontrado resultados claros para esta búsqueda.</p>
        </div>
      ) : (
        <div className="store-card__state store-card__state--error">
          <span className="store-card__icon" aria-hidden="true">
            !
          </span>
          <h3>No se pudo consultar</h3>
          <p>{result.error ?? 'No se pudo consultar la tienda.'}</p>
          <button className="button-secondary" type="button" onClick={onRetry}>
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
