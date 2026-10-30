# Instrucciones para trabajar en A La Cancha

- Leer `README.md`, `docs/product/mvp.md` y `docs/architecture/overview.md` antes de implementar.
- Revisar el issue relacionado y los archivos existentes antes de crear otro módulo.
- Mantener documentación y comunicación de producto en español. Usar nombres de código consistentes en inglés.
- Organizar por funcionalidades. Las rutas coordinan pantallas; las reglas del negocio viven fuera de ellas.
- Usar el stack decidido en `docs/architecture/decisions/0001-platform.md`. Documentar cambios de arquitectura con una nueva decisión.
- No crear microservicios, abstracciones generales, nuevas aplicaciones o paquetes sin una necesidad concreta del alcance actual.
- No confundir un turno consultado, un bloqueo temporal y una reserva confirmada.
- Proteger la exclusividad de horarios en la base de datos, incluso con solicitudes simultáneas. Una comprobación del cliente no basta.
- Registrar reservas externas en la misma agenda. Los pagos y su verificación corresponden al servidor.
- Nunca guardar credenciales, claves de servicio, documentos personales ni datos de clientes en el repositorio.
- En el cliente solo pueden existir claves expresamente públicas. Aplicar permisos de base de datos por usuario y establecimiento.
- Identificar como demo los datos y reseñas ficticios; no atribuir afiliaciones a negocios reales sin autorización.
- Probar los cambios de reservas, permisos y pagos con casos de error y concurrencia pertinentes. Para documentación, comprobar enlaces y consistencia; no agregar pruebas artificiales.
- Describir qué se implementó, qué se verificó y qué sigue pendiente. No afirmar que una función planeada ya funciona.
- Actualizar la guía de la carpeta y la documentación si cambia una responsabilidad o un flujo.
