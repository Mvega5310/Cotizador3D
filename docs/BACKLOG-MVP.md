# Backlog

Orden basado en el "siguiente paso" de la guía v3 (§10) y en la decisión de que los proyectos son datos y el código lo escribimos nosotros.

## 1. Definir el contrato de formas
Decidir qué formas mínimas necesita el motor (empezar por: `viga`, `panel`, `volumen`, `pieza`) y, para cada una: medidas que pide, cómo se dibuja en 3D, cómo se calcula su cantidad y en qué unidades puede cotizarse. Este contrato es lo que luego usan la IA y la pantalla de revisión.

## 2. Intérprete de elementos en `packages/engine`
Dado una lista de elementos + catálogo, devolver escena 3D, cuadro de cantidades por etapa y vistas de cámara (calculadas del bounding box, no fijas). Multiunidad: kg, m², m³, ml, und. Reemplaza a `kits/gableRoofTruss.js` y extiende `pricing.js`.

## 3. Convertir Casa Castañeda en el primer proyecto de datos
Expresar la casa (cerchas, correas, cumbrera, limahoyas, frontón, pérgola, cochera) como lista de elementos + catálogo, y verificar que renders y cantidades coincidan con los de `casa-castaneda/`. Valida el intérprete contra un caso real.

## 4. Segundo producto de otro rubro (prueba de aceptación)
Cocina integral o portón con reja, con el mismo motor. Criterio: lo que se agregue al motor debe ser genérico y reutilizable (una forma, una pieza), no lógica propia de ese producto.

## 5. `apps/web` sobre elementos
Rehacer crear proyecto / revisión / cuadro de cantidades / cotización sobre elementos (hoy están atados al kit de cubierta). Incluye la pantalla de revisión con origen (IA/usuario) y confirmación.

## 6. Generalizar el PDF
Plantilla que recibe nombre, cliente, etapas, filas de cantidades e imágenes; sin texto ni verificaciones escritas por proyecto.

## 7. Paso de IA (planos → elementos)
La IA produce solo elementos con formas y piezas existentes; lo que no reconoce se marca para que el usuario lo resuelva. Probarlo primero a mano con 2–3 planos reales para medir calidad y costo.

## 8. Catálogo inicial
Tubos y perfiles, teja y láminas, muros y losas, vidrio, madera y tableros, puertas y ventanas (guía §07).

## 9. Piloto con 3–5 usuarios de oficios distintos
Mide costo real por proyecto, tiempo ahorrado y disposición a pagar. Sin esto, los precios de los planes son adivinanza.

## 10. Cuentas, suscripción y cobro
Planes Personal / Profesional / Empresa con cupo por proyectos generados; prueba de 14 días o 2 proyectos; PDF con marca de agua en la prueba.

**Después del lanzamiento:** formato de cotización propio, marca propia en el PDF, cuentas de equipo, catálogos de proveedores con precios, piezas de fabricantes, plantillas automáticas para casos repetidos.
