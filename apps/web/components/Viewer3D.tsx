"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer, buildGableRoofTruss, defaultViewsFromBbox } from "@cotizador3d/engine";

export type GableRoofParams = {
  length: number;
  depth: number;
  eaveHeight: number;
  ridgeHeight: number;
  trussCount: number;
  purlinsPerSide: number;
};

const VIEW_NAMES = ["iso", "norte", "sur", "lateral", "planta"] as const;
const TILE_MODES = [
  { key: "ghost", label: "Transparente" },
  { key: "solid", label: "Sólida" },
  { key: "hidden", label: "Oculta" },
] as const;
type TileMode = (typeof TILE_MODES)[number]["key"];

function applyTileMode(viewer: InstanceType<typeof Viewer>, mode: TileMode) {
  viewer.setLayer("roof", mode !== "hidden");
  if (mode !== "hidden") viewer.setLayerOpacity("roof", mode === "ghost" ? 0.2 : 1);
}

export default function Viewer3D({ params }: { params: GableRoofParams }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<typeof Viewer> | null>(null);
  const [tileMode, setTileMode] = useState<TileMode>("ghost");
  const tileModeRef = useRef(tileMode);

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    const { layers, bbox } = buildGableRoofTruss(params);
    const views = defaultViewsFromBbox(bbox);
    const cx = (bbox.x0 + bbox.x1) / 2, cy = (bbox.y0 + bbox.y1) / 2, cz = (bbox.z0 + bbox.z1) / 2;

    const viewer = new Viewer(canvasRef.current, stageRef.current, {
      layers,
      views,
      defaultView: "iso",
      sunTarget: [cx, cy, cz],
    });
    viewerRef.current = viewer;
    applyTileMode(viewer, tileModeRef.current);

    return () => viewer.dispose();
  }, [params]);

  useEffect(() => {
    tileModeRef.current = tileMode;
    if (viewerRef.current) applyTileMode(viewerRef.current, tileMode);
  }, [tileMode]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {VIEW_NAMES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => viewerRef.current?.setView(v)}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1 capitalize hover:bg-neutral-100"
          >
            {v}
          </button>
        ))}
        <span className="mx-2 border-l border-neutral-300" />
        <span className="text-xs text-neutral-500 self-center">Teja:</span>
        {TILE_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setTileMode(m.key)}
            className={`text-xs border rounded px-2.5 py-1 ${
              tileMode === m.key ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-neutral-100"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div ref={stageRef} className="w-full aspect-video bg-[#121821] rounded overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
