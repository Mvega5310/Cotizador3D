# Imagen oficial de Playwright: trae Chromium y sus dependencias del sistema,
# que necesita la generación de PDF (apps/web/lib/actions/pdf.ts). La versión
# tiene que ser exactamente la de playwright-core en apps/web/package.json —
# si no, playwright-core no encuentra el navegador que espera.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

# Dependencias primero (capa cacheable): monorepo con workspaces de npm, así
# que se instala desde la raíz para que @cotizador3d/engine quede enlazado.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/pipeline/package.json apps/pipeline/
COPY packages/engine/package.json packages/engine/
RUN npm ci --no-audit --no-fund

COPY . .
RUN cd apps/web && npx prisma generate --schema=../../prisma/schema.prisma && npm run build

ENV NODE_ENV=production
ENV DATA_DIR=/data
WORKDIR /app/apps/web
# Las migraciones se aplican al arrancar (no en el build): en el build la
# base de datos no está disponible.
CMD npx prisma migrate deploy --schema=../../prisma/schema.prisma && npx next start -p ${PORT:-3000}
