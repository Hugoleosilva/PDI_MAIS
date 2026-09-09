import Link from "next/link";
import { formatPercent, overallProgress } from "@pdi-mais/core";
import { auth, signIn, signOut } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { PdiCanvas } from "@/components/canvas/PdiCanvas";
import { EmptyState } from "@/components/EmptyState";
import { GeminiButton } from "@/components/GeminiButton";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">PDI+</h1>
          <p className="text-neutral-500">
            Transformando planos de desenvolvimento em jornadas.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Entrar com Google
          </button>
        </form>
      </main>
    );
  }

  const pdi = await getPdiByUserId(session.user.id);
  const progress = pdi ? overallProgress(pdi.areas) : 0;

  return (
    <div className="flex h-screen flex-col bg-[#F4F4F5]">
      <header className="flex items-center gap-4 border-b border-neutral-200 bg-white px-4 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-neutral-900">
            {pdi?.root.title ?? "PDI+"}
          </span>
          {pdi?.root.track && (
            <span className="text-xs text-neutral-500">{pdi.root.track}</span>
          )}
        </div>

        {pdi && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-[#2563EB]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-neutral-700">
              {formatPercent(progress)}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {pdi && <GeminiButton pdi={pdi} />}
          <Link
            href="/import"
            className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Importar
          </Link>
          <span className="hidden text-xs text-neutral-500 sm:inline">
            {session.user.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {pdi ? <PdiCanvas pdi={pdi} /> : <EmptyState />}
      </main>
    </div>
  );
}
