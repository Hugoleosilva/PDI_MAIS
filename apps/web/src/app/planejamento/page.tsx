import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { PlanningView } from "@/components/planning/PlanningView";

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const pdi = await getPdiByUserId(session.user.id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Planejamento</h1>
        {/* <a> normal de propósito — força recarregar, sem cache de navegação */}
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← voltar ao canvas
        </a>
      </div>
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
  );
}
