# Supabase de desarrollo

Proyecto: a-la-cancha-dev (`pednpnrgxszcffivfozo`), región us-east-1. Verificado el 31 de octubre de 2026. Sin datos reales. Esta sección registra el despliegue inicial; consultar las actualizaciones al final.

## Migraciones aplicadas

El despliegue mediante MCP asignó versiones de servidor distintas de las originales del laboratorio:

| Archivo del repositorio | Versión remota |
| --- | --- |
| 202610300001_agenda.sql | 20261031195805 |
| 202610310001_pricing_and_hold_limits.sql | 20261031195820 |
| 20261031195847_explicit_rpc_permissions.sql | 20261031195847 |

La tercera migración se recupera del despliegue realizado; su versión no es inventada. Antes de usar db push se debe reconciliar el historial remoto con los dos nombres originales mediante migration repair, sin volver a ejecutar CREATE TABLE. No se ha realizado esa reconciliación.

## Verificación

Las seis tablas tienen RLS. anon y authenticated no tienen INSERT directo. Se comprobó lectura de catálogo bajo SET LOCAL ROLE anon, sin registros. audit_reservation no puede ejecutarse por anon ni authenticated; create_reservation y transition_reservation solo por authenticated; expire_holds no por clientes. Las funciones públicas de cotización y ocupación conservan acceso intencional, con límites de publicación y sin datos personales.

Supabase otorga permisos directos por defecto a funciones nuevas. Revocar solo PUBLIC no elimina esos permisos; la migración adicional revoca explícitamente anon/authenticated y restaura únicamente los necesarios. Las comprobaciones previas del laboratorio no reproducían estos permisos predeterminados.

## Pendientes

- Reproducir permisos predeterminados de Supabase en CI y añadir regresión.
- Revisar avisos restantes de funciones SECURITY DEFINER públicas intencionales y mover btree_gist fuera de public.
- Reconciliar historial de migraciones antes de automatizar despliegues.
- Probar JWT/PostgREST con usuarios de desarrollo y completar #6/#9.
- Configurar vencimiento periódico de holds; actualmente existe expiración al reservar y función administrativa, sin cron.

La app sigue siendo demo local. No hay cobros, usuarios de prueba creados ni reservas reales.

## Actualización del 3 de noviembre

La regresión de permisos está integrada (#23); btree_gist está en extensions y el cron está activo (#28). La app consulta catálogo/ocupación/precios por PostgREST (#30), con una cancha DEMO. Estas entregas resuelven los pendientes históricos correspondientes de arriba. La reconciliación del historial sigue pendiente: no ejecutar db push sin resolver #26. La escritura desde la app y JWT reales se siguen en [la entrega de bloqueos](remote-reservations-verification.md).
