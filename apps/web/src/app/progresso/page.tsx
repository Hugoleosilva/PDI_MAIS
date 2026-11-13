import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { AppHeader } from "@/components/AppHeader";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const pdi = await getPdiByUserId(session.user.id);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F4F5]">
      <AppHeader active="progresso" session={session} />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 p-6">
        <h1 className="mb-2 text-xl font-bold">Progresso</h1>
        <p className="mb-6 max-w-2xl text-sm text-neutral-500">
          Acompanhamento do progresso real em relação às metas planejadas para o
          exercício de 2026.
        </p>

        {pdi ? (
          <ProgressDashboard areas={pdi.areas} />
        ) : (
          <p className="text-sm text-neutral-500">
            Importe seu PDI primeiro em <Link href="/import" className="underline">/import</Link>.
          </p>
        )}
      </main>
    </div>
  );
}
