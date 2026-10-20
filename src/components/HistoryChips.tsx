interface HistoryChipsProps {
  items: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
}

export function HistoryChips({
  items,
  onSelect,
  onClear
}: HistoryChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="history" aria-label="Búsquedas recientes">
      <span className="history__label">Recientes:</span>
      {items.map((item) => (
        <button
          className="history__chip"
          key={item}
          type="button"
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
      <button className="history__clear" type="button" onClick={onClear}>
        Limpiar
      </button>
    </div>
  );
}
