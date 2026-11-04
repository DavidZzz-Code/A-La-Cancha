# Prueba en Android físico — 4 de noviembre de 2026

## Resultado y alcance

El responsable del proyecto confirmó en el chat que completó correctamente, en su teléfono Android mediante Expo Go: inicio de sesión con una cuenta de desarrollo, consulta de agenda conectada, selección de cancha DEMO y horario, creación de bloqueo y cancelación con resultado «Cancelada».

Es una prueba manual reportada por el usuario, no una ejecución automatizada observada por el agente. No se registraron modelo del teléfono, versión de Android ni versión exacta de Expo Go. No equivale a validar un APK de producción, publicación en tienda, iOS, pagos, recuperación de contraseña o persistencia tras reiniciar el teléfono.

## Preparación reproducible

Desde la raíz del repositorio, usar Node 24 y las dependencias del lockfile. Configurar en PowerShell las variables públicas del proyecto de desarrollo (ver .env.example si corresponde):

```powershell
$env:EXPO_PUBLIC_SUPABASE_URL = "<URL HTTPS del proyecto de desarrollo>"
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "<clave publicable del proyecto de desarrollo>"
npm.cmd run start --workspace @alacancha/mobile -- --lan --port 8081
```

Instalar Expo Go compatible con SDK 58 en Android. Mantener la terminal abierta y escanear el QR nuevo después de cada cambio de conexión. No colocar contraseñas, tokens JWT ni claves de servicio en archivos versionados.

## Incidencias encontradas y solución

1. En Wi-Fi universitario, Expo Go mostraba «Something went wrong». La URL LAN anunciada por Metro tampoco respondió desde Chrome del celular en la ruta /status. Esto señala un problema de conectividad; no identifica por sí solo aislamiento de red, firewall o interfaz incorrecta. Probar hotspot no resolvió el caso reportado.
2. El modo `--tunnel` de la CLI instalada solicitó iniciar sesión en Expo para crear una URL firmada. Su mensaje ofrecía `--tunnel ngrok` como alternativa.
3. La instalación global de `@expo/ngrok` terminó correctamente, pero Expo volvió a pedir el paquete. Se comprobó que la versión 4.1.3 podía cargarse desde su ruta absoluta y que el resolvedor global de Expo no la encontraba.
4. Añadir la carpeta global de npm a NODE_PATH, solo en esa terminal, permitió al resolvedor encontrar y cargar el paquete.

Si el paquete aún no está instalado:

```powershell
npm.cmd install --global @expo/ngrok@4.1.3
```

Con las mismas variables públicas configuradas, ejecutar desde la raíz:

```powershell
$globalModules = (npm.cmd root -g).Trim()
$env:NODE_PATH = $globalModules
npm.cmd run start --workspace @alacancha/mobile -- --tunnel ngrok --port 8081
```

Escanear el nuevo QR con Expo Go. En esta sesión el usuario confirmó conexión y recorrido correcto después de aplicar la solución. NODE_PATH no se modificó permanentemente. No fue necesario desactivar el firewall ni modificar restricciones de la red universitaria.

El túnel publica temporalmente el servidor de desarrollo mediante un proveedor externo. No compartir el QR/URL; detenerlo con Ctrl+C al terminar. No constituye un despliegue de producción.

## Recorrido para repetir

1. Mi espacio → iniciar sesión con una cuenta sintética de desarrollo.
2. Consultar agenda conectada → cancha DEMO → horario futuro.
3. Introducir equipo y jugadores → crear bloqueo.
4. Verificar historial y estado de bloqueo temporal, sin confundirlo con una reserva confirmada.
5. Cancelar → comprobar «Cancelada».

Siguientes verificaciones móviles: reinicio/restauración de sesión, segundo plano y retorno, pérdida de conexión y reintento, mensajes de error, accesibilidad y compilación instalable. Registrar dispositivo y versiones en la próxima ejecución.

Referencias: [verificación de reservas](remote-reservations-verification.md), [estado del proyecto](../planning/status.md), [documentación oficial de Expo CLI](https://docs.expo.dev/more/expo-cli/).
