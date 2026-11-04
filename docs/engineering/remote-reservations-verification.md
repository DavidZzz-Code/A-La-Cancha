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
- La validación inicial no contaba con usuarios. Posteriormente se provisionaron dos cuentas de prueba mediante Auth y se verificaron sesiones JWT reales, como se detalla abajo.

## Procedimiento de integración

Usar dos cuentas sintéticas de desarrollo provisionadas mediante Auth, sin invitaciones ni datos personales. Mantener sus credenciales fuera de GitHub. Con sus sesiones reales, comprobar: lectura pública; creación por A; reintento de A con la misma clave; conflicto de B sobre el turno; imposibilidad de que B consulte/cancele la reserva de A; cancelación de A y liberación del turno. Repetir tras interrupción de conexión y comprobar vencimiento desde el servidor. Registrar resultados anonimizados y limpiar las cuentas por la API de Auth conforme al procedimiento de pruebas.

El recorrido principal en Android físico mediante Expo Go fue confirmado por el usuario el 4 de noviembre; los criterios restantes de #6/#9 siguen pendientes. Una exportación y una API simulada no cierran esos issues.

## Primera ejecución de CI

[GitHub Actions 41711786880](https://github.com/DavidZzz-Code/A-La-Cancha/actions/runs/41711786880) aprobó app y PostgreSQL sobre `b0128c3`: lint, tipos, lógica, exportaciones, demo local y recorridos de cuentas/agenda/bloqueos simulados. La revisión posterior hace explícita la representación de una sola fila en las RPC (`single`) y verifica su cabecera en las pruebas. El resultado definitivo de esa revisión se registra en el PR.

La revisión de las capturas de CI detectó que el formulario seguía ocupando el primer plano tras crear un bloqueo. Se oculta después del resultado para mostrar el precio final y evitar otra pulsación de creación accidental. Una nueva selección reinicia la pantalla y recupera cualquier solicitud pendiente de esa cuenta.

## Validación manual real — 2026-11-03

Dos cuentas de prueba, Chrome y Supabase dev, turno DEMO del 4 de noviembre a las 07:00 de Colombia (60 minutos): A creó un bloqueo; B recibió conflicto sobre el mismo turno; A canceló; B pudo bloquear el horario liberado y cancelarlo. Cada historial mostró únicamente su registro. Una consulta SQL final confirmó exactamente un registro cancelado por jugador. No hubo cobros.

La solicitud de A se conservó tras un error de acceso y se completó después de renovar su sesión. No se ha demostrado aún la causa raíz. Se usaron orígenes locales separados por la sincronización Auth entre pestañas. La prueba directa posterior con JWT de B recibió HTTP 403 / 42501 al cancelar el bloqueo de A; la consulta directa de ese registro devolvió cero filas. La expiración y reutilización posterior se comprobaron con sesiones reales; el recorrido principal Android fue confirmado por el usuario (ver actualización siguiente).

La interfaz distingue ahora la cancelación en curso (Cancelando bloqueo…) de la creación y conserva el resultado anterior hasta recibir la respuesta.

## Actualización — 4 de noviembre de 2026

- El bloqueo de prueba quedó expired por vencimiento natural. Con JWT de B se creó un nuevo held para exactamente la misma cancha e intervalo (5 de noviembre, 07:00–08:00 Colombia) y luego se canceló. No se alteraron fechas para forzar la expiración. No se midió la latencia exacta del cron.
- La corrección de AuthProvider relee la sesión de su propio almacenamiento ante eventos de Auth, en vez de adoptar la identidad transmitida por otra pestaña. [CI sobre 0fc2a4b](https://github.com/DavidZzz-Code/A-La-Cancha/actions/runs/41720104792) aprobado, incluida la regresión de dos pestañas.
- El usuario confirmó el recorrido principal en Android físico vía Expo Go: acceso, agenda, creación y cancelación. [Procedimiento, incidencias de red y límites de evidencia](android-device-validation.md).
- Pendientes móviles: modelo/versiones, restauración tras reiniciar, segundo plano, red interrumpida y APK de producción. No cerrar automáticamente #6/#9: registro, recuperación y ciclo comercial completo continúan fuera de esta entrega.
