import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight">PDI+</h1>
        <p className="text-neutral-500">
          Transformando planos de desenvolvimento em jornadas.
        </p>
      </div>

      {session?.user ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Logado como <strong>{session.user.email}</strong>
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Sair
            </button>
          </form>
          <p className="text-xs text-neutral-400">
            Canvas do roadmap: Rodada 2. Import manual: Rodada 5.
          </p>
        </div>
      ) : (
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
      )}
    </main>
  );
}
