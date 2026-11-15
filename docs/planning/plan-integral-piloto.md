# A-La-Cancha · Estado y plan para el piloto en Cartagena
Corte del 5 de noviembre de 2026. Base revisada: main tras el PR #41. El [estado anterior](status.md) conserva la evidencia histórica. Los [issues](backlog.md) sirven para seguir las tareas.

## Inventario de producto
| Área | Disponible en desarrollo | Falta para operar |
|---|---|---|
| App y cuentas | Expo, inicio y cierre de sesión, membresías por establecimiento, prueba física en Android | Inicio y navegación por rol, alta y recuperación de cuenta, perfil, altas y bajas de encargados |
| Jugador | Catálogo conectado, consulta de horarios y precios, bloqueo temporal, consulta y cancelación de bloqueos | Búsqueda por disponibilidad, zona y precio, detalle de cancha, acceso directo a reservas conectadas y recorrido de compra |
| Agenda | Consulta por cancha y día, registro presencial y cancelación, mantenimiento puntual, confirmación de bloqueos de jugadores | Resumen de hoy, calendario semanal, horarios recurrentes, excepciones, gestión de canchas, precios y asistencia |
| Cambios | El jugador propone otra hora. El encargado aprueba o rechaza desde su lista de pendientes. La tarjeta del jugador muestra el resultado al actualizar. Un conflicto conserva la reserva original | Avisos, recuperación después de desconexión y prueba de reapertura con las dos cuentas |
| Dinero | Cotización y desglose informativo de total, anticipo y saldo | Política acordada, pagos verificados, registro en cancha, conciliación, devoluciones, cierre de caja |
| Métricas | Existen reservas, horarios, tipo de registro y estados como fuentes de datos | Panel por cancha y periodo, asistencia registrada y movimientos de dinero confiables |
| Plataforma | Permisos en base de datos, control de solapamientos y reintentos, vencimiento de bloqueos, migraciones reproducibles y CI | Protección de main, auditoría de dependencias y permisos, restauración de respaldo, supervisión y pruebas móviles más amplias |

Evidencia de las entregas: PR #31–#36 (reservas y operación), #38 (reconstrucción en base desechable), #39–#41 (reprogramación y visibilidad para ambos roles). Las pruebas físicas corresponden a desarrollo mediante Expo Go. Los pagos siguen siendo informativos.

## Entregas y criterios de salida propuestos
| Orden | Entrega | Cómo se acepta |
|---|---|---|
| 1 | Dos espacios en la misma app (#3, #6, #8). Jugador: Explorar, Mis reservas, Perfil. Propietario: Hoy, Calendario, Caja y Más, con acceso a Canchas, Métricas y Encargados. | Al entrar con cada cuenta se abre la vista correspondiente. Quien tiene ambos roles puede alternar. El jugador encuentra su próximo partido y el encargado identifica próximos turnos y solicitudes. Las secciones se habilitan al estar operativas. |
| 2 | Recorrido del jugador (#7, #9). Búsqueda por día, hora, duración, zona y precio; detalle con fotos, ubicación, servicios y condiciones. | El jugador elige un turno disponible para toda la duración y consulta desde Mis reservas su cancha, fecha, hora, estado y desglose de precio. |
| 3 | Operación del establecimiento (#8). Configurar canchas, horarios, precios, excepciones y series recurrentes. Registrar asistencia y permisos de dueño y encargado. | Un encargado opera un día de apertura a cierre, resuelve conflictos de series y marca partidos jugados o inasistencias. Un administrador solo gestiona establecimientos asignados. |
| 4 | Métricas operativas. Filtros por sede, cancha y semana/mes. | El propietario compara ocupación reservada (horas confirmadas u ocupadas por partidos jugados / horas vendibles), uso real (horas jugadas / horas vendibles), cancelaciones, inasistencias y origen app/manual. Mantenimientos y cierres se descuentan de las horas vendibles. Probar con un calendario conocido, también sin horas vendibles. |
| 5 | Anticipos y caja (#10). Acordar porcentaje, destinatario del pago y tratamiento de cancelación, inasistencia, lluvia, cierre y cambio aprobado. Revisar las condiciones antes de automatizar retenciones. | En pagos de prueba el servidor verifica el anticipo, conserva su vínculo al reprogramar, controla duplicados y resuelve pagos tardíos. El encargado registra el saldo cobrado y concilia anticipos, pagos en cancha, pendientes y devoluciones. Habilitar cobro real solo tras verificar el ciclo completo. |
| 6 | Avisos y continuidad (#6, #11). Confirmaciones, cambios, vencimientos y recordatorios. | Probar registro, recuperación, revocación de sesión, pérdida de red antes y después de guardar, regreso desde segundo plano y reapertura. El usuario recupera el estado correcto al volver. |
| 7 | Piloto Android (#2, #14). Propuesta inicial: tres establecimientos en Cartagena, responsable de agenda por sede y distribución instalable. | Acordar periodo y umbrales con aliados. Medir cero dobles confirmaciones, sedes que actualizaron agenda en siete días, partidos completados por semana, tiempo de registro manual, conflictos y jugadores que regresan en 30 días. Revisar resultados antes de expandir. |

## Trabajo paralelo y decisiones
- Entrevistar a propietarios desde la primera entrega. Registrar cómo administran reservas presenciales, anticipos y cambios. Acordar quién resuelve incidencias.
- Completar #21, #26 y #27, ensayar restauración y verificar accesibilidad, rendimiento en teléfono de gama media, versiones de Android, calidad de conexión y registros de errores sin datos personales. Definir privacidad, conservación y acceso antes de incorporar usuarios reales.
- Probar por separado jugador, propietario y dos establecimientos diferentes. Para cada entrega: criterios observables, prueba automatizada, revisión en Android cuando corresponda y evidencia en GitHub.
- Para después del núcleo: promociones operables (#13), reseñas de partidos jugados (#12), panel de escritorio dedicado, ampliación a iOS y otras ciudades. El backlog original incluye promociones y reseñas entre las dependencias de lanzamiento. Se propone diferirlas para el piloto controlado y acordar su prioridad antes de la publicación amplia.
- Decisiones abiertas: política y porcentaje de anticipo, pasarela y conciliación, comisión de la plataforma, alcance de cada rol, sedes participantes y umbrales de éxito. La administración de pagos y las métricas financieras dependen de movimientos verificables.

Primera entrega propuesta: revisar los dos inicios con las cuentas de prueba y conectar las funciones existentes a su navegación antes de ampliar calendario o caja.
