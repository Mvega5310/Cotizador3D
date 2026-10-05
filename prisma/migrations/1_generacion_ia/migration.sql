-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoProyecto" ADD VALUE 'procesando';
ALTER TYPE "EstadoProyecto" ADD VALUE 'error';

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "descartadosIA" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "errorIA" TEXT,
ADD COLUMN     "iniciadoIA" TIMESTAMP(3),
ADD COLUMN     "notasIA" TEXT;

