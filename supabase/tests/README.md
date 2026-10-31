# Verificar la agenda

Se necesitan PostgreSQL 17 con `btree_gist`, `psql` y Python 3. No se requieren paquetes Python.

Crear una base **nueva y desechable** llamada `alacancha_test`; configurar `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` y `PGDATABASE=alacancha_test`, y ejecutar:

```sh
python supabase/tests/test_agenda.py
```

El bootstrap no borra tablas existentes. Una segunda ejecución sobre la misma base debe fallar al encontrar el esquema; recrear únicamente la base de pruebas de manera explícita. Nunca ejecutar el bootstrap en un proyecto Supabase real.

GitHub Actions crea un servicio PostgreSQL temporal por ejecución. La contraseña del workflow es exclusiva de ese contenedor efímero, sin acceso a sistemas externos.

Casos: visibilidad pública y privada, aislamiento entre usuarios y propietarios, rechazo de escritura directa, cálculo en servidor, idempotencia, dos reservas simultáneas, confirmación restringida, cancelación, recuperación de bloqueos vencidos, reservas externas, mantenimiento, adyacencia, cierre y restricción de exclusión incluso con escritura privilegiada.

Los datos son ficticios. Ver los [límites del laboratorio](../../docs/architecture/decisions/0002-reservation-laboratory.md).
