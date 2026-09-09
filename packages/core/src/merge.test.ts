import { describe, expect, it } from "vitest";
import { mergePdi } from "./merge";
import { overallProgress, areaProgress } from "./progress";
import { syncPayloadSchema, type SyncPayloadInput } from "./schema";
import type { PdiDoc } from "./types";

const input: SyncPayloadInput = {
  root: { title: "PDI 2026", track: "Desenvolvimento Fullstack" },
  areas: [
    {
      title: "Arquitetura de Software",
      kind: "Desenvolver",
      actions: [
        { title: "Curso DDD", kind: "Treinamento e estudo", status: "Em progresso", dueDate: "2026-10-31" },
        { title: "Design de sistemas distribuídos", status: "Não iniciado" },
      ],
    },
    {
      title: "Backend",
      actions: [{ title: "Certificação AWS", status: "Finalizado" }],
    },
  ],
};

const payload = syncPayloadSchema.parse(input);
const opts = { userId: "u1", source: "extension" as const, now: new Date("2026-09-08") };

describe("mergePdi", () => {
  it("cria o documento a partir do zero", () => {
    const doc = mergePdi(null, payload, opts);
    expect(doc.userId).toBe("u1");
    expect(doc.root.track).toBe("Desenvolvimento Fullstack");
    expect(doc.areas).toHaveLength(2);
    expect(doc.areas[0].kind).toBe("desenvolver");
    expect(doc.areas[0].actions[0].kind).toBe("treinamento_estudo");
    expect(doc.areas[0].actions[0].status).toBe("doing");
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
    const edited: PdiDoc = structuredClone(first);
    const ddd = edited.areas[0].actions[0];
    ddd.status = "done";
    ddd.source = "manual";

    const after = mergePdi(edited, payload, opts);
    const dddAfter = after.areas[0].actions.find((a) => a.title === "Curso DDD");
    expect(dddAfter?.status).toBe("done");
  });

  it("preserva layout e description locais (área e ação)", () => {
    const first = mergePdi(null, payload, opts);
    const edited: PdiDoc = structuredClone(first);
    edited.areas[0].layout = { x: 120, y: 40 };
    edited.areas[0].description = "comentário meu sobre a área";
    edited.areas[0].actions[1].description = "anotação minha";
    edited.areas[0].actions[1].layout = { x: 400, y: 200 };

    const after = mergePdi(edited, payload, opts);
    expect(after.areas[0].layout).toEqual({ x: 120, y: 40 });
    expect(after.areas[0].description).toBe("comentário meu sobre a área");
    expect(after.areas[0].actions[1].description).toBe("anotação minha");
    expect(after.areas[0].actions[1].layout).toEqual({ x: 400, y: 200 });
  });

  it("preserva blocos, tirando áreas que sumiram", () => {
    const first = mergePdi(null, payload, opts);
    const a0 = first.areas[0].id;
    const edited: PdiDoc = structuredClone(first);
    edited.groups = [
      { id: "g1", title: "Bloco", color: "#2563EB", order: 0, areaIds: [a0, "fantasma"] },
    ];
    const after = mergePdi(edited, payload, opts);
    expect(after.groups?.[0].areaIds).toEqual([a0]);
  });

  it("preserva links válidos e descarta os que perderam um nó", () => {
    const first = mergePdi(null, payload, opts);
    const a0 = first.areas[0].id;
    const a1 = first.areas[1].id;
    const edited: PdiDoc = structuredClone(first);
    edited.links = [
      { id: "l1", source: a0, target: a1 },
      { id: "l2", source: a0, target: "fantasma" },
    ];

    const after = mergePdi(edited, payload, opts);
    expect(after.links?.map((l) => l.id)).toEqual(["l1"]);
  });

  it("gera o mesmo ID ignorando acento e caixa", () => {
    const p1 = mergePdi(null, payload, opts);
    const p2 = mergePdi(
      null,
      syncPayloadSchema.parse({
        ...input,
        areas: [{ ...input.areas![0], title: "ARQUITETURA DE SOFTWARE" }, input.areas![1]],
      }),
      opts,
    );
    expect(p2.areas[0].id).toBe(p1.areas[0].id);
  });
});

describe("progress", () => {
  it("areaProgress = ações done / total", () => {
    const doc = mergePdi(null, payload, opts);
    // área 0: "Curso DDD" (doing) + "Design..." (todo) => 0/2
    expect(areaProgress(doc.areas[0])).toBe(0);
    // área 1: "Certificação AWS" (done) => 1/1
    expect(areaProgress(doc.areas[1])).toBe(1);
  });

  it("overallProgress = média dos percentuais das áreas", () => {
    const doc = mergePdi(null, payload, opts);
    expect(overallProgress(doc.areas)).toBeCloseTo(0.5);
  });
});
