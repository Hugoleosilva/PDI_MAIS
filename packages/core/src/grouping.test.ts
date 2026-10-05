import { describe, expect, it } from "vitest";
import { buildGroupingPrompt, parseGroupingSuggestion } from "./grouping";
import { mergePdi } from "./merge";
import { syncPayloadSchema } from "./schema";

const payload = syncPayloadSchema.parse({
  root: { title: "PDI 2026" },
  areas: [
    { title: "Backend" },
    { title: "Frontend" },
    { title: "Inglês" },
  ],
});
const pdi = mergePdi(null, payload, { userId: "u1", source: "manual" });

describe("buildGroupingPrompt", () => {
  it("lista todas as áreas no prompt", () => {
    const prompt = buildGroupingPrompt(pdi);
    expect(prompt).toContain("Backend");
    expect(prompt).toContain("Frontend");
    expect(prompt).toContain("Inglês");
  });
});

describe("parseGroupingSuggestion", () => {
  it("casa títulos ignorando acento/caixa e gera blocos com IDs reais", () => {
    const raw = JSON.stringify([
      { title: "Engenharia", areaTitles: ["backend", "FRONTEND"] },
      { title: "Idiomas", areaTitles: ["ingles"] },
    ]);
    const { groups, unmatched } = parseGroupingSuggestion(pdi, raw);
    expect(unmatched).toHaveLength(0);
    expect(groups).toHaveLength(2);
    expect(groups[0].areaIds).toHaveLength(2);
    expect(groups[1].areaIds).toEqual([pdi.areas.find((a) => a.title === "Inglês")!.id]);
  });

  it("extrai o JSON mesmo com texto/markdown ao redor", () => {
    const raw = "Aqui está:\n```json\n" + JSON.stringify([
      { title: "Tudo", areaTitles: ["Backend", "Frontend", "Inglês"] },
    ]) + "\n```";
    const { groups } = parseGroupingSuggestion(pdi, raw);
    expect(groups).toHaveLength(1);
    expect(groups[0].areaIds).toHaveLength(3);
  });

  it("reporta título que não bate com nenhuma área real", () => {
    const raw = JSON.stringify([
      { title: "Bloco", areaTitles: ["Backend", "Área que não existe"] },
    ]);
    const { unmatched } = parseGroupingSuggestion(pdi, raw);
    expect(unmatched).toEqual(["Área que não existe"]);
  });

  it("uma área só entra no primeiro bloco que a reivindicar (nunca duplica, bloco vazio não sobra)", () => {
    const raw = JSON.stringify([
      { title: "Bloco A", areaTitles: ["Backend"] },
      { title: "Bloco B", areaTitles: ["Backend"] },
    ]);
    const { groups } = parseGroupingSuggestion(pdi, raw);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("Bloco A");
    expect(groups[0].areaIds).toHaveLength(1);
  });

  it("joga erro claro se não for JSON válido", () => {
    expect(() => parseGroupingSuggestion(pdi, "isso não é json")).toThrow();
  });
});
