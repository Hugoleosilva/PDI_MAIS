import { describe, expect, it } from "vitest";
import { mergePdi, seedHugo, syncPayloadSchema } from "@pdi-mais/core";
import { layoutGraph } from "./pdi-to-graph";

const pdi = mergePdi(null, syncPayloadSchema.parse(seedHugo), {
  userId: "u1",
  source: "manual",
});

describe("layoutGraph", () => {
  it("gera 1 raiz + 8 áreas + 32 ações", () => {
    const { nodes, edges } = layoutGraph(pdi);
    expect(nodes.filter((n) => n.type === "root")).toHaveLength(1);
    expect(nodes.filter((n) => n.type === "area")).toHaveLength(8);
    expect(nodes.filter((n) => n.type === "action")).toHaveLength(32);
    // uma aresta por área + uma por ação
    expect(edges).toHaveLength(8 + 32);
  });

  it("LR: raiz mais à esquerda que as ações; coordenadas finitas", () => {
    const { nodes } = layoutGraph(pdi, { direction: "LR" });
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
    }
    const rootX = nodes.find((n) => n.type === "root")!.position.x;
    const anyActionX = nodes.find((n) => n.type === "action")!.position.x;
    expect(rootX).toBeLessThan(anyActionX);
  });

  it("TB: raiz mais acima que as ações", () => {
    const { nodes } = layoutGraph(pdi, { direction: "TB" });
    const rootY = nodes.find((n) => n.type === "root")!.position.y;
    const anyActionY = nodes.find((n) => n.type === "action")!.position.y;
    expect(rootY).toBeLessThan(anyActionY);
  });

  it("IDs de nó são únicos", () => {
    const { nodes } = layoutGraph(pdi);
    const ids = nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
