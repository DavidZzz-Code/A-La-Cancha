# Reglas iniciales de reservas

Estado: propuesta de trabajo; validar condiciones comerciales con los establecimientos antes del piloto.

## Tiempo y unidad reservable

- Una sede puede tener varias canchas físicas. Cada cancha mantiene su propia agenda.
- Guardar instantes en UTC y mostrar fecha y hora en `America/Bogota` para el piloto.
- Representar intervalos como `[inicio, fin)`: dos reservas contiguas son válidas si el establecimiento no exige separación.
- Duración, incrementos de horario y posibles tiempos de preparación se configuran por cancha. No asumir 15 minutos universales.
- Mantenimientos, torneos y reservas externas ocupan la misma agenda que las reservas de la app.

## Estados

| Estado | Significado | Ocupa horario |
| --- | --- | --- |
| `requested` | Solicitud pendiente de aceptación | No; no garantiza disponibilidad |
| `held` | Bloqueo temporal emitido por el servidor | Sí, hasta su vencimiento |
| `confirmed` | Reserva aceptada con requisitos cumplidos | Sí |
| `completed` | Servicio realizado | Conserva el historial |
| `cancelled` | Reserva cancelada con motivo | No |
| `expired` | Solicitud o bloqueo vencidos | No |

Una solicitud puede pasar a bloqueo o confirmación solo tras comprobar disponibilidad de forma atómica. La modalidad de confirmación inmediata se habilita únicamente en sedes cuya agenda pueda mantenerse confiable.

## Concurrencia y cobros

- La base de datos debe impedir solapamientos para una cancha; consultar y después insertar sin protección atómica no es suficiente.
- Definir el vencimiento del bloqueo y validarlo en el servidor. El reloj del celular no decide.
- Precio, moneda, duración, descuento y condiciones quedan registrados al reservar.
- Separar estado de reserva y estado de pago. Una captura de transferencia o el regreso del navegador no verifican un cobro.
- Operaciones de creación y notificaciones de pago deben ser idempotentes.
- Antes de confirmar un pago tardío, volver a comprobar la posesión del horario. Si se perdió, resolver compensación o devolución según el flujo definido; nunca asignar una segunda reserva.
- Descuento, comisión, anticipo, reembolso y saldo requieren importes explícitos; no confiar en totales calculados por el cliente.

## Cancelaciones y opiniones

- Mostrar plazo, penalización, lluvia, cierre del establecimiento y devolución antes de reservar. Las condiciones exactas están pendientes de negociación.
- Mantener historial de cambios y actor responsable.
- Permitir una reseña por reserva completada al usuario autorizado. Definir moderación, edición y reclamaciones antes de habilitarlas.
- Una opinión interna no se publica automáticamente en Google Maps. Ofrecer un enlace voluntario a Google igual para todos, sin filtrar por calificación ni incentivar reseñas.
