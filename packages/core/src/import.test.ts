import { describe, expect, it } from "vitest";
import { parseImportTable } from "./import";
import { syncPayloadSchema } from "./schema";

const root = { title: "PDI 2026", track: "Fullstack" };

// Colunas: Área, Descr. área, Ação, Descr. ação, Tipo, Prazo, Status
describe("parseImportTable", () => {
  it("agrupa por área, lê descrições, tipo, prazo e status", () => {
    const r = parseImportTable(
      [
        "Backend,Consolidar o backend,Node.js do zero,Fundamentos de Node,Treinamento e estudo,03/10/2026,Em progresso",
        "Backend,,NestJS,,Treinamento e estudo,,todo",
        "Frontend,,Next.js,,Desafio profissional,21/12/25,Finalizado",
      ].join("\n"),
      root,
    );
    expect(r.areaCount).toBe(2);
    expect(r.actionCount).toBe(3);
    expect(r.warnings).toHaveLength(0);

    const parsed = syncPayloadSchema.parse(r.payload);
    expect(parsed.areas[0].description).toBe("Consolidar o backend");
    expect(parsed.areas[0].actions[0].description).toBe("Fundamentos de Node");
    expect(parsed.areas[0].actions[0].status).toBe("doing");
    expect(parsed.areas[0].actions[0].dueDate).toBe("2026-10-03");
    expect(parsed.areas[1].actions[0].kind).toBe("desafio_profissional");
    expect(parsed.areas[1].actions[0].dueDate).toBe("2025-12-21");
  });

  it("detecta separador tab e ignora cabeçalho", () => {
    const r = parseImportTable(
      "Área\tDescrição\tAção\tDescrição\tTipo\tPrazo\tStatus\nBackend\t\tNode\t\t\t\tdoing",
      root,
    );
    expect(r.areaCount).toBe(1);
    expect(r.actionCount).toBe(1);
  });

  it("sync parcial: linha ruim vira aviso, resto entra", () => {
    const r = parseImportTable(
      [
        "Backend,,Item bom,,,,todo",
        ",,Sem area,,,,todo", // área vazia
        "Backend,,,,,,", // ação vazia
        "Backend,,Status zoado,,,,xyz", // status inválido
        "Backend,,Data zoada,,,31-31-2026,todo", // prazo inválido
      ].join("\n"),
      root,
    );
    expect(r.actionCount).toBe(3);
    expect(r.warnings.length).toBe(4);
    const parsed = syncPayloadSchema.parse(r.payload);
    expect(parsed.areas[0].actions.find((a) => a.title === "Status zoado")?.status).toBe("todo");
    expect(parsed.areas[0].actions.find((a) => a.title === "Data zoada")?.dueDate).toBeUndefined();
  });

  it("descrição entre aspas com vírgula e quebra de linha", () => {
    const text =
      'Backend,"Fundação, das APIs",Node,"Express, rotas\ne middleware",Treinamento e estudo,03/10/2026,doing';
    const r = parseImportTable(text, root);
    const parsed = syncPayloadSchema.parse(r.payload);
    expect(parsed.areas[0].description).toBe("Fundação, das APIs");
    expect(parsed.areas[0].actions[0].description).toContain("middleware");
  });

  it("aceita separador ; (Excel pt-BR)", () => {
    const r = parseImportTable("Backend;;Node;;;03/10/2026;doing", root);
    expect(r.actionCount).toBe(1);
  });
});
