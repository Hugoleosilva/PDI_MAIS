export function EmptyState() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">🗺️</div>
      <h2 className="text-lg font-semibold">Seu PDI+ ainda está vazio</h2>
      <p className="max-w-sm text-sm text-neutral-500">
        O import manual (colar tabela / CSV) chega na Rodada 5. A sincronização
        pela extensão, na Rodada 3.
      </p>
      {isDev && (
        <a
          href="/api/dev/seed"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Carregar dados de exemplo
        </a>
      )}
    </div>
  );
}
