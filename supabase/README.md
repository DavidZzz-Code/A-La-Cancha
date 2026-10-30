# Backend y persistencia

Estado: servicio y esquema todavía no creados. No se han configurado credenciales ni cobros.

## Organización al implementar

- `migrations/`: cambios SQL ordenados y versionados.
- `functions/`: operaciones de servidor y webhooks que lo necesiten.
- `tests/`: pruebas relevantes de permisos, concurrencia y persistencia.
- `seed.sql`: datos ficticios y claramente identificados para desarrollo.

Crear cada elemento cuando se utilice. Ninguna clave de servicio puede llegar a las apps cliente. Aplicar permisos por usuario y establecimiento y proteger solapamientos en la base de datos.

Versionar decisiones y migraciones; no corregir producción con cambios manuales que no puedan reproducirse. Ver [arquitectura](../docs/architecture/overview.md) y [reglas de reservas](../docs/product/reservation-rules.md).
