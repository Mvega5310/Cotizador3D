# Backlog hacia el piloto

Orden sugerido, pensado para llegar al piloto de 3–5 usuarios de la sección 09 del plan lo más rápido posible sin construir sobre supuestos no probados. Cada ítem dice qué resuelve y por qué va en ese orden.

## 1. Validar el motor: migrar Casa Castañeda a `projects/`
Reescribir `structure.js`/`civil.js` de Casa Castañeda usando `@cotizador3d/engine` (este scaffold) en vez de las primitivas locales, y comparar los renders contra los que ya existen en `casa-castaneda/renders/`. Si coinciden, el motor generalizado está probado con un caso real antes de construir nada más encima. Si no coinciden, es más barato descubrirlo ahora que después de construir la IA de generación.

## 2. Definir el esquema de "kits" paramétricos
El engine de este scaffold sabe *renderizar* capas; no sabe *construir* una cubierta o una cercha a partir de números. Hace falta diseñar, para los tipos de obra del lanzamiento (sección 06: cubiertas, estructuras metálicas, cocheras, pérgolas), qué parámetros de entrada necesita cada kit y qué geometría produce — generalizando `structure.js` de Casa Castañeda de "coordenadas literales de esta casa" a "función que recibe medidas y devuelve geometría". Este es el trabajo de ingeniería más grande del producto.

## 3. Generalizar el PDF
Hoy `build_pdfs_etapas.py` tiene el texto, el layout y los `assert` de verificación escritos a mano para las dos etapas de Casa Castañeda. Reemplazarlo por una plantilla que reciba: nombre del proyecto, cliente, etapas, filas del BOM y lista de imágenes — sin texto ni cálculos hardcodeados por proyecto.

## 4. Etapa 01 y 02: `apps/web` — carga y revisión
El corazón sin resolver del producto. Mínimo viable:
- Subida de planos/bocetos/fotos + descripción libre (sin formularios largos, según el plan).
- Un paso que interprete esa entrada y proponga parámetros (ver ítem 5).
- Pantalla de revisión: mostrar cada parámetro propuesto con su origen (IA/usuario), permitir corregirlo. Ningún proyecto avanza sin esta confirmación (sección 05 del plan).

Este ítem depende de decidir stack (`npx create-next-app`, storage de archivos, auth) — no lo asumas de este documento sin decidirlo explícitamente.

## 5. El paso de IA (lectura de planos → parámetros)
El mayor desconocido de costo y tiempo del producto entero. Antes de automatizarlo del todo, vale la pena probarlo manualmente (un humano usando un LLM con visión para leer 2-3 planos reales y llenar el esquema del ítem 2) para tener una primera medida de qué tan bien funciona antes de construir la integración.

## 6. Piloto: 3 a 5 usuarios reales (sección 09 del plan)
Con los ítems 1–5 en pie, correr proyectos reales de 2-3 arquitectos y 2-3 ejecutores. De aquí salen los tres números que hoy no existen: costo real de generar un proyecto, tiempo que le ahorra al usuario, precio que estaría dispuesto a pagar. Sin estos números, cualquier precio de suscripción (sección 07) es una adivinanza.

## 7. Cuentas, suscripción y cobro
Con el modelo de datos ya definido (`prisma/schema.prisma`), conectar autenticación, pasarela de pago y el conteo de cupo por proyectos generados (no por días).

## 8. Link público y marca de agua
`linkCompleto`/`linkCliente` en el modelo de `Resultado` — versión pública del visor, con marca de agua durante la prueba (sección 07).

---

**Fuera del backlog inicial**, según la sección 06 del plan (se suma después del lanzamiento): viviendas completas, otros oficios (eléctrico, hidráulico, acabados), formato de cotización propio del usuario, marca propia en el PDF, cuentas de equipo, plantillas automáticas para casos repetidos.
