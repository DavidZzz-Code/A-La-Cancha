# Arquitectura y organización

## Enfoque

Un repositorio con aplicaciones separadas por público y un backend compartido. Implementar una aplicación cada vez; no añadir infraestructura de monorepo pesada mientras no sea necesaria.

| Ubicación | Contenido | No colocar aquí |
| --- | --- | --- |
| `apps/mobile/` | App Expo de jugadores | Reglas exclusivas del servidor |
| `apps/admin/` | Agenda de propietarios y administración con permisos | Permisos basados solo en ocultar botones |
| `apps/web/` | Páginas públicas y enlaces de canchas | Otra agenda independiente |
| `packages/domain/` | Tipos, contratos y reglas puras compartidas | React, claves y conexiones a servicios |
| `packages/design-tokens/` | Valores semánticos de diseño | Componentes nativos y web mezclados |
| `supabase/` | Migraciones SQL, políticas y operaciones transaccionales | Credenciales o datos de producción |
| `docs/` | Decisiones y planes | Afirmaciones de funciones sin implementar |

## Funcionalidades de la app móvil

Crear cada carpeta al implementar su issue, evitando directorios vacíos por anticipación.

| Funcionalidad prevista | Responsabilidad |
| --- | --- |
| `auth` | Sesión y perfil |
| `discovery` | Búsqueda y filtros |
| `venues` | Fichas de sedes y canchas |
| `reservations` | Selección de turno y ciclo de reserva |
| `favorites` | Canchas guardadas |
| `reviews` | Opiniones tras jugar |
| `promotions` | Ofertas por horario |
| `notifications` | Avisos y permisos del dispositivo |

En `apps/mobile/app/` viven rutas y composición. En `apps/mobile/src/features/<nombre>/` viven pantallas y elementos propios del módulo. `src/components/` es para presentación reutilizada; `src/lib/` contiene clientes de servicios y configuración. No imponer subcarpetas internas hasta necesitarlas.

## Modelo implementado y pendiente

El laboratorio PostgreSQL implementa establecimientos, membresías, canchas, apertura diaria, reservas, bloqueos, eventos y promociones. Tiene RLS, exclusión de intervalos, cotización e idempotencia. Ver [ADR 0002](decisions/0002-reservation-laboratory.md) y [ADR 0003](decisions/0003-server-pricing.md).

La app Expo sigue usando un catálogo ficticio y persistencia local. Todavía faltan autenticación real, conexión a la agenda, panel de propietarios, pagos, reembolsos y reseñas. Los favoritos están dentro de discovery mientras no necesiten un módulo independiente.

## Garantías

- El servidor decide disponibilidad, precio y confirmación.
- Una operación atómica y una restricción en base de datos protegen contra solapamientos.
- Cada propietario accede solo a los establecimientos autorizados.
- Usar políticas de acceso por fila y pruebas negativas de permisos.
- Webhooks y secretos permanecen en funciones de servidor.
- Reutilizar un backend para todas las aplicaciones; ninguna pantalla mantiene una fuente paralela de disponibilidad.

## Entornos y entrega

Separar desarrollo, pruebas y producción al configurar servicios. Versionar migraciones y archivos `.env.example` sin secretos. No comprar ni publicar servicios como parte de esta fundación.

El workspace Expo usa npm workspaces, Node 24 y lockfile versionado. CI comprueba tipos, reglas, exportaciones y recorridos web; el mismo workflow prueba PostgreSQL real. Ver [ejecución y evidencia](../engineering/prototype.md). Exportar bundles no equivale a probar o publicar apps nativas.
