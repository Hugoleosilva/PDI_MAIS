import Link from "next/link";

export function EmptyState() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-4xl">🗺️</div>
      <h2 className="text-lg font-semibold">Seu PDI+ ainda está vazio</h2>
      <p className="max-w-sm text-sm text-neutral-500">
        Cole a tabela do seu PDI (ou suba um CSV) para montar o roadmap.
      </p>
      <Link
        href="/import"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Importar manualmente
      </Link>
      {isDev && (
        <a href="/api/dev/seed" className="text-xs text-neutral-400 underline">
          ou carregar dados de exemplo (dev)
        </a>
      )}
    </div>
  );
}
