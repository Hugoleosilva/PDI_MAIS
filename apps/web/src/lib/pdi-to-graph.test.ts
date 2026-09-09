import { describe, expect, it } from "vitest";
import { mergePdi, seedHugo, syncPayloadSchema } from "@pdi-mais/core";
import { layoutGraph, type Layout } from "./pdi-to-graph";

const pdi = mergePdi(null, syncPayloadSchema.parse(seedHugo), {
  userId: "u1",
  source: "manual",
});

describe("layoutGraph — árvore", () => {
  it("tree-lr: 1 raiz + 8 áreas + 32 ações + 40 arestas", () => {
    const { nodes, edges } = layoutGraph(pdi, { layout: "tree-lr" });
    expect(nodes.filter((n) => n.type === "root")).toHaveLength(1);
    expect(nodes.filter((n) => n.type === "area")).toHaveLength(8);
    expect(nodes.filter((n) => n.type === "action")).toHaveLength(32);
    expect(edges).toHaveLength(40);
  });

  it("tree-lr: raiz à esquerda das ações", () => {
    const { nodes } = layoutGraph(pdi, { layout: "tree-lr" });
    const rootX = nodes.find((n) => n.type === "root")!.position.x;
    const actX = nodes.find((n) => n.type === "action")!.position.x;
    expect(rootX).toBeLessThan(actX);
  });

  it("tree-tb: raiz acima das ações", () => {
    const { nodes } = layoutGraph(pdi, { layout: "tree-tb" });
    const rootY = nodes.find((n) => n.type === "root")!.position.y;
    const actY = nodes.find((n) => n.type === "action")!.position.y;
    expect(rootY).toBeLessThan(actY);
  });
});

describe("layoutGraph — formatos alternativos", () => {
  const layouts: Layout[] = ["kanban", "swimlane", "radial"];

  for (const layout of layouts) {
    it(`${layout}: todas as 32 ações posicionadas com coordenadas finitas`, () => {
      const { nodes } = layoutGraph(pdi, { layout });
      const actions = nodes.filter((n) => n.type === "action");
      expect(actions).toHaveLength(32);
      for (const n of nodes) {
        expect(Number.isFinite(n.position.x)).toBe(true);
        expect(Number.isFinite(n.position.y)).toBe(true);
      }
    });
  }

  it("kanban: 3 faixas de coluna, uma por status", () => {
    const { nodes } = layoutGraph(pdi, { layout: "kanban" });
    expect(nodes.filter((n) => n.type === "band")).toHaveLength(3);
  });

  it("swimlane: uma faixa por área", () => {
    const { nodes } = layoutGraph(pdi, { layout: "swimlane" });
    expect(nodes.filter((n) => n.type === "band")).toHaveLength(8);
  });

  it("IDs de nó únicos em todos os formatos", () => {
    for (const layout of ["tree-lr", "kanban", "swimlane", "radial"] as Layout[]) {
      const { nodes } = layoutGraph(pdi, { layout });
      const ids = nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
