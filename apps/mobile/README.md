# App de jugadores

Prototipo Expo SDK 58, React Native y TypeScript. Catálogo ficticio y reservas locales.

Desde la raíz: npm install y npm run web. Ver [ejecución, pruebas y límites](../../docs/engineering/prototype.md).

Las rutas están en app/; las pantallas por funcionalidad en src/features/; componentes en src/components/ y persistencia local en src/lib/. Las reglas puras viven en packages/domain y los estilos base en packages/design-tokens.

Hay inicio/cierre de sesión, agenda remota y bloqueos temporales de desarrollo. La primera consulta de agenda del propietario vive en `src/features/owner-agenda` y requiere membresías del servidor. La demo local permanece separada. Exportar JavaScript no sustituye probar dispositivos físicos.

Ver [entornos y calidad](../../docs/engineering/environments.md) antes de conectar servicios.
