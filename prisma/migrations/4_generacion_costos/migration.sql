-- CreateTable
CREATE TABLE "GeneracionIA" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheLectura" INTEGER NOT NULL DEFAULT 0,
    "cacheEscritura" INTEGER NOT NULL DEFAULT 0,
    "costoUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duracionMs" INTEGER NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneracionIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneracionIA_cuentaId_creadoEn_idx" ON "GeneracionIA"("cuentaId", "creadoEn");

-- CreateIndex
CREATE INDEX "GeneracionIA_creadoEn_idx" ON "GeneracionIA"("creadoEn");

-- AddForeignKey
ALTER TABLE "GeneracionIA" ADD CONSTRAINT "GeneracionIA_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

