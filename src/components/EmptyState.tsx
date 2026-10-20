import { EXAMPLES, STORE_META, STORE_ORDER } from '../lib/stores';
import { StoreBadge } from './StoreBadge';

interface EmptyStateProps {
  onExample: (query: string) => void;
}

const STEPS = [
  {
    number: '1',
    title: 'Escribe el producto',
    text: 'Un modelo, una marca o una categoría. Con dos palabras basta.'
  },
  {
    number: '2',
    title: 'Comparamos en paralelo',
    text: 'Consultamos las cinco tiendas a la vez y descartamos lo que no encaja.'
  },
  {
    number: '3',
    title: 'Elige el mejor precio',
    text: 'Cada tarjeta abre la ficha real del producto en la tienda.'
  }
];

export function EmptyState({ onExample }: EmptyStateProps) {
  return (
    <section className="empty">
      <div className="empty__intro">
        <span className="empty__eyebrow">Cinco tiendas, una sola búsqueda</span>
        <h1>
          Encuentra el mejor precio <span>sin abrir cinco pestañas</span>.
        </h1>
        <p>
          Busca el nombre del producto y compara al instante la foto, el precio
          y el enlace de cada establecimiento.
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

      <ol className="steps" aria-label="Cómo funciona">
        {STEPS.map((step) => (
          <li className="steps__item" key={step.number}>
            <span className="steps__number" aria-hidden="true">
              {step.number}
            </span>
            <div>
              <h2 className="steps__title">{step.title}</h2>
              <p className="steps__text">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
