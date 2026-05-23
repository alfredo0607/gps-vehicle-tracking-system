export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-primary">
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
