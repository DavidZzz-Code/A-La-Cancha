# Verificación de lectura remota — 3 de noviembre de 2026

Proyecto de desarrollo a-la-cancha-dev. Se publicó una sede y una cancha ficticias con prefijo DEMO mediante supabase/operations/seed_demo_catalog.sql, sin usuarios ni reservas. No ejecutar ese archivo en producción.

Se consultó la API PostgREST con la clave publicable (sin service_role ni sesión): catálogo HTTP 200 con una cancha; occupied_slots HTTP 200 con cero intervalos; quote_slot HTTP 200 para 60 minutos, total 100000 COP, anticipo ilustrativo 30000 y saldo 70000. La cotización no bloquea turnos ni implica cobro.

CI añade seis recorridos de agenda con API simulada: ocupación/precio, catálogo vacío y error de consulta, en móvil y escritorio. Captura remote-agenda.png dentro del artefacto de resultados de Playwright. Estos recorridos no sustituyen Android físico ni la creación de reservas por un usuario real.

La ruta /remote-agenda permanece separada del catálogo ficticio local. No copia datos remotos a DemoStore ni crea reservas. Próxima entrega: creación/cancelación autenticada con idempotencia y manejo de conflictos, sin confirmar pagos.
