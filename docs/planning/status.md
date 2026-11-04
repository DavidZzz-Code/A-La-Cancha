# Estado verificado — 4 de noviembre de 2026

| Área | Implementado y verificado | Pendiente |
| --- | --- | --- |
| App Expo | Demo local; catálogo/horarios/precios remotos en main; bloqueos en PR #31 | Revisión final e integración de #31 |
| Reservas de desarrollo | JWT reales: creación, conflicto, cancelación, lectura/cancelación ajena rechazadas, expiración y reutilización del horario | Ciclo comercial completo, pagos y reservas confirmadas |
| Cuentas | Inicio/cierre; corrección de eventos entre pestañas con CI aprobado | Registro, recuperación, perfil; ampliar pruebas de renovación/revocación |
| Android | Usuario confirmó acceso, agenda, creación y cancelación en Expo Go físico | Registrar dispositivo/versiones, reinicio, segundo plano, red interrumpida y APK |
| Base de datos | RLS, exclusión de horarios, idempotencia, precios/promociones de servidor | Reconciliar historial de migraciones, carga y supervisión |
| Calidad | [CI 41720104792](https://github.com/DavidZzz-Code/A-La-Cancha/actions/runs/41720104792) aprobado sobre 0fc2a4b | Protección efectiva de main (#21), revisión de dependencias (#27) |
| Propietarios | Membresías y operaciones de servidor | Agenda de propietario y reservas externas (#8) |
| Lanzamiento | Alcance y backlog documentados | Establecimientos participantes, pagos, reseñas, avisos y publicación |

## Próxima entrega

1. Revisar el PR #31 completo y sus comprobaciones antes de integrarlo. Sigue abierto y en borrador al registrar esta actualización.
2. Iniciar la agenda de propietarios (#8), con permisos por establecimiento e incorporación de reservas recibidas por WhatsApp u otros canales a la misma agenda.
3. Mantener pendientes de #6/#9 y catálogo #7 visibles; no dar por terminados registro, recuperación, filtros o ciclo comercial por completar bloqueos de desarrollo.
4. Ampliar la matriz de pruebas móviles y preparar el piloto con establecimientos.

## Evidencia

- [PR #31](https://github.com/DavidZzz-Code/A-La-Cancha/pull/31): entrega en revisión.
- [Verificación de bloqueos](../engineering/remote-reservations-verification.md): alcance, pruebas reales y límites.
- [Android físico](../engineering/android-device-validation.md): resultado reportado por el usuario y solución de conexión con ngrok/NODE_PATH.
- PR #23, #24, #25, #28 y #30 integrados en etapas anteriores.

La prueba de Android fue confirmada por el usuario, no observada automáticamente. La validación de Expo Go no equivale a una distribución de producción. La auditoría de dependencias #27 y la reconciliación del historial siguen pendientes.
