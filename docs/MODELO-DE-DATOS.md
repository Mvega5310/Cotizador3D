# Modelo de datos

Basado en la guía v3 (sección 09). El esquema formal vive en `prisma/schema.prisma`. Principio rector (ver `ARQUITECTURA.md` §2): **el proyecto es datos; el código lo escribimos nosotros.** Por eso el modelo guarda *qué hay* en un proyecto, nunca *cómo dibujarlo*: eso vive en el motor.

## Entidades

**Cuenta / Usuario.** Una `Cuenta` es una persona o una empresa (`esEmpresa`). Tiene plan (`prueba`, `personal`, `profesional`, `empresa`), cupo de proyectos del mes y fecha de prueba. El cupo cuenta *proyectos generados*, no días, porque cada uno tiene costo real de procesamiento. Los proyectos pertenecen a la cuenta, no al usuario: así el plan Empresa (varios usuarios, cupo compartido) no exige migrar nada después.

**Proyecto.** Dueño, `tipoObra` (texto abierto: `cubierta_cercha`, `cocina_integral`, `porton_reja`...), estado. No es un enum a propósito: crece con el catálogo.

**ArchivoEntrada.** Planos, bocetos, fotos y descripción libre de la etapa 01. Cuelgan del proyecto (son el insumo).

**VersionProyecto.** Una versión = un conjunto de elementos + sus resultados. Inmutable una vez generada; una corrección crea la siguiente versión.

**Etapa.** Parte de la obra que se ejecuta por separado ("Estructura de cubierta", "Pérgola y cochera"). Pertenece a una versión.

**Elemento.** Una pieza del proyecto: `nombre`, `forma`, `geometria` (JSON), `piezaId` (catálogo), `cantidad`, `unidad`, `etapa`, `origen` (`ia` | `usuario`) y `confirmado`. Es lo que la IA propone y el usuario revisa. `forma` es una clave de la biblioteca de formas del motor (viga, panel, volumen, pieza...); el esquema de `geometria` lo define cada forma en código. Guardar `origen` y `confirmado` es lo que permite marcar en el PDF qué es dato confirmado y qué es referencia.

**CatalogoPieza.** Tipo, nombre, unidad de cobro, dimensiones y factor (kg/m, rendimiento). Compartido entre proyectos; global o de una cuenta. Generaliza al antiguo `PerfilMaterial`.

**Unidad.** `kg`, `m2`, `m3`, `ml`, `und`: las cinco de la guía.

**Resultado.** Por versión: renders, PDF, links (completo y de cliente), marca de agua y el cuadro de cantidades (JSON).

**PlantillaCotizacion.** Formato propio del usuario, con columnas mapeadas (plan Profesional en adelante).

**Parametro** *(transitorio).* Entradas crudas clave/valor. Hoy solo las usa el kit de cubierta del MVP; desaparece cuando la pantalla de proyecto pase a elementos.

## Relaciones

```
Cuenta 1─* Usuario            Cuenta 1─* Proyecto        Cuenta 1─* PlantillaCotizacion
Proyecto 1─* ArchivoEntrada   Proyecto 1─* VersionProyecto
VersionProyecto 1─* Etapa     VersionProyecto 1─* Elemento     VersionProyecto 1─1 Resultado
Etapa 1─* Elemento            CatalogoPieza 1─* Elemento
```
