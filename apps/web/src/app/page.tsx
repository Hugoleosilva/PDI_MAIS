import { auth, signIn } from "@/auth";
import { getPdiByUserId, setOwnerNameIfChanged } from "@/lib/pdi-repo";
import { PdiCanvas } from "@/components/canvas/PdiCanvas";
import { EmptyState } from "@/components/EmptyState";
import { GeminiButton } from "@/components/GeminiButton";
import { DevelopmentAssistant } from "@/components/DevelopmentAssistant";
import { ReportButton } from "@/components/ReportButton";
import { ShareButton } from "@/components/ShareButton";
import { AppHeader } from "@/components/AppHeader";
import { brand } from "@/lib/theme";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: brand.orange }}>
            PDI+
          </h1>
          <p className="text-neutral-900">
            Transformando Planos de Desenvolvimento em Jornadas.
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
            className="rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ background: brand.orange }}
          >
            Entrar com Google
          </button>
        </form>
      </main>
    );
  }

  const pdi = await getPdiByUserId(session.user.id);
  // "Toca" o nome do dono a cada visita (barato — só escreve se mudou) pra
  // aba "Equipe" do gestor conseguir mostrar de QUEM é cada PDI; sem isso só
  // temos o nome do CICLO ("PDI 2026"), não da pessoa.
  if (pdi && session.user.name) {
    await setOwnerNameIfChanged(session.user.id, session.user.name);
  }

  return (
    <div className="flex h-screen flex-col bg-[#F4F4F5]">
      <AppHeader
        active="canvas"
        session={session}
        rightExtra={
          pdi && (
            <>
              <DevelopmentAssistant pdi={pdi} />
              <GeminiButton pdi={pdi} />
              <ReportButton pdi={pdi} />
              <ShareButton pdi={pdi} />
            </>
          )
        }
      />

      <main className="min-h-0 flex-1">
        {pdi ? <PdiCanvas pdi={pdi} /> : <EmptyState />}
      </main>
    </div>
  );
}
