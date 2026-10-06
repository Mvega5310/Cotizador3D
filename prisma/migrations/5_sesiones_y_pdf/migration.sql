-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "sesionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GeneracionIA" ADD COLUMN     "stopReason" TEXT;

-- AlterTable
ALTER TABLE "Resultado" ADD COLUMN     "pdfError" TEXT,
ADD COLUMN     "pdfEstado" TEXT,
ADD COLUMN     "pdfIniciado" TIMESTAMP(3),
ADD COLUMN     "pdfToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Resultado_pdfToken_key" ON "Resultado"("pdfToken");


-- Los PDF anteriores se servían en /p/<linkCompleto>/pdf, una dirección que
-- dejaba llegar a la vista completa (cantidades y precios). Esa ruta se
-- eliminó: hay que volver a generarlos y salen con su propio token.
UPDATE "Resultado" SET "pdfUrl" = NULL WHERE "pdfUrl" LIKE '/p/%';
