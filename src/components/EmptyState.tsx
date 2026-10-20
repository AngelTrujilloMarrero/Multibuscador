import { EXAMPLES, STORE_META, STORE_ORDER } from '../lib/stores';
import { StoreBadge } from './StoreBadge';

interface EmptyStateProps {
  onExample: (query: string) => void;
}

export function EmptyState({ onExample }: EmptyStateProps) {
  return (
    <section className="empty">
      <div className="empty__intro">
        <h1>
          Un producto. {STORE_ORDER.length} tiendas. Un solo vistazo.
        </h1>
        <p>
          Busca el nombre del producto y compara al instante la foto y el precio
          que ofrece cada establecimiento.
        </p>
      </div>

      <div className="empty__stores" aria-label="Tiendas disponibles">
        {STORE_ORDER.map((id) => {
          const store = STORE_META[id];
          return (
            <StoreBadge
              key={id}
              name={store.name}
              shortName={store.shortName}
              color={store.color}
            />
          );
        })}
      </div>

      <div className="empty__examples">
        <span>Prueba con:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            className="empty__example"
            type="button"
            onClick={() => onExample(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </section>
  );
}
