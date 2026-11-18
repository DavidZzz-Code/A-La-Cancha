# Versión 0.1.6 — apariencia y perfil

Fecha: 2026-11-17.

Implementa la dirección visual aprobada: fondos blanco y azul noche, acentos verdes/cian, emblema deportivo, tarjetas redondeadas y tres accesos principales. Tema Claro / Oscuro / Sistema persistido en el dispositivo. Inicio con catálogo remoto y próximo partido confirmado; Mi cuenta con perfil editable, favoritos locales por usuario y seguridad. Se mantienen los formularios del propietario y las reglas de disponibilidad/pago existentes.

La portada y las canchas usan ilustraciones, no las fotografías ficticias del mockup. No hay nueva integración de pagos. Los metadatos de perfil no otorgan permisos.

Preparación: versión Android 0.1.6, versionCode 7. La instalación local de npm encontró EPERM al crear enlaces de workspaces en Windows; para comprobar TypeScript se copiaron los dos paquetes internos dentro de node_modules (sin modificar el código de esos paquetes). No se ejecutaron suites de pruebas ni operaciones de reserva. La comprobación de tipos no equivale a validación en un teléfono.

El estado del APK debe comprobarse en EAS antes de afirmar que está disponible.

Verificación completada: TypeScript (`tsc --noEmit`) sin errores tras restaurar los paquetes internos locales.

Compilación enviada a EAS: [Android 0.1.6](https://expo.dev/accounts/jesump28/projects/a-la-cancha/builds/5e6b2fe6-6874-4d8b-9a99-1862641c8750), código fuente del commit `3c4cfd5`. La subida y la selección de firma remota finalizaron correctamente. Aún no se ha verificado el APK en dispositivo.
