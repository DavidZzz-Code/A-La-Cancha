# Agenda remota de lectura

Consulta hasta 50 canchas publicadas y sus sedes publicadas, ocupación mediante occupied_slots y cotización mediante quote_slot. No inventa atributos ausentes del esquema (deporte, fotos, ubicación exacta). No escribe directamente ni reutiliza el DemoStore. Delega la creación autenticada en remote-reservations.

La disponibilidad es una consulta provisional. Se excluyen intervalos ocupados y pasados; el servidor conserva la decisión final al crear una reserva. Los importes mostrados provienen de quote_slot, nunca de una promoción calculada en el cliente.

Cada petición usa AbortController y una clave de selección: cambiar cancha, fecha o duración oculta el resultado anterior. Errores de consulta no equivalen a agenda vacía. Actualizar vuelve a consultar catálogo y agenda. Catálogo vacío no se rellena con datos ficticios.

Ruta /remote-agenda; acceso desde el panel de cuentas cuando existe configuración pública. No exige sesión para explorar. La lectura PostgREST real está documentada en docs/engineering/remote-agenda-verification.md. Continúan pendientes paginación, metadatos de búsqueda y validación de escritura con JWT real. Refs #7 y #9.
