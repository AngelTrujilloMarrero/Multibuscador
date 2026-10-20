export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <a className="brand" href="/" aria-label="Multibuscador, inicio">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img">
              <circle cx="13" cy="13" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
              <path
                d="M18 18l7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="brand__text">Multibuscador</span>
        </a>
        <p className="header__tagline">Compara. Encuentra. Ahorra.</p>
      </div>
    </header>
  );
}
