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

## Modelo inicial por diseñar

Usuarios y perfiles; establecimientos y membresías; sedes; canchas físicas; reglas de apertura; bloqueos de agenda; reservas y eventos; pagos y reembolsos; promociones; reseñas. Son entidades propuestas, todavía no existe un esquema implementado.

## Garantías

- El servidor decide disponibilidad, precio y confirmación.
- Una operación atómica y una restricción en base de datos protegen contra solapamientos.
- Cada propietario accede solo a los establecimientos autorizados.
- Usar políticas de acceso por fila y pruebas negativas de permisos.
- Webhooks y secretos permanecen en funciones de servidor.
- Reutilizar un backend para todas las aplicaciones; ninguna pantalla mantiene una fuente paralela de disponibilidad.

## Entornos y entrega

Separar desarrollo, pruebas y producción al configurar servicios. Versionar migraciones y archivos `.env.example` sin secretos. No comprar ni publicar servicios como parte de esta fundación.

Los comandos de instalación, versiones, lockfile y CI se incorporarán al inicializar Expo. Hoy el repositorio contiene estructura y documentación, no un workspace instalable.
