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
      <label className="search__label" htmlFor="product-search">
        ¿Qué producto buscas?
      </label>

      <div className="search__row">
        <span className="search__icon" aria-hidden="true">
          ⌕
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
          aria-describedby="search-hint"
        />
        <button
          className="search__button"
          type="submit"
          disabled={loading || value.trim().length < 2}
        >
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      <p className="search__hint" id="search-hint">
        Consultamos {STORE_ORDER.length} tiendas a la vez y te mostramos el precio
        más bajo encontrado.
      </p>
    </form>
  );
}
