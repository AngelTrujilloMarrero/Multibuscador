import type { SearchResponse } from '../../shared/types';
import { formatPrice, formatTook } from '../lib/format';
import type { SortMode } from '../lib/stores';
import { StoreStatusList } from './StoreStatusList';

interface SummaryBarProps {
  response: SearchResponse;
  sort: SortMode;
  onSort: (mode: SortMode) => void;
}

export function SummaryBar({ response, sort, onSort }: SummaryBarProps) {
  const withResults = response.results.filter(
    (result) => result.status === 'ok'
  ).length;
  const empty = response.results.filter(
    (result) => result.status === 'empty'
  ).length;
  const errors = response.results.filter(
    (result) => result.status === 'error'
  ).length;

  return (
    <div className="summary">
      <div className="summary__top">
        <div>
          <h2 className="summary__title">
            Resultados para <span>“{response.query}”</span>
          </h2>
          <p className="summary__meta">
            <strong>
              {withResults} de {response.results.length}
            </strong>{' '}
            tiendas con resultados
            <span aria-hidden="true">·</span>
            {formatTook(response.tookMs)}
            {response.cached && <span className="summary__tag">caché</span>}
            {empty > 0 && (
              <span className="summary__tag summary__tag--muted">
                {empty} sin coincidencias
              </span>
            )}
            {errors > 0 && (
              <span className="summary__tag summary__tag--warn">
                {errors} con error
              </span>
            )}
          </p>
        </div>

        <div className="sort" role="group" aria-label="Ordenar resultados">
          <span className="sort__label">Ordenar</span>
          <button
            type="button"
            className={sort === 'price' ? 'is-active' : ''}
            onClick={() => onSort('price')}
            aria-pressed={sort === 'price'}
          >
            Precio
          </button>
          <button
            type="button"
            className={sort === 'store' ? 'is-active' : ''}
            onClick={() => onSort('store')}
            aria-pressed={sort === 'store'}
          >
            Tienda
          </button>
        </div>
      </div>

      {response.bestPrice ? (
        <div className="best-price">
          <div className="best-price__main">
            <span className="best-price__label">Mejor precio</span>
            <strong className="best-price__value">
              {formatPrice(response.bestPrice.price)}
            </strong>
          </div>
          <div className="best-price__info">
            <span className="best-price__store">
              en {response.bestPrice.storeName}
            </span>
            <span className="best-price__note">
              El precio más bajo entre las tiendas con resultados.
            </span>
          </div>
          <span className="best-price__mark" aria-hidden="true">
            €
          </span>
        </div>
      ) : (
        <p className="best-price best-price--empty">
          No hay coincidencias claras en ninguna tienda. Prueba con otro nombre
          o con menos palabras.
        </p>
      )}

      <StoreStatusList results={response.results} />
    </div>
  );
}
