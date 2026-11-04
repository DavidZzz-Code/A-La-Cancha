# Panel de propietarios y operaciones

Estado: sin aplicación independiente. La primera consulta de agenda se implementa en Expo, disponible también en web; ver [ADR 0004](../../docs/architecture/decisions/0004-owner-agenda-in-expo.md). Next.js sigue siendo una opción si el panel necesita independizarse.

Prioridad: gestionar reservas originadas dentro de A La Cancha y disponibilidad por cancha. El registro manual de ocupaciones externas es apoyo para evitar dobles reservas; no exige que el jugador reserve por WhatsApp. Bloqueos, precios, ofertas y métricas se incorporan según el roadmap.

El encargado solo administra sus establecimientos. Operaciones es un permiso diferente, aplicado en el backend. Un panel oculto no constituye un control de acceso.

Organizar rutas y funcionalidades por separado. Compartir contratos con [domain](../../packages/domain/README.md) y consumir el mismo backend que la app móvil.

Ver [reglas de reservas](../../docs/product/reservation-rules.md).
