# ADR 0002: laboratorio transaccional de reservas

Estado: implementación para pruebas; no desplegada ni conectada a la app.

## Decisión

PostgreSQL protege cada cancha con una restricción de exclusión GiST sobre intervalos `[inicio, fin)`. Jugadores, reservas externas y bloqueos utilizan la misma tabla. Las operaciones bloquean primero la cancha y después las reservas; la restricción sigue rechazando colisiones aunque se omita la función de entrada.

`create_reservation` calcula el precio en el servidor y devuelve un bloqueo de diez minutos para jugadores. El propietario puede registrar reservas externas y mantenimiento. Una clave UUID por actor hace que los reintentos devuelvan la misma reserva; reutilizarla con parámetros diferentes se rechaza.

`transition_reservation` permite cancelar con motivo, confirmar manualmente como propietario o completar después del turno. La confirmación manual solo sirve para el laboratorio de agenda: no acredita un pago. No hay API para que el jugador marque una reserva como pagada.

Las políticas RLS limitan las reservas y eventos al actor y miembros de su establecimiento. No hay escrituras directas desde roles cliente. `occupied_slots` devuelve exclusivamente intervalos públicos, sin nombres ni identificadores de personas o reservas.

## Límites que deben resolverse antes del piloto

- La app sigue usando datos ficticios locales. Aún no llama estas funciones.
- Esta migración solo cotiza tarifa base por duración, sin promociones, comisiones, anticipos ni reembolsos. No conectar las promociones demo hasta implementar un contrato de cotización completo en servidor.
- Los bloqueos vencidos dejan de aparecer en disponibilidad y se marcan como vencidos al intentar reservar esa cancha nuevamente. Falta una tarea periódica para actualizar su estado aunque nadie consulte.
- La apertura es diaria y la zona horaria es `America/Bogota`; faltan excepciones por fecha, días de cierre y reglas comerciales configurables.
- No hay onboarding ni endpoints para editar establecimientos o membresías; el laboratorio usa datos ficticios insertados por el administrador de pruebas.
- Faltan límites de frecuencia y cantidad de bloqueos por usuario para impedir el acaparamiento de horarios.
- El modelo no registra pagos. Ninguna confirmación habilita cobros automáticamente.

## Verificación

La suite usa PostgreSQL real, roles distintos y conexiones psql independientes para el conflicto simultáneo. Se ejecuta únicamente contra una base desechable llamada `alacancha_test`.

El bootstrap imita solo `auth.users` y `auth.uid()` para verificar RLS. No equivale a probar Supabase Auth, JWT, PostgREST, recuperación de contraseña ni sesión móvil.

Referencias: [rangos y exclusión](https://www.postgresql.org/docs/current/rangetypes.html), [RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
