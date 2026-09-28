# Backlog

Orden basado en el "siguiente paso" de la guía v3 (§10) y en la decisión de que los proyectos son datos y el código lo escribimos nosotros.

## 1. Definir el contrato de formas — HECHO
`packages/engine/src/formas.js`: `viga`, `panel`, `volumen`, `pieza`. Decidir qué formas mínimas necesita el motor (empezar por: `viga`, `panel`, `volumen`, `pieza`) y, para cada una: medidas que pide, cómo se dibuja en 3D, cómo se calcula su cantidad y en qué unidades puede cotizarse. Este contrato es lo que luego usan la IA y la pantalla de revisión.

## 2. Intérprete de elementos en `packages/engine` — HECHO (falta migrar la app)
`interprete.js` (`calcularProyecto`, `construirEscena`), `vistas.js` y `pricing.js::calcCotizacion`, con pruebas en `packages/engine/test`. Un portón con reja ya sale de solo datos (prueba de aceptación parcial; falta el segundo ejemplo real con catálogo de un oficio). Pendiente: reemplazar `kits/gableRoofTruss.js` en la web. Dado una lista de elementos + catálogo, devolver escena 3D, cuadro de cantidades por etapa y vistas de cámara (calculadas del bounding box, no fijas). Multiunidad: kg, m², m³, ml, und. Reemplaza a `kits/gableRoofTruss.js` y extiende `pricing.js`.

## 3. Convertir Casa Castañeda en el primer proyecto de datos — HECHO para la estructura de acero
`projects/casa-castaneda/elementos.json` (94 vigas + 139 nodos, generado del código original con `generar-elementos.mjs`). Las pruebas `casa.test.js` confirman que piezas, longitudes, kilos, nodos y etapas coinciden con `casa-castaneda/data/bom.json` (3.529,4 kg), y el dibujo coincide con el render original. **Brecha conocida:** teja, muros con puertas y ventanas, terreno, mobiliario y vehículos NO están convertidos. Requieren formas nuevas (panel poligonal, muro extruido con vanos); se agregan al motor cuando el catálogo de un producto las pida. Expresar la casa (cerchas, correas, cumbrera, limahoyas, frontón, pérgola, cochera) como lista de elementos + catálogo, y verificar que renders y cantidades coincidan con los de `casa-castaneda/`. Valida el intérprete contra un caso real.

## 4. Segundo producto de otro rubro (prueba de aceptación)
Cocina integral o portón con reja, con el mismo motor. Criterio: lo que se agregue al motor debe ser genérico y reutilizable (una forma, una pieza), no lógica propia de ese producto.

## 5. `apps/web` sobre elementos — HECHO (falta edición de geometría)
Crear desde ejemplo o JSON validado, visor por etapas, cantidades en cinco unidades, confirmación de piezas con versiones nuevas y cotización por pieza; probado de punta a punta en el navegador, incluido el aislamiento entre usuarios. Se eliminó el kit de cubierta y sus pantallas. Pendiente: editar geometría en la revisión. Rehacer crear proyecto / revisión / cuadro de cantidades / cotización sobre elementos (hoy están atados al kit de cubierta). Incluye la pantalla de revisión con origen (IA/usuario) y confirmación.

## 6. Generalizar el PDF — HECHO
`/p/[token]/imprimir` (componente `VisorImprimible`) renderiza el proyecto sin interfaz, captura las 5 vistas de cámara del propio canvas (ya no hace falta un script de renders aparte) y arma portada + vistas + cuadro de cantidades + aviso legal. `lib/actions/pdf.ts` abre esa página con Playwright y llama `page.pdf()`. Probado de punta a punta: PDF de 4 páginas con las 5 vistas embebidas, servido en `/p/[token]/pdf`.

Junto con esto quedaron los dos links de la sección 05 de la guía: `linkCompleto` (visor + cantidades, para el usuario) y `linkCliente` (solo visor, sin cantidades), públicos y sin sesión, con marca de agua mientras el proyecto esté en prueba. Los tokens se generan al crear el proyecto y se conservan entre versiones (`lib/proyectos.ts`), así un link ya compartido sigue mostrando la versión más reciente.

**Limitación conocida:** `generarPdfAction` lanza Chrome dentro del proceso del servidor de Next.js. Funciona en local o en un servidor propio; no funciona en hosting serverless (Vercel y similares no pueden lanzar un navegador). Al reestructurar el despliegue, este paso se mueve a un worker aparte — ver nota al inicio de `lib/actions/pdf.ts`.

## 7. Paso de IA (planos → elementos) — HECHO, falta probar con planos reales
"Subir planos (con IA)" en `/projects/new`: fotos o PDF + descripción libre van a Claude (`claude-opus-5`, salida estructurada con Zod — `lib/ia.ts`), que devuelve *solo datos* (catálogo + elementos + etapas) siguiendo el mismo contrato de formas del motor — nunca código. Todo elemento sale con `origen: "ia"` y `confirmado: false`; la app fuerza esos dos campos, el modelo no puede ponerlos. Lo que el motor no puede interpretar (pieza inexistente, geometría inválida) se descarta y se cuenta en vez de tumbar el proyecto completo (`lib/proyectos.ts::depurarEntradaIA`).

**Sin probar todavía con planos reales** — solo con datos sintéticos, porque no había ANTHROPIC_API_KEY configurada. Falta el ejercicio real: correrlo con 2–3 planos de obra y medir qué tan buenas salen las medidas y cuánto cuesta cada generación (sección 09 de la guía).

## 8. Catálogo inicial
Tubos y perfiles, teja y láminas, muros y losas, vidrio, madera y tableros, puertas y ventanas (guía §07).

## 9. Piloto con 3–5 usuarios de oficios distintos
Mide costo real por proyecto, tiempo ahorrado y disposición a pagar. Sin esto, los precios de los planes son adivinanza.

## 10. Cuentas, suscripción y cobro
Planes Personal / Profesional / Empresa con cupo por proyectos generados; prueba de 14 días o 2 proyectos; PDF con marca de agua en la prueba.

**Después del lanzamiento:** formato de cotización propio, marca propia en el PDF, cuentas de equipo, catálogos de proveedores con precios, piezas de fabricantes, plantillas automáticas para casos repetidos.
