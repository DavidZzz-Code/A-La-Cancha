# Mantenimiento de bloqueos

En a-la-cancha-dev se habilitó pg_cron y el trabajo alacancha-expire-holds cada minuto, ejecutando public.expire_holds() bajo el rol administrador. No se concedieron permisos nuevos a clientes. La función procesa hasta 100 canchas por ejecución con SKIP LOCKED y registra los cambios de estado. No confirma reservas ni procesa cobros.

## Supervisión

```sql
select jobname, schedule, active from cron.job where jobname='alacancha-expire-holds';
select status, return_message, start_time, end_time from cron.job_run_details
where jobid=(select jobid from cron.job where jobname='alacancha-expire-holds')
order by start_time desc limit 10;
```

Pausar sin borrar historial: `select cron.alter_job((select jobid from cron.job where jobname='alacancha-expire-holds'), active := false);`. Reactivar cambiando false por true. No desinstalar pg_cron: eliminaría otros trabajos.

## Historial y entornos

La migración 20261031201423_relocate_btree_gist.sql mueve la extensión existente a extensions sin recrear tablas ni índices. CI ejecuta la migración y las pruebas de exclusión/concurrencia.

La programación está en supabase/migrations/20261031201446_enable_hold_expiry_schedule.sql y se prueba con pg_cron en la base desechable de CI.

El trabajo acumula historial en cron.job_run_details. Revisar retención antes de producción. La ejecución en una base vacía comprueba el planificador, no sustituye las pruebas de expiración con reservas del laboratorio ni la validación de carga real.
