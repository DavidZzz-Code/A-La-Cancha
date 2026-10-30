# Backlog inicial

Los issues de GitHub son la fuente operativa de tareas. Este documento conserva la secuencia y las dependencias; no duplica su estado.

## Prioridades

- P0: imprescindible para validar el problema o asegurar una reserva confiable.
- P1: necesario para operar y evaluar el piloto.
- P2: mejora posterior, sin bloquear el núcleo.

## Tareas iniciales

Plan general: [#1](https://github.com/DavidZzz-Code/A-La-Cancha/issues/1).

| Issue | Prioridad | Área | Entrega | Depende de |
| --- | --- | --- | --- | --- |
| [#2](https://github.com/DavidZzz-Code/A-La-Cancha/issues/2) | P0 | Investigación | Validar zona, deporte y operación de las canchas en Cartagena | — |
| [#3](https://github.com/DavidZzz-Code/A-La-Cancha/issues/3) | P0 | Diseño | Diseñar y probar el recorrido móvil y la agenda del propietario | #2 |
| [#4](https://github.com/DavidZzz-Code/A-La-Cancha/issues/4) | P0 | Móvil | Inicializar Expo, TypeScript y el workspace reproducible | — |
| [#5](https://github.com/DavidZzz-Code/A-La-Cancha/issues/5) | P0 | Backend | Diseñar esquema, permisos y restricciones de agenda en PostgreSQL | #2, #4 |
| [#6](https://github.com/DavidZzz-Code/A-La-Cancha/issues/6) | P0 | Acceso | Implementar sesión y permisos de jugador, propietario y operaciones | #5 |
| [#7](https://github.com/DavidZzz-Code/A-La-Cancha/issues/7) | P0 | Búsqueda | Implementar catálogo y búsqueda por fecha, hora, zona y precio | #3, #5 |
| [#8](https://github.com/DavidZzz-Code/A-La-Cancha/issues/8) | P0 | Propietarios | Crear panel con agenda por cancha y registro de reservas externas | #3, #5, #6 |
| [#9](https://github.com/DavidZzz-Code/A-La-Cancha/issues/9) | P0 | Reservas | Implementar ciclo de reserva con bloqueos y prevención de solapamientos | #6, #7, #8 |
| [#10](https://github.com/DavidZzz-Code/A-La-Cancha/issues/10) | P1 | Pagos | Definir e implementar anticipos, cancelaciones y conciliación de pagos | #2, #9 |
| [#11](https://github.com/DavidZzz-Code/A-La-Cancha/issues/11) | P1 | Avisos | Implementar confirmaciones, recordatorios y enlaces compartibles | #9 |
| [#12](https://github.com/DavidZzz-Code/A-La-Cancha/issues/12) | P1 | Reseñas | Añadir reseñas de reservas completadas y enlace voluntario a Google | #9 |
| [#13](https://github.com/DavidZzz-Code/A-La-Cancha/issues/13) | P1 | Promociones | Implementar ofertas por horario con cupos y costos explícitos | #2, #7, #9 |
| [#14](https://github.com/DavidZzz-Code/A-La-Cancha/issues/14) | P1 | Lanzamiento | Preparar piloto Android, publicación y evaluación antes de expandir | #10, #11, #12, #13 |

## Preparación de una tarea

Definir usuario, problema, alcance, exclusiones, dependencias y criterios observables. No comenzar tareas bloqueadas por decisiones de negocio o datos faltantes sin registrar la hipótesis usada.

## Finalización

Cumplir aceptación, verificar comportamiento y errores pertinentes, enlazar el pull request y actualizar documentos afectados. Crear una tarea de seguimiento para lo pendiente; no dar por completa una integración simulada.
