"use server";

import { redirect, notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { computeBom, DEFAULT_PROFILES } from "@cotizador3d/engine";

export type ProjectFormState = { error?: string };

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await requireSession();
  const cliente = String(formData.get("cliente") || "").trim();
  const num = (k: string) => Number(formData.get(k));
  const length = num("length");
  const depth = num("depth");
  const eaveHeight = num("eaveHeight");
  const ridgeHeight = num("ridgeHeight");
  const trussCount = Math.round(num("trussCount"));
  const purlinsPerSide = Math.round(num("purlinsPerSide"));

  if (!cliente) return { error: "Escribe el nombre del cliente." };
  const positives: [string, number][] = [
    ["Largo", length],
    ["Profundidad", depth],
    ["Altura de alero", eaveHeight],
    ["Altura de cumbrera", ridgeHeight],
  ];
  for (const [label, val] of positives) {
    if (!Number.isFinite(val) || val <= 0) return { error: `${label} debe ser un número mayor que 0.` };
  }
  if (ridgeHeight <= eaveHeight) return { error: "La altura de cumbrera debe ser mayor que la del alero." };
  if (!Number.isInteger(trussCount) || trussCount < 2) return { error: "El número de cerchas debe ser un entero de al menos 2." };
  if (!Number.isInteger(purlinsPerSide) || purlinsPerSide < 0) return { error: "Correas por faldón debe ser un entero de 0 o más." };

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });

  const params = { length, depth, eaveHeight, ridgeHeight, trussCount, purlinsPerSide, profiles: DEFAULT_PROFILES };
  const bom = computeBom(params);

  const proyecto = await prisma.proyecto.create({
    data: {
      cuentaId: usuario.cuentaId,
      creadoPorId: usuario.id,
      cliente,
      tipoObra: "cubierta_cercha",
      estado: "generado",
    },
  });

  const version = await prisma.versionProyecto.create({
    data: { proyectoId: proyecto.id, numero: 1 },
  });

  await prisma.parametro.createMany({
    data: [
      { versionId: version.id, clave: "length", valor: String(length), unidad: "m", origen: "usuario" },
      { versionId: version.id, clave: "depth", valor: String(depth), unidad: "m", origen: "usuario" },
      { versionId: version.id, clave: "eaveHeight", valor: String(eaveHeight), unidad: "m", origen: "usuario" },
      { versionId: version.id, clave: "ridgeHeight", valor: String(ridgeHeight), unidad: "m", origen: "usuario" },
      { versionId: version.id, clave: "trussCount", valor: String(trussCount), origen: "usuario" },
      { versionId: version.id, clave: "purlinsPerSide", valor: String(purlinsPerSide), origen: "usuario" },
    ],
  });

  await prisma.resultado.create({
    data: {
      versionId: version.id,
      renders: [],
      bom: bom as unknown as Prisma.InputJsonValue,
      marcaAgua: true,
    },
  });

  redirect(`/projects/${proyecto.id}`);
}

// Trae un proyecto solo si pertenece a la cuenta del usuario en sesión —
// aquí es donde se garantiza que los proyectos de cuentas distintas nunca
// se mezclen ni sean visibles entre sí.
export async function getOwnedProject(projectId: string) {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });

  const proyecto = await prisma.proyecto.findFirst({
    where: { id: projectId, cuentaId: usuario.cuentaId },
    include: {
      versiones: {
        orderBy: { numero: "desc" },
        take: 1,
        include: { parametros: true, resultado: true },
      },
    },
  });
  if (!proyecto) notFound();
  return proyecto;
}
