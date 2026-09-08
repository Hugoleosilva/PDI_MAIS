import { describe, expect, it } from "vitest";
import { mergePdi } from "./merge";
import type { SyncPayload } from "./schema";
import type { PdiDoc } from "./types";

const payload: SyncPayload = {
  root: { title: "Tech Lead em 2 anos" },
  areas: [
    {
      title: "Arquitetura de Software",
      actions: [
        { title: "Curso DDD", status: "doing", dueDate: "2026-10-31" },
        { title: "Design de sistemas distribuídos", status: "todo" },
      ],
    },
    {
      title: "Backend",
      actions: [{ title: "Certificação AWS", status: "done" }],
    },
  ],
};

const opts = { userId: "u1", source: "extension" as const, now: new Date("2026-09-08") };

describe("mergePdi", () => {
  it("cria o documento a partir do zero", () => {
    const doc = mergePdi(null, payload, opts);
    expect(doc.userId).toBe("u1");
    expect(doc.areas).toHaveLength(2);
    expect(doc.areas[0].actions).toHaveLength(2);
    expect(doc.areas[1].status).toBe("done");
    expect(doc.syncedAt).toEqual(opts.now);
  });

  it("é idempotente: rodar duas vezes dá IDs e estrutura iguais", () => {
    const a = mergePdi(null, payload, opts);
    const b = mergePdi(a, payload, opts);
    expect(b.areas.map((x) => x.id)).toEqual(a.areas.map((x) => x.id));
    expect(b.areas.flatMap((x) => x.actions.map((y) => y.id))).toEqual(
      a.areas.flatMap((x) => x.actions.map((y) => y.id)),
    );
  });

  it("não sobrescreve status de ação marcada como manual", () => {
    const first = mergePdi(null, payload, opts);
    // usuário edita "Curso DDD" para done pelo drawer
    const edited: PdiDoc = structuredClone(first);
    const ddd = edited.areas[0].actions[0];
    ddd.status = "done";
    ddd.source = "manual";

    // extensão reimporta com "Curso DDD" ainda como doing
    const after = mergePdi(edited, payload, opts);
    const dddAfter = after.areas[0].actions.find((a) => a.title === "Curso DDD");
    expect(dddAfter?.status).toBe("done");
  });

  it("preserva layout e description locais", () => {
    const first = mergePdi(null, payload, opts);
    const edited: PdiDoc = structuredClone(first);
    edited.areas[0].layout = { x: 120, y: 40 };
    edited.areas[0].actions[1].description = "anotação minha";
    edited.areas[0].actions[1].layout = { x: 400, y: 200 };

    const after = mergePdi(edited, payload, opts);
    expect(after.areas[0].layout).toEqual({ x: 120, y: 40 });
    expect(after.areas[0].actions[1].description).toBe("anotação minha");
    expect(after.areas[0].actions[1].layout).toEqual({ x: 400, y: 200 });
  });

  it("gera o mesmo ID ignorando acento e caixa", () => {
    const p1 = mergePdi(null, payload, opts);
    const p2 = mergePdi(null, {
      ...payload,
      areas: [{ ...payload.areas[0], title: "ARQUITETURA DE SOFTWARE" }, payload.areas[1]],
    }, opts);
    expect(p2.areas[0].id).toBe(p1.areas[0].id);
  });
});
