interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section className="error-state" role="alert">
      <h2>No hemos podido completar la búsqueda</h2>
      <p>{message}</p>
      <button className="button-primary" type="button" onClick={onRetry}>
        Reintentar
      </button>
    </section>
  );
}
