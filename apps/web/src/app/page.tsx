import { auth, signIn } from "@/auth";
import { getPdiByUserId } from "@/lib/pdi-repo";
import { PdiCanvas } from "@/components/canvas/PdiCanvas";
import { EmptyState } from "@/components/EmptyState";
import { GeminiButton } from "@/components/GeminiButton";
import { ReportButton } from "@/components/ReportButton";
import { AppHeader } from "@/components/AppHeader";

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

  return (
    <div className="flex h-screen flex-col bg-[#F4F4F5]">
      <AppHeader
        active="canvas"
        session={session}
        rightExtra={
          pdi && (
            <>
              <GeminiButton pdi={pdi} />
              <ReportButton pdi={pdi} />
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
