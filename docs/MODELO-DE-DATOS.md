# Modelo de datos

Basado en la sección 08 del plan de producto. El esquema formal vive en `prisma/schema.prisma`; este documento explica las decisiones detrás de cada entidad.

## Entidades

### Usuario / Suscripción
Un usuario tiene un plan (`prueba`, `ejecutor`, `profesional`, `estudio`), un cupo de proyectos del mes y, si aplica, una fecha límite de prueba. El cupo se cuenta por **proyectos generados**, no por días — porque cada proyecto generado tiene un costo real de procesamiento (sección 07 del plan), y la prueba debe enganchar sin que un solo usuario consuma más de lo que paga.

### Cuenta (Estudio)
Se separa `Cuenta` de `Usuario` desde el inicio, aunque el plan "Estudio" (varios usuarios, cupo compartido) sea posterior al lanzamiento. Sin esta separación, agregar equipos después obliga a migrar todos los proyectos existentes de "pertenece a un usuario" a "pertenece a una cuenta". Un usuario individual es, simplemente, una cuenta de un solo miembro.

### Proyecto
Cliente, tipo de obra, estado (`borrador`, `en_revision`, `generado`, `entregado`), versión activa. Un proyecto tiene **muchas versiones** — cada corrección del usuario genera una versión nueva (sección 08), nunca se sobrescribe una anterior. Esto es lo que ya se probó a mano con Casa Castañeda ("cuando llegaron las medidas reales... bastó con cambiar un archivo de parámetros").

### VersionProyecto
Es el corazón del sistema: una versión = un conjunto de parámetros confirmados + sus resultados derivados (renders, PDF, BOM). Inmutable una vez generada; una corrección crea la siguiente versión, no la edita.

### ArchivoEntrada
Planos, bocetos, fotos y la descripción libre que el usuario sube en la etapa 01. Vinculados al proyecto, no a una versión (son el insumo, no el resultado).

### Parametro
Una fila por medida individual: `clave`, `valor`, `unidad`, `origen` (`ia` | `usuario`), y a qué versión pertenece. Guardar el origen de cada medida —tal como se hizo con el tag `ejecutor`/`referencia` en `PROFILES` de Casa Castañeda— es lo que permite marcar en el PDF qué es dato confirmado y qué es supuesto de referencia.

Alternativa descartada: guardar los parámetros como un solo JSON por versión. Se prefiere una fila por parámetro porque la pantalla de revisión (etapa 02) necesita mostrar y editar campo por campo, y el origen (`ia`/`usuario`) se pierde si todo vive en un blob.

### PerfilMaterial
Catálogo de perfiles (tipo de tubo, dimensiones, kg/m) — igual a `PROFILES` en `params.js`, pero reutilizable entre proyectos en vez de copiado a mano en cada archivo. Puede ser global (catálogo del sistema) o propio de una cuenta, cuando el plan Profesional permita perfiles personalizados.

### Resultado
Un resultado por versión: lista de renders (URLs), PDF (URL), link público (con o sin marca de agua), y el BOM calculado (cantidades por elemento y por etapa — el mismo `bom.json` que ya genera `getbom.mjs`).

### PlantillaCotizacion
El formato de cotización propio que el usuario sube una vez (plan Profesional en adelante) y el sistema llena en cada proyecto nuevo, con las columnas mapeadas a los campos del BOM.

## Diagrama (resumen de relaciones)

```
Cuenta 1───* Usuario
Cuenta 1───* Proyecto
Proyecto 1───* ArchivoEntrada
Proyecto 1───* VersionProyecto
VersionProyecto 1───* Parametro
VersionProyecto 1───1 Resultado
Cuenta 1───* PlantillaCotizacion
PerfilMaterial *───* VersionProyecto   (a través de Parametro, cuando clave = perfil)
```

Ver `prisma/schema.prisma` para los campos exactos y tipos.
