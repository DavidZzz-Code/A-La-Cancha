# Prototipo de jugadores

Entrega de [#15](https://github.com/DavidZzz-Code/A-La-Cancha/issues/15), en el PR [#17](https://github.com/DavidZzz-Code/A-La-Cancha/pull/17). Demostración local, no agenda comercial.

## Ejecutar

Usar Node 24. Desde la raíz:

```sh
npm install
npm run web
npm run check
npm run export:web
npm run export:native
npx playwright install chromium
npm run test:e2e
```

En Windows, usar `npm.cmd` si PowerShell bloquea `npm.ps1`. Para Android: `npm run android -w @alacancha/mobile` con un emulador compatible o dispositivo preparado. Un bundle JavaScript no es un APK firmado ni demuestra compatibilidad en un teléfono.

La primera instalación completa produce el lockfile que se incorporará al repositorio; después se utilizará `npm ci`. El workflow conserva ese archivo como artefacto durante esta inicialización. La instalación reproducible requiere versionarlo.

## Implementación

- Búsqueda por fecha, hora, duración, deporte, zona, cubierta y presupuesto.
- Fichas ficticias e ilustraciones SVG originales. Sin fotografías, direcciones ni reseñas de negocios reales.
- Turnos alineados a media hora. Una reserva ocupa una cancha completa.
- Cotización compartida, descuentos por franja y reparto orientativo entre jugadores.
- Reserva de prueba, confirmación, historial, cancelación, favoritos y restablecimiento.
- Persistencia local validada al restaurar y aviso si falla la escritura.
- Navegación adaptable y tipografías incluidas en el paquete.

## Organización

Las rutas de `apps/mobile/app` componen las pantallas de `src/features`. Discovery contiene catálogo y favoritos; venues, ficha y horarios; reservations, formulario y ciclo local; profile, explicación y reinicio. `src/lib` contiene los datos ficticios y la persistencia. Las reglas puras viven en `packages/domain`; los colores y fuentes, en `packages/design-tokens`.

## Límites

No hay cuentas, cobros, contactos a propietarios, mapas reales ni backend conectado. El anticipo del 30% ilustra el desglose; no representa una política comercial acordada.

La agenda local rechaza un segundo intento dentro de la misma instancia y restaura pruebas al recargar. No sincroniza pestañas, navegadores ni teléfonos. La protección multiusuario debe venir de PostgreSQL (#16).

Las canchas cierran como máximo a las 23:00. El caso de medianoche comprueba que una hora colombiana conserve su fecha aunque el instante UTC pertenezca al día siguiente; no permite jugar fuera del horario publicado.

Las reglas aceptan hasta treinta días de anticipación y la interfaz muestra catorce. Las promociones aplican a todo el intervalo o no aplican. Saldo y anticipo suman el total en pesos enteros.

## Evidencia

Se ejecutaron localmente catorce pruebas de dominio y almacén demo: todas correctas. Incluyen conflicto, adyacencia, cancelación, vencimiento, validación, cambio de fecha UTC, precios y restauración. También pasó TypeScript del paquete de dominio.

La instalación local completa recibió HTTP 403 de npm. En GitHub Actions ya pasaron instalación, TypeScript del workspace y exportaciones web/Android/iOS para `f0a69eb`. Consultar el resultado del commit concreto para E2E y capturas.

Pendientes: versionar lockfile, completar E2E y revisar capturas. Android/iOS físicos, entrevistas y pruebas con organizadores siguen pendientes aunque la web pase.
