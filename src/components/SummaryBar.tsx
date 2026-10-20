import type { SearchResponse } from '../../shared/types';
import { formatPrice, formatTook } from '../lib/format';
import type { SortMode } from '../lib/stores';

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
      <div className="summary__text">
        <h2 className="summary__title">Resultados para “{response.query}”</h2>
        <p className="summary__meta">
          <strong>
            {withResults} de {response.results.length}
          </strong>{' '}
          tiendas con resultados
          <span aria-hidden="true"> · </span>
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

        {response.bestPrice ? (
          <p className="summary__best">
            Precio más bajo:{' '}
            <strong>{formatPrice(response.bestPrice.price)}</strong> en{' '}
            {response.bestPrice.storeName}
          </p>
        ) : (
          <p className="summary__best summary__best--empty">
            No hay coincidencias claras en ninguna tienda.
          </p>
        )}
      </div>

      <div className="sort" role="group" aria-label="Ordenar resultados">
        <span className="sort__label">Ordenar:</span>
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
  );
}
