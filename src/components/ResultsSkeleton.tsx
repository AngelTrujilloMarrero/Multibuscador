const SKELETON_CARDS = [0, 1, 2, 3, 4, 5];

export function ResultsSkeleton() {
  return (
    <section className="results" aria-busy="true" aria-label="Buscando productos">
      <div className="summary summary--skeleton">
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
      </div>

      <div className="stores-grid">
        {SKELETON_CARDS.map((card) => (
          <div className="store-card skeleton-card" key={card}>
            <div className="skeleton skeleton--badge" />
            <div className="skeleton skeleton--image" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
          </div>
        ))}
      </div>
    </section>
  );
}
