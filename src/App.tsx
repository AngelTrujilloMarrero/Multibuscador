import { useState } from 'react';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HistoryChips } from './components/HistoryChips';
import { ResultsSkeleton } from './components/ResultsSkeleton';
import { ResultsView } from './components/ResultsView';
import { SearchBar } from './components/SearchBar';
import { useSearch } from './hooks/useSearch';
import type { SortMode } from './lib/stores';

export default function App() {
  const {
    query,
    setQuery,
    state,
    history,
    search,
    retry,
    clearHistory
  } = useSearch();
  const [sort, setSort] = useState<SortMode>('price');

  const selectQuery = (value: string) => {
    setQuery(value);
    void search(value);
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>

      <Header />

      <main className="main" id="main">
        <section className="hero">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={() => void search(query)}
            loading={state.status === 'loading'}
          />
          <HistoryChips
            items={history}
            onSelect={selectQuery}
            onClear={clearHistory}
          />
        </section>

        {state.status === 'idle' && <EmptyState onExample={selectQuery} />}

        {state.status === 'loading' && <ResultsSkeleton />}

        {state.status === 'error' && (
          <ErrorState message={state.error ?? 'Error inesperado.'} onRetry={retry} />
        )}

        {state.status === 'success' && state.response && (
          <ResultsView
            response={state.response}
            sort={sort}
            onSort={setSort}
            onRetry={retry}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
