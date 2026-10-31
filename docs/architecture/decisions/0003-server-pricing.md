# ADR 0003: cotización y control de bloqueos

Estado: laboratorio de servidor. No conectado a la app ni a pagos.

## Precio y ofertas

`quote_slot` devuelve base, descuento, total, anticipo ilustrativo del 30%, saldo y datos de la promoción. Usa pesos enteros y aplica el descuento solo si todo el turno está dentro de las fechas, días y franja permitidos. Si hay varias promociones, elige el mayor porcentaje; desempata por UUID. No acumula descuentos.

El cupo pertenece a la promoción completa, no se reinicia cada día. Cuentan las reservas confirmadas, completadas y los bloqueos aún vigentes. Cancelar o vencer libera el cupo. El descuento se atribuye exclusivamente al establecimiento: esta versión no subsidia ofertas ni gasta fondos de la plataforma.

Consultar precio no bloquea la promoción ni el turno. `create_reservation` bloquea la cancha, vuelve a cotizar y guarda el desglose y el nombre/porcentaje aplicados. Dos solicitudes para el último cupo no pueden recibir ambas el descuento. Si el cupo se agotó, la nueva reserva temporal puede tener tarifa base: **el cliente deberá mostrar ese precio final y pedir aceptación antes de cualquier confirmación o cobro**. No hay cobros en este laboratorio.

Un reintento con la misma clave devuelve el mismo snapshot, aunque se edite después la oferta. No se aceptan importes desde el cliente. Los datos históricos anteriores se migran con descuento cero y conservan su total.

## Bloqueos

Máximo tres bloqueos activos por actor, incluyendo canchas distintas. La creación toma un bloqueo transaccional por actor y luego por cancha; mantiene el mismo orden en todos los reintentos. Esto limita acaparamiento básico, pero no sustituye controles de frecuencia o prevención de cuentas abusivas.

`expire_holds()` marca vencimientos en lotes de hasta cien canchas, omite canchas bloqueadas por transacciones concurrentes y registra eventos. Solo el rol de servicio y el administrador de base de datos pueden ejecutarla. Su clave nunca debe estar en un cliente.

La función está implementada; **no hay un cron desplegado**. La disponibilidad ya ignora holds vencidos y la creación también los libera antes de insertar. El futuro cron deberá volver a ejecutar la función hasta vaciar lotes pendientes y observar fallos.

## Pendientes

No hay edición de promociones por propietarios, contratos comerciales, pagos, comisiones, JWT real ni integración móvil. Las futuras operaciones de edición de precios y promociones deben tomar el bloqueo de la cancha para respetar la serialización de la creación.

Esta decisión reemplaza las limitaciones de tarifa base y falta de operación de limpieza de ADR 0002. Siguen pendientes las excepciones de apertura, onboarding y despliegue.
