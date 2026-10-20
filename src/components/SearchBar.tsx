import { STORE_ORDER } from '../lib/stores';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  loading
}: SearchBarProps) {
  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="search__heading">
        <span className="search__eyebrow">Comparador de precios</span>
        <label className="search__label" htmlFor="product-search">
          ¿Qué producto buscas?
        </label>
      </div>

      <div className="search__row">
        <span className="search__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l5 5" />
          </svg>
        </span>

        <input
          id="product-search"
          className="search__input"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ej. iPhone 15, teclado Logitech, lavadora…"
          autoComplete="off"
          autoFocus
          enterKeyHint="search"
          aria-describedby="search-hint"
        />

        {value.length > 0 && (
          <button
            className="search__clear"
            type="button"
            onClick={() => onChange('')}
            aria-label="Borrar la búsqueda"
          >
            ×
          </button>
        )}

        <button
          className="search__button"
          type="submit"
          disabled={loading || value.trim().length < 2}
        >
          {loading && <span className="search__spinner" aria-hidden="true" />}
          {loading ? 'Buscando' : 'Comparar'}
        </button>
      </div>

      <p className="search__hint" id="search-hint">
        Consultamos {STORE_ORDER.length} tiendas en paralelo y ordenamos los
        resultados por precio. Sin registro y sin coste.
      </p>
    </form>
  );
}
