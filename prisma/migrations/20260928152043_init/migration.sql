-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'prueba',
    "pruebaHasta" DATETIME,
    "cupoMes" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "tipoObra" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proyecto_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Proyecto_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArchivoEntrada" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyectoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT,
    "descripcion" TEXT,
    "subidoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchivoEntrada_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VersionProyecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proyectoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VersionProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parametro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "unidad" TEXT,
    "origen" TEXT NOT NULL,
    "perfilId" TEXT,
    CONSTRAINT "Parametro_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Parametro_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilMaterial" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerfilMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT,
    "nombre" TEXT NOT NULL,
    "ancho" REAL NOT NULL,
    "alto" REAL NOT NULL,
    "kgPorM" REAL NOT NULL,
    "reutilizable" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Resultado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "renders" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "linkCompleto" TEXT,
    "linkCliente" TEXT,
    "marcaAgua" BOOLEAN NOT NULL DEFAULT true,
    "bom" JSONB NOT NULL,
    "generadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resultado_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlantillaCotizacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "mapeoColumnas" JSONB NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlantillaCotizacion_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VersionProyecto_proyectoId_numero_key" ON "VersionProyecto"("proyectoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_versionId_key" ON "Resultado"("versionId");
