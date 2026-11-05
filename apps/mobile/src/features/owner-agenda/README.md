# Agenda del establecimiento

La consulta diaria de #8 está integrada en #32. Desde una cancha y fecha, Gestionar mantenimientos abre el formulario del encargado. Acceso desde Mi espacio → Agenda de mi establecimiento. Funciona en la exportación web de Expo y comparte la sesión existente; ver [ADR 0004](../../../../../docs/architecture/decisions/0004-owner-agenda-in-expo.md).

- `api.ts` comprueba la sesión, consulta membresías propias y limita canchas a esos establecimientos. Revalida membresía al consultar cada día. RLS es la autorización real.
- `contracts.ts` valida respuestas y conteos completos, usa límites diarios de Colombia y calcula intervalos de 30 minutos. Un bloqueo `held` sigue ocupado hasta recibir un cambio de estado del servidor, aunque su plazo local parezca agotado.
- `OwnerAgendaScreen.tsx` separa carga/error/vacío, descarta respuestas obsoletas y desmonta los datos al cambiar usuario. No persiste datos de agenda en almacenamiento local. Actualización manual; no promete tiempo real.

Se muestran todos los estados, distinguiendo reservas de la app, registros manuales y bloqueos. No se consultan identificadores de actores, claves de idempotencia ni información de pagos. Las canchas no publicadas aparecen únicamente para sus encargados.

Límites explícitos: hasta 100 membresías, 200 canchas y 200 movimientos por día/cancha. Un resultado mayor o truncado produce error, nunca disponibilidad incompleta. La primera interfaz permite consultar hoy y los siguientes 13 días. La apertura diaria procede del modelo existente; no hay edición ni horarios recurrentes aún.

Pruebas: contratos Node, E2E con API simulada y permisos PostgreSQL. Ver [verificación](../../../../../docs/engineering/owner-agenda-verification.md).

## Mantenimiento puntual

El encargado elige un inicio futuro, una duración de 30, 60, 90 o 120 minutos y un motivo de hasta 40 caracteres. La app guarda la referencia antes de enviar la solicitud. Si se pierde la respuesta, permite comprobar la misma operación después de recargar.

La operación existente del servidor crea un registro de tipo `block` con importe cero en la agenda común. El motivo se guarda en `team` para este tipo de registro. La exclusión de intervalos resuelve los conflictos incluso si un jugador reserva simultáneamente. La cancelación de un mantenimiento futuro exige motivo y queda registrada en el historial de eventos.

Para verificar en Android, crear un mantenimiento en una cancha DEMO, actualizar la agenda de jugador y verificar que desaparece el horario. Cancelar desde el panel, actualizar otra vez y comprobar que el turno vuelve a estar disponible. Registrar el resultado por separado de la prueba de consulta de #32.

La migración `20261105122311_require_current_membership_for_maintenance.sql` exige membresía vigente en el servidor para toda transición de un bloqueo operativo, incluido el que registró el propio encargado antes de perder acceso.

## Turnos presenciales

En la agenda diaria, seleccionar una cancha y fecha y pulsar **Registrar turno presencial**. El encargado indica equipo, jugadores, duración y hora. Solo se ofrecen intervalos libres durante toda la duración consultada. El servidor comprueba nuevamente membresía, capacidad y solapamientos, guarda una reserva de tipo `external` y devuelve el precio calculado. Registrar el turno no procesa un cobro.

Si se interrumpe la respuesta, abrir la misma cancha y fecha en el dispositivo y pulsar **Comprobar turno presencial**. Se reutiliza la referencia persistida antes del envío. Al comprobar el registro se actualiza la agenda común.

Para cancelar un turno presencial confirmado antes de su inicio, el encargado abre el movimiento en la agenda, indica el motivo y confirma. El servidor exige membresía vigente, conserva el registro cancelado y libera el intervalo para los jugadores.

El encargado puede confirmar desde la agenda el bloqueo vigente de un jugador. El servidor comprueba membresía, estado y vencimiento al confirmar. El jugador consulta el resultado en Mis reservas → Ver mis reservas conectadas → Actualizar mis bloqueos.

## Cambio de horario

El jugador abre una reserva confirmada desde Mis reservas → Ver mis reservas conectadas, solicita un horario libre y mantiene su turno original. En la agenda del día original el encargado abre Revisar cambios de horario. Puede aprobar o rechazar. El servidor vuelve a consultar precio y disponibilidad antes de mover la misma reserva. Una solicitud pendiente no ocupa el horario propuesto. El historial muestra la decisión y ambas fechas en hora colombiana.

Prueba Android: solicitar con la cuenta del jugador, revisar con la cuenta del encargado y actualizar la lista del jugador. Repetir ocupando antes el destino con otro equipo: debe figurar Horario no disponible y conservarse la reserva original.

Al abrir o actualizar la agenda, el encargado ve las solicitudes pendientes de todas sus canchas, ordenadas por llegada. Puede aprobar o rechazar desde esa lista aunque consulte otra cancha o fecha. La lista muestra diez solicitudes por página.
