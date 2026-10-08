import ExcelJS from "exceljs";
import { obtenerProyecto } from "@/lib/proyectos";
import { UNIDAD_LABEL } from "@/lib/format";
import type { FilaDespiece, LaminaMaterial } from "@/components/Despiece";

// Desglose del proyecto en Excel, sin precios (AUDITORIA.md, S-12): para el
// ejecutor que cotiza con su propio formato y solo necesita pegar las
// cantidades. Una hoja por etapa con el cuadro de cantidades y, si hay
// tableros, el despiece y las láminas. Exige sesión y que el proyecto sea de
// la cuenta (obtenerProyecto).

type Linea = { nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean; derivada?: boolean };
type Etapa = { nombre: string; lineas: Linea[] };

// Nombre de hoja válido en Excel: máximo 31 caracteres, sin : \ / ? * [ ].
const nombreHoja = (s: string) => s.replace(/[:\\/?*[\]]/g, " ").slice(0, 31);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { proyecto, version, calculo } = await obtenerProyecto(id);
  const libro = new ExcelJS.Workbook();
  libro.created = new Date();

  for (const [n, e] of Object.entries(calculo.porEtapa as Record<string, Etapa>)) {
    const hoja = libro.addWorksheet(nombreHoja(`Etapa ${n} - ${e.nombre}`));
    hoja.columns = [
      { header: "Pieza", key: "pieza", width: 55 },
      { header: "Cantidad", key: "cantidad", width: 12 },
      { header: "Unidad", key: "unidad", width: 9 },
      { header: "Elementos", key: "n", width: 11 },
      { header: "Estado", key: "estado", width: 22 },
    ];
    for (const l of e.lineas) {
      hoja.addRow({
        pieza: l.nombre,
        cantidad: Number(l.cantidad.toFixed(3)),
        unidad: UNIDAD_LABEL[l.unidad] ?? l.unidad,
        n: l.n,
        estado: l.derivada ? "Calculado de sus piezas" : l.confirmado ? "Confirmado" : "Referencia (sin confirmar)",
      });
    }
    hoja.getRow(1).font = { bold: true };
    hoja.getColumn("cantidad").numFmt = "#,##0.000";
  }

  const despiece = calculo.despiece as FilaDespiece[];
  if (despiece.length) {
    const hoja = libro.addWorksheet("Despiece");
    hoja.columns = [
      { header: "Material", key: "material", width: 36 },
      { header: "Piezas", key: "piezas", width: 50 },
      { header: "Cantidad", key: "cantidad", width: 10 },
      { header: "Largo (mm)", key: "largo", width: 11 },
      { header: "Ancho (mm)", key: "ancho", width: 11 },
      { header: "Espesor (mm)", key: "espesor", width: 12 },
      { header: "Canto en bordes largos", key: "cl", width: 20 },
      { header: "Canto en bordes cortos", key: "cc", width: 20 },
    ];
    for (const f of despiece) {
      hoja.addRow({
        material: f.material, piezas: f.nombres.join(", "), cantidad: f.cantidad,
        largo: f.largo, ancho: f.ancho, espesor: f.espesor, cl: f.cantos[0] ?? 0, cc: f.cantos[1] ?? 0,
      });
    }
    hoja.getRow(1).font = { bold: true };

    const laminas = (calculo.laminas as LaminaMaterial[]).filter((l) => l.lamina);
    if (laminas.length) {
      const h = libro.addWorksheet("Láminas");
      h.columns = [
        { header: "Material", key: "material", width: 36 },
        { header: "Área (m²)", key: "m2", width: 11 },
        { header: "Lámina (mm)", key: "lamina", width: 14 },
        { header: "Mínimo de láminas", key: "minimo", width: 17 },
        { header: "Nota", key: "nota", width: 50 },
      ];
      for (const l of laminas) {
        h.addRow({
          material: l.nombre, m2: Number(l.m2.toFixed(3)),
          lamina: `${Math.round(l.lamina![0] * 1000)} × ${Math.round(l.lamina![1] * 1000)}`,
          minimo: l.minimo,
          nota: l.noCaben ? `${l.noCaben} pieza(s) más grandes que la lámina` : "Mínimo por área, sin contar el desperdicio de corte",
        });
      }
      h.getRow(1).font = { bold: true };
    }
  }

  const datos = await libro.xlsx.writeBuffer();
  const nombre = `desglose-${proyecto.cliente.normalize("NFD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").slice(0, 40) || "proyecto"}-v${version.numero}.xlsx`;
  return new Response(new Uint8Array(datos as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
