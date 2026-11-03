# Estado verificado — 3 de noviembre de 2026

| Área | Implementado y verificado | Pendiente |
| --- | --- | --- |
| App Expo | Demo navegable, favoritos, precio, reserva/cancelación local; exportaciones y recorridos web | Android físico, integración remota |
| Base de datos | Supabase de desarrollo, RLS, exclusión, idempotencia, precio/promociones de servidor | Reconciliar historial, carga y validación JWT/PostgREST |
| Mantenimiento | Cron cada minuto; 4034 ejecuciones succeeded al revisar; extensión en extensions | Retención del historial y supervisión antes de producción |
| Cuentas | PR #25 integrado: acceso opcional, persistencia y cierre; pruebas con API simulada | Sesión real, registro, recuperación, perfil y dispositivo |
| Calidad | Lint, tipos, pruebas y check conjunto app/PostgreSQL | Protección efectiva de main (#21), revisión de dependencias (#27) |
| Propietarios | Membresías y operaciones de servidor | Panel y operación con establecimientos |
| Lanzamiento | Alcance y backlog | Canchas participantes, pagos, reseñas, avisos y publicación |

## Orden de entrega

1. Completar acceso y verificar sesiones reales (#6).
2. Consultar catálogo, horarios y precio del servidor (#7).
3. Crear/cancelar bloqueos remotos, manejar vencimiento y conflictos (#9).
4. Entregar agenda de propietario y reservas externas (#8).
5. Probar Android con establecimientos participantes (#2 y #14).

Cada entrega debe demostrar el recorrido completo que habilita. No cerrar #6/#9 por pasar pruebas simuladas, ni confundir una exportación JavaScript con una prueba nativa. Pagos y reseñas dependen del ciclo real de reservas.

## Evidencia

- [PR #23: permisos RPC](https://github.com/DavidZzz-Code/A-La-Cancha/pull/23), integrado.
- [PR #24: lint y CI](https://github.com/DavidZzz-Code/A-La-Cancha/pull/24), integrado.
- [PR #25: cuentas de desarrollo](https://github.com/DavidZzz-Code/A-La-Cancha/pull/25), integrado.
- [PR #28: mantenimiento](https://github.com/DavidZzz-Code/A-La-Cancha/pull/28), integrado.

La auditoría npm local quedó bloqueada por revisión automática de una conexión secundaria no autorizada. #27 conserva el pendiente; no hay un informe de auditoría completo validado.
