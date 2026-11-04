# Verificación de agenda del propietario

Entrega inicial de #8, 4 de noviembre de 2026. Consulta de solo lectura sobre tablas y RLS existentes. No cambia el esquema ni asigna permisos a cuentas reales.

## Casos implementados en pruebas

- Contratos: límites diarios UTC correspondientes a Colombia, intervalos contiguos, estados cancelados/vencidos, bloqueo con plazo agotado, rechazo de otra cancha/fecha y respuestas truncadas.
- E2E con API simulada en web móvil y escritorio: sesión, membresías, canchas publicadas/privadas, selección de día y cancha, estados y origen, errores, respuesta incompleta, revocación al actualizar y cierre de sesión. El fixture exige filtros por actor/establecimiento/cancha/día y ausencia de escrituras.
- PostgreSQL: encargado A lee reservas de su sede, no de B; B no lee A; membresías ajenas ocultas y eliminación de membresía retira acceso. Se ejecuta sobre la base desechable `alacancha_test`, junto con pruebas existentes de permisos, conflictos y concurrencia.

Ejecución local de contratos/tipos/lint: `npm run check`. E2E: exportar con variables de prueba del workflow y ejecutar `AUTH_E2E=1 npx playwright test tests/e2e/owner-agenda.spec.ts` con `PREVIEW_DIR` apuntando a la exportación. En PowerShell usar `$env:AUTH_E2E='1'` y `$env:PREVIEW_DIR='<ruta>'`. CI ejecuta todos los casos en Linux.

## Prueba manual pendiente

Usar una cuenta sintética autorizada por el responsable de desarrollo mediante una membresía explícita. Abrir Mi espacio → Agenda de mi establecimiento, verificar cancha/fecha contra datos del servidor, cambiar cancha y comprobar estados. Probar otra cuenta sin membresía. No elevar permisos de un jugador existente solo para facilitar la prueba.

Esta pantalla aún no se ha validado con un encargado real ni en Android físico. La prueba Android documentada para #31 corresponde al flujo del jugador. No se afirma que esta entrega habilite reservas comerciales confirmadas, cobros o edición de la agenda.
