# Estado verificado — 4 de noviembre de 2026

| Área | Implementado y verificado | Pendiente |
| --- | --- | --- |
| App Expo | Demo local; catálogo/horarios/precios remotos y bloqueos de #31 integrados en main | Continuar ciclo completo y panel del propietario |
| Reservas de desarrollo | JWT reales: creación, conflicto, cancelación, lectura/cancelación ajena rechazadas, expiración y reutilización del horario | Ciclo comercial completo, pagos y reservas confirmadas |
| Cuentas | Inicio/cierre; corrección de eventos entre pestañas con CI aprobado | Registro, recuperación, perfil; ampliar pruebas de renovación/revocación |
| Android | Usuario confirmó acceso, agenda, creación y cancelación en Expo Go físico | Registrar dispositivo/versiones, reinicio, segundo plano, red interrumpida y APK |
| Base de datos | RLS, exclusión de horarios, idempotencia, precios/promociones de servidor | Reconciliar historial de migraciones, carga y supervisión |
| Calidad | [CI 41720104792](https://github.com/DavidZzz-Code/A-La-Cancha/actions/runs/41720104792) aprobado sobre 0fc2a4b | Protección efectiva de main (#21), revisión de dependencias (#27) |
| Propietarios | Membresías y operaciones de servidor; primera consulta por cancha/día implementada en la rama de #8 | Verificación CI y con encargado, registro manual, mantenimiento y horarios recurrentes |
| Lanzamiento | Alcance y backlog documentados | Establecimientos participantes, pagos, reseñas, avisos y publicación |

## Próxima entrega

1. PR #31 integrado en main el 4 de noviembre de 2026 (47228ea), tras revisión y CI aprobado.
2. Revisar la primera consulta de agenda del propietario (#8), con permisos por establecimiento. Después incorporar mantenimiento y registro manual de ocupaciones. El flujo principal de reservas permanece dentro de la app; WhatsApp no es requisito.
3. Mantener pendientes de #6/#9 y catálogo #7 visibles; no dar por terminados registro, recuperación, filtros o ciclo comercial por completar bloqueos de desarrollo.
4. Ampliar la matriz de pruebas móviles y preparar el piloto con establecimientos.

## Evidencia

- [PR #31](https://github.com/DavidZzz-Code/A-La-Cancha/pull/31): integrado; bloqueos temporales, no confirmación comercial.
- [Verificación de bloqueos](../engineering/remote-reservations-verification.md): alcance, pruebas reales y límites.
- [Android físico](../engineering/android-device-validation.md): resultado reportado por el usuario y solución de conexión con ngrok/NODE_PATH.
- PR #23, #24, #25, #28 y #30 integrados en etapas anteriores.

La prueba de Android fue confirmada por el usuario, no observada automáticamente. La validación de Expo Go no equivale a una distribución de producción. La auditoría de dependencias #27 y la reconciliación del historial siguen pendientes.

- [Verificación de agenda del propietario](../engineering/owner-agenda-verification.md): alcance de lectura, pruebas y límites de la entrega de #8.

## Avance del 5 de noviembre de 2026

El PR #32 está integrado. El responsable confirmó en Android físico que pudo consultar la cancha DEMO y los tres movimientos del 5 de noviembre con la cuenta de encargado. La siguiente entrega de #8 implementa crear y cancelar mantenimientos puntuales, con motivos, permisos y reintentos. La validación física de estas escrituras queda pendiente.
