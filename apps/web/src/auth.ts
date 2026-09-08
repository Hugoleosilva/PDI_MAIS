import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Configuração central do Auth.js (v5).
 *
 * - Estratégia JWT: não guardamos usuários/sessões no banco. A identidade é o
 *   `sub` do Google, exposto em `session.user.id`.
 * - `Google` sem argumentos lê AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET do ambiente.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
