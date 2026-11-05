# Bloqueos remotos de desarrollo

Ruta `/remote-reservations`, accesible desde la agenda conectada. Requiere una sesión; las consultas públicas siguen disponibles sin cuenta. No reutiliza DemoStore.

- El formulario envía cancha, fecha/hora de Colombia, duración, jugadores y equipo a `create_reservation`. Nunca envía un precio ni permite elegir roles o confirmar pagos.
- Cada intento usa un UUID de Expo Crypto. Se guarda antes de enviar, en SecureStore nativo o sessionStorage web, separado por usuario. Una respuesta perdida conserva los datos y la clave, incluso tras recargar. Antes de repetir la RPC se busca la reserva por actor y clave.
- Solo se elimina la solicitud tras comprobar el resultado o un rechazo definitivo de datos, conflicto o límite. Los errores de red, autenticación y respuestas inválidas conservan la clave. No hay reintentos automáticos.
- El precio final es el devuelto por el servidor. El jugador puede cancelar el bloqueo; no hay botón de cobro o confirmación. El límite y la exclusión se aplican en PostgreSQL.
- Historial de los últimos 50 registros propios, con filtro explícito por actor además de RLS. Al cambiar o cerrar sesión se desmonta el estado anterior. Los resultados tardíos no aparecen en la cuenta siguiente.
- La cancelación consulta el estado antes de escribir: si ya está cancelada o vencida, no repite la transición. La pantalla solo cancela `held`; las condiciones de cancelación de reservas confirmadas siguen pendientes.
- El reloj local avisa cuando pasó el plazo y pide actualizar. Nunca modifica por su cuenta el estado del servidor.

Límites: no es un lanzamiento público; faltan sesiones JWT reales, Android físico, recuperación/registro de cuentas, aceptación comercial y paginación del historial. La persistencia web dura lo que dura la pestaña; al perderla se consulta el historial, sin garantía de recuperar la clave local. No se modificó el esquema remoto ni se crearon cuentas por SQL.

Ver [evidencia y pendientes](../../../../../docs/engineering/remote-reservations-verification.md). Refs #6, #9.

Al abrir o actualizar el historial conectado, cada reserva confirmada del jugador muestra junto a su horario la decisión más reciente sobre cambios de turno. Las solicitudes pendientes y el historial completo se pueden consultar en el detalle.
