# Backend y persistencia

Agenda desplegada en Supabase de desarrollo, con RLS, exclusión de intervalos, cotización y mantenimiento periódico de bloqueos. La app todavía no crea reservas remotas. No hay pagos ni establecimientos reales afiliados.

- migrations/: esquema, permisos y restricciones portables.
- tests/: PostgreSQL real, actores distintos y conexiones simultáneas; ver [ejecución](tests/README.md).
- operations/: configuración específica del entorno Supabase, separada del laboratorio.

Ver [despliegue](../docs/engineering/supabase-development.md) y [mantenimiento](../docs/engineering/hold-maintenance.md). El historial remoto necesita reconciliación antes de automatizar db push (#26).

Las reservas externas y mantenimientos ocupan la misma agenda. El servidor calcula el precio y guarda su desglose. Los clientes no pueden modificar tablas directamente. La confirmación manual no acredita pagos; el anticipo sigue siendo ilustrativo.

Pendientes: integración de autenticación y reservas con la app, validación JWT/PostgREST, políticas comerciales y onboarding de propietarios.
