"use client";

import { useEffect, useRef } from "react";
import { useStore, type ReactFlowState } from "@xyflow/react";
import { brand } from "@/lib/theme";

const selector = (s: ReactFlowState) => ({
  width: s.width,
  height: s.height,
  transform: s.transform,
});

/** Desenha as linhas-guia de alinhamento (canvas overlay) durante o arraste. */
export function HelperLines({
  horizontal,
  vertical,
}: {
  horizontal?: number;
  vertical?: number;
}) {
  const { width, height, transform } = useStore(selector);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || !width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    el.width = width * dpr;
    el.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = brand.orange;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);

    const [tx, ty, scale] = transform;
    if (typeof vertical === "number") {
      const x = vertical * scale + tx;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    if (typeof horizontal === "number") {
      const y = horizontal * scale + ty;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [width, height, transform, horizontal, vertical]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 z-10"
      style={{ width, height }}
    />
  );
}
