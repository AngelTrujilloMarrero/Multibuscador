import { useMemo } from 'react';
import type { SearchResponse } from '../../shared/types';
import type { SortMode } from '../lib/stores';
import { EXTERNAL_STORES, STORE_ORDER } from '../lib/stores';
import { ExternalStoreCard } from './ExternalStoreCard';
import { StoreCard } from './StoreCard';
import { SummaryBar } from './SummaryBar';

interface ResultsViewProps {
  response: SearchResponse;
  sort: SortMode;
  onSort: (mode: SortMode) => void;
  onRetry: () => void;
}

export function ResultsView({
  response,
  sort,
  onSort,
  onRetry
}: ResultsViewProps) {
  const ordered = useMemo(() => {
    const copy = [...response.results];

    if (sort === 'store') {
      return copy.sort(
        (left, right) =>
          STORE_ORDER.indexOf(left.store) - STORE_ORDER.indexOf(right.store)
      );
    }

    return copy.sort((left, right) => {
      const leftPrice = left.products[0]?.price ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.products[0]?.price ?? Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice;
    });
  }, [response.results, sort]);

  return (
    <section className="results" id="results" aria-live="polite">
      <SummaryBar response={response} sort={sort} onSort={onSort} />

      <div className="stores-grid">
        {ordered.map((result) => (
          <StoreCard
            key={result.store}
            result={result}
            best={result.store === response.bestPrice?.store}
            onRetry={onRetry}
          />
        ))}
      </div>

      <section className="external-stores" aria-label="Tiendas consultadas manualmente">
        <h3 className="external-stores__title">También puedes consultar</h3>
        <p className="external-stores__hint">
          Alcampo y Leroy Merlin no se comparan automáticamente: las abrimos en
          su web para que veas precio y stock directamente.
        </p>
        <div className="stores-grid stores-grid--external">
          {EXTERNAL_STORES.map((store) => (
            <ExternalStoreCard
              key={store.id}
              store={store}
              query={response.query}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
