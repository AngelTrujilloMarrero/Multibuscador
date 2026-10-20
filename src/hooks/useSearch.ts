import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchResponse } from '../../shared/types';
import { searchProducts } from '../lib/api';
import { clearHistory, readHistory, saveSearch } from '../lib/history';

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SearchViewState {
  status: SearchStatus;
  response: SearchResponse | null;
  error: string | null;
}

const INITIAL_STATE: SearchViewState = {
  status: 'idle',
  response: null,
  error: null
};

export function useSearch() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchViewState>(INITIAL_STATE);
  const [history, setHistory] = useState<string[]>(() => readHistory());
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();

    if (trimmed.length < 2) {
      setState({
        status: 'error',
        response: null,
        error: 'Escribe al menos 2 caracteres para buscar.'
      });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setQuery(trimmed);
    setState({ status: 'loading', response: null, error: null });
    setHistory(saveSearch(trimmed));

    const url = new URL(window.location.href);
    url.searchParams.set('q', trimmed);
    window.history.replaceState({}, '', url);

    try {
      const response = await searchProducts(trimmed, controller.signal);

      if (!controller.signal.aborted) {
        setState({ status: 'success', response, error: null });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setState({
        status: 'error',
        response: null,
        error:
          error instanceof Error
            ? error.message
            : 'Ha ocurrido un error inesperado.'
      });
    }
  }, []);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('q');

    if (initial && initial.trim().length >= 2) {
      void run(initial);
    }

    return () => controllerRef.current?.abort();
  }, [run]);

  const retry = useCallback(() => {
    void run(query);
  }, [query, run]);

  const clear = useCallback(() => {
    setHistory(clearHistory());
  }, []);

  return {
    query,
    setQuery,
    state,
    history,
    search: run,
    retry,
    clearHistory: clear
  };
}
