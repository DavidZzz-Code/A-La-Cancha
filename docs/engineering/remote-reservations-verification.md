# Bloqueos remotos — entrega del 3 de noviembre de 2026

Base: main `c84b10b`. Rama: `feat/9-remote-holds`. [PR #31](https://github.com/DavidZzz-Code/A-La-Cancha/pull/31). Avance parcial de #6 y #9.

## Alcance

Consultar agenda → iniciar sesión → crear bloqueo de diez minutos → revisar precio final del servidor → consultar historial → cancelar. Las RPC existentes conservan autoridad sobre identidad, disponibilidad, precio y vencimiento. No hay cobros ni confirmación automática; las reservas locales siguen separadas.

La solicitud pendiente se conserva por cuenta antes de enviarla. Un reintento consulta primero la reserva por clave y, si no existe, reutiliza exactamente la misma clave. Se contemplan respuesta perdida, recarga, conflicto, límite de bloqueos, plazo agotado y cierre de sesión.

## Verificación y límites

- Lint, TypeScript y 23 pruebas Node aprobados localmente.
- Exportaciones web, Android e iOS generadas; la web de prueba usa configuración ficticia aislada.
- Se añadieron seis escenarios Playwright, ejecutados en tamaños móvil y escritorio por CI: creación/cancelación, respuesta perdida y recarga, conflicto, cancelación interrumpida, vencimiento y cierre de sesión.
- La descarga de Chromium de Playwright devolvió ZIP incompletos. Chrome alternativo se descargó, pero el entorno local rechazó la creación de sockets del navegador. La validación visual y E2E se delega al runner de CI; los escenarios no se consideran aprobados por estar escritos. Consultar el resultado del PR.
- La consulta de Supabase de desarrollo confirmó proyecto activo, una cancha publicada, cero usuarios y cero reservas antes de esta entrega. No se escribieron datos remotos.
- No se ha probado un JWT real: no existen cuentas de prueba provisionadas y el conector disponible no ofrece administración de usuarios Auth. No se fabricaron usuarios mediante SQL ni se enviaron correos.

## Validación de integración pendiente

Provisionar dos cuentas sintéticas de desarrollo mediante Auth Admin, sin invitaciones ni datos personales. Mantener sus credenciales fuera de GitHub. Con sus sesiones reales, comprobar: lectura pública; creación por A; reintento de A con la misma clave; conflicto de B sobre el turno; imposibilidad de que B consulte/cancele la reserva de A; cancelación de A y liberación del turno. Repetir tras interrupción de conexión y comprobar vencimiento desde el servidor. Registrar resultados anonimizados y limpiar las cuentas por la API de Auth conforme al procedimiento de pruebas.

La prueba nativa en Android y los criterios restantes de #6/#9 siguen pendientes. Una exportación y una API simulada no cierran esos issues.

## Primera ejecución de CI

[GitHub Actions 41711786880](https://github.com/DavidZzz-Code/A-La-Cancha/actions/runs/41711786880) aprobó app y PostgreSQL sobre `b0128c3`: lint, tipos, lógica, exportaciones, demo local y recorridos de cuentas/agenda/bloqueos simulados. La revisión posterior hace explícita la representación de una sola fila en las RPC (`single`) y verifica su cabecera en las pruebas. El resultado definitivo de esa revisión se registra en el PR.

La revisión de las capturas de CI detectó que el formulario seguía ocupando el primer plano tras crear un bloqueo. Se oculta después del resultado para mostrar el precio final y evitar otra pulsación de creación accidental. Una nueva selección reinicia la pantalla y recupera cualquier solicitud pendiente de esa cuenta.

## Validación manual real — 2026-11-03

Dos cuentas de prueba, Chrome y Supabase dev, turno DEMO del 4 de noviembre a las 07:00 de Colombia (60 minutos): A creó un bloqueo; B recibió conflicto sobre el mismo turno; A canceló; B pudo bloquear el horario liberado y cancelarlo. Cada historial mostró únicamente su registro. Una consulta SQL final confirmó exactamente un registro cancelado por jugador. No hubo cobros.

La solicitud de A se conservó tras un error de acceso y se completó después de renovar su sesión. No se ha demostrado aún la causa raíz. Se usaron orígenes locales separados por la sincronización Auth entre pestañas. Pendientes: ataque directo de cancelación con JWT ajeno, expiración real y Android físico.

La interfaz distingue ahora la cancelación en curso (Cancelando bloqueo…) de la creación y conserva el resultado anterior hasta recibir la respuesta.
