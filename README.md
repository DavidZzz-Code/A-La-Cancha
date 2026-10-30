# A La Cancha

Encuentra, compara y reserva canchas deportivas sin recorrer un chat por establecimiento.

El primer mercado es Cartagena, Colombia. La expansión a otras ciudades depende de validar disponibilidad confiable, reservas completadas y uso recurrente.

## Estado actual

Fundación de producto y organización del repositorio. Todavía no hay una aplicación ejecutable, cuentas de tiendas, integración de pagos ni establecimientos afiliados. Las metas del piloto son hipótesis de trabajo, no resultados obtenidos.

## Empieza aquí

1. [Visión y usuarios](docs/product/vision.md).
2. [Alcance de la primera versión](docs/product/mvp.md).
3. [Reglas de reservas](docs/product/reservation-rules.md).
4. [Arquitectura y mapa de carpetas](docs/architecture/overview.md).
5. [Plan de desarrollo](docs/planning/roadmap.md) y [backlog](docs/planning/backlog.md).
6. [Cómo contribuir](CONTRIBUTING.md).

## Mapa del repositorio

| Carpeta | Responsabilidad |
| --- | --- |
| `apps/mobile/` | App de jugadores para Android e iOS: React Native, Expo y TypeScript |
| `apps/admin/` | Panel web de propietarios y operaciones |
| `apps/web/` | Presentación pública y enlaces compartibles de canchas |
| `packages/domain/` | Reglas y contratos independientes de las pantallas |
| `packages/design-tokens/` | Colores, tipografía, espaciado y movimiento compartidos |
| `supabase/` | Base de datos, permisos, migraciones y funciones de servidor |
| `docs/` | Producto, diseño, decisiones, investigación y operación |
| `.github/` | Plantillas de issues y pull requests |

Las carpetas incluyen su propia guía. No se crean aplicaciones ni servicios adicionales hasta que una tarea los necesite.

## Forma de trabajar

- Una tarea concreta por issue; cada tarea tiene criterios de aceptación.
- Una rama por cambio, vinculada al issue y revisada mediante pull request.
- Organizar el código por funcionalidad: búsqueda, canchas, reservas, etc.
- Mantener las decisiones y cambios de alcance en el repositorio.
- Usar datos de demostración identificados; no inventar disponibilidad, reseñas ni afiliaciones.

[Índice de documentación](docs/README.md) · [Plan general #1](https://github.com/DavidZzz-Code/A-La-Cancha/issues/1) · [Issues](https://github.com/DavidZzz-Code/A-La-Cancha/issues)
