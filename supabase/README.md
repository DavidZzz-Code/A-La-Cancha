# Backend y persistencia

Laboratorio PostgreSQL implementado y probado; todavía no desplegado ni conectado a la app. No hay claves de servicio ni pagos configurados.

- migrations/: esquema, RLS, exclusión de intervalos, cotización y control de bloqueos.
- tests/: PostgreSQL real, actores distintos y conexiones simultáneas. Ver [ejecución](tests/README.md).

Las reservas externas y mantenimientos ocupan la misma agenda. El servidor calcula el precio y guarda su desglose histórico. Los clientes no pueden modificar tablas directamente.

Ver [ADR 0002](../docs/architecture/decisions/0002-reservation-laboratory.md) y [ADR 0003](../docs/architecture/decisions/0003-server-pricing.md). La confirmación manual no acredita pagos; el anticipo es ilustrativo. Falta configurar Supabase real, autenticación móvil, cron, políticas comerciales y onboarding.
