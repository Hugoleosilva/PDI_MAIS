import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Google `sub` — chave do documento PDI. */
      id: string;
    } & DefaultSession["user"];
  }
}
