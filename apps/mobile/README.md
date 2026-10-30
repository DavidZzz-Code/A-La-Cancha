# App de jugadores

Estado: espacio reservado y documentado; Expo todavía no se ha inicializado.

Stack decidido: React Native, Expo y TypeScript. Preparar Android e iOS; primera distribución prevista en Android.

## Organización al implementar

- `app/`: rutas y composición de pantallas.
- `src/features/`: funcionalidades como discovery, venues y reservations.
- `src/components/`: presentación compartida dentro de la app.
- `src/lib/`: configuración y clientes de servicios.
- `assets/`: iconos, imágenes autorizadas y fuentes necesarias.

Crear las carpetas conforme tengan contenido. Las reglas y contratos compartidos corresponden a [domain](../../packages/domain/README.md); el estilo base a [design-tokens](../../packages/design-tokens/README.md).

Ver [MVP](../../docs/product/mvp.md) y [arquitectura](../../docs/architecture/overview.md). Los comandos reproducibles, versiones compatibles, lockfile y chequeos se añadirán en el issue de inicialización de Expo.
