import { describe, expect, it } from "vitest";
import { appendSnapshot, buildSnapshot, MAX_REPORTS, snapshotDelta } from "./reports";
import { mergePdi } from "./merge";
import { syncPayloadSchema } from "./schema";
import { seedHugo } from "./fixtures/seed-hugo";
import { overallProgress } from "./progress";

const pdi = mergePdi(null, syncPayloadSchema.parse(seedHugo), {
  userId: "u1",
  source: "manual",
});

describe("buildSnapshot", () => {
  it("bate com overallProgress e traz uma linha por área", () => {
    const s = buildSnapshot(pdi, new Date("2026-01-15T10:00:00Z"));
    expect(s.overall).toBeCloseTo(overallProgress(pdi.areas));
    expect(s.areas).toHaveLength(pdi.areas.length);
    expect(s.generatedAt).toBe("2026-01-15T10:00:00.000Z");
  });

  it("gera ids diferentes em chamadas sucessivas", () => {
    const a = buildSnapshot(pdi);
    const b = buildSnapshot(pdi);
    expect(a.id).not.toBe(b.id);
  });
});

describe("appendSnapshot", () => {
  it("anexa e corta o mais antigo ao passar do limite", () => {
    let reports: ReturnType<typeof buildSnapshot>[] = [];
    for (let i = 0; i < MAX_REPORTS + 5; i++) {
      reports = appendSnapshot(reports, buildSnapshot(pdi, new Date(2026, 0, i + 1)));
    }
    expect(reports).toHaveLength(MAX_REPORTS);
    expect(reports[0].generatedAt).toBe(new Date(2026, 0, 6).toISOString());
  });
});

describe("snapshotDelta", () => {
  it("null sem relatório anterior", () => {
    expect(snapshotDelta(undefined, buildSnapshot(pdi))).toBeNull();
  });

  it("em pontos percentuais, 1 casa decimal", () => {
    const prev = { ...buildSnapshot(pdi), overall: 0.5 };
    const cur = { ...buildSnapshot(pdi), overall: 0.583 };
    expect(snapshotDelta(prev, cur)).toBe(8.3);
  });
});
