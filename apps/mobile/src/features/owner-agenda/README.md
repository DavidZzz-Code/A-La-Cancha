# Agenda del establecimiento

Primera entrega de #8: consulta diaria conectada, sin escrituras. Acceso desde Mi espacio → Agenda de mi establecimiento. Funciona en la exportación web de Expo y comparte la sesión existente; ver [ADR 0004](../../../../../docs/architecture/decisions/0004-owner-agenda-in-expo.md).

- `api.ts` comprueba la sesión, consulta membresías propias y limita canchas a esos establecimientos. Revalida membresía al consultar cada día. RLS es la autorización real.
- `contracts.ts` valida respuestas y conteos completos, usa límites diarios de Colombia y calcula intervalos de 30 minutos. Un bloqueo `held` sigue ocupado hasta recibir un cambio de estado del servidor, aunque su plazo local parezca agotado.
- `OwnerAgendaScreen.tsx` separa carga/error/vacío, descarta respuestas obsoletas y desmonta los datos al cambiar usuario. No persiste datos de agenda en almacenamiento local. Actualización manual; no promete tiempo real.

Se muestran todos los estados, distinguiendo reservas de la app, registros manuales y bloqueos. No se consultan identificadores de actores, claves de idempotencia ni información de pagos. Las canchas no publicadas aparecen únicamente para sus encargados.

Límites explícitos: hasta 100 membresías, 200 canchas y 200 movimientos por día/cancha. Un resultado mayor o truncado produce error, nunca disponibilidad incompleta. La primera interfaz permite consultar hoy y los siguientes 13 días. La apertura diaria procede del modelo existente; no hay edición ni horarios recurrentes aún.

Pruebas: contratos Node, E2E con API simulada y permisos PostgreSQL. Ver [verificación](../../../../../docs/engineering/owner-agenda-verification.md).
