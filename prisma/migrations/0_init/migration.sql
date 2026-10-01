-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('prueba', 'personal', 'profesional', 'empresa');

-- CreateEnum
CREATE TYPE "Unidad" AS ENUM ('kg', 'm2', 'm3', 'ml', 'und');

-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('borrador', 'en_revision', 'generado', 'entregado');

-- CreateEnum
CREATE TYPE "OrigenParametro" AS ENUM ('ia', 'usuario');

-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('verificacion', 'recuperacion');

-- CreateTable
CREATE TABLE "Cuenta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'prueba',
    "pruebaHasta" TIMESTAMP(3),
    "cupoMes" INTEGER NOT NULL,
    "esEmpresa" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "cuentaId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAuth" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "tipoObra" TEXT NOT NULL,
    "estado" "EstadoProyecto" NOT NULL DEFAULT 'borrador',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivoEntrada" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT,
    "descripcion" TEXT,
    "subidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoEntrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionProyecto" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etapa" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Elemento" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "etapaId" TEXT,
    "nombre" TEXT NOT NULL,
    "forma" TEXT NOT NULL,
    "geometria" JSONB NOT NULL,
    "piezaId" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidad" "Unidad" NOT NULL,
    "origen" "OrigenParametro" NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Elemento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametro" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "unidad" TEXT,
    "origen" "OrigenParametro" NOT NULL,
    "perfilId" TEXT,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoPieza" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" "Unidad" NOT NULL,
    "dimensiones" JSONB NOT NULL,
    "factor" DOUBLE PRECISION,
    "reutilizable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CatalogoPieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resultado" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "renders" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "linkCompleto" TEXT,
    "linkCliente" TEXT,
    "marcaAgua" BOOLEAN NOT NULL DEFAULT true,
    "bom" JSONB NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaCotizacion" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "mapeoColumnas" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantillaCotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TokenAuth_token_key" ON "TokenAuth"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VersionProyecto_proyectoId_numero_key" ON "VersionProyecto"("proyectoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Etapa_versionId_numero_key" ON "Etapa"("versionId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_versionId_key" ON "Resultado"("versionId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenAuth" ADD CONSTRAINT "TokenAuth_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivoEntrada" ADD CONSTRAINT "ArchivoEntrada_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionProyecto" ADD CONSTRAINT "VersionProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etapa" ADD CONSTRAINT "Etapa_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Elemento" ADD CONSTRAINT "Elemento_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Elemento" ADD CONSTRAINT "Elemento_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "Etapa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Elemento" ADD CONSTRAINT "Elemento_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "CatalogoPieza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parametro" ADD CONSTRAINT "Parametro_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parametro" ADD CONSTRAINT "Parametro_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "CatalogoPieza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resultado" ADD CONSTRAINT "Resultado_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VersionProyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaCotizacion" ADD CONSTRAINT "PlantillaCotizacion_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "Cuenta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

