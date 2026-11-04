# ADR 0004: primera agenda del propietario en Expo

Fecha: 2026-11-04. Estado: adoptada para la primera entrega de #8.

## Contexto

Existe una aplicación Expo con exportación web, sesión y backend compartido. `apps/admin` solo contiene una propuesta de Next.js. La siguiente necesidad es validar la consulta de agenda del encargado sin duplicar autenticación, infraestructura ni despliegues.

## Decisión

Implementar esta primera pantalla en `apps/mobile/src/features/owner-agenda`, accesible también desde web. Mantener contratos, acceso a datos y ruta separados. Los permisos provienen de `venue_members` y las políticas RLS existentes; mostrar el enlace no otorga acceso y no se permite autoasignarse un establecimiento.

Esta etapa es de lectura: cancha, día, ocupación y estados. La reserva del jugador debe completarse dentro de A La Cancha. Los registros manuales son apoyo operativo para evitar dobles reservas, sin exigir coordinación por WhatsApp.

## Consecuencias

Se reutilizan sesión, componentes, CI y backend; no se añade dependencia ni migración. El panel hereda por ahora la navegación del prototipo de jugadores. Si las necesidades de operaciones justifican una aplicación independiente, evaluar `apps/admin` en otra decisión; Next.js sigue siendo una opción, no una obligación implementada.

Registro manual, mantenimiento, horarios recurrentes, auditoría visible, confirmación comercial y pagos quedan fuera de esta primera entrega. No cerrar #8 por completar la consulta.
