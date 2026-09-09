import { describe, expect, it } from "vitest";
import { buildInsightPrompt } from "./insight";
import { mergePdi } from "./merge";
import { syncPayloadSchema } from "./schema";
import { seedHugo } from "./fixtures/seed-hugo";

const pdi = mergePdi(null, syncPayloadSchema.parse(seedHugo), {
  userId: "u1",
  source: "manual",
});

describe("buildInsightPrompt", () => {
  it("inclui ciclo, trilha, todas as áreas e ações", () => {
    const p = buildInsightPrompt(pdi);
    expect(p).toContain("PDI 2026");
    expect(p).toContain("Desenvolvimento Fullstack");
    for (const area of pdi.areas) expect(p).toContain(area.title);
    expect(p).toContain("Udemy: Node.js do Zero a Maestria com diversos Projetos.");
    expect(p).toContain("1-on-1");
  });

  it("mostra prazo no formato DD/MM/AAAA e o status em português", () => {
    const p = buildInsightPrompt(pdi);
    expect(p).toMatch(/prazo \d{2}\/\d{2}\/\d{4}/);
    expect(p).toContain("Finalizado");
  });
});
