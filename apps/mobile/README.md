# App de jugadores

Prototipo Expo SDK 58, React Native y TypeScript. Catálogo ficticio y reservas locales.

Desde la raíz: npm install y npm run web. Ver [ejecución, pruebas y límites](../../docs/engineering/prototype.md).

Las rutas están en app/; las pantallas por funcionalidad en src/features/; componentes en src/components/ y persistencia local en src/lib/. Las reglas puras viven en packages/domain y los estilos base en packages/design-tokens.

Hay inicio/cierre de sesión, agenda remota y bloqueos temporales de desarrollo. La primera consulta de agenda del propietario vive en `src/features/owner-agenda` y requiere membresías del servidor. La demo local permanece separada. Exportar JavaScript no sustituye probar dispositivos físicos.

Ver [entornos y calidad](../../docs/engineering/environments.md) antes de conectar servicios.

## APK Android de prueba interna

Desde la raíz del repositorio con Node 24, ejecutar `npm ci` y entrar a `apps/mobile`. El perfil `preview` de `eas.json` usa la conexión pública de desarrollo y genera un APK con el JavaScript incluido.

1. Autenticarse con `npx eas-cli login` y verificar la cuenta con `npx eas-cli whoami`.
2. En la primera compilación, vincular la app al proyecto de su propietario mediante `npx eas-cli init`. Conservar el identificador generado y la misma firma para futuras actualizaciones.
3. Ejecutar `npx eas-cli build --platform android --profile preview`. En la primera ejecución, usar las credenciales Android administradas por Expo del proyecto.
4. Tras la compilación, abrir el enlace de instalación desde el teléfono. Compartirlo únicamente con participantes autorizados.
5. Cerrar Expo Go, apagar el PC y abrir A La Cancha desde su ícono con datos móviles. Iniciar sesión y consultar las reservas conectadas. Registrar versión, dispositivo y resultado.
