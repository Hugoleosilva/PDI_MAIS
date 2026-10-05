import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Configuração central do Auth.js (v5).
 *
 * - Estratégia JWT: não guardamos usuários/sessões no banco. A identidade é o
 *   `sub` do Google, exposto em `session.user.id`.
 * - `Google` lê AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET do ambiente.
 * - `prompt: "select_account"` força o Google a sempre mostrar a tela de
 *   escolha de conta — sem isso, com o navegador/perfil já logado numa conta
 *   (ex.: a do trabalho), o Google pula direto pra ela e nunca oferece
 *   escolher outra (como a pessoal) usada nesse app.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google({ authorization: { params: { prompt: "select_account" } } })],
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * Sem adapter de banco, o Auth.js gera um `user.id` ALEATÓRIO a cada
     * login (pensado pra quando um adapter reaproveita o id salvo na
     * primeira vez) — o identificador estável de verdade é
     * `account.providerAccountId` (o `sub` do Google, presente só no
     * primeiro login desse ciclo de token). Sem fixar isso aqui, toda vez
     * que a sessão precisava ser renovada (cookie limpo, JWT expirado) o
     * usuário virava "novo" no Mongo, perdendo acesso ao PDI salvo.
     */
    jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
