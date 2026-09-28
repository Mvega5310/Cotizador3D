"use client";

import { useState } from "react";
import { calcQuote } from "@cotizador3d/engine";
import type { Bom } from "@/lib/bom";

export default function QuoteCalculator({ bom }: { bom: Bom }) {
  const [wastePct, setWastePct] = useState(8);
  const [pricePerKg, setPricePerKg] = useState(0);
  const [pricePerNode, setPricePerNode] = useState(0);

  const q = calcQuote(bom, { wastePct, pricePerKg, pricePerNode, stage: "todo" });
  const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="border border-neutral-200 rounded p-4 space-y-4">
      <h3 className="font-medium">Cotización</h3>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <label className="space-y-1">
          <span className="block text-neutral-500">Desperdicio %</span>
          <input type="number" value={wastePct} onChange={(e) => setWastePct(Number(e.target.value))}
            className="w-full border border-neutral-300 rounded px-2 py-1" />
        </label>
        <label className="space-y-1">
          <span className="block text-neutral-500">$ / kg</span>
          <input type="number" value={pricePerKg} onChange={(e) => setPricePerKg(Number(e.target.value))}
            className="w-full border border-neutral-300 rounded px-2 py-1" />
        </label>
        <label className="space-y-1">
          <span className="block text-neutral-500">$ / nodo</span>
          <input type="number" value={pricePerNode} onChange={(e) => setPricePerNode(Number(e.target.value))}
            className="w-full border border-neutral-300 rounded px-2 py-1" />
        </label>
      </div>
      <p className="text-sm text-neutral-600">
        {fmt(q.kgWithWaste)} kg con desperdicio · {q.nodes} nodos de soldadura
      </p>
      <p className="text-2xl font-semibold">
        {q.hasPrice ? `$ ${fmt(q.total)}` : "Ingresa tus precios"}
      </p>
    </div>
  );
}
