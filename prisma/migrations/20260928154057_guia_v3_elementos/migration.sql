/*
  Warnings:

  - You are about to drop the `PerfilMaterial` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PerfilMaterial";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Etapa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    CONSTRAINT "Etapa_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Elemento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "etapaId" TEXT,
    "nombre" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "geometria" JSONB NOT NULL,
    "piezaId" TEXT,
    "cantidad" REAL NOT NULL,
    "unidad" TEXT NOT NULL,
    "origen" TEXT NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Elemento_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Elemento_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Etapa" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Elemento_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "CatalogoPieza" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogoPieza" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "dimensiones" JSONB NOT NULL,
    "factor" REAL,
    "reutilizable" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cuenta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'prueba',
    "pruebaHasta" DATETIME,
    "cupoMes" INTEGER NOT NULL,
    "esEmpresa" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Cuenta" ("creadoEn", "cupoMes", "id", "nombre", "plan", "pruebaHasta") SELECT "creadoEn", "cupoMes", "id", "nombre", "plan", "pruebaHasta" FROM "Cuenta";
DROP TABLE "Cuenta";
ALTER TABLE "new_Cuenta" RENAME TO "Cuenta";
CREATE TABLE "new_Parametro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "unidad" TEXT,
    "origen" TEXT NOT NULL,
    "perfilId" TEXT,
    CONSTRAINT "Parametro_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Parametro_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "CatalogoPieza" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Parametro" ("clave", "id", "origen", "perfilId", "unidad", "valor", "versionId") SELECT "clave", "id", "origen", "perfilId", "unidad", "valor", "versionId" FROM "Parametro";
DROP TABLE "Parametro";
ALTER TABLE "new_Parametro" RENAME TO "Parametro";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Etapa_versionId_numero_key" ON "Etapa"("versionId", "numero");
