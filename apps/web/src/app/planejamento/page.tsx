import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { PlanningView } from "@/components/planning/PlanningView";
import { AppHeader } from "@/components/AppHeader";

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const pdi = await getPdiByUserId(session.user.id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F4F5]">
      <AppHeader active="planejamento" session={session} />
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 p-6">
        <h1 className="mb-2 text-xl font-bold">Planejamento</h1>
        <p className="mb-6 max-w-2xl text-sm text-neutral-500">
          Informe a carga horária de cada curso e o progresso real (módulos ou horas
          feitas), e as horas que você dedica por semana a cada bloco. O PDI+ projeta a
          data de conclusão e compara o previsto com o andamento real.
        </p>

        {pdi ? (
          <PlanningView pdi={pdi} today={today} />
        ) : (
          <p className="text-sm text-neutral-500">
            Importe seu PDI primeiro em <Link href="/import" className="underline">/import</Link>.
          </p>
        )}
      </main>
    </div>
  );
}
