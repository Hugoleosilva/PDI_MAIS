import { describe, expect, it } from "vitest";
import { parseImportTable } from "./import";
import { syncPayloadSchema } from "./schema";

const root = { title: "PDI 2026", track: "Fullstack" };

describe("parseImportTable", () => {
  it("agrupa por área e conta certo", () => {
    const r = parseImportTable(
      [
        "Backend,Node.js do zero,Em progresso,03/10/2026",
        "Backend,NestJS,todo,",
        "Frontend,Next.js,Finalizado,21/12/25",
      ].join("\n"),
      root,
    );
    expect(r.areaCount).toBe(2);
    expect(r.actionCount).toBe(3);
    expect(r.warnings).toHaveLength(0);
    const parsed = syncPayloadSchema.parse(r.payload);
    expect(parsed.areas[0].actions[0].status).toBe("doing");
    expect(parsed.areas[0].actions[0].dueDate).toBe("2026-10-03");
    expect(parsed.areas[1].actions[0].dueDate).toBe("2025-12-21");
  });

  it("detecta separador tab e ignora cabeçalho", () => {
    const r = parseImportTable("Área\tAção\tStatus\nBackend\tNode\tdoing", root);
    expect(r.areaCount).toBe(1);
    expect(r.actionCount).toBe(1);
  });

  it("sync parcial: linha ruim vira aviso, resto entra", () => {
    const r = parseImportTable(
      [
        "Backend,Item bom,todo,",
        ",Sem area,todo,", // área vazia
        "Backend,,todo,", // ação vazia
        "Backend,Status zoado,xyz,", // status inválido
        "Backend,Data zoada,todo,31-31-2026", // prazo inválido
      ].join("\n"),
      root,
    );
    expect(r.actionCount).toBe(3); // "Item bom", "Status zoado", "Data zoada"
    expect(r.warnings.length).toBe(4);
    const parsed = syncPayloadSchema.parse(r.payload);
    const zoado = parsed.areas[0].actions.find((a) => a.title === "Status zoado");
    expect(zoado?.status).toBe("todo");
    const dz = parsed.areas[0].actions.find((a) => a.title === "Data zoada");
    expect(dz?.dueDate).toBeUndefined();
  });

  it("aceita separador ; (Excel pt-BR)", () => {
    const r = parseImportTable("Backend;Node;doing;03/10/2026", root);
    expect(r.actionCount).toBe(1);
  });

  it("descrições da ação e da área (campo entre aspas com vírgula e quebra)", () => {
    const text =
      'Backend,Node,doing,03/10/2026,"Aprender Express, rotas\ne middleware","Fundação das APIs"\n' +
      "Backend,NestJS,todo,,,";
    const r = parseImportTable(text, root);
    expect(r.actionCount).toBe(2);
    const parsed = syncPayloadSchema.parse(r.payload);
    expect(parsed.areas[0].description).toBe("Fundação das APIs");
    expect(parsed.areas[0].actions[0].description).toContain("middleware");
    expect(parsed.areas[0].actions[1].description).toBeUndefined();
  });
});
