"use client";

import { useMemo, useState } from "react";
import { Background, Controls, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { PdiDoc } from "@pdi-mais/core";
import { layoutGraph, type PdiNode } from "@/lib/pdi-to-graph";
import { brand } from "@/lib/theme";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import { DetailPanel } from "./DetailPanel";

/**
 * Modo Gestor (`/r/[shareId]`) — mesmo desenho salvo do canvas do dono, só
 * leitura. De propósito um componente separado do `PdiCanvas` (que é grande
 * e congelado): aqui os nós vêm direto de `layoutGraph`, sem passar pelo
 * `withHandlers` que liga os callbacks de edição — então não tem NENHUMA
 * função de mutação disponível pra um nó chamar, nem por engano.
 */
function Canvas({ pdi }: { pdi: PdiDoc }) {
  const [selected, setSelected] = useState<PdiNode | null>(null);

  const layout = useMemo(
    () =>
      layoutGraph(pdi, {
        // Roadmap: raia = bloco, card = área — mais fácil de ler de relance
        // pro gestor do que a árvore (que é mais pra ORGANIZAR, do lado do
        // dono do PDI).
        layout: "roadmap",
        groups: pdi.groups ?? [],
        positions: pdi.canvas?.positions ?? {},
        frameBoxes: pdi.canvas?.frames ?? {},
        rootSize: pdi.canvas?.rootSize,
        shapes: pdi.shapes ?? [],
      }),
    [pdi],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={layout.nodes}
        edges={layout.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        fitView
        fitViewOptions={{ padding: 0.14 }}
        minZoom={0.06}
        style={{ background: brand.pageBg }}
        onNodeClick={(_, node) => {
          if (node.type === "area" || node.type === "action") setSelected(node as PdiNode);
        }}
      >
        <Background gap={20} color={brand.gray} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {selected && (
        <DetailPanel
          node={selected}
          onClose={() => setSelected(null)}
          readOnly
          modules={
            selected.type === "area"
              ? pdi.areas.find((a) => a.id === selected.id)?.actions
              : undefined
          }
        />
      )}
    </div>
  );
}

export function ReadOnlyCanvas({ pdi }: { pdi: PdiDoc }) {
  return (
    <ReactFlowProvider>
      <Canvas pdi={pdi} />
    </ReactFlowProvider>
  );
}
